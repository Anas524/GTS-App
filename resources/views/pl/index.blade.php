<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Profit & Loss Books</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script src="https://cdn.tailwindcss.com"></script>
</head>

<body class="bg-slate-50 text-slate-900">
    <div id="plIndexRoot"
        data-store-book-url="{{ route('pl.books.store') }}"
        data-dashboard-url-tmpl="{{ route('pl.dashboard', ['book' => '__BOOK_ID__']) }}"
        data-close-book-url-tmpl="{{ route('pl.books.close', ['book' => '__BOOK_ID__']) }}"
        data-reopen-book-url-tmpl="{{ route('pl.books.reopen', ['book' => '__BOOK_ID__']) }}"
        data-delete-book-url-tmpl="{{ route('pl.books.destroy', ['book' => '__BOOK_ID__']) }}">
    </div>

    <div class="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {{-- Header --}}
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-semibold">
                    Profit & Loss Books
                </h1>
                <p class="text-sm text-slate-500">
                    GTS LOGISTICS AIR CARGO SERVICES CO. L.L.C
                </p>
            </div>
            
            {{-- Right actions --}}
            <div class="flex items-center gap-3">
                {{-- Back --}}
                <a href="{{ route('admin.dashboard') }}"
                   class="inline-flex items-center gap-2
                          h-10 px-4
                          rounded-lg
                          bg-white border border-slate-300
                          text-slate-700
                          hover:bg-slate-100
                          transition">
                    <span class="text-base leading-none">←</span>
                    <span class="text-sm font-medium">Back to Dashboard</span>
                </a>
            
                {{-- Create --}}
                <button id="plIndexCreateBtn"
                    class="inline-flex items-center
                           h-10 px-4
                           rounded-lg
                           bg-slate-900 text-white
                           hover:bg-slate-800
                           transition font-medium">
                    + Create & Open
                </button>
            </div>
        </div>

        {{-- Books --}}
        @if($books->isEmpty())
        <div class="bg-white border border-slate-200 rounded-xl p-6 text-slate-500">
            No Profit & Loss books created yet.
        </div>
        @else
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            @foreach($books as $i => $book)

            @php
            $isClosed = (bool) $book->is_closed;
            @endphp

            <div class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">

                {{-- top bar (like your screenshot) --}}
                <div class="px-5 py-4 {{ $isClosed ? 'bg-rose-200/80' : 'bg-emerald-200/80' }}">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="text-[11px] uppercase tracking-wide text-slate-600 font-semibold">
                                Book {{ $i + 1 }}
                            </div>
                            <div class="text-sm font-semibold">
                                {{ $book->title ?? 'Profit & Loss' }}
                            </div>
                            <div class="text-xs text-slate-700 mt-0.5">
                                {{ substr($book->from_month, 0, 7) }} — {{ substr($book->to_month, 0, 7) }}
                            </div>
                        </div>

                        <span class="inline-flex items-center gap-2 text-[11px] font-semibold px-3 py-1 rounded-full border
                            {{ $isClosed ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200' }}">
                            <span class="w-2 h-2 rounded-full {{ $isClosed ? 'bg-rose-500' : 'bg-emerald-500' }}"></span>
                            {{ $isClosed ? 'CLOSED' : 'OPEN' }}
                        </span>
                    </div>
                </div>

                {{-- body --}}
                <div class="p-5 space-y-4">

                    {{-- actions --}}
                    <div class="flex items-center justify-end gap-2">
                        <a href="{{ route('pl.dashboard', $book->id) }}"
                            class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800">
                            Open screen
                        </a>

                        @if($isClosed)
                        <button type="button"
                            class="plIndexReopen px-4 py-2 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700"
                            data-book-id="{{ $book->id }}">
                            Reopen
                        </button>
                        @else
                        <button type="button"
                            class="plIndexClose px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                            data-book-id="{{ $book->id }}">
                            Close
                        </button>
                        @endif

                        {{-- 3 dots menu --}}
                        <div class="relative">
                            <button type="button"
                                class="plKebabBtn w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50"
                                data-menu="plMenu-{{ $book->id }}">
                                ⋯
                            </button>

                            <div id="plMenu-{{ $book->id }}"
                                class="plKebabMenu hidden absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg z-50 overflow-hidden">
                                <button type="button"
                                    class="plIndexDelete w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                                    data-book-id="{{ $book->id }}">
                                    Delete…
                                </button>
                            </div>
                        </div>
                    </div>

                    {{-- mini stats placeholders (optional like screenshot) --}}
                    <div class="grid grid-cols-2 gap-3">
                        <div class="rounded-xl border border-slate-200 bg-white p-3">
                            <div class="text-xs text-slate-500">Overall Profit/Loss</div>
                            <div class="mt-1 font-semibold {{ ($book->overall_profit ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600' }}">
                                AED {{ number_format($book->overall_profit ?? 0, 2) }}
                            </div>
                        </div>
                        <div class="rounded-xl border border-slate-200 bg-white p-3">
                            <div class="text-xs text-slate-500">Months</div>
                            <div class="mt-1 font-semibold text-slate-900">
                                {{ $book->months_count ?? 0 }}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            @endforeach
        </div>
        @endif
    </div>

    {{-- Create Book Modal --}}
    <div id="plIndexModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
        <div class="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold">Create Profit & Loss Book</h3>
                <button id="plIndexModalClose" class="text-slate-500 hover:text-slate-700 text-xl">&times;</button>
            </div>

            <div class="space-y-3">
                <div>
                    <label class="block text-sm font-medium mb-1">Book Name</label>
                    <input id="plIndexName" type="text" class="w-full px-3 py-2 rounded border" placeholder="e.g., P&L 2025" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-sm font-medium mb-1">From</label>
                        <input id="plIndexFrom" type="month" class="w-full px-3 py-2 rounded border" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium mb-1">To</label>
                        <input id="plIndexTo" type="month" class="w-full px-3 py-2 rounded border" />
                    </div>
                </div>
            </div>

            <div class="mt-5 flex justify-end gap-2">
                <button id="plIndexCancel" class="px-4 py-2 rounded border">Cancel</button>
                <button id="plIndexCreateGo" class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
                    Create & Open
                </button>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="{{ asset('js/profitloss.js') }}"></script>
</body>

</html>