@php($isClosed = $isClosed ?? (isset($cycle) && ($cycle->status ?? null) === 'closed'))

<div class="space-y-6">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
    <!-- Total Profit -->
    <div class="bg-white rounded-2xl shadow p-4 border-l-4 border-indigo-600 self-start">
      <div class="text-gray-500 text-sm">Total Profit</div>
      <div id="benTotalProfit" class="text-2xl font-bold text-indigo-700">AED 0.00</div>
    </div>

    <!-- Donut/Pie Chart -->
    <div class="bg-white rounded-2xl shadow p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold">Allocation Breakdown</h3>
      </div>

      <div id="benPieWrap" class="flex flex-col items-center justify-center min-h-[240px]">
        <!-- chart injected by JS -->
      </div>
    </div>
  </div>
  
  <!-- Three KPI cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="bg-white rounded-2xl shadow p-4 border-l-4 border-amber-500">
      <div class="text-gray-500 text-sm">Shareholder 1 - Mr. Khurram – Allocation</div>
      <div id="benSH1Balance" class="text-2xl font-bold text-amber-800">AED 0.00</div>
    </div>
    <div class="bg-white rounded-2xl shadow p-4 border-l-4 border-violet-500">
      <div class="text-gray-500 text-sm">Shareholder 2 - Mr. Zeeshan – Allocation</div>
      <div id="benSH2Balance" class="text-2xl font-bold text-violet-800">AED 0.00</div>
    </div>
    <div class="bg-white rounded-2xl shadow p-4 border-l-4 border-emerald-500">
      <div class="text-gray-500 text-sm">Charity (5% of Profit)</div>
      <div id="benCharityKpi" class="text-2xl font-bold text-emerald-700">AED 0.00</div>
    </div>
  </div>

  <!-- Allocation table -->
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div class="px-5 py-3 border-b">
      <h2 class="text-lg font-semibold">Beneficiary Allocation</h2>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-white text-gray-700">
          <tr>
            <th class="px-4 py-3 text-left">Party</th>
            <th class="px-4 py-3 text-right">Allocation %</th>
            <th class="px-4 py-3 text-right">Allocated</th>
            <th class="px-4 py-3 text-right">Withdrawn</th>
            <th class="px-4 py-3 text-right">Balance</th>
          </tr>
        </thead>
        <tbody id="benAllocBody" class="divide-y divide-gray-100">
          <!-- rows will be populated by JS -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Two side-by-side tables -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <!-- Shareholder 1 -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-5 py-3 border-b bg-amber-50 border-amber-300">
        <h2 class="text-lg font-semibold text-amber-800">Shareholder 1 - Mr. Khurram</h2>
      </div>
      <!-- Inline Add Row -->
      <div class="px-5 py-3 border-b bg-gray-50">
        <form id="benFormSH1" class="grid grid-cols-12 gap-3 items-end">
          <input type="hidden" name="beneficiary" value="shareholder1">
          <div class="col-span-4">
            <label class="text-xs text-gray-500">Date</label>
            <input type="date" name="date" class="w-full border rounded px-3 py-2">
          </div>
          <div class="col-span-8">
            <label class="text-xs text-gray-500">Amount (AED)</label>
            <input type="number" step="0.01" name="amount" class="w-full border rounded px-3 py-2" placeholder="0.00">
          </div>
          <div class="col-span-4">
            <label class="text-xs text-gray-500">Type</label>
            <div class="ben-select relative" data-name="type">
              <input type="hidden" name="type" value="cash">
              <button type="button"
                class="ben-sel-btn w-full rounded border bg-white py-2.5 pl-3 pr-10
                   text-gray-800 shadow-sm text-left
                   focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <span class="ben-sel-label">Cash</span>
                <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                  viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clip-rule="evenodd" />
                </svg>
              </button>

              <!-- Menu -->
              <div class="ben-sel-menu hidden absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white
                shadow-lg overflow-hidden">
                <button type="button" class="ben-sel-opt w-full px-3 py-2 text-left hover:bg-gray-50"
                  data-value="cash">Cash</button>
                <button type="button" class="ben-sel-opt w-full px-3 py-2 text-left hover:bg-gray-50"
                  data-value="bank_transfer">Bank transfer</button>
                <button type="button" class="ben-sel-opt w-full px-3 py-2 text-left hover:bg-gray-50"
                  data-value="adjustment">Adjustment</button>
              </div>
            </div>
          </div>
          <div class="col-span-4">
            <label class="text-xs text-gray-500">Charity (AED)</label>
            <input type="number" step="0.01" name="charity" class="w-full border rounded px-3 py-2" placeholder="0.00">
          </div>
          <div class="col-span-4">
            <label class="text-xs text-gray-500">Remark</label>
            <input type="text" name="remarks" class="w-full border rounded px-3 py-2" placeholder="Optional">
          </div>
          <div class="col-span-12 flex items-center justify-between mt-1">
            <button class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Add</button>

            <div class="ml-3 flex-1">
              <div class="flex items-center justify-end gap-3">
                <!-- Transfer Balance Allocation -->
                <div class="bg-white rounded-xl border border-gray-200 px-4 py-2 inline-flex items-center gap-3 shadow-sm">
                  <span class="text-sm text-gray-500">Charity total:</span>
                  <span id="benSH1CharityTotal" class="text-base font-semibold text-slate-800">AED 0.00</span>
                </div>
                <!-- NEW: Entries Total -->
                <div class="bg-white rounded-xl border border-gray-200 px-4 py-2 inline-flex items-center gap-3 shadow-sm">
                  <span class="text-sm text-gray-500">Total:</span>
                  <span id="benSH1EntriesTotal" class="text-base font-semibold text-slate-800">AED 0.00</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-700">
            <tr>
              <th class="px-4 py-3 text-left">#</th>
              <th class="px-4 py-3 text-left">Date</th>
              <th class="px-4 py-3 text-left">Type</th>
              <th class="px-4 py-3 text-right">Amount</th>
              <th class="px-4 py-3 text-right">Charity</th>
              <th class="px-4 py-3 text-left">Remark</th>
              @unless ($isClosed)
              <th class="px-4 py-3 text-center w-24 action-col" data-col="action">Action</th>
              @endunless
            </tr>
          </thead>
          <tbody id="benBodySH1" class="divide-y divide-gray-100"></tbody>
        </table>
      </div>
    </div>

    <!-- Shareholder 2 -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="px-5 py-3 border-b bg-violet-50 border-violet-300">
        <h2 class="text-lg font-semibold text-violet-800">Shareholder 2 - Mr. Zeeshan</h2>
      </div>
      <div class="px-5 py-3 border-b bg-gray-50">
        <form id="benFormSH2" class="grid grid-cols-12 gap-3 items-end">
          <input type="hidden" name="beneficiary" value="shareholder2">
          <div class="col-span-4">
            <label class="text-xs text-gray-500">Date</label>
            <input type="date" name="date" class="w-full border rounded px-3 py-2">
          </div>
          <div class="col-span-8">
            <label class="text-xs text-gray-500">Amount (AED)</label>
            <input type="number" step="0.01" name="amount" class="w-full border rounded px-3 py-2" placeholder="0.00">
          </div>
          <div class="col-span-4">
            <label class="text-xs text-gray-500">Type</label>
            <div class="ben-select relative" data-name="type">
              <input type="hidden" name="type" value="cash">
              <button type="button"
                class="ben-sel-btn w-full border rounded bg-white py-2.5 pl-3 pr-10
                   text-gray-800 shadow-sm text-left
                   focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
                <span class="ben-sel-label">Cash</span>
                <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
                  viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                    clip-rule="evenodd" />
                </svg>
              </button>

              <!-- Menu -->
              <div class="ben-sel-menu hidden absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white
                shadow-lg overflow-hidden">
                <button type="button" class="ben-sel-opt w-full px-3 py-2 text-left hover:bg-gray-50"
                  data-value="cash">Cash</button>
                <button type="button" class="ben-sel-opt w-full px-3 py-2 text-left hover:bg-gray-50"
                  data-value="bank_transfer">Bank transfer</button>
                <button type="button" class="ben-sel-opt w-full px-3 py-2 text-left hover:bg-gray-50"
                  data-value="adjustment">Adjustment</button>
              </div>
            </div>
          </div>
          <div class="col-span-4">
            <label class="text-xs text-gray-500">Charity (AED)</label>
            <input type="number" step="0.01" name="charity" class="w-full border rounded px-3 py-2" placeholder="0.00">
          </div>
          <div class="col-span-4">
            <label class="text-xs text-gray-500">Remark</label>
            <input type="text" name="remarks" class="w-full border rounded px-3 py-2" placeholder="Optional">
          </div>
          <div class="col-span-12 flex items-center justify-between mt-1">
            <button class="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Add</button>

            <div class="ml-3 flex-1">
              <div class="flex items-center justify-end gap-3">
                <div class="bg-white rounded-xl border border-gray-200 px-4 py-2 inline-flex items-center gap-3 shadow-sm">
                  <span class="text-sm text-gray-500">Charity total:</span>
                  <span id="benSH2CharityTotal" class="text-base font-semibold text-slate-800">AED 0.00</span>
                </div>
                <div class="bg-white rounded-xl border border-gray-200 px-4 py-2 inline-flex items-center gap-3 shadow-sm">
                  <span class="text-sm text-gray-500">Total:</span>
                  <span id="benSH2EntriesTotal" class="text-base font-semibold text-slate-800">AED 0.00</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 text-gray-700">
            <tr>
              <th class="px-4 py-3 text-left">#</th>
              <th class="px-4 py-3 text-left">Date</th>
              <th class="px-4 py-3 text-left">Type</th>
              <th class="px-4 py-3 text-right">Amount</th>
              <th class="px-4 py-3 text-right">Charity</th>
              <th class="px-4 py-3 text-left">Remark</th>
              <th class="px-4 py-3 text-center w-24">Action</th>
            </tr>
          </thead>
          <tbody id="benBodySH2" class="divide-y divide-gray-100"></tbody>
        </table>
      </div>
    </div>
  </div>

