<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Illuminate\Support\Str;

class ProfitLossSheetsController extends Controller
{
    public function index()
    {
        $books = DB::table('pl_books')->orderBy('id', 'asc')->get();

        // Add: months_count + overall_profit for each book
        foreach ($books as $b) {
            $months = DB::table('pl_months')
                ->where('book_id', $b->id)
                ->orderBy('month_date')
                ->get();

            $b->months_count = $months->count();

            // overall_profit = LAST running gross (same as your dashboard)
            $runningGross = 0;

            foreach ($months as $m) {
                $monthLabel = $m->label;

                $lines = DB::table('pl_lines')->where('month_id', $m->id)->get();

                // Revenue (same as bookData())
                $revGts   = $this->sumInGroup($lines, 'A', 'GLOBAL TRADE SERVICES', $monthLabel);
                $revBuy   = $this->sumInGroup($lines, 'B', 'BUY LUXURY GLOBAL', $monthLabel);
                $revTrado = $this->sumInGroup($lines, 'C', 'TRADO GLOBAL', $monthLabel);
                $revOther = $this->sumInGroup($lines, 'D', 'OTHERS', $monthLabel);

                $totalRevenue = $this->money($revGts + $revBuy + $revTrado + $revOther);

                // Expenses (same as bookData())
                $purchases = $this->purchasesOutExtraSum($lines, $monthLabel);
                $salaries  = $this->fixedOutAmt($lines, 'B', 'Salaries', $monthLabel);
                $rent      = $this->fixedOutAmt($lines, 'C', 'Rent per month', $monthLabel);
                $misc      = $this->fixedOutAmt($lines, 'D', 'Miscellaneous Expenses/ PETTY CASH', $monthLabel);

                $totalExpense = $this->money($purchases + $salaries + $rent + $misc);

                $grossMonth = $this->money($totalRevenue - $totalExpense);
                $runningGross = $this->money($runningGross + $grossMonth);
            }

            $b->overall_profit = $runningGross;
        }

        return view('pl.index', compact('books'));
    }

    public function dashboard($bookId)
    {
        $book = DB::table('pl_books')->where('id', $bookId)->first();
        abort_if(!$book, 404);

        return view('pl.dashboard', [
            'plBookId' => $book->id,
            'book' => $book,
        ]);
    }

