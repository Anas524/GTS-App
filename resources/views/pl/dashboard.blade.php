<!doctype html>
<html lang="en">

<head>
    <meta charset="utf-8">
    <title>Profit & Loss</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        #plGridWrap {
            font-size: 11px;
            overflow: hidden;
        }

        #plGridScroll {
            overflow: auto;
            scrollbar-width: thin;
            -webkit-overflow-scrolling: touch;
            cursor: grab;
            user-select: none;
            -webkit-user-select: none;
        }

        #plGridScroll.dragging {
            cursor: grabbing;
        }

        /* disable text selection inside grid */
        #plGridScroll * {
            user-select: none;
            -webkit-user-select: none;
        }

        #plGridWrap .pl-left {
            position: sticky;
            left: 0;
            z-index: 5;
            background: #fff;
        }

        #plRightMonths {
            font-size: 11px;
        }

        /* month header text */
        #plRightMonths .font-semibold {
            font-size: 11px;
        }

        #plRightMonths .text-sm:not(.text-emerald-900):not(.text-rose-900):not(.text-amber-900) {
            color: #2563eb;
            /* blue-600 */
            font-weight: 600;
            font-size: 11px !important;
        }

        #plRightMonths .text-emerald-900 {
            color: #065f46 !important;
            font-weight: 650;
        }

        #plRightMonths .text-rose-900 {
            color: #9f1239 !important;
            font-weight: 650;
        }

        #plRightMonths .text-amber-900 {
            color: #92400e !important;
            font-weight: 650;
        }

        #plRightMonths .text-slate-900,
        #plRightMonths .text-gray-900 {
            color: #111827 !important;
            font-weight: 700;
        }

        /* Month header text → black */
        #plRightMonths .pl-month-label {
            color: #111827 !important;
            /* slate-900 */
            font-weight: 600;
        }

        :root {
            --plRowH: 34px;
        }

        #plGridScroll::-webkit-scrollbar {
            height: 8px;
        }

        #plGridScroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
        }

        #plGridScroll::-webkit-scrollbar-track {
            background: #f8fafc;
        }

        #plMonthTabs button {
            width: auto !important;
            height: auto !important;
            padding: 6px 14px !important;
            border-radius: 9999px !important;
            white-space: nowrap !important;
        }
    </style>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
</head>

<body class="bg-gray-50 text-gray-800">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        <div id="plBookClosedBar" class="hidden mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This book is <b>CLOSED</b>. Reopen to make changes.
        </div>

        {{-- top header --}}
        <div class="flex items-center justify-between gap-3">
            <div>
                <h1 class="text-2xl font-semibold">Profit & Loss</h1>
                <div class="text-sm text-gray-500">GTS LOGISTICS AIR CARGO SERVICES CO. L.L.C</div>
            </div>

            <div class="flex items-center gap-2">
                <a href="{{ route('pl.index') }}"
                    class="px-4 py-2 rounded-lg border bg-white text-gray-700 hover:bg-gray-50">
                    ← Back
                </a>

                <button id="plCreateBtn" class="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-black">
                    + Add Months
                </button>
            </div>
        </div>

        {{-- summary card --}}
        <div class="bg-white border rounded-2xl shadow-sm p-5">
            <div class="flex items-start justify-between gap-3 flex-wrap">
                <div>
                    <div class="text-lg font-semibold">Profit & Loss</div>
                    <div id="plLabel" class="text-sm text-gray-500">
                        {{ $plBookId ? 'Loading…' : 'No P&L sheet created' }}
                    </div>
                </div>

                <div class="px-4 py-2 rounded-xl border bg-gray-50">
                    <div class="text-xs text-gray-500">PROFIT/LOSS</div>
                    <div id="plOverall" class="text-lg font-semibold">—</div>
                </div>
            </div>

            {{-- months tabs --}}
            <div id="plMonthsWrap" class="mt-6 hidden">
                <div class="flex items-center justify-between flex-wrap gap-4">
                    <div class="text-sm font-semibold text-gray-700">
                        Months
                    </div>
                    <div class="text-xs text-gray-500">
                        Open a month to edit values
                    </div>
                </div>

                <div
                    id="plMonthTabs"
                    class="mt-4 flex flex-wrap gap-2 overflow-x-auto pb-3"></div>
            </div>
        </div>

        {{-- Gross Profit Chart (separate card) --}}
        <div id="plGrossChartWrap" class="bg-white border rounded-2xl shadow-sm p-5 hidden">
            <div class="flex items-center justify-between gap-3">
                <div>
                    <div class="text-lg font-semibold">Gross Profit Hike</div>
                    <div class="text-xs text-gray-500">Month profit + running trend</div>
                </div>
            </div>

            <div class="mt-4 h-[260px]">
                <canvas id="plGrossProfitChart"></canvas>
            </div>
        </div>

        {{-- Excel-like grid --}}
        <div id="plGridWrap" class="bg-white border rounded-2xl shadow-sm overflow-hidden hidden">
            <div class="flex">
                {{-- LEFT sticky labels --}}
                <div class="pl-left w-[320px] shrink-0 border-r bg-white sticky left-0 z-10">
                    <div class="p-3 border-b font-semibold text-sm">Months</div>

                    <div class="p-3 text-xs font-semibold text-emerald-700">REVENUE</div>
                    <div id="plLeftRevenue" class="px-3 pb-3 space-y-2"></div>

                    <div class="px-3 pt-2 border-t text-xs font-semibold text-rose-700">EXPENSES</div>
                    <div id="plLeftExpense" class="px-3 pb-3 space-y-2"></div>
                </div>

                {{-- RIGHT months scroll --}}
                <div id="plGridScroll" class="pl-grid-scroll flex-1 overflow-auto">
                    <div id="plRightMonths" class="min-w-[900px]"></div>
                </div>
            </div>
        </div>

        {{-- root for JS --}}
        <div id="plRoot"
            data-book-id="{{ $plBookId }}"
            data-month-view-url-tmpl="{{ route('pl.month.view', ['bookId' => $plBookId, 'monthId' => '__MONTH_ID__']) }}"
            data-store-book-url="{{ route('pl.books.store') }}"
            data-add-months-url-tmpl="{{ route('pl.books.addMonths', ['book' => 0]) }}"
            data-book-data-url-tmpl="{{ route('pl.books.data', ['book' => 0]) }}"
            data-close-book-url-tmpl="{{ route('pl.books.close', ['book' => 0]) }}"
            data-reopen-book-url-tmpl="{{ route('pl.books.reopen', ['book' => 0]) }}">
        </div>
    </div>

    {{-- create modal (same as yours) --}}
    <div id="plModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">Create Profit & Loss</h3>
                <button id="plClose" class="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-sm font-medium mb-1">From</label>
                    <input id="plFrom" type="month" class="w-full px-3 py-2 rounded border" />
                </div>
                <div>
                    <label class="block text-sm font-medium mb-1">To</label>
                    <input id="plTo" type="month" class="w-full px-3 py-2 rounded border" />
                </div>
            </div>

            <div class="mt-5 flex justify-end gap-2">
                <button id="plCancel" class="px-4 py-2 rounded border">Cancel</button>
                <button id="plGenerate" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                    Generate
                </button>
            </div>
        </div>
    </div>

    <script src="{{ asset('js/profitloss.js') }}"></script>
</body>

</html>