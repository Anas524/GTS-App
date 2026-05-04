<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ProfitLossController extends Controller
{
    public function index()
    {
        // optional if you want dedicated page later
        return view('profit_loss');
    }

    public function data(Request $request)
    {
        $from = Carbon::parse($request->query('from', now()->startOfYear()->toDateString()))->startOfMonth();
        $to   = Carbon::parse($request->query('to', now()->endOfYear()->toDateString()))->endOfMonth();

        // Build month keys: ["2024-12", "2025-01", ...]
        $months = [];
        $cursor = $from->copy()->startOfMonth();
        while ($cursor <= $to) {
            $months[] = $cursor->format('Y-m');
            $cursor->addMonth();
        }

        /**
         * IMPORTANT:
         * Replace table/column names below with your actual ones.
         * I’m assuming revenue comes from local sales (client_name + total),
         * and expenses come from some expense table or investments table.
         */

        // ---- Revenue mapping (by client groups) ----
        $revMap = [
            'global_trade_services' => ['Global Trade Services', 'GTS', 'GLOBAL TRADE SERVICES'],
            'buy_luxury'            => ['Buy Luxury', 'BUY LUXURY'],
            'trado_global'          => ['Trado Global', 'TRADO GLOBAL'],
        ];

        // Example: local_sales table has: date, client_name, total
        // Adjust these to match your DB!
        $revenueRows = DB::table('local_sales')
            ->selectRaw("DATE_FORMAT(`date`, '%Y-%m') as ym, client_name, SUM(total_amount) as amt")
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->groupBy('ym', 'client_name')
            ->get();

        // Prepare revenue buckets per month
        $rev = [
            'global_trade_services' => array_fill_keys($months, 0),
            'buy_luxury'            => array_fill_keys($months, 0),
            'trado_global'          => array_fill_keys($months, 0),
            'all_others'            => array_fill_keys($months, 0),
        ];

        foreach ($revenueRows as $r) {
            $ym = $r->ym;
            if (!isset($rev['all_others'][$ym])) continue;

            $bucket = 'all_others';
            foreach ($revMap as $key => $names) {
                foreach ($names as $nm) {
                    if (strcasecmp(trim($r->client_name), $nm) === 0) {
                        $bucket = $key;
                        break 2;
                    }
                }
            }
            $rev[$bucket][$ym] += (float)$r->amt;
        }

        // ---- Expenses (replace with your real source) ----
        // Example table: expenses has: date, type, amount
        $expTypes = ['purchases', 'salaries', 'rent', 'misc'];

        $expenseRows = DB::table('expenses')
            ->selectRaw("DATE_FORMAT(`date`, '%Y-%m') as ym, type, SUM(amount) as amt")
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->groupBy('ym', 'type')
            ->get();

        $exp = [
            'purchases' => array_fill_keys($months, 0),
            'salaries'  => array_fill_keys($months, 0),
            'rent'      => array_fill_keys($months, 0),
            'misc'      => array_fill_keys($months, 0),
        ];

        foreach ($expenseRows as $e) {
            $ym = $e->ym;
            $type = strtolower(trim($e->type));
            if (isset($exp[$type]) && isset($exp[$type][$ym])) {
                $exp[$type][$ym] += (float)$e->amt;
            }
        }

        // Totals
        $totalRevenue = [];
        $totalExpense = [];
        $grossProfit  = [];

        foreach ($months as $m) {
            $totalRevenue[$m] =
                $rev['global_trade_services'][$m] +
                $rev['buy_luxury'][$m] +
                $rev['trado_global'][$m] +
                $rev['all_others'][$m];

            $totalExpense[$m] =
                $exp['purchases'][$m] +
                $exp['salaries'][$m] +
                $exp['rent'][$m] +
                $exp['misc'][$m];

            $grossProfit[$m] = $totalRevenue[$m] - $totalExpense[$m];
        }

        $overallProfit = array_sum($grossProfit);

        return response()->json([
            'months' => $months,
            'label'  => $from->format('M Y') . ' - ' . $to->format('M Y'),
            'revenue' => $rev,
            'expense' => $exp,
            'totalRevenue' => $totalRevenue,
            'totalExpense' => $totalExpense,
            'grossProfit'  => $grossProfit,
            'overallProfit' => $overallProfit,
        ]);
    }
}
