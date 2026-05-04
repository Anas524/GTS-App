<div id="local-sales-root">
    <input type="hidden" class="local-sheet-flag" value="1" />

    <!-- Totals card -->
    <div id="localSalesTotals" class="mb-4">
        <div class="bg-white rounded-2xl shadow-lg p-4 border-l-4 border-blue-800 flex items-center justify-between">
            <div>
                <div class="text-gray-500 text-sm">Total Sales (incl VAT)</div>
                <div id="localTotalSales" class="text-2xl font-bold text-blue-800">AED 0.00</div>
            </div>
            <div id="localTotalCount" class="text-xs text-gray-400"></div>
        </div>
    </div>

    <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold">Local Sales</h2>
        <button id="localAddBtn" class="px-4 py-2 rounded-lg bg-[#d7efff] text-blue-900 hover:bg-[#c8e7ff] border border-blue-200">
            + Add Row
        </button>
    </div>

    <div class="bg-white shadow rounded-2xl border border-gray-100 overflow-x-auto">
        <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-gray-700">
                <tr>
                    <th class="px-3 py-3 text-left">S.No</th>
                    <th class="px-3 py-3 text-left">Date</th>
                    <th class="px-3 py-3 text-left">Client</th>
                    <th class="px-3 py-3 text-left">Brief Description</th>
                    <th class="px-3 py-3 text-right">Total Amount</th>
                    <th class="px-3 py-3 text-center">Actions</th>
                </tr>
            </thead>
            <tbody id="localSalesBody" class="divide-y divide-gray-100"></tbody>
        </table>
    </div>

    {{-- Quick-add Modal (only basic fields) --}}
    <div id="localModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50 p-4">
        <div class="bg-white w-full max-w-xl rounded-2xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold">Add Local Sale (basic)</h3>
                <button id="closeLocalModal" class="text-2xl leading-none">&times;</button>
            </div>

            <form id="localQuickForm" autocomplete="off">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="qDate" class="block text-sm mb-1">Date</label>
                        <input
                            type="date"
                            id="qDate"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            required
                            autofocus>
                    </div>

                    <div>
                        <label for="qClient" class="block text-sm mb-1">Client</label>
                        <input
                            type="text"
                            id="qClient"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            placeholder="e.g., Gharib"
                            required>
                    </div>

                    <div class="md:col-span-2">
                        <label for="qDesc" class="block text-sm mb-1">Description</label>
                        <input
                            type="text"
                            id="qDesc"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            placeholder="Brief description (optional)">
                    </div>
                </div>

                <div class="mt-6 flex justify-end gap-2">
                    <button type="button" id="cancelLocal" class="px-4 py-2 rounded-lg border hover:bg-gray-50">Cancel</button>
                    <button type="submit" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Add</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Upload Attachments (Local Sales) -->
    <div id="lsUploadModal" class="fixed inset-0 hidden items-center justify-center bg-black/50 z-50 p-4">
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-xl">
            <div class="flex items-center justify-between px-6 py-4 border-b">
                <h3 class="text-xl font-semibold">Upload Attachments</h3>
                <button class="text-2xl leading-none" id="lsUploadClose" aria-label="Close">&times;</button>
            </div>

            <form id="lsUploadForm" class="p-6 space-y-5" enctype="multipart/form-data">
                <input type="hidden" id="lsUploadSaleId" name="sale_id" value="">

                <!-- Invoice -->
                <div>
                    <label class="block text-sm font-medium mb-1">Invoice</label>
                    <div class="flex">
                        <input type="text" class="flex-1 border rounded-l px-3 py-2 bg-gray-50 text-gray-600"
                            value="No file chosen" readonly data-fp-label="ls-invoice">
                        <button type="button" class="px-4 py-2 border border-l-0 rounded-r bg-blue-50 text-blue-700 fp-browse"
                            data-for="ls-invoice">Browse</button>
                    </div>
                    <input id="ls-invoice" class="fp-input hidden" type="file" name="invoice"
                        accept=".pdf,.jpg,.jpeg,.png,.webp">
                </div>

                <!-- Bank Transfer Receipt -->
                <div>
                    <label class="block text-sm font-medium mb-1">Bank Transfer Receipt</label>
                    <div class="flex">
                        <input type="text" class="flex-1 border rounded-l px-3 py-2 bg-gray-50 text-gray-600"
                            value="No file chosen" readonly data-fp-label="ls-receipt">
                        <button type="button" class="px-4 py-2 border border-l-0 rounded-r bg-blue-50 text-blue-700 fp-browse"
                            data-for="ls-receipt">Browse</button>
                    </div>
                    <input id="ls-receipt" class="fp-input hidden" type="file" name="receipt"
                        accept=".pdf,.jpg,.jpeg,.png,.webp">
                </div>

                <!-- Delivery Note -->
                <div>
                    <label class="block text-sm font-medium mb-1">Delivery Note</label>
                    <div class="flex">
                        <input type="text" class="flex-1 border rounded-l px-3 py-2 bg-gray-50 text-gray-600"
                            value="No file chosen" readonly data-fp-label="ls-note">
                        <button type="button" class="px-4 py-2 border border-l-0 rounded-r bg-blue-50 text-blue-700 fp-browse"
                            data-for="ls-note">Browse</button>
                    </div>
                    <input id="ls-note" class="fp-input hidden" type="file" name="note"
                        accept=".pdf,.jpg,.jpeg,.png,.webp">
                </div>

                <div class="flex items-center justify-end gap-3 pt-2 border-t">
                    <button type="button" class="px-4 py-2 rounded bg-gray-200" id="lsUploadCancel">Cancel</button>
                    <button type="submit" class="px-4 py-2 rounded bg-blue-600 text-white">Save</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Attachment Viewer (Local Sales) -->
    <div id="lsViewModal" class="fixed inset-0 hidden items-center justify-center bg-black/50 z-50 p-4">
        <div class="bg-white w-full max-w-3xl rounded-2xl shadow-xl">
            <div class="flex items-center justify-between px-6 py-4 border-b">
                <h3 class="text-xl font-semibold">Attachment Viewer – Local Sales</h3>
                <button class="text-2xl leading-none" id="lsViewClose" aria-label="Close">&times;</button>
            </div>

            <div class="p-6 space-y-4" id="lsViewBody">
                <!-- Filled by JS -->
            </div>

            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t">
                <a id="lsDownloadPdfBtn" class="px-4 py-2 rounded bg-slate-800 text-white" href="#" target="_blank"><i class="bi bi-download"></i> Download PDF</a>
                <button class="px-4 py-2 rounded bg-gray-200" id="lsViewClose2">Close</button>
            </div>
        </div>
    </div>

</div>