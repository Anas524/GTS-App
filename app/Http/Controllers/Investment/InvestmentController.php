<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use App\Models\Investment\Investment;
use App\Models\Investment\CustomerSheet;
use App\Models\Investment\USClient;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\log;
use App\Models\Investment\Cycle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class InvestmentController extends Controller
{
    public function index(?Cycle $cycle = null)
    {
        // 1) Pick the active cycle id (route param wins, else session, else ?cycle_id)
        $activeCycleId = $cycle?->id
            ?? session('active_cycle_id')
            ?? request('cycle_id');

        // 2) Only fetch sheets for that cycle
        $customerSheets = $activeCycleId
            ? \App\Models\Investment\CustomerSheet::where('cycle_id', $activeCycleId)
            ->orderBy('id')
            ->get(['id', 'sheet_name'])
            : collect();

        // 3) JS-friendly payload
        $customerSheetsForJs = $customerSheets
            ->map(fn($s) => ['id' => $s->id, 'name' => $s->sheet_name])
            ->values();

        // 4) Optional: names for any dropdowns you might have
        $sheetNames = $customerSheets->pluck('sheet_name');

        // 5) Remember which tab is active
        $activeSheet = request('activeSheet', session('activeSheet', 'summary'));
        session(['activeSheet' => $activeSheet]);

        return view('investment.index', [ // <— keep this the same view you actually render
            'cycle'               => $cycle,
            'totalAmount'         => USClient::sum('amount'),
            'customerSheets'      => $customerSheets,
            'customerSheetsForJs' => $customerSheetsForJs, // used by @json in Blade
            'sheetNames'          => $sheetNames,
            'activeSheet'         => $activeSheet,
        ]);
    }
    
    public function totals(\App\Models\Investment\Cycle $cycle)
    {
        // Material = SUM(total_material)
        $material = (float) DB::table('gts_materials')->where('cycle_id', $cycle->id)
            ->sum('total_material');

        // Shipping = total_shipping_cost, else shipping_cost + dgd + labour
        $shipping = (float) DB::table('gts_materials as m')->where('m.cycle_id', $cycle->id)
            ->selectRaw('
            ROUND(SUM(
                COALESCE(
                    m.total_shipping_cost,
                    COALESCE(m.shipping_cost,0) + COALESCE(m.dgd,0) + COALESCE(m.labour,0)
                )
            ), 2) as s
        ')->value('s') ?? 0.0;

        // Investment = SUM(investment_amount|amount)
        $invCol = Schema::hasColumn('gts_investments', 'investment_amount') ? 'investment_amount'
            : (Schema::hasColumn('gts_investments', 'amount') ? 'amount' : null);
        $investment = $invCol
            ? (float) DB::table('gts_investments')->where('cycle_id', $cycle->id)->sum($invCol)
            : 0.0;

        return response()->json([
            'material'   => round($material, 2),
            'shipping'   => round($shipping, 2),
            'investment' => round($investment, 2),
            'ts'         => now()->timestamp,
        ]);
    }

    public function show(Cycle $cycle)
    {
        session(['active_cycle_id' => $cycle->id]);

        $customerSheets = \App\Models\Investment\CustomerSheet::where('cycle_id', $cycle->id)
            ->orderBy('id')
            ->get(['id', 'sheet_name']);

        $customerSheetsForJs = $customerSheets
            ->map(function ($s) {
                return ['id' => $s->id, 'name' => $s->sheet_name];
            })
            ->values()
            ->all();

        return view('investments.index', [
            'cycle'               => $cycle,
            'customerSheets'      => $customerSheets,
            'customerSheetsForJs' => $customerSheetsForJs,
        ]);
    }
}
