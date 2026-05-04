<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\Investment\CycleMetric;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class CycleMetricService
{
  /* ------------------------- helpers ------------------------- */

  private function hasCol(string $table, string $col): bool
  {
    return Schema::hasColumn($table, $col);
  }

  /** Apply soft-delete + posted=true (if columns exist). */
  private function scopeAliveAndPosted($q, string $alias, bool $applyStatus = true)
  {
    $table = trim(explode(' as ', $alias)[0]); // 'locals as t' -> 'locals'
    if (Schema::hasColumn($table, 'deleted_at')) {
      $q->whereNull("$alias.deleted_at");
    }
    if ($applyStatus && Schema::hasColumn($table, 'status')) {
      // only apply when the UI also filters by status
      $q->where("$alias.status", true);
    }
    return $q;
  }

  /* ----------------------- CASH IN -------------------------- */

  private function pickCol(string $table, array $candidates): ?string
  {
    foreach ($candidates as $c) {
      if (\Illuminate\Support\Facades\Schema::hasColumn($table, $c)) return $c;
    }
    return null;
  }

  private function cashInLocalSales(int $cycleId): float
  {
    if (!Schema::hasTable('locals')) return 0.0;

    // You confirmed the column name:
    $col = 'total_inc_vat';

    return (float) DB::table('locals as t')
      ->where('t.cycle_id', $cycleId)
      ->tap(fn($q) => $this->scopeAliveAndPosted($q, 't', false))
      ->sum("t.$col");
  }


  private function cashInSQ(int $cycleId): float
  {
    if (!Schema::hasTable('s_q_clients')) return 0.0;
    if (!$this->hasCol('s_q_clients', 'amount')) return 0.0;

    return (float) DB::table('s_q_clients as t')
      ->where('t.cycle_id', $cycleId)
      ->tap(fn($q) => $this->scopeAliveAndPosted($q, 't', false))
      ->sum('t.amount');
  }

  private function cashInUS(int $cycleId): float
  {
    if (!Schema::hasTable('us_clients')) return 0.0;
    if (!$this->hasCol('us_clients', 'amount')) return 0.0;

    return (float) DB::table('us_clients as t')
      ->where('t.cycle_id', $cycleId)
      ->tap(fn($q) => $this->scopeAliveAndPosted($q, 't', false))
      ->sum('t.amount');
  }

  /**
   * Cash In from ALL customer sheets in this cycle.
   * Prefers item totals; optionally adds entry totals if present.
   */
  private function cashInCustomerSheets(int $cycleId): float
  {
    if (!Schema::hasTable('customer_sheets') || !Schema::hasTable('customer_sheet_entries')) {
      return 0.0;
    }

    $entries = 'customer_sheet_entries';

    // Figure out the FK column name on entries
    $fk = Schema::hasColumn($entries, 'customer_sheet_id') ? 'customer_sheet_id'
      : (Schema::hasColumn($entries, 'sheet_id') ? 'sheet_id' : null);

    if (!$fk) return 0.0;

    // Ensure both amount columns exist
    $hasMat = Schema::hasColumn($entries, 'total_material_buy');
    $hasShip = Schema::hasColumn($entries, 'total_shipping_cost');

    if (!$hasMat && !$hasShip) {
      // fallback to a single “total” column if your install has one
      $totalCol = Schema::hasColumn($entries, 'total') ? 'total'
        : (Schema::hasColumn($entries, 'total_aed') ? 'total_aed'
          : (Schema::hasColumn($entries, 'amount') ? 'amount' : null));
      if (!$totalCol) return 0.0;

      return (float) DB::table("$entries as e")
        ->join('customer_sheets as s', "s.id", "=", "e.$fk")
        ->where('s.cycle_id', $cycleId)
        ->tap(fn($q) => $this->scopeAliveAndPosted($q, 'e', false))
        ->tap(fn($q) => $this->scopeAliveAndPosted($q, 's', false))
        ->sum("e.$totalCol");
    }

    // Preferred: material + shipping (matches Summary)
    return (float) DB::table("$entries as e")
      ->join('customer_sheets as s', "s.id", "=", "e.$fk")
      ->where('s.cycle_id', $cycleId)
      ->tap(fn($q) => $this->scopeAliveAndPosted($q, 'e', false))
      ->tap(fn($q) => $this->scopeAliveAndPosted($q, 's', false))
      ->selectRaw('ROUND(SUM(COALESCE(e.total_material_buy,0) + COALESCE(e.total_shipping_cost,0)), 2) as s')
      ->value('s') ?? 0.0;
  }

  private function computeCashIn(int $cycleId): array
  {
    $local = $this->cashInLocalSales($cycleId);
    $sq    = $this->cashInSQ($cycleId);
    $us    = $this->cashInUS($cycleId);
    $cust  = $this->cashInCustomerSheets($cycleId);

    $cashIn = round($local + $sq + $us + $cust, 2);
    return compact('cashIn', 'local', 'sq', 'us', 'cust');
  }

  /* ----------------------- CASH OUT ------------------------- */

  private function pullMaterialsTotalsFromEndpoint(int $cycleId): array
  {
      // Use the same endpoint the Summary/Materials cards use
      $url  = 'investment/gts-materials/total';
      $resp = app()->handle(Request::create($url, 'GET', ['cycle_id' => $cycleId]));

      if ($resp->getStatusCode() >= 200 && $resp->getStatusCode() < 300) {
          $j = json_decode($resp->getContent(), true) ?: [];
          return [
              'material'   => (float) ($j['material']   ?? 0),
              'shipping'   => (float) ($j['shipping']   ?? 0),
              'investment' => (float) ($j['investment'] ?? 0), // keep if your endpoint returns it
          ];
      }
      return ['material' => 0.0, 'shipping' => 0.0, 'investment' => 0.0];
  }

  private function materialsTotals(int $cycleId): array
  {
      if (!\Illuminate\Support\Facades\Schema::hasTable('gts_materials')) {
          return ['material' => 0.0, 'shipping' => 0.0];
      }

      // MATERIAL = ui_total_material → total_material_buy → total_material
      $material = (float) DB::table('gts_materials as m')
          ->where('m.cycle_id', $cycleId)
          ->tap(fn($q) => $this->scopeAliveAndPosted($q, 'm', /* applyStatus */ false))
          ->selectRaw('ROUND(SUM(COALESCE(m.ui_total_material, m.total_material_buy, m.total_material, 0)), 2) as s')
          ->value('s') ?? 0.0;

      // SHIPPING = total_shipping_cost → (shipping_cost + dgd + labour)
      $shipping = (float) DB::table('gts_materials as m')
          ->where('m.cycle_id', $cycleId)
          ->tap(fn($q) => $this->scopeAliveAndPosted($q, 'm', /* applyStatus */ false))
          ->selectRaw('ROUND(SUM(COALESCE(m.total_shipping_cost, COALESCE(m.shipping_cost,0) + COALESCE(m.dgd,0) + COALESCE(m.labour,0))), 2) as s')
          ->value('s') ?? 0.0;

      return ['material' => $material, 'shipping' => $shipping];
  }

  private function investmentsTotal(int $cycleId): float
  {
    // If your Materials totals endpoint already includes investment,
    // you can return 0. Otherwise keep your DB sum here (as you have).
    if (!Schema::hasTable('gts_investments')) return 0.0;

    $invCol = Schema::hasColumn('gts_investments', 'investment_amount') ? 'investment_amount'
      : (Schema::hasColumn('gts_investments', 'amount') ? 'amount' : null);

    return $invCol
      ? (float) DB::table('gts_investments')->where('cycle_id', $cycleId)->sum($invCol)
      : 0.0;
  }

  private function pullMaterialsTotalsSnapshot(int $cycleId): ?array
  {
    $val = Cache::get(\App\Http\Controllers\Investment\MaterialsTotalsSnapshotController::key($cycleId));
    if (is_array($val) && ($val['material'] ?? 0) + ($val['shipping'] ?? 0) > 0) {
      return [
        'material'   => (float)$val['material'],
        'shipping'   => (float)$val['shipping'],
        'investment' => (float)$val['investment'],
      ];
    }
    return null;
  }

  private function computeCashOut(int $cycleId): array
  {
      $cycle = \App\Models\Investment\Cycle::find($cycleId);

      // Only trust snapshot for CLOSED sets; live sets should hit endpoint/DB
      $snap = ($cycle && strtolower((string)$cycle->status) === 'closed')
          ? $this->pullMaterialsTotalsSnapshot($cycleId)
          : null;

      if ($snap) {
          $used       = 'snapshot';
          $material   = (float) $snap['material'];
          $shipping   = (float) $snap['shipping'];
          $investment = (float) $snap['investment'];
      } else {
          // 1) Endpoint (same logic as the Materials/Summary pages)
          $t    = $this->pullMaterialsTotalsFromEndpoint($cycleId);
          $used = 'endpoint';
          if ((($t['material'] ?? 0) + ($t['shipping'] ?? 0)) <= 0) {
              // 2) DB fallback (now canonical)
              $used = 'db-fallback';
              $ms   = $this->materialsTotals($cycleId);
              $inv  = $this->investmentsTotal($cycleId);
              $t    = ['material' => $ms['material'], 'shipping' => $ms['shipping'], 'investment' => $inv];
          }
          $material   = (float) ($t['material'] ?? 0);
          $shipping   = (float) ($t['shipping'] ?? 0);
          $investment = (float) ($t['investment'] ?? 0);
      }

      $cashOut = round($material + $shipping + $investment, 2);
      Log::info('computeCashOut', compact('cycleId','used','material','shipping','investment','cashOut'));

      return [
          'cashOut'          => $cashOut,
          'material'         => round($material, 2),
          'shipping'         => round($shipping, 2),
          'investment'       => round($investment, 2),
          'source'           => $used,
      ];
  }

  /* ----------------------- PUBLIC API ----------------------- */

  public function computeFor(int $cycleId): array
  {
    $in  = $this->computeCashIn($cycleId);
    $out = $this->computeCashOut($cycleId);

    $profit = round($in['cashIn'] - $out['cashOut'], 2);
    $us_total = $in['us'];

    return [
      'cash_in'        => $in['cashIn'],
      'cash_out'       => $out['cashOut'],
      'profit'         => $profit,

      // breakdowns (nice for debugging / Summary parity)
      'us_total'       => round($us_total, 2),
      'local'          => round($in['local'], 2),
      'sq'             => round($in['sq'], 2),
      'customers'      => round($in['cust'], 2),
      'material_total' => $out['material'],
      'shipping_total' => $out['shipping'],
      'investment_total' => $out['investment'],
    ];
  }

  public function recomputeAndPersist(int $cycleId): array
  {
    $data = $this->computeFor($cycleId);

    // ← QUICK UNBLOCK: skip persistence if the table isn't created yet
    if (!Schema::hasTable('cycle_metrics')) {
      Log::info('cycle_metrics missing; skipping persist for cycle ' . $cycleId, $data);
      return $data;
    }

    // If you might not have a model yet, you can keep this guarded block
    // or swap to DB::table(...)->updateOrInsert(...) directly.
    CycleMetric::updateOrCreate(
      ['cycle_id' => $cycleId],
      $data + ['computed_at' => now()]
    );

    return $data;
  }
}
