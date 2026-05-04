let rowCount = 0;
let editingId = null;
let lastGrandTotal = 0;
let lastFocusId = null;

function setGroupFilled($input) {
    const hasVal = ($input.val() ?? '').toString().trim() !== '';
    $input.closest('.input-group').toggleClass('has-value', hasVal);
}

$(document).ready(function () {
    setMode('create');

    // run on load and whenever the user types/changes
    $('.input-group input, .input-group textarea, .input-group select')
        .each(function () { setGroupFilled($(this)); })
        .on('input change', function () { setGroupFilled($(this)); });

    const ROUTES = {
        LIST: window.AR.indexUrl,
        CREATE: window.AR.storeUrl,
        UPDATE: id => window.AR.updateUrl.replace('__ID__', id),
        DELETE: id => window.AR.deleteUrl.replace('__ID__', id)
    };

    const CSRF = $('meta[name="csrf-token"]').attr('content');

    const $form = $('#entry-form');                 // was #user-form
    const $customerName = $('#customerName');
    const $brandName = $('#brandName');            // was #brand-name
    const $asin = $('#asin');
    const $briefDescription = $('#briefDescription'); // was #brief-description
    const $shippingCost = $('#shippingCost');      // was #shipping-cost
    const $labelingCharges = $('#labelingCharges');// was #labeling-charges
    const $goodsCost = $('#goodsCost');            // was #goods-cost
    const $fulfillment = $('#fulfillment');
    const $sellPrice = $('#sellPrice');            // was #sell-price
    const $amazonStorageCharges = $('#amazonStorageCharges'); // was #amazon-storage-charges
    const $originPurchase = $('#originPurchase');  // was #origin-purchase
    const $unitsSold = $('#unitsSold');            // was #units-sold
    const $tariffPercentage = $('#tariffPercentage'); // was #tariff-percentage
    const $lowInventoryFee = $('#lowInventoryFee');   // was #low-inventory-fee
    const $description = $('#description');
    const $productLink = $('#productLink');
    const $imageInput = $('#image');               // was #image-upload
    const $previewImage = $('#preview');           // was #previewImage

    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    });

    $form.on('submit', function (e) {
        e.preventDefault();

        const fd = new FormData();
        fd.append('customerName', $customerName.val());
        fd.append('brandName', $brandName.val());
        fd.append('asin', $asin.val());
        fd.append('briefDescription', $briefDescription.val());
        fd.append('shippingCost', $shippingCost.val() || 0);
        fd.append('labelingCharges', $labelingCharges.val() || 0);
        fd.append('goodsCost', $goodsCost.val() || 0);
        fd.append('fulfillment', $fulfillment.val() || 0);
        fd.append('sellPrice', $sellPrice.val() || 0);
        fd.append('amazonStorageCharges', $amazonStorageCharges.val() || 0);
        fd.append('originPurchase', $originPurchase.val());
        fd.append('unitsSold', $unitsSold.val() || 0);
        fd.append('tariffPercentage', $tariffPercentage.val() || 0);
        fd.append('lowInventoryFee', $lowInventoryFee.is(':checked') ? 1 : 0);
        fd.append('description', $description.val().trim());
        fd.append('productLink', $productLink.val());
        if ($imageInput[0].files[0]) fd.append('image', $imageInput[0].files[0]);

        $.ajax({
            url: ROUTES.CREATE,
            method: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            headers: { 'X-CSRF-TOKEN': CSRF },
            success: (resp) => {
                $form[0].reset();
                resetPreview();
                editingId = null;
                setMode('create');

                const newRow = resp && resp.row ? resp.row : null;

                if (newRow) {
                    // serial number = count of header rows + 1
                    const headerCount = $('#data-rows > tr[data-id]').length;
                    const sn = headerCount + 1;

                    // append HTML at the end
                    const html = buildRowHtml(newRow, sn);
                    $('#data-rows').append(html);

                    // keep filters up to date
                    updateFilters({
                        brandName: newRow.brand_name || '',
                        customerName: newRow.customer_name || ''
                    });

                    // update "Total rows" label
                    const totalNow = $('#data-rows > tr[data-id]').length;
                    const txt = `Total rows: ${totalNow}`;
                    $('#pageInfo').removeClass('hidden').text(txt);

                    // highlight + scroll to the new row
                    const $header = $(`#data-rows > tr[data-id="${newRow.id}"]`);
                    applyCurrentFiltersToRow($header);

                    $header.addClass('flash-new');

                    // smooth scroll to bottom (or to the row)
                    $('html, body').animate({ scrollTop: $header.offset().top - 80 }, 400);

                    // Recompute totals from DOM so label stays correct
                    const totalHeaders = $('#data-rows > tr[data-id]').length;
                    lastGrandTotal = totalHeaders;
                    updateCounts();

                    updateDownloadState();

                    // remove highlight after a moment
                    setTimeout(() => $header.removeClass('flash-new'), 2200);
                } else {
                    // Fallback if backend didn’t return the row yet
                    load();
                }
            },
            error: (xhr) => {
                console.error(xhr.responseText || xhr);
                alert('Save failed');
            }
        });
    });

    if (localStorage.getItem('scrollToBottom') === 'true') {
        setTimeout(function () {
            $('html, body').animate({
                scrollTop: $('#data-table').offset().top + $('#data-table').height()
            }, 'slow');
            localStorage.removeItem('scrollToBottom');
        }, 1000);
    }

    // EDIT
    $('#data-table')
        .off('click.edit', '.edit-btn')
        .on('click.edit', '.edit-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const $row = $(this).closest('tr[data-id]');
            if (!$row.length) return;

            const $detail = $row.next('tr.detail-row');
            if (!$detail.length) return;

            editingId = $row.data('id') || null;

            const { imageUrl } = populateFormFromRow($row, $detail, { includeImagePreview: true });
            $('#entry-form').data('existing-image', imageUrl);

            setMode('edit');

            $('html, body').stop().animate({ scrollTop: $('#entry-form').offset().top - 16 }, 300);
        });

    // Add event listener for the new "Save Changes" button
    $('#save-changes-btn').on('click', function (e) {
        e.preventDefault();
        if (!editingId) return;

        const fd = new FormData();
        fd.append('customerName', $('#customerName').val());
        fd.append('brandName', $('#brandName').val());
        fd.append('asin', $('#asin').val());
        fd.append('briefDescription', $('#briefDescription').val());
        fd.append('shippingCost', $('#shippingCost').val() || 0);
        fd.append('labelingCharges', $('#labelingCharges').val() || 0);
        fd.append('goodsCost', $('#goodsCost').val() || 0);
        fd.append('fulfillment', $('#fulfillment').val() || 0);
        fd.append('sellPrice', $('#sellPrice').val() || 0);
        fd.append('amazonStorageCharges', $('#amazonStorageCharges').val() || 0);
        fd.append('originPurchase', $('#originPurchase').val());
        fd.append('unitsSold', $('#unitsSold').val() || 0);
        fd.append('tariffPercentage', $('#tariffPercentage').val() || 0);
        fd.append('lowInventoryFee', $('#lowInventoryFee').is(':checked') ? 1 : 0);
        fd.append('description', $('#description').val().trim());
        fd.append('productLink', $('#productLink').val());
        // Use the actual input id: #image
        const $imgInput = $('#image');
        if ($imgInput.length && $imgInput[0].files && $imgInput[0].files.length > 0) {
            fd.append('image', $imgInput[0].files[0]);
        } else {
            // no new file picked — keep existing
            const existing = $('#entry-form').data('existing-image') || '';
            if (existing) fd.append('existing_image', existing);
        }

        $('#save-spinner').removeClass('d-none');
        $('#save-btn-text').text('Saving...');
        $('#save-changes-btn').prop('disabled', true);

        $.ajax({
            url: ROUTES.UPDATE(editingId),
            method: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            headers: { 'X-CSRF-TOKEN': CSRF },

            beforeSend: () => {
                // disable the save button while saving
                $('#save-changes-btn')
                    .prop('disabled', true)
                    .addClass('opacity-50 cursor-not-allowed');
            },

            success: (resp) => {
                // remember which row to focus after reload
                lastFocusId = (resp && resp.row && resp.row.id) ? resp.row.id : editingId;

                // reset form + preview + hint
                $form[0].reset();
                if (typeof resetPreview === 'function') {
                    resetPreview(); // hides preview & #imageHint
                } else {
                    // fallback if resetPreview wasn't defined
                    $('#preview').attr('src', '');
                    $('#previewWrap').addClass('hidden');
                    $('#imageHint').addClass('hidden').text('No file selected — existing image will be kept.');
                }

                // exit edit mode
                editingId = null;
                setMode('create');

                // refresh table
                load();
            },

            error: (xhr) => {
                console.error(xhr.responseText || xhr);
                alert('Update failed');
            },

            complete: () => {
                // re-enable the save button and restore visuals
                $('#saveChangesBtn, #save-changes-btn')
                    .prop('disabled', false)
                    .removeClass('opacity-50 cursor-not-allowed');
            }
        });
    });

    // toggle detail (but ignore clicks on action/interactive elements)
    $('#data-rows').on('click', 'tr[data-row]', function (e) {
        const $t = $(e.target);

        // If click came from any actionable UI, do nothing
        if ($t.closest('.edit-btn, .delete-btn, .copy-btn, button, a, input, select, label, textarea, [data-no-toggle]').length) {
            return;
        }

        const $detail = $(this).next('.detail-row');
        $('.detail-row').not($detail).slideUp(120);
        $detail.slideToggle(120);
    });

    // Filter the rows based on the selected brand
    $('#brandFilter').on('change', function () {
        const val = $(this).val(); // '' means All
        $('#data-table tbody tr').each(function () {
            const $tr = $(this);
            if ($tr.hasClass('detail-row')) return; // skip detail rows
            const brand = $tr.find('.productBrand').text().trim();
            const show = !val || brand === val;
            $tr.toggle(show);
            $tr.next('.detail-row').toggle(false); // keep details collapsed
        });
        resetSerialNumbers();
        updateCounts();
    });


    // Filter the rows based on the selected customer
    $('#customerFilter').on('change', function () {
        const val = $(this).val(); // '' means All
        $('#data-table tbody tr').each(function () {
            const $tr = $(this);
            if ($tr.hasClass('detail-row')) return; // skip detail rows
            const customer = $tr.find('.customerName').text().trim();
            const show = !val || customer === val;
            $tr.toggle(show);
            $tr.next('.detail-row').toggle(false); // keep details collapsed
        });
        resetSerialNumbers();
        updateCounts();
    });

    $('#downloadExcel').click(function () {
        // Create a new workbook and worksheet
        var wb = XLSX.utils.book_new();
        var ws_data = [];

        // Define the header row
        ws_data.push([
            "Serial Number",
            "Customer Name",
            "Product Brand",
            "ASIN",
            "Brief Description",
            "Goods Cost",
            "Sell Price",
            "Min Sell Price",
            "Profit",
            "Target Buy Price",
            "Units Sold",
            "Description",
            "Net Proceeds",
            "Amazon fees",
            "Tariff",
            "Fulfillment fees",
            "Storage Cost",
            "Origin of Purchase",
            "Shipping Cost",
            "Labeling Charges",
            "Return",
            "Low Inventory Fee",
            "Actual Cost"
        ]);

        // Iterate over each data row in the table
        $('#data-table tbody tr').each(function () {
            var $row = $(this);

            // Skip detail rows
            if ($row.hasClass('detail-row')) return;

            // Get the first row's data
            var serialNumber = $row.find('td:eq(0)').text();
            var customerName = $row.find('td:eq(1)').text();
            var productBrand = $row.find('td:eq(2)').text();
            var asin = $row.find('td:eq(3)').text();
            var briefDescription = $row.find('td:eq(4)').text();
            var goodsCost = $row.find('td:eq(5)').text();
            var sellPrice = $row.find('td:eq(6)').text();
            var rockBottomSellPrice = $row.find('td:eq(7)').text();
            var profit = $row.find('td:eq(8)').text();
            var targetBuyPrice = $row.find('td:eq(9)').text();

            // Manually get the next row for details (skip if it's a detail row itself)
            var $detailRow = $row.next('tr.detail-row');
            var unitsSoldText = $detailRow.find('.units-tag').text().trim();
            var unitsSoldMatch = unitsSoldText.match(/\d+/);
            unitsSold = unitsSoldMatch ? unitsSoldMatch[0] : '';
            var description = ($detailRow.find('.detail-desc p').first().text().trim()) || '';
            var netProceeds = $detailRow.find('.net-proceeds').text().trim() || '';
            var amazonFees = $detailRow.find('.amazon-fees').text().trim() || '';
            var tariff = $detailRow.find('.tariff').text().trim() || '';
            var fulfillmentFees = $detailRow.find('.fulfillment-fees').text().trim() || '';
            var storageCost = $detailRow.find('.storage-cost').text().trim() || '';
            var originOfPurchase = $detailRow.find('.origin-of-purchase').text().trim() || '';
            var shippingCost = $detailRow.find('.shipping-cost').text().trim();
            var labelingCharges = $detailRow.find('.labeling-charges').text().trim();
            var returnVal = $detailRow.find('.return').text().trim() || '';
            var lowInventoryFee = $detailRow.find('.low-inventory-fee').text().trim() || '';
            var actualCost = $detailRow.find('.actual-cost').text().trim() || '';

            // Add the row data into the worksheet data array
            ws_data.push([
                serialNumber,
                customerName,
                productBrand,
                asin,
                briefDescription,
                goodsCost,
                sellPrice,
                rockBottomSellPrice,
                profit,
                targetBuyPrice,
                unitsSold,
                description,
                netProceeds,
                amazonFees,
                tariff,
                fulfillmentFees,
                storageCost,
                originOfPurchase,
                shippingCost,
                labelingCharges,
                returnVal,
                lowInventoryFee,
                actualCost
            ]);
        });

        // Convert the data array to a worksheet
        var ws = XLSX.utils.aoa_to_sheet(ws_data);

        // Append the worksheet to the workbook
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

        // Write the workbook to a file
        XLSX.writeFile(wb, "Purchase-Data.xlsx");
    });

    // preview on choose
    $imageInput.on('change', function () {
        if (this.files && this.files[0]) {
            $('#imageHint').removeClass('hidden').text('New image selected — will replace existing on save.');
            const file = this.files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    $('#preview').attr('src', e.target.result);
                    $('#previewWrap').removeClass('hidden');
                };
                reader.readAsDataURL(file);
            } else {
                resetPreview();
            }
        } else {
            // no file chosen
            $('#imageHint').removeClass('hidden').text('No file selected — existing image will be kept.');
            // keep existing preview if editing; if you want to always hide preview, call resetPreview()
        }
    });

    function load() {
        const qs = $.param({
            search: $('#search').val() || '',
            brand: $('#brandFilter').val() || '',
            customer: $('#customerFilter').val() || '',
            _: Date.now() // cache-buster
        });

        $.ajax({
            url: `${ROUTES.LIST}?${qs}`,
            method: 'GET',
            headers: { 'X-CSRF-TOKEN': CSRF },
            success: (resp) => {
                const rows = Array.isArray(resp) ? resp : (resp.data || []);
                const total = resp.total ?? rows.length;
                const grand = resp.grand_total ?? rows.length;

                // Build once, inject once (fast)
                let html = '';
                rowCount = 0;
                rows.forEach((row) => {
                    rowCount++;
                    html += buildRowHtml(row, rowCount);

                    // keep your filter options in sync
                    updateFilters({
                        brandName: row.brand_name || '',
                        customerName: row.customer_name || ''
                    });
                });
                $('#data-rows').html(html);

                // If an update just happened, scroll to that row and flash it
                if (lastFocusId) {
                    const $header = $(`#data-rows > tr[data-id="${lastFocusId}"]`);
                    if ($header.length && $header.is(':visible')) {
                        // optional: open its detail row
                        const $detail = $header.next('.detail-row');
                        $detail.slideDown(120);

                        // flash + scroll
                        $header.addClass('bg-green-50 transition-colors');
                        $('html, body').stop().animate(
                            { scrollTop: Math.max($header.offset().top - 80, 0) },
                            400,
                            () => setTimeout(() => $header.removeClass('bg-green-50'), 1600)
                        );
                    }
                    lastFocusId = null; // reset flag
                }

                updateDownloadState();

                // Show counts
                const txt = (total === grand)
                    ? `Total rows: ${total}`
                    : `Total rows: ${total} (filtered from ${grand})`;
                $('#pageInfo').removeClass('hidden').text(txt);

                // baseline from server
                lastGrandTotal = (resp.grand_total ?? rows.length);

                // This will show “filtered from …” ONLY if filters are active
                updateCounts();

                $('#prevPage, #nextPage').addClass('hidden');
            },
            error: (e) => console.error(e.responseText || e)
        });
    }

    // builds header row + detail row (uses server fields)
    function buildRowHtml(d, sn) {
        // Prefer full URL from server
        const imgSrc = (d.image_src || '').trim();
        const hasImg = !!imgSrc;

        // helpers
        const num = (v) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : 0;
        };
        const n2 = (v) => (v == null || v === '' || isNaN(v) ? '-' : (+v).toFixed(2));

        // resolve values with fallbacks
        const fulfillmentFees = num(d.fulfillment ?? d.fulfillment_fees ?? d.fulfillment_fee);
        const storageCost = num(d.amazon_storage_charges ?? d.storage_cost ?? d.storage);
        const amazonFees = num(d.amazon_fees ?? d.amazon_fee ?? (num(d.sell_price) * 0.18));
        const returnVal = (() => {
            const r = Number(d.return_value);
            if (Number.isFinite(r) && r >= 0) return r;
            return num(d.goods_cost) > 2 ? 0.5 : 0.2;
        })();

        const leftHtml = `
            <div class="detail-left relative">
            ${hasImg
                ? `<img id="image-detail" src="${imgSrc}" alt="image" loading="lazy" decoding="async"
                        class="block max-h-64 w-auto object-contain">`
                : `<div class="block h-64 w-full rounded-lg border border-dashed border-gray-300 bg-gray-50"></div>`
            }
            <div class="units-tag absolute bottom-2 left-2 inline-block rounded bg-black/70 text-white text-xs px-2 py-1">
                Units Sold: ${d.units_sold ?? '-'}
            </div>
            </div>
        `;

        const header = `
        <tr data-id="${d.id}" data-row="${sn}" data-brand="${d.brand_name || ''}" data-customer="${d.customer_name || ''}" data-tariff-percentage="${d.tariff_percentage || 0}">
            <td class="p-3">${sn}</td>
            <td class="customerName p-3">${d.customer_name ?? '-'}</td>
            <td class="productBrand p-3">${d.brand_name ?? '-'}</td>
            <td class="p-3">${d.asin ?? '-'}</td>
            <td class="p-3">${d.brief_description ?? '-'}</td>
            <td class="p-3 text-right tabular-nums">${n2(d.goods_cost)}</td>
            <td class="p-3 text-right tabular-nums">${n2(d.sell_price)}</td>
            <td class="p-3 text-right tabular-nums">${n2(d.min_sell_price)}</td>
            <td class="p-3 text-right tabular-nums">${n2(d.profit)}</td>
            <td class="p-3 text-right tabular-nums">${n2(d.target_buy_price)}</td>
            <td class="p-3 text-center no-toggle" data-no-toggle="1">
                <button class="btn btn-success btn-sm edit-btn px-1.5 py-1 text-sm rounded bg-green-600 hover:bg-green-700 text-white mb-2" title="Edit">
                    <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm copy-btn px-1.5 py-1 text-sm rounded bg-amber-500 hover:bg-amber-600 text-white mb-2" title="Copy">
                    <i class="bi bi-files"></i>
                </button>
                <button class="btn btn-danger btn-sm delete-btn px-1.5 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white mb-2" title="Delete">
                    <i class="bi bi-trash3"></i>
                </button>
            </td>
        </tr>`;

        const detail = `
        <tr class="detail-row" style="display:none;">
            <td colspan="11">
                <div class="detail-wrap p-3">
                    <div class="detail-inner">
                        <!-- LEFT: image -->
                        ${leftHtml}

                        <!-- RIGHT: description + KPIs -->
                        <div class="detail-right">
                            <div class="detail-desc mb-2">
                                <h4>Description:</h4>
                                <p>${d.description ?? '-'}</p>
                                ${d.product_link ? `<a id="productLink" href="${d.product_link}" target="_blank" style="color:#0ea5e9;text-decoration:none;">View Product ↗</a>` : ''}
                            </div>

                            <div class="detail-grid">
                                <div class="kv"><span class="k-label">Profit:</span> <span class="k-val profit"><span class="usd">$</span>${n2(d.profit)}</span></div>
                                <div class="kv"><span class="k-label">Shipping Cost:</span> <span class="k-val shipping-cost"><span class="usd">$</span>${n2(d.shipping_cost)}</span></div>
                                <div class="kv"><span class="k-label">Net Proceeds:</span> <span class="k-val net-proceeds"><span class="usd">$</span>${n2(d.net_proceeds)}</span></div>
                                <div class="kv"><span class="k-label">Labeling Charges:</span> <span class="k-val labeling-charges"><span class="usd">$</span>${n2(d.labeling_charges)}</span></div>
                                <div class="kv"><span class="k-label">Amazon fees:</span> <span class="k-val amazon-fees"><span class="usd">$</span>${n2(amazonFees)}</span></div>
                                <div class="kv"><span class="k-label">Return:</span> <span class="k-val return"><span class="usd">$</span>${n2(returnVal)}</span></div>
                                <div class="kv"><span class="k-label">Fulfillment fees:</span> <span class="k-val fulfillment-fees"><span class="usd">$</span>${n2(fulfillmentFees)}</span></div>
                                <div class="kv"><span class="k-label">Storage Cost:</span> <span class="k-val storage-cost"><span class="usd">$</span>${n2(storageCost)}</span></div>
                                <div class="kv"><span class="k-label">Tariff:</span> <span class="k-val tariff"><span class="usd">$</span>${n2(d.tariff)}</span></div>
                                <div class="kv"><span class="k-label">Low Inventory Fee:</span> <span class="k-val low-inventory-fee"><span class="usd">$</span>${n2(d.low_inventory_fee)}</span></div>
                                <div class="kv"><span class="k-label">Origin of Purchase:</span> <span class="k-val origin-of-purchase">${d.origin_purchase ?? '-'}</span></div>
                                <div class="kv"><span class="k-label">Actual Cost:</span> <span class="k-val actual-cost"><span class="usd">$</span>${n2(d.actual_cost)}</span></div>
                                <div class="kv"><span class="k-label">Min Sell Price:</span> <span class="k-val min-sell-price"><span class="usd">$</span>${n2(d.min_sell_price)}</span></div>
                                <div class="kv"><span class="k-label">Target Buy Price:</span> <span class="k-val target-buy-price"><span class="usd">$</span>${n2(d.target_buy_price)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </td>
        </tr>`;

        return header + detail;
    }

    // attach filters & search AFTER load() is defined
    $('#brandFilter, #customerFilter').on('change', () => {
        load();
    });

    $('#search').on('input', debounce(() => {
        load();
    }, 400));

    // initial load
    load();

    $(document).on('click', '.delete-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const $btn = $(this);
        const $row = $btn.closest('tr');           // header row
        const id = $row.data('id');
        if (!id) return alert('ID missing');
        if (!confirm('Delete this entry?')) return;

        const $detail = $row.next('.detail-row');

        $.ajax({
            url: ROUTES.DELETE(id),
            method: 'POST',
            data: new FormData(),
            processData: false,
            contentType: false,
            headers: { 'X-CSRF-TOKEN': CSRF },

            success: () => {
                $detail.remove();
                $row.remove();
                // re-number
                resetSerialNumbers();
                updateDownloadState();

                // Recompute from DOM; this avoids double-decrements
                const totalHeaders = $('#data-rows > tr[data-id]').length;
                lastGrandTotal = totalHeaders; // new grand total baseline
                updateCounts(); // auto-detects if filtered or not
            },

            error: (xhr) => {
                if (xhr.status === 404) {
                    // Treat as already gone
                    $detail.remove();
                    $row.remove();
                    resetSerialNumbers();

                    const totalHeaders = $('#data-rows > tr[data-id]').length;
                    lastGrandTotal = totalHeaders;
                    updateCounts();
                    console.warn('Row already gone, removed from UI.');
                    return;
                }
                console.error(xhr.responseText || xhr);
                alert('Delete failed');
            }
        });
    });

    // COPY
    $(document).on('click', '.copy-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const $row = $(this).closest('tr[data-id]');
        if (!$row.length) return;

        const $detail = $row.next('tr.detail-row');
        if (!$detail.length) return;

        populateFormFromRow($row, $detail, { includeImagePreview: true });

        editingId = null;
        $('#entry-form').data('existing-image', ''); // don't carry update hint
        setMode('create');

        $('html, body').stop().animate({ scrollTop: $('#entry-form').offset().top - 16 }, 300);
    });
});

