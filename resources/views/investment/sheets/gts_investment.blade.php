@php($isClosed = $isClosed ?? (isset($cycle) && ($cycle->status ?? null) === 'closed'))

<div class="p-6">
  <!-- <h2 class="text-2xl font-bold mb-4">Investment Sheet</h2> -->

  <!-- Totals Wrapper -->
  <div class="w-full flex justify-center mb-6">
    <div id="investmentTotalsWrapper" class="flex flex-col md:flex-row items-center gap-6">

      <!-- Total Investment Amount -->
      <div class="bg-white rounded-2xl shadow-lg p-8 text-center min-w-[300px] border-l-4 border-blue-700">
        <h3 class="text-gray-500 font-medium text-sm mb-2">Total Investment Amount</h3>
        <p id="investmentTotalAmount" class="text-2xl font-bold text-blue-700">AED 0.00</p>
      </div>

      <!-- Murabaha Profit Sharing -->
      <div id="murabahaTotalLine" class="bg-white rounded-2xl shadow-lg p-8 text-center min-w-[300px] hidden border-l-4 border-yellow-600">
        <h3 class="text-gray-500 text-sm mb-2">Murabaha Profit Sharing</h3>
        <p id="murabahaAmount" class="text-2xl font-bold text-yellow-600">AED 0.00</p>
      </div>

    </div>
  </div>

  <!-- Add Row Button -->
  <button id="addInvestmentRowBtn"
    class="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
    + Add Row
  </button>

  <!-- Investment Table -->
  <div class="mt-8">
    <h2 class="text-lg font-semibold mt-8 mb-2">Investment Entries</h2>
    <div class="overflow-x-auto">
      <table class="min-w-full border border-gray-300 bg-white">
        <thead class="bg-black text-white">
          <tr class="investment-header" data-id="${investmentId}">
            <th class="border p-2 w-5">S.No</th>
            <th class="border p-2 w-32">Date</th>
            <th class="border p-2 w-32">Investor</th>
            <th class="border p-2 w-32">Investment Amount</th>
            <th class="border p-2 w-32">Payment Method</th>
            @unless ($isClosed)
              <th class="border p-2 w-24 action-col" data-col="action">Action</th>
            @endunless
          </tr>
        </thead>
        <tbody id="investmentTableBody">
          <!-- Investment rows inserted here -->
        </tbody>
      </table>
    </div>
  </div>

  <!-- Investment Row Modal -->
  <div id="investmentRowModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
      <h2 class="text-xl font-semibold mb-4">Add Investment Entry</h2>
      <form id="investmentForm">
        <div class="space-y-4">

          <!-- Date -->
          <div>
            <label class="block text-sm font-medium mb-1">Date</label>
            <input id="modalInvestmentDate" type="date" class="w-full border border-gray-300 rounded px-3 py-2" required />
          </div>

          <!-- Investor -->
          <div>
            <label class="block text-sm font-medium mb-1">Investor</label>
            <input id="modalInvestmentInvestor" type="text" placeholder="Investor Name" class="w-full border border-gray-300 rounded px-3 py-2" required />
          </div>

        </div>
        <div class="mt-6 flex justify-end space-x-2">
          <button type="button" id="investmentCancelBtn" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
            Cancel
          </button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Add
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- Upload Attachments Modal -->
<div id="uploadAttachmentModal" class="fixed inset-0 bg-black/60 hidden z-50 items-center justify-center px-4 min-h-screen">
  <div class="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-6 relative">
    
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold text-gray-800">Upload Attachments</h2>
      <button id="closeAttachmentModal" class="text-gray-500 hover:text-red-500 text-2xl">&times;</button>
    </div>

    <!-- Upload Form -->
    <form id="attachmentUploadForm" enctype="multipart/form-data" class="space-y-5">

      <!-- Input Group -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
        <div class="relative">
          <input type="text" id="invoiceFileName" class="w-full border rounded-lg px-4 py-2 pr-28 text-sm text-gray-700 bg-gray-100 cursor-default" placeholder="No file chosen" readonly />
          <label for="invoice" class="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-1.5 rounded cursor-pointer text-sm font-medium">Browse</label>
          <input type="file" id="invoice" name="invoice" class="hidden" onchange="$('#invoiceFileName').val(this.files[0]?.name)" />
        </div>
      </div>

      <!-- Receipt -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Bank Transfer Receipt</label>
        <div class="relative">
          <input type="text" id="receiptFileName" class="w-full border rounded-lg px-4 py-2 pr-28 text-sm text-gray-700 bg-gray-100 cursor-default" placeholder="No file chosen" readonly />
          <label for="receipt" class="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-1.5 rounded cursor-pointer text-sm font-medium">Browse</label>
          <input type="file" id="receipt" name="receipt" class="hidden" onchange="$('#receiptFileName').val(this.files[0]?.name)" />
        </div>
      </div>

      <!-- Delivery Note -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Delivery Note</label>
        <div class="relative">
          <input type="text" id="noteFileName" class="w-full border rounded-lg px-4 py-2 pr-28 text-sm text-gray-700 bg-gray-100 cursor-default" placeholder="No file chosen" readonly />
          <label for="note" class="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-1.5 rounded cursor-pointer text-sm font-medium">Browse</label>
          <input type="file" id="note" name="note" class="hidden" onchange="$('#noteFileName').val(this.files[0]?.name)" />
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-3 pt-4 border-t">
        <button type="button" id="cancelAttachmentUpload" class="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200">Cancel</button>
        <button type="submit" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Save</button>
      </div>
    </form>
  </div>
