@php($isClosed = $isClosed ?? (isset($cycle) && ($cycle->status ?? null) === 'closed'))

<div id="sheet-customer-{{ strtolower($sheetName) }}" class="sheet-section" style="display:none" data-sheet-name="{{ strtoupper($sheetName) }}">
  <input type="hidden" class="customer-sheet-id" id="customer-sheet-id-{{ $sheetId }}" value="{{ $sheetId }}">
  <div class="p-6">
    <!-- Totals Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 justify-center place-items-center">

      <!-- Total Material -->
      <div class="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-blue-800 w-full max-w-sm">
        <h3 class="text-gray-500 font-medium text-sm mb-2">Total Material</h3>
        <p id="totalMaterial-{{ $sheetId }}" class="text-2xl font-bold text-blue-800">AED 0.00</p>
      </div>

      <!-- Total Shipping Cost -->
      <div class="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-blue-800 w-full max-w-sm">
        <h3 class="text-gray-500 font-medium text-sm mb-2">Total Shipping Cost</h3>
        <p id="totalShipping-{{ $sheetId }}" class="text-2xl font-bold text-blue-800">AED 0.00</p>
      </div>
    </div>

    <!-- Add Row Button -->
    <button class="add-customer-row-btn mb-4 px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-900 transition"
      data-sheet="customer-{{ $sheetId }}" data-sheet-id="{{ $sheetId }}">
      + Add Row
    </button>

    <!-- Material Table -->
    <h2 class="text-lg font-semibold mt-8 mb-2">Material Entries</h2>
    <div class="overflow-x-auto">
      <table class="min-w-full border border-gray-300 bg-white">
        <thead class="bg-black text-white">
          <tr>
            <th class="border p-2 w-5">S.No</th>
            <th class="border p-2 w-32">Invoice Date</th>
            <th class="border p-2 w-32">Supplier Name</th>
            <th class="border p-2 w-32">Brief Description</th>
            <th class="border p-2 w-32">Total Material</th>
            <th class="border p-2 w-32">Total Shipping Cost</th>
            @unless($isClosed)
              <th class="border p-2 w-24 action-col" data-col="action">Action</th>
            @endunless
          </tr>
        </thead>
        <tbody class="customer-table-body" id="customerTableBody-{{ $sheetId }}" data-sheet="customer-{{ $sheetId }}">
          <!-- Dynamic rows -->
        </tbody>
      </table>
    </div>
  </div>

  {{-- Loan Ledger Section --}}
  <div class="mt-10 p-6">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 justify-center place-items-center">
      <!-- Total Loan Paid Amount -->
      <div class="bg-text-gray-500 rounded-2xl shadow-lg p-6 text-center border-l-4 border-pink-400 w-full max-w-sm">
        <h3 class="text-gray-500 font-medium text-sm mb-2">Total Payment Charges by Customer</h3>
        <p id="totalLoanPaid-{{ $sheetId }}" class="text-2xl font-bold text-pink-400">AED 0.00</p>
      </div>

      <!-- Sheet Total Amount -->
      <div class="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-pink-400 w-full max-w-sm">
        <h3 id="sheetTotalTitle" class="text-gray-500 font-medium text-sm mb-2">Sheet Total Amount</h3>
        <p id="sheetTotal-{{ $sheetId }}" class="text-2xl font-bold text-pink-400">AED 0.00</p>
      </div>

      <!-- Remaining Balance -->
      <div class="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-pink-400 w-full max-w-sm">
        <h3 class="text-gray-500 font-medium text-sm mb-2">Remaining Balance</h3>
        <p id="remainingBalance-{{ $sheetId }}" class="text-2xl font-bold text-pink-400">AED 0.00</p>
      </div>
    </div>

    <div class="flex items-center justify-between mb-3">
      <h2 class="text-lg font-semibold">{{ strtoupper($sheetName) }} Loan Ledger</h2>
      <button
        class="open-loan-modal-btn px-4 py-2 bg-pink-400 text-white rounded hover:bg-pink-500 transition"
        data-sheet-id="{{ $sheetId }}">
        + Add Entry
      </button>
    </div>

    <div class="overflow-x-auto">
      <div class="bg-white rounded-2xl shadow-lg border">
        <table class="min-w-full border border-gray-300 bg-white">
          <thead class="bg-black text-white">
            <tr>
              <th class="border p-2 w-14">S.No</th>
              <th class="border p-2 w-36">Date</th>
              <th class="border p-2">Description</th>
              <th class="border p-2 w-40 text-right">Amount (AED)</th>
              @unless($isClosed)
                <th class="border p-2 w-28 action-col" data-col="action">Action</th>
              @endunless
            </tr>
          </thead>
          <tbody id="loanLedgerBody-{{ $sheetId }}">
            {{-- rows injected by JS --}}
          </tbody>
          <tfoot class="bg-gray-50">
            <tr class="font-semibold">
              <td class="border p-2 text-right" colspan="3">Total:</td>
              <td class="border p-2 text-right">
                <span id="loanLedgerTotal-{{ $sheetId }}">0.00</span>
              </td>
              <td class="border p-2"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  </div>