function debounce(f, ms) {
    let t;
    return (...a) => {
        clearTimeout(t);
        t = setTimeout(() => f(...a), ms);
    };
}

// reset preview helper
function resetPreview() {
    $('#preview').attr('src', '');
    $('#previewWrap').addClass('hidden');
    $('#imageHint').addClass('hidden').text('No file selected — existing image will be kept.');
}

function updateFilters(data) {
    if (data.brandName && data.brandName.trim() !== '') {
        if (!$("#brandFilter option[value='" + data.brandName + "']").length) {
            $("#brandFilter").append(`<option value="${data.brandName}">${data.brandName}</option>`);
        }
    }
    if (data.customerName && data.customerName.trim() !== '') {
        if (!$("#customerFilter option[value='" + data.customerName + "']").length) {
            $("#customerFilter").append(`<option value="${data.customerName}">${data.customerName}</option>`);
        }
    }
    // Remove empty (truly empty) options other than the first "All"
    $("#brandFilter option, #customerFilter option").filter(function () {
        return this.value === undefined || this.value === null;
    }).remove();
}

function resetSerialNumbers() {
    let count = 1;
    $('#data-table tbody tr').each(function () {
        if (!$(this).hasClass('detail-row')) {
            $(this).find('td:eq(0)').text(count++);
        }
    });
}

