<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use App\Models\Investment\CustomerSheet;
use App\Models\Investment\CustomerSheetEntry;
use App\Models\Investment\Local;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Schema;
use App\Models\Investment\Cycle;
use App\Support\ActiveCycle;
use Illuminate\Support\Facades\Log;

use Illuminate\Http\Request;

class SummaryController extends Controller
{
    public function summary()
    {
        // return view('sheets.summary_sheet');
        return redirect()->route('index');
    }

    public function getSummaryData(Request $request, ?Cycle $cycle = null)
    {
        $cid = $cycle?->id ?? ActiveCycle::id($request);

        // --- Cash OUT parts (Material & Shipping) exactly as before
        $material = (float) DB::table('gts_materials as m')
            ->where('m.cycle_id', $cid)
            ->when(Schema::hasColumn('gts_materials', 'deleted_at'), fn($q) => $q->whereNull('m.deleted_at'))
            ->selectRaw("
            ROUND(SUM(
                CASE
                    WHEN COALESCE(m.total_material_card,0) > 0 THEN COALESCE(m.total_material_card,0)
                    WHEN COALESCE(m.total_material_buy, 0) > 0 THEN COALESCE(m.total_material_buy, 0)
                    WHEN COALESCE(m.total_material,     0) > 0 THEN COALESCE(m.total_material,     0)
                    ELSE 0
                END
            ), 2) as s
        ")
            ->value('s') ?? 0.0;

        $shipping = (float) DB::table('gts_materials as m')
            ->where('m.cycle_id', $cid)
            ->when(Schema::hasColumn('gts_materials', 'deleted_at'), fn($q) => $q->whereNull('m.deleted_at'))
            ->selectRaw(<<<SQL
                ROUND(SUM(
                    COALESCE(
                        m.total_shipping_cost,
                        COALESCE(m.shipping_cost,0) + COALESCE(m.dgd,0) + COALESCE(m.labour,0)
                    )
                ), 2) as s
            SQL)
            ->value('s') ?? 0.0;

        // --- Cash IN parts (must match the "Cash In Breakdown" grand total)
        $usTotal = (float) DB::table('us_clients')->where('cycle_id', $cid)->sum('amount');
        $sqTotal = (float) DB::table('s_q_clients')->where('cycle_id', $cid)->sum('amount');

        // Local Sales total using your helper
        $localTotal = $this->computeLocalSalesTotal($cid);

        // Customer sheets totals = BL + RH … (material + shipping)
        $cust = DB::table('customer_sheet_entries')
            ->where('cycle_id', $cid)
            ->selectRaw('
            COALESCE(SUM(COALESCE(total_material_buy,0)), 0) AS material,
            COALESCE(SUM(COALESCE(total_shipping_cost,
                   COALESCE(shipping_cost,0)+COALESCE(dgd,0)+COALESCE(labour,0))), 0) AS shipping
        ')
            ->first();

        $custMat  = (float) ($cust->material ?? 0);
        $custShip = (float) ($cust->shipping ?? 0);
        $custTotal = $custMat + $custShip;

        // Final KPI numbers (exactly what Summary shows)
        $cashIn  = round($usTotal + $sqTotal + $localTotal + $custTotal, 2);
        $cashOut = round($material + $shipping, 2);
        $profit  = round($cashIn - $cashOut, 2);

        // OPTIONAL: expose a small structure the Summary page can use to build the table, if you want
        $cashInBreakdown = [
            ['sheet' => 'BL/RH (Customer Sheets)', 'total' => round($custTotal, 2)],
            ['sheet' => 'US Client Payment',        'total' => round($usTotal, 2)],
            ['sheet' => 'SQ Sheet',                 'total' => round($sqTotal, 2)],
            ['sheet' => 'Local Sales',              'total' => round($localTotal, 2)],
        ];

        // --- SNAPSHOT: write to cycle_metrics so /cycles can read it
        \App\Models\Investment\CycleMetric::updateOrCreate(
            ['cycle_id' => $cid],
            [
                'cash_in'     => $cashIn,
                'cash_out'    => $cashOut,
                'profit'      => $profit,
                'us_total'    => round($usTotal, 2),
                'computed_at' => now(),
            ]
        );
    
        Log::debug('Summary KPIs', compact('cid','cashIn','cashOut','profit'));
        
        return response()->json([
            'total_purchase_of_material' => round($material, 2),
            'total_shipping_cost'        => round($shipping, 2),
            'cash_out'                   => $cashOut,
            'cash_in'                    => $cashIn,
            'profit'                     => $profit,
            'cash_in_breakdown'          => $cashInBreakdown, // helps if you need it
        ])->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    public function getCashInBreakdown(Request $request)
    {
        $cid = ActiveCycle::id($request);

        $us  = (float) DB::table('us_clients')->where('cycle_id', $cid)->sum('amount');
        $sq  = (float) DB::table('s_q_clients')->where('cycle_id', $cid)->sum('amount');
        $loc = $this->computeLocalSalesTotal($cid);

        $customerRows = DB::table('customer_sheets as cs')
            ->where('cs.cycle_id', $cid)
            ->leftJoin('customer_sheet_entries as e', 'e.customer_sheet_id', '=', 'cs.id')
            ->selectRaw('
            cs.sheet_name AS name,
            COALESCE(SUM(COALESCE(e.total_material_buy,0)), 0) AS material,
            COALESCE(
                SUM(
                    COALESCE(e.total_shipping_cost,
                             COALESCE(e.shipping_cost,0)+COALESCE(e.dgd,0)+COALESCE(e.labour,0))
                ), 0
            ) AS shipping
        ')
            ->groupBy('cs.id', 'cs.sheet_name')
            ->orderBy('cs.sheet_name')
            ->get()
            ->map(fn($r) => [
                'sheet'    => (string) $r->name,
                'material' => (float) $r->material,
                'shipping' => (float) $r->shipping,
                'total'    => (float) $r->material + (float) $r->shipping,
            ])
            ->values()
            ->all();

        $otherRows = [
            ['sheet' => 'US Client Payment', 'material' => $us, 'shipping' => 0.0, 'total' => $us],
            ['sheet' => 'SQ Sheet',          'material' => $sq, 'shipping' => 0.0, 'total' => $sq],
            ['sheet' => 'Local Sales',       'material' => $loc, 'shipping' => 0.0, 'total' => $loc],
        ];

        return response()->json(array_merge($customerRows, $otherRows));
    }

    public function customerSheetTotals(Request $request): JsonResponse
    {
        $cid = ActiveCycle::id($request);
        $tot = DB::table('customer_sheet_entries')
            ->where('cycle_id', $cid)
            ->selectRaw('
                COALESCE(SUM(COALESCE(total_material_buy,0)), 0) AS material,
                COALESCE(SUM(COALESCE(total_shipping_cost,
                    COALESCE(shipping_cost,0)+COALESCE(dgd,0)+COALESCE(labour,0))), 0) AS shipping')
            ->first();
    
        return response()->json([
            'material' => round((float)($tot->material ?? 0), 2),
            'shipping' => round((float)($tot->shipping ?? 0), 2),
        ]);
    }

    public function customerSheetRows(Request $request): JsonResponse
    {
        $cid = ActiveCycle::id($request);

        // Decide FK once
        $fk = Schema::hasColumn('customer_sheet_entries', 'customer_sheet_id')
            ? 'customer_sheet_id'
            : (Schema::hasColumn('customer_sheet_entries', 'sheet_id') ? 'sheet_id' : null);

        // If entries table missing (or no FK), return all sheets with zeros
        if (!Schema::hasTable('customer_sheet_entries') || !$fk) {
            $rows = DB::table('customer_sheets')
                ->where('cycle_id', $cid)
                ->orderBy('sheet_name')
                ->get(['sheet_name'])
                ->map(fn($s) => [
                    'name'     => (string) $s->sheet_name,
                    'material' => 0.0,
                    'shipping' => 0.0,
                ])->values();

            return response()->json(['rows' => $rows], 200);
        }

        $rows = DB::table('customer_sheets as cs')
            ->where('cs.cycle_id', $cid)
            ->leftJoin('customer_sheet_entries as e', "e.$fk", '=', 'cs.id')
            ->selectRaw('
            cs.sheet_name AS name,
            COALESCE(SUM(COALESCE(e.total_material_buy,0)), 0) AS material,
            COALESCE(
                SUM(
                    COALESCE(e.total_shipping_cost,
                             COALESCE(e.shipping_cost,0) + COALESCE(e.dgd,0) + COALESCE(e.labour,0))
                ), 0
            ) AS shipping
        ')
            ->groupBy('cs.id', 'cs.sheet_name')
            ->orderBy('cs.sheet_name')
            ->get()
            ->map(fn($r) => [
                'name'     => (string) $r->name,
                'material' => (float) $r->material,
                'shipping' => (float) $r->shipping,
            ])
            ->values();

        return response()->json(['rows' => $rows], 200);
    }

    public function customerSheetLoans(Request $request): JsonResponse
    {
        $cid = ActiveCycle::id($request);

        $rows = DB::table('customer_sheets as cs')
            ->where('cs.cycle_id', $cid)
            ->leftJoin(DB::raw('
            (SELECT customer_sheet_id, cycle_id,
                    SUM(COALESCE(total_material_buy,0) + COALESCE(total_shipping_cost,0)) AS sheet_total
             FROM customer_sheet_entries
             GROUP BY customer_sheet_id, cycle_id) e
        '), function ($join) {
                $join->on('e.customer_sheet_id', '=', 'cs.id')
                    ->on('e.cycle_id', '=', 'cs.cycle_id');           // keep cycle consistent
            })
            ->leftJoin(DB::raw('
            (SELECT customer_sheet_id, cycle_id,
                    SUM(COALESCE(amount,0)) AS loan_paid
             FROM customer_loan_ledger_entries
             GROUP BY customer_sheet_id, cycle_id) ll
        '), function ($join) {
                $join->on('ll.customer_sheet_id', '=', 'cs.id')
                    ->on('ll.cycle_id', '=', 'cs.cycle_id');          // keep cycle consistent
            })
            ->selectRaw('
            cs.id,
            cs.sheet_name AS name,
            COALESCE(e.sheet_total,0)  AS sheet_total,
            COALESCE(ll.loan_paid,0)   AS loan_paid,
            /* match Customer Sheet: remaining = loan_paid - sheet_total (signed) */
            (COALESCE(ll.loan_paid,0) - COALESCE(e.sheet_total,0)) AS remaining_signed,
            /* dues only (positive absolute of negatives) for grand total */
            CASE
            WHEN (COALESCE(ll.loan_paid,0) - COALESCE(e.sheet_total,0)) < 0
            THEN ABS(COALESCE(ll.loan_paid,0) - COALESCE(e.sheet_total,0))
            ELSE 0
            END AS due_abs
        ')
            ->orderBy('name')
            ->get();

        // Grand total = sum of dues only (negatives on the signed metric)
        $grand = (float) $rows->sum('due_abs');

        // expose the signed value as "remaining" to the frontend
        $rows = $rows->map(fn($r) => [
            'id'          => $r->id,
            'name'        => $r->name,
            'sheet_total' => (float) $r->sheet_total,
            'loan_paid'   => (float) $r->loan_paid,
            'remaining'   => (float) $r->remaining_signed, // e.g. RH = -75809.50, BL = +1000.00
        ]);

        return response()->json(['rows' => $rows, 'grand' => $grand], 200);
    }

    public function localSalesTotal(Request $request)
    {
        $cid = ActiveCycle::id($request);
        return response()->json(['total' => $this->computeLocalSalesTotal($cid)]);
    }

    private function computeLocalSalesTotal(int $cid): float
    {
        // items subtotal per local_id
        $sub = DB::table('local_items')
            ->selectRaw('local_id, '
                . 'SUM(COALESCE(total_inc_vat, (COALESCE(units,0)*COALESCE(unit_price,0)) + COALESCE(vat,0))) AS items_inc')
            ->groupBy('local_id');

        $grand = DB::table('locals as l')
            ->where('l.cycle_id', $cid)
            ->leftJoinSub($sub, 'it', 'it.local_id', '=', 'l.id')
            ->selectRaw('SUM(CASE '
                . 'WHEN l.total_inc_vat IS NOT NULL THEN l.total_inc_vat '
                . 'WHEN COALESCE(it.items_inc,0) > 0 THEN it.items_inc '
                . 'ELSE COALESCE(l.total_ex_vat,0) + COALESCE(l.vat_amount,0) '
                . 'END) AS grand')
            ->value('grand');

        return round((float) ($grand ?? 0), 2);
    }

    public function sqTotal(Request $request): \Illuminate\Http\JsonResponse
    {
        $cid = ActiveCycle::id($request);
        $sum = (float) DB::table('s_q_clients')->where('cycle_id', $cid)->sum('amount');
        return response()->json(['total' => round($sum, 2)], 200);
    }

    public function usClientTotal(Request $request): JsonResponse
    {
        $cid = ActiveCycle::id($request);
        $sum = (float) \Illuminate\Support\Facades\DB::table('us_clients')
            ->where('cycle_id', $cid)
            ->sum('amount');

        return response()->json(['total' => round($sum, 2)], 200);
    }
}
