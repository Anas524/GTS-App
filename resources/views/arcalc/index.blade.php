<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Amazon Revenue Calculator</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="icon" href="{{ asset('images/Title-Logo.png') }}">
    <link rel="stylesheet" href="{{ asset('css/arcalc.css?v=16') }}">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        brand: '#00569f',
                        accent: '#ffd863'
                    }
                }
            }
        }
    </script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
</head>

<body class="bg-slate-50 text-slate-900">

    <div class="max-w-[1200px] mx-auto px-4 py-8">
        <div class="header-section flex flex-col md:flex-row items-center justify-center relative mb-12 space-y-4 md:space-y-0">
            {{-- Back to Dashboard --}}
              @auth
                <a href="{{ route('admin.dashboard') }}"
                   class="group md:absolute left-0 top-0 z-10 inline-flex items-center gap-2 rounded-full
                          border border-brand/70 bg-white px-4 py-2 text-sm font-semibold
                          text-brand shadow-sm transition-colors duration-150
                          hover:bg-brand hover:text-white hover:border-brand
                          focus:outline-none focus:ring-2 focus:ring-brand/30">
                  <i class="bi bi-arrow-left-short text-base transition-colors group-hover:text-white"></i>
                  <span>Back to Dashboard</span>
                </a>
              @endauth
            <img src="{{ asset('images/arlogo.png') }}" class="h-16 md:h-20 absolute right-0 top-0" alt="logo">
            <h1 class="text-3xl font-bold text-center">Amazon Revenue Calculator</h1>
        </div>

        <!-- CARD: Form -->
        <form id="entry-form" enctype="multipart/form-data" class="space-y-6">
            <!-- Row 1 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="input-group">
                    <input type="text" id="customerName" name="customerName" placeholder=" " />
                    <label for="customerName">Customer Name</label>
                </div>
                <div class="input-group">
                    <input type="text" id="brandName" name="brandName" placeholder=" " />
                    <label for="brandName">Brand Name</label>
                </div>
                <div class="input-group">
                    <input type="text" id="asin" name="asin" placeholder=" " />
                    <label for="asin">ASIN</label>
                </div>
            </div>

            <!-- Row 2 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="input-group">
                    <input type="text" id="briefDescription" name="briefDescription" placeholder=" " />
                    <label for="briefDescription">Brief Description</label>
                </div>
                <div class="input-group">
                    <input type="number" step="0.01" id="shippingCost" name="shippingCost" placeholder=" " />
                    <label for="shippingCost">Shipping Cost</label>
                </div>
                <div class="input-group">
                    <input type="number" step="0.01" id="labelingCharges" name="labelingCharges" placeholder=" " />
                    <label for="labelingCharges">Labeling Charges</label>
                </div>
            </div>

            <!-- Row 3 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="input-group">
                    <input type="number" step="0.01" id="goodsCost" name="goodsCost" placeholder=" " />
                    <label for="goodsCost">Goods Cost</label>
                </div>
                <div class="input-group">
                    <input type="number" step="0.01" id="fulfillment" name="fulfillment" placeholder=" " />
                    <label for="fulfillment">Fulfillment</label>
                </div>
                <div class="input-group">
                    <input type="number" step="0.01" id="sellPrice" name="sellPrice" placeholder=" " />
                    <label for="sellPrice">Sell Price</label>
                </div>
            </div>

            <!-- Row 4 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="input-group">
                    <input type="number" step="0.01" id="amazonStorageCharges" name="amazonStorageCharges" placeholder=" " />
                    <label for="amazonStorageCharges">Amazon Storage Charges</label>
                </div>
                <div class="input-group">
                    <input type="text" id="originPurchase" name="originPurchase" placeholder=" " />
                    <label for="originPurchase">Origin of Purchase</label>
                </div>
                <div class="input-group">
                    <input type="number" id="unitsSold" name="unitsSold" placeholder=" " />
                    <label for="unitsSold">Units Sold</label>
                </div>
            </div>

            <!-- Row 5 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="input-group">
                    <input type="number" step="0.01" id="tariffPercentage" name="tariffPercentage" placeholder=" " />
                    <label for="tariffPercentage">Tariff (%)</label>
                </div>
                <div class="flex items-center gap-3">
                    <input type="checkbox" id="lowInventoryFee" name="lowInventoryFee"
                        class="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                    <label for="lowInventoryFee" class="text-gray-700">Low Inventory Fee</label>
                </div>
            </div>

            <!-- Row 6 -->
            <div class="grid grid-cols-1 gap-6">
                <div class="input-group">
                    <textarea id="description" name="description" rows="3" placeholder=" "></textarea>
                    <label for="description">Description</label>
                </div>
            </div>

            <!-- Row 7 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="input-group">
                    <input type="url" id="productLink" name="productLink" placeholder=" " />
                    <label for="productLink">Product Link</label>
                </div>

                <!-- File Upload -->
                <div class="flex flex-col">
                    <label class="mb-2 text-gray-700">Upload Image</label>
                    <input type="file" id="image" name="image" accept="image/*"
                        class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                                file:rounded-lg file:border-0 file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100">

                    <p id="imageHint" class="mt-1 text-xs text-slate-500">
                        No file selected — existing image will be kept.
                    </p>

                    <!-- preview wrapper -->
                    <div id="previewWrap" class="hidden mt-3 rounded-lg border bg-white p-2 flex items-center justify-center">
                        <img id="preview" src="" alt="Preview" class="block max-h-40 w-auto object-contain" />
                    </div>
                </div>
            </div>

            <!-- Buttons -->
            <div class="mt-6 space-y-3">
                <button id="submitBtn" type="submit"
                    class="w-full py-3 md:py-2 bg-accent hover:bg-yellow-500 text-black rounded-lg shadow transition font-semibold tracking-wide touch-manipulation">
                    — SUBMIT —
                </button>
                <button id="save-changes-btn" type="button"
                    class="w-full py-3 md:py-2 bg-accent hover:bg-yellow-500 text-black rounded-lg shadow transition hidden font-semibold tracking-wide touch-manipulation">
                    — Save Changes —
                </button>
            </div>
        </form>

        <!-- Filters / Toolbar -->
        <div class="flex flex-wrap items-center gap-4 mt-8">
            <!-- Search -->
            <div class="relative flex-grow min-w-[200px] md:w-64">
                <input id="search" placeholder=" "
                    class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 peer bg-white" />
                <label for="search"
                    class="absolute left-3 -top-2.5 bg-white px-1 text-xs text-gray-600 peer-placeholder-shown:top-2.5 peer-placeholder-shown:left-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-gray-400 peer-focus:-top-2.5 peer-focus:left-3 peer-focus:text-xs peer-focus:text-blue-600 transition-all">
                    Search…
                </label>
            </div>

            <!-- Brand -->
            <div class="relative flex-grow min-w-[150px] md:w-48">
                <select id="brandFilter"
                    class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white peer appearance-none">
                    <option value="">All Brands</option>
                </select>
                <label for="brandFilter"
                    class="absolute left-3 -top-2.5 bg-white px-1 text-xs text-gray-600 transition-all peer-focus:text-blue-600">
                    Brand
                </label>
                <span class="pointer-events-none absolute right-3 top-3.5 text-gray-400">
                    <i class="bi bi-chevron-down"></i>
                </span>
            </div>

            <!-- Customer -->
            <div class="relative flex-grow min-w-[150px] md:w-56">
                <select id="customerFilter"
                    class="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white peer appearance-none">
                    <option value="">All Customers</option>
                </select>
                <label for="customerFilter"
                    class="absolute left-3 -top-2.5 bg-white px-1 text-xs text-gray-600 transition-all peer-focus:text-blue-600">
                    Customer
                </label>
                <span class="pointer-events-none absolute right-3 top-3.5 text-gray-400">
                    <i class="bi bi-chevron-down"></i>
                </span>
            </div>

            <!-- RIGHT SIDE: counts + export -->
            <div class="ml-auto flex items-center gap-3">
                <span id="pageInfo" class="text-sm text-slate-600 hidden">Total rows: 0</span>

                <button id="downloadExcel" type="button"
                    class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <i class="bi bi-file-earmark-excel"></i>
                    <span>Download Excel</span>
                </button>
            </div>
        </div>

        <!-- Table -->
        <div class="mt-6 bg-white rounded-2xl shadow ring-1 ring-gray-100 overflow-y-visible relative">
            <table id="data-table" class="min-w-full text-sm table-sticky">
                <thead class="bg-brand text-white shadow-sm sticky top-0 z-30">
                    <tr>
                        <th class="p-3 text-left w-12">SN</th>
                        <th class="p-3 text-left">Customer Name</th>
                        <th class="p-3 text-left">Brand Name</th>
                        <th class="p-3 text-left">ASIN</th>
                        <th class="p-3 text-left">Brief Description</th>
                        <th class="p-3 text-right">Buy Price</th>
                        <th class="p-3 text-right">Sell Price</th>
                        <th class="p-3 text-right">Min Sell Price</th>
                        <th class="p-3 text-right">Profit</th>
                        <th class="p-3 text-right">Target Buy Price</th>
                        <th class="p-3 text-center w-28">Actions</th>
                    </tr>
                </thead>
                <tbody id="data-rows"></tbody>
            </table>
        </div>

        <div class="flex justify-between items-center mt-4">
            <div id="pageInfo" class="text-sm text-slate-600 mb-2"></div>
        </div>
    </div>

    <script>
        // e.g. "https://globaltradeservices.ae/"
        window.ASSET_BASE = "{{ rtrim(asset(''), '/') }}/";
    </script>
    <script>
        window.AR = {
            indexUrl: "{{ route('entries.index') }}",
            storeUrl: "{{ route('entries.store') }}",
            updateUrl: "{{ route('entries.update', ['id' => '__ID__']) }}",
            deleteUrl: "{{ route('entries.destroy', ['id' => '__ID__']) }}"
        };
    </script>
    <script src="{{ asset('js/arcalc.js?v=2') }}"></script>
</body>

</html>