</div>

<!-- Delete confirm modal -->
<div id="benDeleteModal" class="fixed inset-0 z-50 hidden items-center justify-center">
<div class="absolute inset-0 bg-black/40"></div>
<div class="relative bg-white rounded-2xl w-full max-w-md shadow-lg">
  <div class="px-5 py-4 border-b flex items-center justify-between">
    <h3 class="text-lg font-semibold">Delete Entry?</h3>
    <button id="benDelClose" class="text-gray-500 hover:text-gray-700" type="button">
      <i class="bi bi-x-lg"></i>
    </button>
  </div>
  <div class="px-5 py-4 space-y-2 text-sm text-gray-700">
    <p class="text-gray-600">This action cannot be undone.</p>
    <div class="bg-gray-50 rounded-lg p-3">
      <div><span class="text-gray-500">Date:</span> <span id="benDelDate" class="font-medium"></span></div>
      <div><span class="text-gray-500">Amount:</span> <span id="benDelAmount" class="font-medium"></span></div>
      <div><span class="text-gray-500">Remark:</span> <span id="benDelRemark" class="font-medium"></span></div>
    </div>
  </div>
  <div class="px-5 py-4 border-t flex items-center justify-end gap-2">
    <button id="benDelCancel" type="button" class="px-4 py-2 rounded-lg border">Cancel</button>
    <button id="benDelConfirm" type="button" class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">Delete</button>
  </div>
