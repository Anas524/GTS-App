<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="csrf-token" content="{{ csrf_token() }}">

  <title>@yield('title', 'GTS Tools')</title>
  <link rel="stylesheet" href="{{ asset('css/ft.css') }}">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet">

  {{-- Tailwind (simple CDN for new project) --}}
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
  
</head>
<body class="bg-slate-50 text-slate-900">
    {{-- Simple top bar --}}
  <header class="bg-white border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-2 py-2 flex items-center justify-between gap-4">
    
        {{-- Left: Back --}}
        <a href="{{ route('admin.dashboard') }}"
           class="inline-flex items-center gap-2 h-10 px-4 rounded-lg
                  bg-white border border-slate-300 text-slate-700
                  hover:bg-slate-100 transition">
          <span class="text-base leading-none">←</span>
          <span class="text-sm font-medium">Back to Dashboard</span>
        </a>
    
        {{-- Right: Context --}}
        <div class="flex items-center gap-2 text-sm">
          <span class="font-medium text-slate-700">GTS • Tools</span>
          <span class="text-slate-400">/</span>
          <span class="text-slate-500">FedEx Tracker</span>
        </div>
    
      </div>
    </header>

  <main>
    <div class="max-w-7xl mx-auto px-4 py-8 space-y-6" id="fedexRoot"
      data-invoices-url="{{ route('fedex.invoices.list') }}"
      data-store-invoice-url="{{ route('fedex.invoices.store') }}"
      data-update-invoice-url-tmpl="{{ route('fedex.invoices.update', ['invoice' => '__ID__']) }}"
      data-delete-invoice-url-tmpl="{{ route('fedex.invoices.delete', ['invoice' => '__ID__']) }}"
      data-shipments-url-tmpl="{{ route('fedex.shipments.list', ['invoice' => '__ID__']) }}"
    
      data-store-shipment-url-tmpl="{{ route('fedex.shipments.store', ['invoice' => '__ID__']) }}"
      data-update-shipment-url-tmpl="{{ route('fedex.shipments.update', ['shipment' => '__ID__']) }}"
      data-delete-shipment-url-tmpl="{{ route('fedex.shipments.delete', ['shipment' => '__ID__']) }}"
      data-import-shipments-url-tmpl="{{ route('fedex.shipments.import', ['invoice' => '__ID__']) }}"
      data-import-invoices-url="{{ route('fedex.invoices.import') }}">
    
      {{-- Header --}}
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
            FEDEX TRACKER
          </h1>
          <p class="text-sm text-slate-500">
            Invoices summary + shipment tracker with auto amount due sync.
          </p>
        </div>
    
        <button id="fxOpenCreateInvoice"
          class="px-4 py-2 rounded-xl text-white shadow-sm
               bg-gradient-to-r from-indigo-600 to-purple-600
               hover:from-indigo-700 hover:to-purple-700
               focus:outline-none focus:ring-2 focus:ring-indigo-200">
          <span class="inline-flex items-center gap-2">
            <i class="bi bi-plus-lg"></i>
            New Invoice
          </span>
        </button>
      </div>
    
      {{-- Tabs --}}
      <div class="flex gap-2 border-b border-slate-200">
        <button class="fxTab px-4 py-2 -mb-px rounded-t-xl
                     border-b-2 border-indigo-600 text-slate-900 font-semibold
                     bg-gradient-to-b from-indigo-50 to-white"
          data-tab="summary">
          FEDEX INVOICES SUMMARY
        </button>
    
        <button class="fxTab px-4 py-2 -mb-px rounded-t-xl
                     border-b-2 border-transparent text-slate-500
                     hover:text-slate-900 hover:bg-slate-50"
          data-tab="tracker">
          FEDEX SHIPMENT TRACKER
        </button>
      </div>
    
      {{-- SUMMARY --}}
      <section id="fxTab-summary" class="space-y-4">
        {{-- Filters --}}
        <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm ring-1 ring-black/5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div class="flex flex-col sm:flex-row gap-3">
            <input id="fxSearch" type="text" placeholder="Search invoice #, remarks, payment ref..."
              class="w-full sm:w-80 px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" />
    
            <div class="relative w-44" id="fxStatusDropdown">
              <button
                type="button"
                id="fxStatusBtn"
                class="w-full flex items-center justify-between gap-2
               pl-10 pr-10 py-2.5 rounded-xl
               bg-white text-sm text-slate-700
               border border-slate-200 shadow-sm
               hover:border-indigo-300 transition
               focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300">
    
                <!-- left icon -->
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500">
                  <i class="bi bi-funnel-fill text-sm"></i>
                </span>
    
                <span id="fxStatusLabel" class="truncate">All Status</span>
    
                <!-- arrow -->
                <span class="text-slate-400">
                  <i class="bi bi-chevron-down text-xs"></i>
                </span>
              </button>
    
              <!-- Dropdown menu -->
              <div
                id="fxStatusMenu"
                class="absolute z-30 mt-2 w-full hidden
               rounded-xl bg-white border border-slate-200 shadow-xl overflow-hidden">
    
                <button type="button" class="fxStatusOpt w-full text-left px-4 py-2.5 text-sm
                                             hover:bg-indigo-50 transition" data-value="">
                  <span class="font-medium text-slate-900">All Status</span>
                </button>
    
                <button type="button" class="fxStatusOpt w-full text-left px-4 py-2.5 text-sm
                                             hover:bg-amber-50 transition" data-value="Pending">
                  <span class="inline-flex items-center gap-2">
                    <span class="h-2 w-2 rounded-full bg-amber-400"></span>
                    <span class="text-amber-800 font-medium">Pending</span>
                  </span>
                </button>
    
                <button type="button" class="fxStatusOpt w-full text-left px-4 py-2.5 text-sm
                                             hover:bg-sky-50 transition" data-value="Open">
                  <span class="inline-flex items-center gap-2">
                    <span class="h-2 w-2 rounded-full bg-sky-500"></span>
                    <span class="text-sky-800 font-medium">Open</span>
                  </span>
                </button>
    
                <button type="button" class="fxStatusOpt w-full text-left px-4 py-2.5 text-sm
                                             hover:bg-emerald-50 transition" data-value="Closed">
                  <span class="inline-flex items-center gap-2">
                    <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <span class="text-emerald-800 font-medium">Closed</span>
                  </span>
                </button>
              </div>
    
              <!-- Hidden input so your existing JS keeps working -->
              <input type="hidden" id="fxFilterStatus" value="">
            </div>
    
            <button id="fxImportInvoicesBtn"
              type="button"
              class="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
              <i class="bi bi-file-earmark-excel"></i> Import Invoices
            </button>
    
            <input id="fxImportInvoicesFile" type="file" class="hidden" accept=".xlsx,.xls,.csv" />
          </div>
    
          <div class="text-sm text-slate-500">
            Amount (AED) is auto from Shipment Tracker subtotal sum.
          </div>
    
        </div>
    
        {{-- Total + Due Reminders (side-by-side) --}}
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
    
          {{-- Summary Total --}}
          <div class="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4
                  shadow-sm ring-1 ring-black/5 flex items-center justify-between">
            <div>
              <div class="text-sm text-slate-500">Total Amount (Filtered)</div>
              <div class="text-[11px] text-slate-400">Auto sum of Amount column</div>
            </div>
    
            <div id="fxSummaryTotal" class="text-lg font-semibold text-slate-900 whitespace-nowrap">
              AED 0.00
            </div>
          </div>
    
          {{-- Due Reminders --}}
          <div id="fxDueReminders"
            class="hidden lg:col-span-8 bg-white border border-slate-200 rounded-2xl overflow-hidden
                  shadow-sm ring-1 ring-black/5">
            <div class="p-4 border-b border-slate-200 flex items-center justify-between">
              <div class="flex items-center gap-2">
                {{-- Warning triangle icon --}}
                <span class="inline-flex h-8 w-8 items-center justify-center rounded-xl
                         bg-amber-50 border border-amber-200 text-amber-700">
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M12 3.25c.5 0 .96.27 1.21.7l8.25 14.3c.25.44.25.99 0 1.43-.25.44-.71.72-1.21.72H3.75c-.5 0-.96-.28-1.21-.72-.25-.44-.25-.99 0-1.43L10.79 3.95c.25-.43.71-.7 1.21-.7Zm0 6.25a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 0 1.5 0v-4.5A.75.75 0 0 0 12 9.5Zm0 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
                  </svg>
                </span>
    
                <div>
                  <div class="font-semibold leading-tight">Due Reminders</div>
                  <div class="text-[11px] text-slate-500 leading-tight">
                    Auto alerts <span class="font-semibold text-slate-700">7 days</span> before Due Date
                  </div>
                </div>
              </div>
    
              <div class="text-xs text-slate-500">Upcoming only</div>
            </div>
    
            {{-- Make reminders compact horizontally --}}
            <div id="fxDueRemindersBody" class="p-3 flex gap-2 overflow-x-auto"></div>
          </div>
    
        </div>
    
        {{-- Table --}}
        <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div class="overflow-y-auto overflow-x-hidden max-h-[70vh]" id="fxSummaryScroll">
            <table id="fedexInvoicesTable" class="fx-table w-full text-sm">
              <thead class="sticky top-0 z-20 bg-gradient-to-r from-slate-50 to-indigo-50 text-slate-700">
                <tr class="text-left">
                  <th class="p-3 font-semibold text-xs uppercase tracking-wide w-16">S.NO</th>
                  <th class="fx-col-invoice p-3 font-semibold text-xs uppercase tracking-wide">Invoice Number</th>
                  <th class="fx-col-date p-3 font-semibold text-xs uppercase tracking-wide">Invoice Date</th>
                  <th class="fx-col-date p-3 font-semibold text-xs uppercase tracking-wide">Due Date</th>
                  <th class="fx-col-amount p-3 font-semibold text-xs uppercase tracking-wide">Amount</th>
                  <th class="fx-col-status p-3 font-semibold text-xs uppercase tracking-wide">Status</th>
                  <th class="fx-col-remarks p-3 font-semibold text-xs uppercase tracking-wide">Remarks</th>
                  <th class="p-3 font-semibold text-xs uppercase tracking-wide">PAYMENT STATUS</th>
                  <th class="p-3 font-semibold text-xs uppercase tracking-wide">Payment Reference #</th>
                  <th class="fx-col-actions p-3 font-semibold text-xs uppercase tracking-wide w-32">Actions</th>
                </tr>
              </thead>
              <tbody id="fxInvoiceTbody" class="divide-y divide-slate-100">
                <tr>
                  <td colspan="10" class="p-6 text-center text-slate-400">Loading invoices…</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    
      {{-- TRACKER --}}
      <section id="fxTab-tracker" class="hidden">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {{-- Left invoice list --}}
          <div class="lg:col-span-4 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
            <div class="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50">
              <div class="font-semibold text-slate-900">Invoices</div>
              <div class="text-xs text-slate-500">Click an invoice to view shipments.</div>
            </div>
            <div id="fxInvoiceList" class="max-h-[70vh] overflow-auto divide-y divide-slate-100">
              <div class="p-4 text-slate-400">Loading…</div>
            </div>
          </div>
    
          {{-- Right details --}}
          <div class="lg:col-span-8 space-y-4">
            {{-- Header card --}}
            <div id="fxTrackerHeader" class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm ring-1 ring-black/5">
              <div class="text-slate-400 text-sm">Select an invoice to view shipment tracker.</div>
            </div>
    
            {{-- Paid / Unpaid boxes --}}
            <div id="fxPayBoxes" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm ring-1 ring-black/5">
                <div class="text-sm text-slate-500">Paid (Subtotal)</div>
                <div class="text-[11px] text-slate-400">Sum of rows with Payment Status = Paid</div>
                <div id="fxPaidTotal" class="mt-2 text-xl font-semibold text-slate-900 whitespace-nowrap">AED 0.00</div>
              </div>
    
              <div class="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm ring-1 ring-black/5">
                <div class="text-sm text-slate-500">Unpaid (Subtotal)</div>
                <div class="text-[11px] text-slate-400">Sum of rows with Payment Status = Unpaid</div>
                <div id="fxUnpaidTotal" class="mt-2 text-xl font-semibold text-slate-900 whitespace-nowrap">AED 0.00</div>
              </div>
            </div>
    
            {{-- Shipment table area (Step 3 will fill) --}}
            <div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-black/5">
              <div class="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-indigo-50">
                <div>
                  <div class="font-semibold text-slate-900">Shipments</div>
                  <div class="text-xs text-slate-500 mt-0.5">
                    Tip: Click on any row to edit. Save button appears after changes.
                  </div>
                </div>
    
                {{-- right actions --}}
                <div class="flex items-center gap-3">
                  <button id="fxAddShipmentBtn"
                    class="hidden px-3 py-2 rounded-xl text-white shadow-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                    <i class="bi bi-plus-lg"></i> Add Shipment Row
                  </button>
    
                  <button id="fxImportShipmentsBtn"
                    type="button"
                    class="hidden px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
                    <i class="bi bi-file-earmark-excel text-emerald-600"></i> Import Excel
                  </button>
    
                  <button id="fxTopSaveShipBtn"
                    type="button"
                    class="hidden px-4 py-2 rounded-xl text-white shadow-sm bg-slate-900 hover:bg-slate-800">
                    <i class="bi bi-check-lg"></i> Save Changes
                  </button>
    
                  <button id="fxTopCancelShipBtn"
                    type="button"
                    class="hidden px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
                    <i class="bi bi-x-lg text-slate-600"></i> Cancel
                  </button>
    
                  <input id="fxImportFile" type="file" class="hidden" accept=".xlsx,.xls,.csv" />
                </div>
              </div>
    
              <div class="p-6 text-slate-400" id="fxShipmentPlaceholder">
                No invoice selected.
              </div>
    
              <div id="fxShipmentTableWrap" class="hidden">
                <div id="fxShipmentScroll" class="overflow-x-auto overflow-y-auto max-h-[520px] cursor-grab select-none">
                  <table class="min-w-[1400px] w-full text-sm">
                    <thead class="sticky top-0 z-20 bg-gradient-to-r from-slate-50 to-indigo-50 text-slate-700">
                      <tr class="text-left">
                        <th class="p-3">Shipment ID</th>
                        <th class="p-3">Origin</th>
                        <th class="p-3">Destination</th>
                        <th class="p-3">Ship Date</th>
                        <th class="p-3">Service</th>
                        <th class="p-3">PCS</th>
                        <th class="p-3">Weight</th>
                        <th class="p-3">Billed Weight</th>
                        <th class="p-3">Subtotal Amount</th>
                        <th class="p-3">Amount / KG</th>
                        <th class="p-3">Diff</th>
                        <th class="p-3">Shipping Status</th>
                        <th class="p-3">Signed for by</th>
                        <th class="p-3">Actual Delivery</th>
                        <th class="p-3">Paid by Customer</th>
                        <th class="p-3">Payment Status</th>
                        <th class="p-3">Duties & Taxes Bill to</th>
                        <th class="p-3">Remarks</th>
                        <th class="p-3">History</th>
                        <th class="p-3 w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody id="fxShipmentTbody" class="divide-y divide-slate-100"></tbody>
                    <tfoot id="fxShipmentTotals" class="sticky bottom-0 z-10 bg-white border-t border-slate-200"></tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
    
        </div>
      </section>
    
    </div>
    
    {{-- Create/Edit Invoice Modal --}}
    <div id="fxInvoiceModal" class="fixed inset-0 hidden z-50">
      <div class="absolute inset-0 bg-black/40"></div>
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
          <div class="p-4 border-b border-slate-200 flex items-center justify-between">
            <div class="font-semibold" id="fxInvoiceModalTitle">New Invoice</div>
            <button id="fxCloseInvoiceModal" class="text-slate-500 hover:text-slate-800">✕</button>
          </div>
    
          <form id="fxInvoiceForm" class="p-5 space-y-4">
            @csrf
            <input type="hidden" id="fxInvoiceId" />
    
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="text-xs text-slate-500">Invoice Number <span class="text-red-500 font-semibold">*</span></label>
                <input id="fxInvoiceNumber" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" />
              </div>
    
              <div>
                <label class="text-xs text-slate-500">Status</label>
                <select id="fxStatus" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200">
                  <option>Pending</option>
                  <option>Open</option>
                  <option>Closed</option>
                </select>
              </div>
    
              <div>
                <label class="text-xs text-slate-500">Invoice Date</label>
                <input id="fxInvoiceDate" type="date" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" />
              </div>
    
              <div>
                <label class="text-xs text-slate-500">Due Date (date)</label>
                <input id="fxDueDate" type="date" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" />
                <div class="text-[11px] text-slate-400 mt-1">OR use Due Date text below</div>
              </div>
    
              <div class="md:col-span-2">
                <label class="text-xs text-slate-500">Due Date text (example: Due on receipt)</label>
                <input id="fxDueDateText" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" />
              </div>
    
              <div class="md:col-span-2">
                <label class="text-xs text-slate-500">Remarks</label>
                <textarea id="fxRemarks" rows="3" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"></textarea>
              </div>
    
              <div>
                <label class="text-xs text-slate-500">PAYMENT STATUS</label>
                <select id="fxPaymentStatus"
                  class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300">
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
    
              <div>
                <label class="text-xs text-slate-500">Payment Reference #</label>
                <input id="fxPaymentRef" class="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" />
              </div>
            </div>
    
            <div class="flex items-center justify-end gap-2 pt-2">
              <button type="button" id="fxCancelInvoice"
                class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50">Cancel</button>
    
              <button type="submit" id="fxSaveInvoice"
                class="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                Save
              </button>
            </div>
    
            <div id="fxInvoiceFormErr" class="hidden text-sm text-red-600"></div>
          </form>
        </div>
      </div>
    </div>
    
    {{-- Global App Modal (replaces alert/confirm) --}}
    <div id="fxAppModal" class="fixed inset-0 hidden z-[60]">
      <div class="absolute inset-0 bg-black/40"></div>
    
      <div class="absolute inset-0 flex items-center justify-center p-4">
        <div class="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div class="p-4 border-b border-slate-200 flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <div id="fxAppModalIcon" class="h-9 w-9 rounded-xl flex items-center justify-center bg-slate-100 text-slate-700">
                <i class="bi bi-info-circle"></i>
              </div>
              <div>
                <div id="fxAppModalTitle" class="font-semibold text-slate-900">Message</div>
                <div id="fxAppModalSub" class="text-xs text-slate-500 hidden"></div>
              </div>
            </div>
    
            <button id="fxAppModalCloseX" class="text-slate-500 hover:text-slate-800">✕</button>
          </div>
    
          <div class="p-4">
            <div id="fxAppModalMsg" class="text-sm text-slate-700 leading-relaxed"></div>
    
            <div id="fxAppModalErrBox" class="hidden mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3"></div>
    
            <div class="mt-5 flex items-center justify-end gap-2">
              <button id="fxAppModalCancel"
                class="hidden px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50">
                Cancel
              </button>
    
              <button id="fxAppModalOk"
                class="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    </main>

  {{-- jQuery --}}
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <script src="{{ asset('js/ft.js') }}"></script>
</body>
</html>