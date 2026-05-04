@php($isClosed = $isClosed ?? (isset($cycle) && ($cycle->status ?? null) === 'closed'))

<div class="sq-client-wrapper px-4 py-6 min-h-screen">
  <div class="max-w-2xl mx-auto">
    <!-- Form Card -->
    <div class="bg-white rounded-lg shadow-lg mb-6">
      <div class="p-6">
        <h4 class="text-xl font-bold text-center text-gray-800 mb-6">💵 SQ Client Payment Entry</h4>
        <form id="sqClientForm" action="{{ url('/sq-client/save') }}" method="POST">
          @csrf
          <div>
            <label for="sqDate" class="block font-medium mb-1">Date</label>
            <input type="date" id="sqDate" name="date" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label for="sqAmount" class="block font-medium mb-1">Amount (AED)</label>
              <input type="number" step="any" id="sqAmount" name="amount" placeholder="e.g. 2000.00" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label for="sqRemarks" class="block font-medium mb-1">Remarks</label>
              <input type="text" id="sqRemarks" name="remarks" placeholder="Optional" class="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div class="text-center mt-4">
            <button type="submit" class="bg-black text-white px-6 py-2 rounded hover:bg-gray-700">Submit Payment</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Summary Box -->
    <div class="bg-white rounded-lg shadow-sm py-4 px-6 mb-6 text-center border-l-4 border-green-500">
      <h5 class="text-gray-600">Total Amount Collected for SQ Sheet</h5>
      <h3 class="text-2xl text-green-600 mt-2 font-bold" id="sq-total-amount">AED 0.00</h3>
    </div>
  </div>

  <div class="max-w-2xl mx-auto">
    <!-- Table Section -->
    <div class="mt-8">
      <table class="min-w-full bg-white us-table">
        <thead class="text-sm">
          <tr class="bg-black text-white sticky top-0 z-40">
            <th class="p-2 w-5">SR.NO</th>
            <th class="p-2 w-32">Date</th>
            <th class="p-2 w-32">Amount</th>
            <th class="p-2">Remarks</th>
            @unless ($isClosed)
              <th class="p-2 w-24">Action</th>
            @endunless
          </tr>
          <tr class="bg-gray-100 text-black sticky top-9 z-30">
            <th>
              <input type="text" class="column-filter w-full px-2 py-1 border border-gray-300 rounded text-sm" data-index="0" placeholder="Filter..." />
            </th>
            <th class="relative">
              <input type="text" id="sqDateFilterInput" class="date-filter w-full px-2 py-1 border border-gray-300 rounded cursor-pointer text-sm bg-white" placeholder="Select Date Range" readonly />
              <div id="sqDateFilterPopup" class="absolute hidden z-40 bg-white border shadow-lg p-4 w-[240px] rounded text-sm left-0">
                <label class="block mb-1 font-medium">From Date:</label>
                <input type="date" id="sqDateFilterFrom" class="w-full border border-gray-300 rounded mb-2 px-2 py-1" />
                <label class="block mb-1 font-medium">To Date:</label>
                <input type="date" id="sqDateFilterTo" class="w-full border border-gray-300 rounded mb-3 px-2 py-1" />
                <div class="space-y-2">
                  <button id="applySqDateFilterBtn" class="w-full bg-blue-500 text-white py-1 rounded hover:bg-blue-600 transition">Apply Filter</button>
                  <button id="clearSqDateFilterBtn" class="w-full bg-gray-300 text-gray-800 py-1 rounded hover:bg-gray-400 transition">Clear Filter</button>
                  <button id="sqFilteredExcelBtn" class="w-full bg-white border text-sm py-1 rounded hidden">
                    <img src="https://img.icons8.com/color/24/microsoft-excel-2019--v1.png" class="inline" /> Export Excel
                  </button>
                </div>
              </div>
            </th>
            <th>
              <input type="text" class="column-filter w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="Filter..." />
            </th>
            <th>
              <input type="text" class="column-filter w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="Filter..." />
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody id="sq-client-body" class="text-center text-sm">
          <!-- JS rows go here -->
        </tbody>
      </table>
    </div>

    <!-- Delete Confirmation Modal -->
    <div id="sqDeleteModal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center z-50">
      <div class="bg-white rounded-lg w-full max-w-md shadow-lg">
        <div class="bg-red-600 text-white px-4 py-3 flex justify-between items-center">
          <h5 class="text-lg font-semibold">Confirm Delete</h5>
          <button class="text-white text-xl" onclick="document.getElementById('sqDeleteModal').classList.add('hidden')">&times;</button>
        </div>
        <div class="px-6 py-4 text-center">
          Are you sure you want to delete this record?
          <input type="hidden" id="sqDeleteId">
        </div>
        <div class="px-6 pb-4 flex justify-center gap-4">
          <button onclick="document.getElementById('sqDeleteModal').classList.add('hidden')" class="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
          <button id="confirmSqDeleteBtn" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">Delete</button>
        </div>
      </div>
    </div>
  </div>
</div>