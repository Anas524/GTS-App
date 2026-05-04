@php($isClosed = $isClosed ?? (isset($cycle) && ($cycle->status ?? null) === 'closed'))

<div class="p-6">
  <!-- <h2 class="text-2xl font-bold mb-4">Material Sheet</h2> -->

  <!-- Totals Section -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

    <!-- Total Material -->
    <div class="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-blue-700">
      <h3 class="text-gray-500 font-medium text-sm mb-2">Total Material</h3>
      <p id="gtsMaterialTotal" class="text-2xl font-bold text-blue-700">0.00</p>
    </div>

    <!-- Total Shipping Cost -->
    <div class="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-blue-700">
      <h3 class="text-gray-500 font-medium text-sm mb-2">Total Shipping Cost</h3>
      <p id="gtsShippingTotal" class="text-2xl font-bold text-blue-700">0.00</p>
    </div>

    <!-- Total Investment Amount -->
    <div class="bg-white rounded-2xl shadow-lg p-6 text-center border-l-4 border-green-700">
      <h3 class="text-gray-500 font-medium text-sm mb-2">Total Investment Amount</h3>
      <p id="totalInvestmentAmount-material" class="text-2xl font-bold text-green-700">AED 0.00</p>
    </div>

  </div>

  <!-- Add Row Button -->
  <button id="addRowBtn"
    class="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
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
          <th class="border p-2 w-32">Invoice No</th>
          <th class="border p-2 w-32">Supplier Name</th>
          <th class="border p-2 w-32">Brief Description</th>
          <th class="border p-2 w-32">Total Material</th>
          <th class="border p-2 w-32">Total Shipping Cost</th>
          @unless ($isClosed)
          <th class="border p-2 w-24 action-col" data-col="action">Action</th>
          @endunless
        </tr>
      </thead>
      <tbody id="materialTableBody">
        <!-- Rows will be dynamically inserted -->
      </tbody>
    </table>
  </div>

  <template id="itemRowTemplate">
    <tr class="item-row bg-yellow-100">
      <td class="border p-1 text-center w-5">__SNO__</td>

      <!-- Description -->
      <td class="border p-1 w-64 relative">
        <textarea
          placeholder="Description"
          data-field="description"
          rows="1"
          class="material-input editable-input w-full rounded px-1 py-0.5 align-middle bg-white border border-gray-300 focus:outline-none resize-none overflow-hidden whitespace-pre-wrap break-words"></textarea>
      </td>

      <!-- No. of Units -->
      <td class="border p-1 w-24 relative">
        <input
          type="number"
          placeholder="0"
          data-field="units"
          step="0.0000001"
          inputmode="decimal"
          class="material-input editable-input w-full rounded px-1 py-0.5 bg-white border border-gray-300 focus:outline-none" />
      </td>

      <!-- Unit Material wout VAT -->
      <td class="border p-1 w-40 relative">
        <input
          type="number"
          placeholder="0"
          data-field="unitPrice"
          step="0.0000001"
          inputmode="decimal"
          class="material-input editable-input w-full rounded px-1 py-0.5 bg-white border border-gray-300 focus:outline-none" />
      </td>

      <!-- VAT 5% -->
      <td class="border p-1 w-20 relative">
        <input
          type="number"
          placeholder="0"
          data-field="vat"
          step="0.0000001"
          inputmode="decimal"
          class="material-input editable-input w-full rounded px-1 py-0.5 bg-white border border-gray-300 focus:outline-none" />
      </td>

      <!-- Total Price (calculated) -->
      <td class="border p-1 total-material w-40">0</td>

      <!-- Weight -->
      <td class="border p-1 w-32 relative">
        <input
          type="number"
          placeholder="0"
          data-field="weightPerCtn"
          step="0.0000001"
          inputmode="decimal"
          class="material-input editable-input w-full rounded px-1 py-0.5 bg-white border border-gray-300 focus:outline-none" />
      </td>

      <!-- No. of CTNS -->
      <td class="border p-1 w-24 relative">
        <input
          type="number"
          placeholder="0"
          data-field="ctns"
          step="0.0000001"
          inputmode="decimal"
          class="material-input editable-input w-full rounded px-1 py-0.5 bg-white border border-gray-300 focus:outline-none" />
      </td>

      <!-- Total Weight (calculated) -->
      <td class="border p-1 total-weight w-32">0</td>

      <td class="border p-1 text-center">
        <button class="delete-item-btn text-red-500 hover:text-red-700">
          &times;
        </button>
      </td>
    </tr>
  </template>

  <!-- Modal Backdrop -->
  <div id="addRowModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
      <h2 class="text-xl font-semibold mb-4">Add New Investment Row</h2>
      <form id="addRowForm">
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium mb-1">Invoice Date</label>
            <input id="modalInvoiceDate" name="invoice_date" type="date" placeholder="e.g., 28 June 2025" class="w-full border border-gray-300 rounded px-3 py-2" required />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Invoice No</label>
            <input id="modalInvoiceNo" name="invoice_no" type="text" placeholder="Enter Invoice No" class="w-full border border-gray-300 rounded px-3 py-2" />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Supplier Name</label>
            <input id="modalSupplierName" name="supplier_name" type="text" placeholder="Supplier Name" class="w-full border border-gray-300 rounded px-3 py-2" required />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1">Brief Description</label>
            <input id="modalDescription" name="brief_description" type="text" placeholder="Brief Description" class="w-full border border-gray-300 rounded px-3 py-2" required />
          </div>
        </div>
        <div class="mt-6 flex justify-end space-x-2">
          <button id="modalCancelBtn" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  <div id="deleteConfirmModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
      <h2 class="text-xl font-semibold mb-4 text-center">Confirm Delete</h2>
      <p class="text-center mb-6">Are you sure you want to delete this row?</p>
      <div class="flex justify-center space-x-4">
        <button id="cancelDeleteBtn" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
        <button id="confirmDeleteBtn" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
      </div>
    </div>
  </div>

  <!-- Confirm Item Delete Modal -->
  <div id="confirmItemDeleteModal" class="fixed inset-0 bg-black bg-opacity-40 z-50 hidden justify-center items-center">
    <div class="bg-white p-6 rounded shadow-xl w-80 text-center">
      <p class="mb-4 text-lg font-semibold text-gray-800">Delete this item?</p>
      <div class="flex justify-center gap-4">
        <button id="confirmItemDeleteBtn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-1 rounded">Delete</button>
        <button id="cancelItemDeleteBtn" class="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-1 rounded">Cancel</button>
      </div>
    </div>
  </div>

  <!-- Type Selection Modal -->
  <div id="typeSelectModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
      <h2 class="text-xl font-semibold mb-4 text-center">Select Entry Type</h2>
      <div class="flex flex-col space-y-3">
        <button id="selectMaterialBtn" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Material Layout
        </button>
        <button id="selectInvestmentBtn" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Investment Layout
        </button>
      </div>
      <div class="mt-4 flex justify-center">
        <button id="cancelTypeSelectBtn" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
          Cancel
        </button>
      </div>
    </div>
  </div>
  {{-- MATERIAL: Upload Modal (Metal-ledger style) --}}
  <div id="matAttUploadModal" class="pm-modal hidden fixed inset-0 z-[9999]">
    <div class="pm-backdrop absolute inset-0" id="matAttUploadBackdrop"></div>

    <div class="pm-modal-wrap">
      <div class="pm-panel pm-panel--upload">
        <div class="pm-panel-head flex items-center justify-between px-6 py-4">
          <div>
            <div class="text-lg font-semibold">Upload Attachments</div>
            <div class="text-xs pm-subtext">PDF and images only, max 25MB each.</div>
          </div>
          <button type="button" class="pm-close-btn" id="matAttUploadClose">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="pm-panel-body p-6 space-y-5">
          <form id="matAttUploadForm" enctype="multipart/form-data">
            <input type="hidden" id="matAttRowId" name="row_id" value="">
            <input type="hidden" id="matRemoveInvoice" name="remove_invoice" value="0">
            <input type="hidden" id="matRemoveReceipt" name="remove_receipt" value="0">
            <input type="hidden" id="matRemoveNote" name="remove_note" value="0">

            <div class="pm-upload-grid">
              <!-- Invoice -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <div class="text-sm font-semibold">Invoice</div>
                </div>

                <input id="matInvoiceInput" type="file" name="invoice[]" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" class="hidden">

                <div class="pm-dropzone pm-dropzone--compact" data-pick="invoice">
                  <div class="pm-fileline">
                    <div class="pm-filemeta">
                      <div id="matInvoiceLabel" class="pm-file-name">No file selected yet.</div>
                    </div>
                    <button type="button" class="pm-btn pm-btn-secondary" data-browse="invoice">
                      <i class="bi bi-folder2-open"></i> Browse
                    </button>
                  </div>
                </div>
              </div>

              <!-- Receipt -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <div class="text-sm font-semibold">Bank Transfer Receipt</div>
                </div>

                <input id="matReceiptInput" type="file" name="receipt[]" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" class="hidden">

                <div class="pm-dropzone pm-dropzone--compact" data-pick="receipt">
                  <div class="pm-fileline">
                    <div class="pm-filemeta">
                      <div id="matReceiptLabel" class="pm-file-name">No file selected yet.</div>
                    </div>
                    <button type="button" class="pm-btn pm-btn-secondary" data-browse="receipt">
                      <i class="bi bi-folder2-open"></i> Browse
                    </button>
                  </div>
                </div>
              </div>

              <!-- Note -->
              <div>
                <div class="flex items-center justify-between mb-1">
                  <div class="text-sm font-semibold">Delivery Note</div>
                </div>

                <input id="matNoteInput" type="file" name="note[]" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" class="hidden">

                <div class="pm-dropzone pm-dropzone--compact" data-pick="note">
                  <div class="pm-fileline">
                    <div class="pm-filemeta">
                      <div id="matNoteLabel" class="pm-file-name">No file selected yet.</div>
                    </div>
                    <button type="button" class="pm-btn pm-btn-secondary" data-browse="note">
                      <i class="bi bi-folder2-open"></i> Browse
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="pt-4">
              <div class="text-sm font-semibold mb-2">Existing attachments</div>

              <!-- loading -->
              <div id="matExistingLoading" class="hidden text-sm text-slate-500 flex items-center gap-2">
                <i class="bi bi-arrow-repeat animate-spin"></i>
                <span>Loading attachments…</span>
              </div>

              <!-- list -->
              <div id="matExistingList" class="space-y-2 max-h-40 overflow-auto"></div>
            </div>
          </form>
        </div>

        <div class="pm-panel-foot flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button type="button" id="matAttUploadCancel" class="pm-btn pm-btn-secondary">Cancel</button>
          <button type="button" id="matAttUploadBtn" class="pm-btn pm-btn-primary">
            <i class="bi bi-cloud-arrow-up"></i> Upload
          </button>
        </div>
      </div>
    </div>
  </div>

  {{-- MATERIAL: Viewer Modal (Metal-ledger style) --}}
  <div id="matAttViewerModal" class="pm-modal hidden fixed inset-0 z-[9999]">
    <div class="pm-backdrop absolute inset-0" id="matAttViewerBackdrop"></div>

    <div class="pm-modal-wrap">
      <div class="pm-panel pm-panel--viewer">
        <div class="pm-panel-head flex items-center justify-between px-6 py-4">
          <div>
            <div class="text-lg font-semibold">Attachments Viewer</div>
            <div class="text-xs pm-subtext" id="matViewerSubTitle"></div>
          </div>
          <button type="button" class="pm-close-btn" id="matAttViewerClose">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="pm-panel-body grid grid-cols-12">
          <div class="col-span-4 border-r border-slate-200 p-4">
            <div id="matViewerList" class="space-y-2"></div>
          </div>

          <div class="col-span-8 p-4">
            <div id="matPreviewBox" class="bg-black rounded-xl h-[440px] flex items-center justify-center overflow-hidden">

              <iframe id="matPreviewFrame" class="w-full h-full hidden"></iframe>

              <img id="matPreviewImg" class="hidden max-h-full max-w-full object-contain" />

              <div id="matPreviewEmpty" class="flex flex-col items-center justify-center text-center text-gray-300 w-full h-full">
                <i class="bi bi-image text-4xl mb-2 opacity-70"></i>
                <span class="text-sm tracking-wide">Select a file to preview</span>
              </div>

            </div>

            <div class="flex items-center justify-between mt-4">

              <div class="flex items-center gap-3">
                <a id="matDownloadBtn" href="#" class="pm-btn pm-btn-secondary">
                  <i class="bi bi-download"></i> Download
                </a>

                <a id="matDownloadAllBtn" href="#" class="pm-btn pm-btn-primary">
                  <i class="bi bi-download"></i> Download All
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</div>