</div>

<!-- View Investment Attachment Modal -->
<div id="investmentAttachmentModal" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-50 backdrop-blur-sm px-4">
  <div class="bg-white max-w-4xl w-full rounded-2xl shadow-xl overflow-hidden flex flex-col" style="max-height: 85vh;">

    <!-- Modal Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
      <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
        <i class="bi bi-folder2-open text-blue-600 text-2xl"></i>
        <span>Attachment Viewer – Investment <span id="attachmentViewerTitle" class="text-gray-600 font-medium text-base"></span></span>
      </h2>
      <button id="closeInvestmentViewModal" class="text-gray-500 hover:text-red-600 text-2xl font-bold">&times;</button>
    </div>

    <!-- Modal Body -->
    <div id="pdfContentForDownload" class="space-y-4 text-sm px-6 py-4 overflow-auto max-h-[65vh]">
      <div class="flex justify-between items-center">
        <strong>Invoice:</strong>
        <div class="flex items-center gap-2">
          <a id="iviewInvoiceLink" href="#" target="_blank" class="text-blue-600 underline">Open</a>
          <span id="iviewInvoiceName" class="text-gray-500 text-xs"></span>
        </div>
      </div>
      <div class="flex justify-between items-center">
        <strong>Bank Transfer Receipt:</strong>
        <div class="flex items-center gap-2">
          <a id="iviewReceiptLink" href="#" target="_blank" class="text-blue-600 underline">Open</a>
          <span id="iviewReceiptName" class="text-gray-500 text-xs"></span>
        </div>
      </div>
      <div class="flex justify-between items-center">
        <strong>Delivery Note:</strong>
        <div class="flex items-center gap-2">
          <a id="iviewNoteLink" href="#" target="_blank" class="text-blue-600 underline">Open</a>
          <span id="iviewNoteName" class="text-gray-500 text-xs"></span>
        </div>
      </div>
    </div>

    <!-- Modal Footer -->
    <div class="flex justify-end items-center gap-4 px-6 py-4 border-t bg-gray-50">
      <button id="invDownloadBtn" class="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md font-medium">
        <i class="bi bi-download"></i> Download PDF
      </button>
      <button id="closeInvestmentViewModalBottom" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-medium">
        Close
      </button>
    </div>

  </div>
</div>

<!-- Murabaha Date Modal -->
<div id="murabahaDateModal" class="fixed inset-0 bg-black/60 hidden items-center justify-center z-50">
  <div class="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
    <h2 class="text-xl font-bold mb-4">Select Murabaha Start Date</h2>
    <input type="date" id="murabahaDateInput" class="w-full border px-3 py-2 rounded mb-4" />
    <div class="flex justify-end gap-3">
      <button id="cancelMurabahaDate" class="bg-gray-300 px-4 py-2 rounded">Cancel</button>
      <button id="saveMurabahaDateBtn" class="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
    </div>
  </div>
</div>