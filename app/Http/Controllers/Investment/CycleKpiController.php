<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Investment\CycleMetric;

class CycleKpiController extends Controller
{
    public function index(Request $request)
    {
        // ids from ?ids=5,4,3 or ?ids[]=5&ids[]=4...
        $ids = collect($request->input('ids'))
            ->when(is_string($request->input('ids')), fn ($c) => $c->flatMap(fn ($s) => explode(',', $s)))
            ->map(fn ($v) => (int) $v)
            ->filter()->unique()->values();

        if ($ids->isEmpty()) {
            return response()->json([]);
        }

        // --- helpers
        $num = static function ($v) {
            return is_numeric($v) ? (float) $v : (float) preg_replace('/[^\d.\-]/', '', (string) $v);
        };

        $try = static function (array $paths, array $params = []) {
            foreach ($paths as $p) {
                $req  = Request::create($p, 'GET', $params);
                $resp = app()->handle($req);
                if ($resp->getStatusCode() >= 200 && $resp->getStatusCode() < 300) {
                    $json = json_decode($resp->getContent(), true);
                    if (is_array($json)) return $json;
                }
            }
            return [];
        };

        // one snapshot collection only
        $snapshots = CycleMetric::whereIn('cycle_id', $ids)->get()->keyBy('cycle_id');

        $out = [];

        foreach ($ids as $id) {
            // If a snapshot exists, use it and continue
            if (isset($snapshots[$id])) {
                $m = $snapshots[$id];
                $out[$id] = [
                    'cash_in'  => round((float)$m->cash_in,  2),
                    'cash_out' => round((float)$m->cash_out, 2),
                    'profit'   => round((float)$m->profit,   2),
                    'us_total' => round((float)$m->us_total, 2),
                ];
                continue;
            }
            
            $cycle = \App\Models\Investment\Cycle::find($id);
            if (!$cycle) continue;

            // --- 1) Component totals (same sources the Summary uses)
            $us   = $try(['/summary/us/total',    '/us/total'],    ['cycle_id' => $id]);
            $sq   = $try(['/summary/sq/total',    '/sq/total'],    ['cycle_id' => $id]);
            $loc  = $try(['/summary/local/total', '/local/total'], ['cycle_id' => $id]);

            $cust = $try(
                ['/summary/customer-sheets/totals', '/summary/customers/totals', '/customers/totals'],
                ['cycle_id' => $id]
            );

            $usTotal    = $num($us['total']          ?? $us['totalAmount'] ?? 0);
            $sqTotal    = $num($sq['total']          ?? $sq['totalAmount'] ?? $sq['sum'] ?? 0);
            $localTotal = $num($loc['total']         ?? $loc['totalAmount'] ?? $loc['sum'] ?? 0);

            $custIn     = $num($cust['cash_in']      ?? $cust['in']        ?? $cust['total_in']  ?? 0);
            $custOut    = $num($cust['cash_out']     ?? $cust['out']       ?? $cust['total_out'] ?? 0);

            // GTS (cash OUT components)
            $gtsMatShip    = $try(['/gts-materials/total'],    ['cycle_id' => $id]); // {material,shipping}
            $gtsInv        = $try(['/gts-investments/total'],  ['cycle_id' => $id]); // {total}|{investment}
            $gtsMat        = $num($gtsMatShip['material'] ?? 0);
            $gtsShip       = $num($gtsMatShip['shipping'] ?? 0);
            $gtsInvestment = $num($gtsInv['total'] ?? $gtsInv['investment'] ?? 0);

            $compCI = $usTotal + $sqTotal + $localTotal + $custIn;
            $compCO = ($gtsMat + $gtsShip + $gtsInvestment) + $custOut;

            // --- 2) Summary snapshot (used by the Summary page)
            $snap   = $try(['/summary-data'], ['cycle_id' => $id]);
            $snapCI = $num($snap['cash_in']  ?? 0);
            $snapCO = $num($snap['cash_out'] ?? 0);

            // --- 3) Optional: sum the "Cash In Breakdown" table rows (safe)
            $tableCI = 0.0;
            $breakdown = data_get($snap, 'cash_in_breakdown')
                    ?? data_get($snap, 'breakdown')
                    ?? data_get($snap, 'tables.cash_in', []);
            $rows = is_array($breakdown) ? (data_get($breakdown, 'rows', $breakdown) ?? []) : [];
            if (is_array($rows)) {
                foreach ($rows as $r) {
                    if (isset($r['total'])) {
                        $tableCI += $num($r['total']);
                    } else {
                        foreach (array_reverse((array)$r) as $v) {
                            if (is_array($v)) continue;
                            $val = $num($v);
                            if ($val !== 0.0) { $tableCI += $val; break; }
                        }
                    }
                }
            }

            // --- 4) Choose final numbers
            // Snapshot CI sometimes equals just investment (bad). Ignore when that happens.
            $looksLikeInvestment = ($snapCI > 0) && (abs($snapCI - $gtsInvestment) <= 0.50);

            // Cash In: prefer tableCI, else component math, else snapshot (unless it looks like investment-only)
            if ($tableCI > 0.01) {
                $finalCI = $tableCI;
            } elseif ($compCI > 0.01) {
                $finalCI = $compCI;
            } else {
                $finalCI = $looksLikeInvestment ? 0.0 : $snapCI;
            }

            // Cash Out: prefer component math; else snapshot; else compose from pieces
            $finalCO = ($compCO > 0.01)
                ? $compCO
                : ($snapCO ?: ($gtsMat + $gtsShip + $gtsInvestment + $custOut));

            $finalPF = $finalCI - $finalCO;

            // Write computed result when snapshot is absent
            $out[$id] = [
                'cash_in'  => round($finalCI, 2),
                'cash_out' => round($finalCO, 2),
                'profit'   => round($finalPF, 2),
                'us_total' => round($usTotal, 2),
            ];
        }

        return response()->json($out);
    }
}
