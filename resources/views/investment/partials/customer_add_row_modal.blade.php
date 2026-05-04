<div id="customerAddRowModal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50">
  <div class="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
    <h2 class="text-xl font-semibold mb-4">Add Customer Sheet Row</h2>
    <form id="customerAddRowForm">
      <div class="space-y-3">
        <div>
          <label class="block text-sm font-medium mb-1">Date</label>
          <input id="customerDate" name="date" type="date" class="w-full border border-gray-300 rounded px-3 py-2" required>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Supplier</label>
          <input id="customerSupplier" name="supplier" type="text" placeholder="Supplier Name" class="w-full border border-gray-300 rounded px-3 py-2">
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Brief Description</label>
          <input id="customerDescription" name="description" type="text" placeholder="Enter brief description" class="w-full border border-gray-300 rounded px-3 py-2">
        </div>
      </div>
      <div class="mt-6 flex justify-end space-x-2">
        <button id="customerRowCancelBtn" type="button" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
        <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
      </div>
    </form>
  </div>
</div>