    // Create a new book + months + default lines
    public function storeBook(Request $request)
    {
        $request->validate([
            'from'  => ['required', 'date_format:Y-m'],
            'to'    => ['required', 'date_format:Y-m'],
            'title' => ['required', 'string', 'max:255'],
        ]);

        $from = Carbon::createFromFormat('Y-m', $request->from)->startOfMonth();
        $to   = Carbon::createFromFormat('Y-m', $request->to)->startOfMonth();

        if ($from->gt($to)) {
            return response()->json(['message' => 'From must be <= To'], 422);
        }

        // First time: create new book + months + default lines
        $bookId = null;

        DB::transaction(function () use ($request, $from, $to, &$bookId) {
            $bookId = DB::table('pl_books')->insertGetId([
                'title'      => $request->title ?: 'Profit & Loss',
                'from_month' => $from->toDateString(),
                'to_month'   => $to->toDateString(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $cursor = $from->copy();
            while ($cursor->lte($to)) {
                $monthId = DB::table('pl_months')->insertGetId([
                    'book_id'     => $bookId,
                    'month_date'  => $cursor->toDateString(),
                    'label'       => $cursor->format('M Y'),
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);

                foreach ($this->defaultLines() as $i => $row) {
                    DB::table('pl_lines')->insert([
                        'month_id'    => $monthId,
                        'section'     => $row['section'],
                        'code'        => $row['code'],
                        'label'       => $row['label'],
                        'amount'      => 0,
                        'remarks'     => null,
                        'sort_order'  => $row['sort_order'] ?? ($i + 1),
                        'created_at'  => now(),
                        'updated_at'  => now(),
                    ]);
                }

                $cursor->addMonth();
            }
        });

        return response()->json([
            'book_id'  => $bookId,
            'created'  => true,
            'message'  => 'P&L book created.'
        ]);
    }

    // Get dashboard data (months + totals)
    public function bookData($bookId)
    {
        $book = DB::table('pl_books')->where('id', $bookId)->first();
        if (!$book) return response()->json(['message' => 'Not found'], 404);

        $months = DB::table('pl_months')
            ->where('book_id', $bookId)
            ->orderBy('month_date')
            ->get();

        $monthSummaries = [];
        $runningGross = 0;

        foreach ($months as $m) {
            $monthLabel = $m->label; // "Oct 2025"
            $lines = DB::table('pl_lines')->where('month_id', $m->id)->get();

            // Revenue subtotals (from CASH IN groups)
            $revGts   = $this->sumInGroup($lines, 'A', 'GLOBAL TRADE SERVICES', $monthLabel);
            $revBuy   = $this->sumInGroup($lines, 'B', 'BUY LUXURY GLOBAL', $monthLabel);
            $revTrado = $this->sumInGroup($lines, 'C', 'TRADO GLOBAL', $monthLabel);
            $revOther = $this->sumInGroup($lines, 'D', 'OTHERS', $monthLabel);

            $totalRevenue = $this->money($revGts + $revBuy + $revTrado + $revOther);

            // Expenses (from CASH OUT fixed items)
            // PURCHASES must be sum of OUT_EXTRA rows (same as month page)
            $purchases = $this->purchasesOutExtraSum($lines, $monthLabel);

            $salaries = $this->fixedOutAmt($lines, 'B', 'Salaries', $monthLabel);
            $rent     = $this->fixedOutAmt($lines, 'C', 'Rent per month', $monthLabel);
            $misc     = $this->fixedOutAmt($lines, 'D', 'Miscellaneous Expenses/ PETTY CASH', $monthLabel);

            $totalExpense = $this->money($purchases + $salaries + $rent + $misc);

            // Month gross profit
            $grossMonth = $this->money($totalRevenue - $totalExpense);

            // Running gross profit (your Excel rule)
            $runningGross = $this->money($runningGross + $grossMonth);

            $monthSummaries[] = [
                'id' => $m->id,
                'label' => $m->label,
                'month_date' => $m->month_date,

                'rev_gts' => $revGts,
                'rev_buy' => $revBuy,
                'rev_trado' => $revTrado,
                'rev_other' => $revOther,
                'total_revenue' => $totalRevenue,

                'purchases' => $purchases,
                'salaries' => $salaries,
                'rent' => $rent,
                'misc' => $misc,
                'total_expense' => $totalExpense,

                'gross_month' => $grossMonth,
                'gross_running' => $runningGross,
            ];
        }

        $overallProfit = count($monthSummaries) ? end($monthSummaries)['gross_running'] : 0;

        return response()->json([
            'book' => $book,
            'months' => $months->map(fn($m) => [
                'id' => $m->id,
                'label' => $m->label,
                'month_date' => $m->month_date,
                'is_closed' => (int)($m->is_closed ?? 0),
            ])->values(),

            'monthSummaries' => $monthSummaries,
            'overallProfit' => $overallProfit,
        ]);
    }

    // Get month sheet lines
    public function monthData($monthId)
    {
        $month = DB::table('pl_months')->where('id', $monthId)->first();
        if (!$month) return response()->json(['message' => 'Not found'], 404);

        $lines = DB::table('pl_lines')
            ->where('month_id', $monthId)
            ->orderBy('section')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'month' => $month,
            'lines' => $lines,
        ]);
    }

    // Update a single line (amount/remarks)
    public function updateLine(Request $request, $lineId)
    {
        $request->validate([
            'amount' => ['nullable', 'numeric'],
            'remarks' => ['nullable', 'string'],
        ]);

        $row = DB::table('pl_lines')->where('id', $lineId)->first();
        if (!$row) return response()->json(['message' => 'Not found'], 404);

        DB::table('pl_lines')->where('id', $lineId)->update([
            'amount' => $request->amount ?? $row->amount,
            'remarks' => $request->remarks,
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    private function defaultLines(): array
    {
        return [
            // Revenue
            ['section' => 'revenue', 'code' => 'rev_gts', 'label' => 'Revenue Stream from Global Trade Services', 'sort_order' => 10],
            ['section' => 'revenue', 'code' => 'rev_buy_luxury', 'label' => 'Revenue Stream from Buy Luxury', 'sort_order' => 20],
            ['section' => 'revenue', 'code' => 'rev_trado', 'label' => 'Revenue Stream from Trado Global', 'sort_order' => 30],
            ['section' => 'revenue', 'code' => 'rev_others', 'label' => 'Revenue Stream from all others', 'sort_order' => 40],

            // Expenses
            ['section' => 'expense', 'code' => 'exp_purchases', 'label' => 'PURCHASES', 'sort_order' => 10],
            ['section' => 'expense', 'code' => 'exp_salaries', 'label' => 'Salaries', 'sort_order' => 20],
            ['section' => 'expense', 'code' => 'exp_rent', 'label' => 'Rent per month', 'sort_order' => 30],
            ['section' => 'expense', 'code' => 'exp_misc', 'label' => 'Miscellaneous Expenses/ PETTY CASH', 'sort_order' => 40],
        ];
    }

    public function monthView($bookId, $monthId)
    {
        $book = DB::table('pl_books')->where('id', $bookId)->first();
        abort_if(!$book, 404);

        $month = DB::table('pl_months')
            ->where('id', $monthId)
            ->where('book_id', $bookId) // IMPORTANT: prevents mixing
            ->first();

        abort_if(!$month, 404);

        $monthLabel = $month->label ?? Carbon::parse($month->month_date)->format('M Y');

        return view('pl.month', [
            'monthId'    => $monthId,
            'bookId'     => $bookId,
            'monthLabel' => $monthLabel,
            'bookClosed' => (bool)($book->is_closed ?? 0),
        ]);
    }

    public function monthPage($monthId)
    {
        $month = DB::table('pl_months')->where('id', $monthId)->first();
        abort_if(!$month, 404);

        $lines = DB::table('pl_lines')
            ->where('month_id', $monthId)
            ->orderBy('section')
            ->orderBy('sort_order')
            ->get();

        return view('pl.month_sheet', compact('month', 'lines'));
    }

    public function storeLine(Request $request)
    {
        $data = $request->validate([
            'month_id' => ['required', 'integer', 'exists:pl_months,id'],
            'section'  => ['required', 'in:revenue,expense'],
            'label'    => ['required', 'string', 'max:255'],
            'amount'   => ['nullable', 'numeric'],
            'remarks'  => ['nullable', 'string'],
            // optional if you send it
            'code'     => ['nullable', 'string', 'max:255'],
        ]);

        // IMPORTANT: pl_lines.code is required + unique per (month_id, code)
        $code = $data['code'] ?? ('dyn_' . Str::uuid()->toString());
        if (strlen($code) > 255) $code = substr($code, 0, 255);

        // If somehow duplicates, regenerate
        while (DB::table('pl_lines')
            ->where('month_id', $data['month_id'])
            ->where('code', $code)
            ->exists()
        ) {
            $code = 'dyn_' . Str::uuid()->toString();
            if (strlen($code) > 255) $code = substr($code, 0, 255);
        }

        $id = DB::table('pl_lines')->insertGetId([
            'month_id'    => $data['month_id'],
            'section'     => $data['section'],
            'code'        => $code,
            'label'       => $data['label'],
            'amount'      => (float)($data['amount'] ?? 0),
            'remarks'     => $data['remarks'] ?? null,
            'sort_order'  => 9999,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $line = DB::table('pl_lines')->where('id', $id)->first();

        return response()->json(['ok' => true, 'line' => $line], 201);
    }

    public function destroyLine($lineId)
    {
        $row = DB::table('pl_lines')->where('id', $lineId)->first();
        if (!$row) return response()->json(['message' => 'Not found'], 404);

        DB::table('pl_lines')->where('id', $lineId)->delete();

        return response()->json(['ok' => true]);
    }

    public function addMonths(Request $request, $bookId)
    {
        $request->validate([
            'from' => ['required', 'date_format:Y-m'],
            'to'   => ['required', 'date_format:Y-m'],
        ]);

        $book = DB::table('pl_books')->where('id', $bookId)->first();
        if (!$book) return response()->json(['message' => 'Book not found'], 404);

        $from = Carbon::createFromFormat('Y-m', $request->from)->startOfMonth();
        $to   = Carbon::createFromFormat('Y-m', $request->to)->startOfMonth();
        if ($from->gt($to)) return response()->json(['message' => 'From must be <= To'], 422);

        DB::transaction(function () use ($bookId, $book, $from, $to) {
            $cursor = $from->copy();

            while ($cursor->lte($to)) {
                $exists = DB::table('pl_months')
                    ->where('book_id', $bookId)
                    ->whereDate('month_date', $cursor->toDateString())
                    ->exists();

                if (!$exists) {
                    $monthId = DB::table('pl_months')->insertGetId([
                        'book_id' => $bookId,
                        'month_date' => $cursor->toDateString(),
                        'label' => $cursor->format('M Y'),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    foreach ($this->defaultLines() as $i => $row) {
                        DB::table('pl_lines')->insert([
                            'month_id' => $monthId,
                            'section' => $row['section'],
                            'code' => $row['code'],
                            'label' => $row['label'],
                            'amount' => 0,
                            'remarks' => null,
                            'sort_order' => $row['sort_order'] ?? ($i + 1),
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }

                $cursor->addMonth();
            }

            // update book range
            $newFrom = Carbon::parse($book->from_month)->startOfMonth()->min($from);
            $newTo   = Carbon::parse($book->to_month)->startOfMonth()->max($to);

            DB::table('pl_books')->where('id', $bookId)->update([
                'from_month' => $newFrom->toDateString(),
                'to_month' => $newTo->toDateString(),
                'updated_at' => now(),
            ]);
        });

        return response()->json(['ok' => true]);
    }

    public function closeMonth($monthId)
    {
        $m = DB::table('pl_months')->where('id', $monthId)->first();
        if (!$m) return response()->json(['message' => 'Not found'], 404);

        DB::table('pl_months')->where('id', $monthId)->update([
            'is_closed' => 1,
            'closed_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function reopenMonth($monthId)
    {
        $m = DB::table('pl_months')->where('id', $monthId)->first();
        if (!$m) return response()->json(['message' => 'Not found'], 404);

        DB::table('pl_months')->where('id', $monthId)->update([
            'is_closed' => 0,
            'closed_at' => null,
            'updated_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    public function closeBook($bookId)
    {
        DB::transaction(function () use ($bookId) {
            DB::table('pl_books')->where('id', $bookId)->update([
                'is_closed' => 1,
                'updated_at' => now(),
            ]);

            // lock all months in this book too (optional but recommended)
            DB::table('pl_months')->where('book_id', $bookId)->update([
                'is_closed' => 1,
                'updated_at' => now(),
            ]);
        });

        return response()->json(['ok' => true]);
    }

    public function reopenBook($bookId)
    {
        DB::transaction(function () use ($bookId) {
            DB::table('pl_books')->where('id', $bookId)->update([
                'is_closed' => 0,
                'updated_at' => now(),
            ]);

            // unlock all months in this book
            DB::table('pl_months')->where('book_id', $bookId)->update([
                'is_closed' => 0,
                'updated_at' => now(),
            ]);
        });

        return response()->json(['ok' => true]);
    }

    public function destroyBook($bookId)
    {
        DB::transaction(function () use ($bookId) {
            // delete lines for all months in this book
            $monthIds = DB::table('pl_months')->where('book_id', $bookId)->pluck('id');

            if ($monthIds->count()) {
                DB::table('pl_lines')->whereIn('month_id', $monthIds)->delete();
            }

            DB::table('pl_months')->where('book_id', $bookId)->delete();
            DB::table('pl_books')->where('id', $bookId)->delete();
        });

        return response()->json(['ok' => true]);
    }

    // ---------------- helpers for dashboard month summary ----------------
    private function money($v): float
    {
        return round((float)($v ?? 0), 2);
    }

    private function endsWithMonth(?string $label, string $monthLabel): bool
    {
        if (!$label) return false;
        return str_ends_with($label, '|' . $monthLabel);
    }

    private function startsWithKey(?string $label, string $prefix): bool
    {
        if (!$label) return false;
        return str_starts_with($label, $prefix);
    }

    private function sumInGroup($lines, string $code, string $title, string $monthLabel): float
    {
        $sum = 0;
        foreach ($lines as $l) {
            $lab = $l->label ?? '';
            if ($this->startsWithKey($lab, "IN|{$code}|{$title}|") && $this->endsWithMonth($lab, $monthLabel)) {
                $sum += $this->money($l->amount);
            }
        }
        return $this->money($sum);
    }

    private function fixedOutAmt($lines, string $code, string $labelText, string $monthLabel): float
    {
        $key = "OUT|{$code}|{$labelText}|{$monthLabel}";
        foreach ($lines as $l) {
            if (($l->label ?? '') === $key) return $this->money($l->amount);
        }
        return 0;
    }

    private function purchasesOutExtraSum($lines, string $monthLabel): float
    {
        $sum = 0;
        foreach ($lines as $l) {
            $lab = $l->label ?? '';
            if ($this->startsWithKey($lab, "OUT_EXTRA|") && $this->endsWithMonth($lab, $monthLabel)) {
                $sum += $this->money($l->amount);
            }
        }
        return $this->money($sum);
    }
}