function formatNumber(value) {
    return (value !== undefined && value !== null && !isNaN(value))
        ? parseFloat(value).toFixed(2)
        : '-';
}

function isFilterActive() {
    // If any UI filter/search is set OR any header rows are hidden, treat as filtered
    const searchOn = ($('#search').val() || '').trim() !== '';
    const brandOn = ($('#brandFilter').val() || '') !== '';
    const custOn = ($('#customerFilter').val() || '') !== '';

    const totalHeaders = $('#data-rows > tr[data-id]').length;
    const visibleHeaders = $('#data-rows > tr[data-id]:visible').length;

    return searchOn || brandOn || custOn || (visibleHeaders !== totalHeaders);
}

function updateCounts(forcedFilteredCount = null, forcedGrand = null) {
    const totalHeaders = $('#data-rows > tr[data-id]').length;
    const visibleHeaders = forcedFilteredCount ?? $('#data-rows > tr[data-id]:visible').length;

    const filtered = isFilterActive();

    // When NOT filtered, grand = total headers in DOM.
    // When filtered, use forcedGrand → else lastGrandTotal → else totalHeaders.
    let grand = filtered
        ? (forcedGrand ?? (lastGrandTotal || totalHeaders))
        : totalHeaders;

    // Guard against grand < visible (can happen if counts drift)
    if (grand < visibleHeaders) grand = visibleHeaders;

    // Keep our memory in sync
    lastGrandTotal = grand;

    const txt = filtered
        ? `Total rows: ${visibleHeaders} (filtered from ${grand})`
        : `Total rows: ${visibleHeaders}`;

    $('#pageInfo').removeClass('hidden').text(txt);
}

