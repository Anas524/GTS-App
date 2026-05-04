@php
    // Global flag: available to all sections/partials that extend this layout
    $isClosed = isset($cycle) && ($cycle->status ?? null) === 'closed';
@endphp

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GTS Investment Sheets</title>
    <link rel="icon" href="{{ asset('images/investment/GTS-web-logo.png') }}">
    <!-- Fonts & Icons -->
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <!-- Tailwind CDN (legacy usage retained) -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css">
    <script src="https://cdn.tailwindcss.com"></script>
    
    <link rel="stylesheet" href="{{ asset('css/tailwind.css?v=7') }}">
    <!-- Tippy -->
    <link rel="stylesheet" href="https://unpkg.com/tippy.js@6/themes/light.css" />
    <script src="https://unpkg.com/@popperjs/core@2"></script>
    <script src="https://unpkg.com/tippy.js@6"></script>
    <!-- Core JS libs -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script id="apexcharts-cdn" src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
    
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="api-investment-base" content="{{ url('/investment') }}">
    
    @php
        $activeMetaId = isset($cycle) ? $cycle->id : (session('active_cycle_id') ?? request('cycle_id'));
    @endphp
    <meta name="active-cycle-id" content="{{ $activeMetaId }}">
</head>

<body class="bg-gray-100 text-gray-800 cursor-default">
    
    {{-- Top red banner when CLOSED --}}
    @if(isset($cycle) && $cycle->status === 'closed')
    <div id="cycle-closed-banner"
        class="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-sm text-center py-2">
        This set is <strong>CLOSED</strong>. Reopen or create a new set to make changes.
    </div>
    <style> body { padding-top: 40px; } </style>
    <script>
        document.documentElement.classList.add('is-cycle-closed');
        window.__SET_IS_CLOSED = true;
    </script>
    @else
    <script>
        window.__SET_IS_CLOSED = false;
    </script>
    @endif

    <!-- HEADER -->
    <header class="bg-white shadow">
    <div class="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-0 items-center">
        <!-- Left: icon + title + status -->
        <div class="flex items-center space-x-2">
        <i id="headerIcon" class="bi header-icon" aria-hidden="true"></i>
        <h1 id="headerTitle" class="header-title">GTS Investment</h1>

        @isset($cycle)
            <span class="status-badge
                        {{ $cycle->status === 'closed' ? 'status-closed' : 'status-open' }}">
            {{ strtoupper($cycle->status) }}
            </span>
        @endisset
        </div>

        <!-- Center: Dashboard button -->
        <div class="flex justify-center">
        <a href="{{ route('investment.cycles.index') }}"
            class="btn-dashboard allow-when-closed">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            <span>Dashboard</span>
        </a>
        </div>

        <!-- Right: set info + logo -->
        <div class="flex items-center justify-end gap-3">
        @isset($cycle)
            <div class="set-meta">
            {{ $cycle->name ?? 'Set' }}
            @if($cycle->date_from || $cycle->date_to)
                • {{ optional($cycle->date_from)->toDateString() ?? '—' }}
                – {{ optional($cycle->date_to)->toDateString() ?? '—' }}
            @endif
            </div>
        @endisset

        <img id="headerLogo" src="{{ asset('images/investment/gts-logo.png') }}" alt="GTS" class="header-logo">
        </div>
    </div>
    </header>

    <!-- MAIN -->
    <main class="container mx-auto p-3 md:p-4 pb-28 md:pb-6">
        @yield('content')
    </main>

    <!-- Customer Sheet include container -->
    <div id="sheetContainer" class="max-w-screen-xl mx-auto p-4 space-y-6">
        @if(isset($sheetName) && isset($sheetId))
        @include('sheets.customer_sheet', ['sheetId' => $sheetId, 'sheetName' => $sheetName])
        @endif
    </div>

    <!-- Bottom Sheet Tabs (Global) -->
    <div class="fixed bottom-0 inset-x-0 bg-white shadow border-t z-50">
        <div class="tabs-scroll flex overflow-x-auto whitespace-nowrap no-scrollbar gap-1 px-2 py-2 md:justify-center">
            <button class="sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100 active" data-sheet="summary">Summary Sheet</button>
            <button class="sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100" data-sheet="beneficiary">Beneficiary Sheet</button>
            <button class="sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100" data-sheet="gts-material">GTS Materials</button>
            <button class="sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100" data-sheet="gts-investment">GTS Investments</button>
            <button class="sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100" data-sheet="us">US Client Payment</button>
            <button class="sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100" data-sheet="sq">SQ Sheet</button>
            <button class="sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100" data-sheet="local">Local Sales</button>
    
            <!-- Dynamic Customer Sheets -->
            <span id="customerTabsContainer" class="relative"></span>
        </div>
    </div>
    
    <!-- makes the update URL available even if inline scripts are blocked -->
    <div id="customer-sheet-root"
        data-update-url="{{ route('investment.customer.entry.update') }}"
        hidden>
    </div>

    <!-- URL helpers + endpoints (MUST be before external JS) -->
    <script>
      // ----- base prefix from meta -----
      window.investmentBase =
        document.querySelector('meta[name="api-investment-base"]')?.content || '/investment';
    
      // ----- idempotent: never produces /investment/investment/... -----
      window.investmentUrl = function (path = '') {
        const s = String(path || '');
    
        // 1) already absolute URL? leave it
        if (/^https?:\/\//i.test(s)) return s;
    
        // 2) already starts with /investment ? return as-is (ensure leading slash)
        if (/^\/?investment\/?/i.test(s)) {
          return s.startsWith('/') ? s : '/' + s;
        }
    
        // 3) otherwise, prefix once
        const base = String(window.investmentBase || '/investment').replace(/\/+$/, '');
        const p = s.replace(/^\/+/, '');
        return `${base}/${p}`;
      };
    
      // ----- robust withCycle: works for absolute or relative paths -----
      window.withCycle = (function () {
        function attach(u, id) {
          if (!id) return u.pathname + u.search;
          if (!u.searchParams.has('cycle_id')) u.searchParams.set('cycle_id', String(id));
          return u.pathname + u.search;
        }
        return function (input) {
          const id = (window.cycle && window.cycle.id) || window.activeCycleId || 0;
          try {
            if (/^https?:\/\//i.test(input)) {
              const u = new URL(input, location.origin);
              return attach(u, id);
            } else {
              const p = (input || '').startsWith('/') ? input : '/' + (input || '');
              const u = new URL(p, location.origin);
              return attach(u, id);
            }
          } catch {
            return input;
          }
        };
      })();
    
      // ----- Centralized endpoints built with the helpers above -----
      window.INV_API = {
        // Summary (Cash In)
        rows:    investmentUrl('summary/customer-sheets/rows'),
        us:      investmentUrl('summary/us/total'),
        sq:      investmentUrl('summary/sq/total'),
        local:   investmentUrl('summary/local-sales/total'),
    
        // Cash Out (KPIs)
        matTot:  investmentUrl('gts-materials/total'),
        invTot:  investmentUrl('gts-investments/total'),
    
        // Investments: provide both possibilities
        investmentsBase:      'investments',       // REST-y (new)
        gtsInvestmentsBase:   'gts-investments',   // legacy (prod)
        investmentsIndex:     investmentUrl('investments'), // (kept but not relied on)
        
        // Customer Sheet (use with /:id)
        custLoadBase: investmentUrl('customer-sheet/load'),   // + '/:id'
        ledgerBase:   investmentUrl('customer-sheet'),        // + '/:id/loan-ledger'
        sectionBase:  investmentUrl('customer-sheet/section') // + '/:id'
        
      };
    </script>
        
    <!-- NEW: Expose activeCycleId globally -->
    <script>
      (function () {
        var meta = document.querySelector('meta[name="active-cycle-id"]');
        var fromMeta = meta && meta.content ? Number(meta.content) : 0;
        var fromQS = Number(new URLSearchParams(location.search).get('cycle_id') || 0);
        window.activeCycleId = fromMeta || fromQS || 0;
      })();
    </script>

    <script type="application/json" id="cycle-json">
    {!! json_encode(
        isset($cycle) ? [
            'id'        => $cycle->id ?? null,
            'name'      => $cycle->name ?? null,
            'status'    => $cycle->status ?? null,
            'date_from' => optional($cycle->date_from)->toDateString(),
            'date_to'   => optional($cycle->date_to)->toDateString(),
        ] : null,
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    ) !!}
    </script>

    @isset($cycle)
      <!-- NEW: withCycle(), ensureOpenOrToast(), and closed lock -->
      <script>
        (function () {
          // read the payload
          var el = document.getElementById('cycle-json');
          try {
            window.cycle = JSON.parse(el.textContent || 'null');
          } catch (_) { window.cycle = null; }

          if (window.cycle && window.cycle.status === 'closed') {
            document.documentElement.classList.add('is-cycle-closed');
          }

          // block writes if closed
          window.ensureOpenOrToast = function () {
            if (window.cycle && window.cycle.status === 'closed') {
              alert('This set is closed. Reopen or create a new set.');
              return false;
            }
            return true;
          };

          // global 403 toast on AJAX when closed
          $(function () {
            if (window.cycle && window.cycle.status === 'closed') {
              $('[data-write]').attr('aria-disabled', 'true');

              $('.submit-investment-btn, .invest-save-changes-btn, .update-invest-btn, .delete-investment-btn, #saveMurabahaDateBtn')
                .attr('data-write', '');
              $('#attachmentUploadForm button[type=submit], #attachmentUploadForm input[type=file]')
                .attr('data-write', '');

              $(document).ajaxError(function(_e, xhr) {
                if (xhr && xhr.status === 403) {
                  alert('This set is closed. Reopen or create a new set to make changes.');
                }
              });
            }
          });
        })();
      </script>
    @endisset

    <!-- NEW: Kick totals refresh once page loads -->
    <script>
      window.addEventListener('load', function () {
        if (window.refreshAllTotals) window.refreshAllTotals();
      });
    </script>
    
    {{-- CustomerSheets bootstrap (unchanged, just made robust) --}}
    <script type="application/json" id="customer-sheets-json">
        @json($customerSheetsForJs ?? [])
    </script>
    <script>
      (function () {
        var el = document.getElementById('customer-sheets-json');
        try { window.customerSheetsFromServer = JSON.parse(el.textContent || '[]'); }
        catch (_) { window.customerSheetsFromServer = []; }
      })();

      document.addEventListener('DOMContentLoaded', function () {
        var list = window.customerSheetsFromServer || [];
        if (!Array.isArray(list) || list.length === 0) return;
        list.forEach(s => addCustomerSheetUI({ id: s.id, name: s.name }));
      });
    </script>

    <script>
        window.routes = window.routes || {};
        window.routes.loanOutstanding = "{{ route('investment.summary.customerSheets.loans') }}";
    </script>
    
    <script>
      // Build absolute URL once, then append cycle_id
      window.api = function (path) {
        var abs = (typeof window.investmentUrl === 'function') ? window.investmentUrl(path) : path;
        return (typeof window.withCycle === 'function') ? window.withCycle(abs) : abs;
      };
    </script>
    
    <script>
      window.ASSETS = {
        gtsLogo: "{{ asset('images/investment/GTS-web-logo.png') }}",
        customerLogo: "{{ asset('images/investment/customer-sheet-logo.png') }}"
      };
    </script>
    
    <script>
        // Wrap any large tables/sections so they scroll horizontally on phones
        document.addEventListener('DOMContentLoaded', function() {
            // Tables: add a wrapper div.table-wrap if not present
            document.querySelectorAll('table').forEach(function(tbl) {
                if (!tbl.closest('.table-wrap')) {
                    const wrap = document.createElement('div');
                    wrap.className = 'table-wrap';
                    tbl.parentNode.insertBefore(wrap, tbl);
                    wrap.appendChild(tbl);
                }
            });

            // Any manual wide blocks you mark as .responsive-h-target
            document.querySelectorAll('.responsive-h-target').forEach(function(el) {
                if (!el.closest('.responsive-h-scroll')) {
                    const wrap = document.createElement('div');
                    wrap.className = 'responsive-h-scroll';
                    el.parentNode.insertBefore(wrap, el);
                    wrap.appendChild(el);
                }
            });
        });
    </script>
    
    <!-- SCRIPTS -->
    <script src="{{ asset('/js/request-utils.js?v=3') }}"></script>
    @isset($cycle)
        <script src="{{ asset('js/cycle-glue.js?v=3') }}"></script>
        <script src="{{ asset('js/gts-totals.js?v=3') }}"></script>
    @endisset
    
    <script>
      window.ASSETS = {
        customerSheetIcon: "{{ asset('images/investment/customer-sheet-logo.png') }}",
        defaultIcon: "{{ asset('images/investment/GTS-web-logo.png') }}"
      };
      // optional: version for cache-busting
      window.APP_VERSION = "{{ config('app.asset_version', '1') }}";
    </script>
    <script src="{{ asset('js/sheets.js?v=77') }}"></script>
    <script src="{{ asset('js/dynamic.js?v=52') }}"></script>
    <script src="{{ asset('js/customer_sheet.js?v=42') }}"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function () {
          const sheets = @json($customerSheets ?? []);
          if (typeof window.addCustomerSheetUI === 'function') {
            sheets.forEach(s => window.addCustomerSheetUI({ id: s.id, name: s.name }));
          }
        });
    </script>
    <script src="{{ asset('js/html2pdf.bundle.min.js') }}"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
    @yield('scripts')

    @hasSection('customerSheets')
        @yield('customerSheets')
    @endif
    <script>
    (function () {
      // per-cycle storage key
      const cycleId =
        window.activeCycleId ||
        document.querySelector('meta[name="active-cycle-id"]')?.content ||
        'global';
      const TAB_KEY = `gtsActiveTab:${cycleId}`;
    
      // helpers
      const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
      function showPanel(name) {
        // hide all panels whose id starts with "sheet-"
        $$('[id^="sheet-"]').forEach(el => el.classList.add('hidden'));
        const panel = document.getElementById(`sheet-${name}`);
        if (panel) panel.classList.remove('hidden');
    
        // set active state on bottom tabs
        $$('.sheet-tab').forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.sheet-tab[data-sheet="${name}"]`);
        if (btn) btn.classList.add('active');
      }
    
      function activate(name) {
        if (!name) return;
        localStorage.setItem(TAB_KEY, name);
    
        // keep tab in URL so reloads/deep-links preserve it
        const u = new URL(location.href);
        u.searchParams.set('tab', name);
        history.replaceState(null, '', u.toString());
    
        showPanel(name);
      }
    
      // initial tab:
      // 1) ?tab= from URL
      // 2) saved per-cycle tab
      // 3) default to 'summary'
      const urlTab = new URLSearchParams(location.search).get('tab');
      const savedTab = localStorage.getItem(TAB_KEY);
      const initial = urlTab || savedTab || 'summary';
      activate(initial);
    
      // clicks on bottom tabs
      $$('.sheet-tab').forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          const name = btn.dataset.sheet;
          if (name) activate(name);
        });
      });
    
      // optional: allow hash-only deep links like #gts-investment
      if (!urlTab && location.hash) {
        const hash = location.hash.slice(1);
        if (hash && document.getElementById(`sheet-${hash}`)) activate(hash);
      }
    })();
    </script>
</body>

</html>