</div>
</div>

<!-- Attachments Modal -->
<div id="benAttachModal" class="fixed inset-0 z-50 hidden items-center justify-center">
  <div class="absolute inset-0 bg-black/40"></div>
  <div class="relative bg-white rounded-2xl w-full max-w-3xl shadow-lg">
    <div class="px-5 py-4 border-b flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold">Entry Attachments</h3>
        <div id="benAttachMeta" class="text-xs text-gray-500 mt-1">Entry #—</div>
      </div>
      <button id="benAttachClose" class="text-gray-500 hover:text-gray-700" type="button"><i class="bi bi-x-lg"></i></button>
    </div>

    <div class="px-5 py-4 space-y-4">
      <form id="benAttachForm" class="flex flex-wrap items-center gap-3">
        <input type="hidden" name="entry_id" value="">

        <select name="type" class="border rounded px-2 py-1 text-sm">
          <option value="invoice">Invoice</option>
          <option value="receipt">Receipt</option>
          <option value="note">Note</option>
          <option value="other" selected>Other</option>
        </select>

        <!-- hidden real input -->
        <input id="benAttFiles" type="file" name="files[]" class="hidden" multiple>

        <!-- visible controls -->
        <button type="button" id="benAttBrowse"
          class="px-3 py-1.5 rounded border bg-gray-50 hover:bg-gray-100 text-sm">
          Browse
        </button>
        <span id="benAttChosen" class="text-sm text-gray-500">No file chosen</span>

        <button id="benAttUpload" class="px-3 py-1.5 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700" type="submit">
          Upload
        </button>

        <a id="benAttachDownloadAll" href="#" class="ml-auto text-sm text-indigo-700 hover:underline" target="_blank">
          Download all (PDF)
        </a>
      </form>

      <div id="benAttachList" class="divide-y divide-gray-100">
        <!-- rows injected -->
      </div>
    </div>
  </div>
</div>