function applyCurrentFiltersToRow($header) {
    const brandVal = ($('#brandFilter').val() || '').trim();
    const custVal = ($('#customerFilter').val() || '').trim();

    const rowBrand = ($header.data('brand') || '').toString();
    const rowCust = ($header.data('customer') || '').toString();

    const show = (!brandVal || brandVal === rowBrand) &&
        (!custVal || custVal === rowCust);

    $header.toggle(show);
    $header.next('.detail-row').toggle(false); // keep details collapsed
}

function updateDownloadState() {
    const hasRows = $('#data-rows > tr[data-id]').length > 0;
    $('#downloadExcel').prop('disabled', !hasRows);
}

function populateFormFromRow($row, $detail, opts = {}) {
    const includeImagePreview = opts.includeImagePreview ?? true;

    const getTxt = (sel) => $detail.find(sel).first().text().trim();
    const getMoney = (sel) => {
        const raw = getTxt(sel).replace(/[^\d.-]/g, '');
        return raw === '' ? '' : parseFloat(raw);
    };

    // header cells -> form
    $('#customerName').val($row.find('td:eq(1)').text().trim());
    $('#brandName').val($row.find('td:eq(2)').text().trim());
    $('#asin').val($row.find('td:eq(3)').text().trim());
    $('#briefDescription').val($row.find('td:eq(4)').text().trim());
    $('#goodsCost').val($row.find('td:eq(5)').text().trim());
    $('#sellPrice').val($row.find('td:eq(6)').text().trim());

    // details -> form
    $('#shippingCost').val(getMoney('.shipping-cost'));
    $('#labelingCharges').val(getMoney('.labeling-charges'));
    $('#fulfillment').val(getMoney('.fulfillment-fees'));
    $('#amazonStorageCharges').val(getMoney('.storage-cost'));
    $('#originPurchase').val(getTxt('.origin-of-purchase') || '');

    const unitsText = $detail.find('.units-tag, .units-sold').first().text();
    const um = (unitsText || '').match(/(\d+(?:\.\d+)?)/);
    $('#unitsSold').val(um ? um[1] : '');

    // tariff %
    $('#tariffPercentage').val($row.data('tariff-percentage') || 0);

    // low inventory fee
    const lifRaw = getMoney('.low-inventory-fee');
    $('#lowInventoryFee').prop('checked', Number(lifRaw) > 0);

    // description + product link
    $('#description').val($detail.find('.detail-desc p').first().text().trim() || '');
    $('#productLink').val($detail.find('#productLink').attr('href') || '');

    // image (safe if #image-detail is missing)
    const $img = $detail.find('#image-detail');
    const imageUrl = $img.length ? ($img.attr('src') || '') : '';

    if (includeImagePreview && imageUrl) {
        $('#preview').attr('src', imageUrl);
        $('#previewWrap').removeClass('hidden');
    } else {
        // for copy we may reset preview, or keep — choose your UX
        $('#preview').attr('src', imageUrl || '');
        $('#previewWrap').toggleClass('hidden', !imageUrl);
    }

    // refresh floating labels
    $('.input-group input, .input-group textarea, .input-group select')
        .each(function () { setGroupFilled($(this)); });

    return { imageUrl };
}

function setMode(mode) {
    if (mode === 'edit') {
        $('#save-changes-btn').removeClass('hidden').show();
        $('#submitBtn').addClass('hidden').hide();
    } else {
        // 'create' default
        $('#save-changes-btn').addClass('hidden').hide();
        $('#submitBtn').removeClass('hidden').show();
    }
}
