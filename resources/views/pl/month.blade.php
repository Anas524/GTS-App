<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <title>P&L Month</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Scroll inside card (so sticky works) */
        .pl-card-scroll {
            max-height: 520px;
            /* adjust as you like */
            overflow: auto;
            padding-right: 2px;
            scrollbar-width: thin;
            -webkit-overflow-scrolling: touch;
        }

        /* Sticky header inside each card */
        .pl-sticky-head {
            position: sticky;
            top: 0;
            z-index: 20;
            background: white;
            padding: 10px 0;
            border-bottom: 1px solid rgba(226, 232, 240, .9);
        }

        .pl-sticky-head {
            box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);
        }
    </style>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>

<body class="bg-gray-50 text-gray-800">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <div id="plBookClosedBar"
            class="hidden mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This book is <b>CLOSED</b>. Reopen it from the P&L Dashboard to make changes.
        </div>

        <div class="flex items-center justify-between gap-3">
            <div>
                <h1 class="text-xl sm:text-2xl font-semibold">Profit & Loss</h1>
                <div id="plSheetSub" class="text-sm text-gray-500">—</div>
            </div>

            <a href="{{ route('pl.dashboard', ['book' => $bookId]) }}"
                class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                ← Back to P&L Dashboard
            </a>
        </div>

        <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-semibold text-gray-700">
                {{ $monthLabel }}
            </div>

            <div class="flex gap-2">
                {{-- CLOSE MONTH (only show when OPEN via JS) --}}
                <button
                    id="plCloseMonth"
                    class="hidden px-4 py-2 rounded-lg bg-red-600 text-white text-sm hover:bg-red-700">
                    Close Month
                </button>
            </div>
        </div>

        <div id="plMonthRoot"
            data-month-id="{{ $monthId }}"
            data-book-id="{{ $bookId }}"
            data-book-closed="{{ $bookClosed ? '1' : '0' }}"
            data-month-data-url="{{ route('pl.months.data', ['month' => $monthId]) }}"
            data-line-create-url="{{ route('pl.lines.store') }}"
            data-line-update-url-tmpl="{{ route('pl.lines.update', ['line' => 'LINE_ID']) }}"
            data-line-delete-url-tmpl="{{ route('pl.lines.destroy', ['line' => 'LINE_ID']) }}">
        </div>

        {{-- SUMMARY CARD --}}
        <div class="bg-white border rounded-2xl shadow-sm p-5">
            <div class="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <div id="plSheetTitle" class="text-lg font-semibold">—</div>
                    <div class="text-sm text-gray-500">Edit Amount + Remarks, then Save (auto shows only when changed)</div>
                </div>
                <div class="px-4 py-2 rounded-xl border bg-gray-50">
                    <div class="text-xs text-gray-500">MONTH PROFIT</div>
                    <div id="plMonthProfit" class="text-lg font-semibold">—</div>
                </div>
            </div>
        </div>

        {{-- CASH OUT --}}
        <div class="bg-white border rounded-2xl shadow-sm p-5">
            <div class="pl-sticky-head flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <div id="cashOutTitle" class="text-sm font-semibold text-rose-700">Cash Out</div>
                    <div class="text-xs text-gray-500">Add rows if needed. Mandatory items A–D always included.</div>
                </div>

                <div class="flex items-center gap-2">
                    <button id="plSaveAllOut"
                        class="hidden px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700">
                        Save Cash Out
                    </button>

                    <button id="plAddCashOutRow"
                        class="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black text-sm">
                        + Add Row
                    </button>
                </div>
            </div>

            <div class="mt-3 overflow-auto border rounded-xl">
                <table class="min-w-[1100px] w-full border-collapse">
                    <thead class="bg-rose-50">
                        <tr>
                            <th class="p-2 border text-left text-xs font-semibold w-[80px]">S.no</th>
                            <th class="p-2 border text-left text-xs font-semibold w-[420px]">Description</th>
                            <th class="p-2 border text-center text-xs font-semibold w-[180px]">Amount</th>
                            <th class="p-2 border text-left text-xs font-semibold w-[380px]">Remarks</th>
                            <th class="p-2 border text-center text-xs font-semibold w-[140px]">Actions</th>
                        </tr>
                    </thead>

                    <tbody id="plCashOutBody"></tbody>

                    <tfoot class="bg-rose-50">
                        <tr>
                            <td class="p-2 border font-semibold text-sm" colspan="2" id="plCashOutTotalLabel">TOTAL CASH OUT</td>
                            <td class="p-2 border font-semibold text-sm text-center" id="plCashOutTotal">—</td>
                            <td class="p-2 border" colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        {{-- CASH IN --}}
        <div class="bg-white border rounded-2xl shadow-sm p-5">
            <div class="pl-sticky-head flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <div id="cashInTitle" class="text-sm font-semibold text-emerald-700">Cash In</div>
                    <div class="text-xs text-gray-500">A–D sections, editable rows with delete support.</div>
                </div>

                <div class="flex items-center gap-2">
                    <button id="plSaveAllIn"
                        class="hidden px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700">
                        Save Cash In
                    </button>

                    <button id="plAddCashInRow"
                        class="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black text-sm">
                        + Add Row
                    </button>
                </div>
            </div>

            <div class="mt-3 overflow-auto border rounded-xl">
                <table class="min-w-[1100px] w-full border-collapse">
                    <thead class="bg-emerald-50">
                        <tr>
                            <th class="p-2 border text-left text-xs font-semibold w-[80px]">S.no</th>
                            <th class="p-2 border text-left text-xs font-semibold w-[420px]">Description</th>
                            <th class="p-2 border text-center text-xs font-semibold w-[180px]">Amount</th>
                            <th class="p-2 border text-left text-xs font-semibold w-[380px]">Remarks</th>
                            <th class="p-2 border text-center text-xs font-semibold w-[140px]">Actions</th>
                        </tr>
                    </thead>

                    <tbody id="plCashInBody"></tbody>

                    <tfoot class="bg-emerald-50">
                        <tr>
                            <td class="p-2 border font-semibold text-sm" colspan="2" id="plCashInTotalLabel">TOTAL CASH IN</td>
                            <td class="p-2 border font-semibold text-sm text-center" id="plCashInTotal">—</td>
                            <td class="p-2 border" colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

    </div>

    {{-- ADD CASH IN ROW MODAL --}}
    <div id="plCashInModal" class="hidden fixed inset-0 z-50 items-center justify-center bg-black/40 p-4">
        <div class="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200">
            <div class="flex items-center justify-between px-5 py-4 border-b">
                <h3 class="text-lg font-semibold">Add Cash In Row</h3>
                <button type="button" id="plCashInModalClose" class="text-slate-500 hover:text-slate-800 text-xl leading-none">
                    &times;
                </button>
            </div>

            <div class="p-5 space-y-4">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Group</label>
                    <select id="plCashInGroup" class="w-full border rounded-lg px-3 py-2 text-sm">
                        <option value="A">A - GLOBAL TRADE SERVICES</option>
                        <option value="B">B - BUY LUXURY GLOBAL</option>
                        <option value="C">C - TRADO GLOBAL</option>
                        <option value="D" selected>D - OTHERS</option>
                    </select>
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <input id="plCashInDesc" type="text" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Enter description">
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Amount</label>
                    <input id="plCashInAmt" type="number" step="0.01" min="0" value="0" class="w-full border rounded-lg px-3 py-2 text-sm">
                </div>

                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                    <textarea id="plCashInRemarks" rows="4" class="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Enter remarks"></textarea>
                </div>
            </div>

            <div class="flex items-center justify-end gap-2 px-5 py-4 border-t bg-slate-50 rounded-b-2xl">
                <button type="button" id="plCashInCancel" class="px-4 py-2 rounded-lg border bg-white text-slate-700 hover:bg-slate-50">
                    Cancel
                </button>
                <button type="button" id="plCashInCreate" class="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-black">
                    Create Row
                </button>
            </div>
        </div>
    </div>

    <script src="{{ asset('js/profitloss.js?v=2') }}"></script>
</body>

</html>