</div>

<!-- Delete Confirmation Modal -->
<div id="deleteModal" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-50">
  <div class="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">Are you sure you want to delete this entry?</h3>
    <div class="flex justify-center gap-4">
      <button id="confirmCrowDeleteBtn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">Delete</button>
      <button id="cancelCrowDeleteBtn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded">Cancel</button>
    </div>
  </div>
</div>

<div id="uploadAttachmentModal-{{ $sheetId }}" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-50">
  <div class="bg-white rounded-2xl w-full max-w-lg p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold">Upload Attachments</h3>
      <button type="button" id="closeUploadAttachment" class="close-upload text-2xl">&times;</button>
    </div>

    <form id="uploadAttachmentForm-{{ $sheetId }}">
      <input type="hidden" id="attEntryId-{{ $sheetId }}" value="">
      <div class="space-y-3">
        <label class="block text-sm">Type (optional)</label>
        <select id="attType-{{ $sheetId }}" name="type" class="attType w-full border rounded px-3 py-2">
          <option value="">-- Select --</option>
          <option value="invoice">Invoice</option>
          <option value="receipt">Receipt</option>
          <option value="note">Note</option>
          <option value="other">Other</option>
        </select>

        <!-- Browse-style file picker -->
        <label class="block text-sm mt-3">Files</label>
        <div class="flex gap-2">
          <input type="text"
            class="file-name-display w-full border rounded px-3 py-2 bg-gray-50 text-gray-700"
            placeholder="No file chosen" readonly>
          <input type="file"
            id="attFiles-{{ $sheetId }}"
            class="hidden attFiles"
            multiple
            accept="image/*,application/pdf">
          <button type="button"
            class="btn-browse px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200"
            data-sheet-id="{{ $sheetId }}">Browse</button>
        </div>
      </div>

      <div class="mt-5 flex justify-end gap-2">
        <button type="button" id="cancelUpload" class="cancel-upload px-4 py-2 border rounded">Cancel</button>
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded">Upload</button>
      </div>
    </form>
  </div>
</div>

<div id="viewAttachmentModal-{{ $sheetId }}" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-50">
  <div class="bg-white rounded-2xl w-full max-w-4xl overflow-hidden" style="max-height:85vh;">
    <div class="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
      <h2 class="text-xl font-bold">Attachment Viewer – <span id="attachmentViewerTitle" class="text-gray-600 text-base"></span></h2>
      <div class="flex items-center gap-2">
        <button id="downloadAllBtn-{{ $sheetId }}" class="px-3 py-1 border rounded">Download PDF</button>
        <button type="button" id="closeViewModal" class="close-view text-2xl">&times;</button>
      </div>
    </div>
    <div class="p-4 overflow-y-auto" style="max-height: calc(85vh - 64px);">
      <div id="attachmentsList-{{ $sheetId }}" class="grid grid-cols-1 md:grid-cols-2 gap-4"></div>
    </div>
  </div>
</div>

{{-- Add/Edit Loan Modal --}}
<div id="loanModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50 p-4">
  <div class="bg-white w-full max-w-md rounded-2xl p-6">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-bold" id="loanModalTitle">Add Loan Entry</h3>
      <button id="closeLoanModal" class="text-2xl leading-none">&times;</button>
    </div>

    <form id="loanForm" autocomplete="off">
      <input type="hidden" id="loanRowId" value="">
      <div class="space-y-3">
        <div>
          <label class="block text-sm mb-1">Date</label>
          <input type="date" id="loanDate" class="w-full border rounded px-3 py-2" required>
        </div>
        <div>
          <label class="block text-sm mb-1">Description</label>
          <input type="text" id="loanDescription" class="w-full border rounded px-3 py-2" placeholder="Optional">
        </div>
        <div>
          <label class="block text-sm mb-1">Amount (AED)</label>
          <input type="number" step="0.01" id="loanAmount" class="w-full border rounded px-3 py-2" required>
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 mt-5">
        <button type="button" id="cancelLoanModal" class="px-3 py-2 rounded border">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
      </div>
    </form>
  </div>
</div>