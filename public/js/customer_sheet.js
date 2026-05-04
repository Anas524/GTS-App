let currentCustomerSheet = null;
let tempCustomerRowData = {};
let rowToDeleteId = null;
let rowToDeleteSheetId = null;
let currentEntryId = null;
let currentSheetId = null;

if (typeof window.renderCustomerSheet !== 'function') {
  window.renderCustomerSheet = function (_data, _container) { /* no-op */ };
}
if (typeof window.renderLoanLedger !== 'function') {
  window.renderLoanLedger = function (_rows) { /* no-op */ };
}

// Parse any "AED 12,345.67" or "12,345.67" to Number
const num = v => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;
// Format numbers with commas
const fmt = v => num(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// no decimals
const fmt0 = v => num(v).toLocaleString('en-US');
// AED wrapper
const aed = v => `AED ${fmt(v)}`;

// --- shared autosize helpers ---
window._autoSizeTA = window._autoSizeTA || function (el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
};

// Shrink Receipt to one line when short/empty and give that space to Remarks
function _compactReceiptResize(scope) {
    const rec = $(scope).find('textarea.receipt-no-textarea, textarea.receipt-no-input')[0];
    const rem = $(scope).find('textarea.remarks-textarea, textarea.remarks-input')[0];
    if (!rec || !rem) return;

    const v = (rec.value || '').trim();
    const short = v.length === 0 || (v.length <= 20 && !v.includes('\n'));

    // Receipt: collapse to a single line when short
    rec.style.minHeight = short ? '36px' : '0px';
    rec.style.height = 'auto';
    window._autoSizeTA?.(rec);

    // Remarks: NEVER force tall. Keep a tiny base; let autosize grow if needed.
    rem.style.minHeight = '36px';
    rem.style.height = 'auto';
    window._autoSizeTA?.(rem);
}

// --- Loan busy lock (per sheet) + UI helpers ---
window._loanBusy = window._loanBusy || {};

function isLoanBusy(sheetId){ return !!window._loanBusy[sheetId]; }
function setLoanBusy(sheetId, busy){
  window._loanBusy[sheetId] = !!busy;

  // Disable all loan controls in this sheet section
  const $sec = $(`#sheet-customer-${sheetId}`);
  const $controls = $sec.find('.open-loan-modal-btn, .loan-edit, .loan-delete, #loanForm button[type="submit"]');
  $controls.prop('disabled', !!busy).toggleClass('opacity-60 pointer-events-none', !!busy);

  // Totals card: show "Updating…" while busy
  const $totalPaid = $(`#totalLoanPaid-${sheetId}`);
  const $remain = $(`#remainingBalance-${sheetId}`);
  const $sheetTotal = $(`#sheetTotal-${sheetId}`);
  if (busy) {
    $totalPaid.data('old', $totalPaid.text());
    $remain.data('old', $remain.text());
    $sheetTotal.data('old', $sheetTotal.text());
    $totalPaid.text('Updating…');
    $remain.text('Updating…');
    $sheetTotal.text('Updating…');
  } else {
    // restore only if we still have the placeholders
    if ($totalPaid.text() === 'Updating…')   $totalPaid.text($totalPaid.data('old') || 'AED 0.00');
    if ($remain.text() === 'Updating…')      $remain.text($remain.data('old') || 'AED 0.00');
    if ($sheetTotal.text() === 'Updating…')  $sheetTotal.text($sheetTotal.data('old') || 'AED 0.00');
  }
}

$(document).ready(function () {

    $.ajaxSetup({
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    });
    
    // Autosize while typing + keep full height after blur
    $(document)
        .off('input.dynamicTA').on('input.dynamicTA', '.dynamic-textarea', function () {
            window._autoSizeTA(this);
        })
        .off('blur.dynamicTA').on('blur.dynamicTA', '.dynamic-textarea', function () {
            this.value = this.value.trim();
            window._autoSizeTA(this);
        });

    // Re-evaluate compacting when Receipt changes
    $(document)
        .off('input.receiptCompact').on('input.receiptCompact', 'textarea.receipt-no-input', function () {
            _compactReceiptResize($(this).closest('.detail-row'));
        });

    // When you open/close a row, autosize once it’s visible
    $(document).off('click.custRowToggle').on('click.custRowToggle', '.customer-header-row', function (e) {
        if ($(e.target).closest('.btn-upload-attachments, .btn-view-attachments, .save-changes-btn, .delete-btn').length) {
            e.stopImmediatePropagation();
            return;
        }
        const rowId = $(this).data('id');
        const $target = $(`.detail-row[data-id="${rowId}"]`);

        $('.detail-row').not($target).slideUp(200);
        $target.stop(true, true).slideToggle(200, () => {
            if ($target.is(':visible')) {
                requestAnimationFrame(() => {
                    $target.find('textarea.dynamic-textarea').each((_, el) => window._autoSizeTA?.(el));
                    _compactReceiptResize($target);
                    queueMicrotask(() => {
                        $target.find('textarea.dynamic-textarea').each((_, el) => window._autoSizeTA?.(el));
                        _compactReceiptResize($target);
                    });
                });
            }
        });
    });
    
    // Block edit/open while a loan request is in-flight for this sheet
    $(document)
      .off('click.loanGuard')
      .on('click.loanGuard', '.open-loan-modal-btn, .loan-edit, .loan-delete', function (e) {
        const sheetId =
          $(this).data('sheet-id') ||
          $(this).closest('[data-sheet-id]').data('sheet-id'); // works for buttons inside <tr>
        if (sheetId && isLoanBusy(sheetId)) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return false;
        }
     });
        
    // Persist active tab on click
    $(document).off('click.tabSave').on('click.tabSave', '.sheet-tab', function () {
      const key = $(this).data('sheet');   // <- e.g. "customer-some-name"
      if (!key) return;
    
      localStorage.setItem('activeSheet', key);
    
      // keep URL in sync for hard reloads
      const url = new URL(location.href);
      url.searchParams.set('tab', key);
      history.replaceState({}, '', url);
    });

    // Open Modal
    $(document).on('click', '.add-customer-row-btn', function () {
        const sheetId = Number($(this).data('sheet-id')); // numeric id
        $('#customerAddRowForm')[0]?.reset();
        $('#customerAddRowForm').data('sheet-id', sheetId); // stash for submit
        $('#customerAddRowModal').addClass('flex').removeClass('hidden');
    });

    // Cancel Modal
    $('#customerRowCancelBtn').on('click', function () {
        $('#customerAddRowModal').addClass('hidden').removeClass('flex');
        $('#customerAddRowForm')[0].reset();
    });

    // Add Row on Modal Submit
    $('#customerAddRowForm').off('submit.addTempRow').on('submit.addTempRow', function (e) {
        e.preventDefault();

        const sheetId = Number($(this).data('sheet-id')); // from step 1
        const $tbody = $(`#customerTableBody-${sheetId}`); // per-sheet
        const date = $('#customerDate').val();
        const supplier = $('#customerSupplier').val();
        const description = $('#customerDescription').val();

        // keep your global stash (you use it in customerSaveBtn handler)
        window.tempCustomerRowData = { date, supplier, description };
        
        const isClosed =
            (typeof window.isSetClosed === 'function' && window.isSetClosed()) ||
            !!window.__SET_IS_CLOSED ||
            (window.cycle && window.cycle.status === 'closed') ||
            document.documentElement.classList.contains('is-cycle-closed');

        const rowId = `customer-${Date.now()}`;
        const serialNumber = $tbody.find('.customer-header-row').length + 1;
        const formattedDate = formatDateToWords(date);
        
        const actionCell = !isClosed ? `
            <td class="border p-2 text-center action-col" data-col="action">
                <div class="flex items-center justify-center gap-1">
                <button id="customerSaveBtn"
                        class="submit-btn bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded">
                    Submit
                </button>
                </div>
            </td>` : '';

        // Create Header Row
        const $headerRow = $(`
            <tr class="customer-header-row cursor-pointer hover:bg-gray-100" data-id="${rowId}" data-sheet-id="${sheetId}" data-date="${date}" data-supplier="${supplier}" data-description="${$('<div>').text(description).html()}" data-submitted="false" data-new="true">
                <td class="border p-2 text-center">${serialNumber}</td>
                <td class="border p-2">${formattedDate}</td>
                <td class="border p-2">${supplier}</td>
                <td class="border p-2">${description}</td>
                <td class="border p-2 header-total-material">AED 0</td>
                <td class="border p-2 header-total-shipping">AED 0</td>
                ${actionCell}
            </tr>
        `);
        
        // detail colspan must match header col count (6 when closed, 7 when open)
        const detailColspan = isClosed ? 6 : 7;

        // Create Empty Detail Row (we'll enhance this in next step)
        const $detailRow = $(`
        <tr class="detail-row relative hidden" data-new="true" data-id="${rowId}" data-sheet-id="${sheetId}">
            <td colspan="${detailColspan}" class="p-2 bg-gray-50">
            <div class="text-center font-bold text-xl mb-4 bg-blue-200 p-2">${supplier}</div>

            <div class="flex justify-center">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-5xl mx-auto">
                <!-- Left Summary Block -->
                <div class="space-y-2 border-4 border-zinc-500 p-5 bg-white">
                    <div class="flex items-start gap-2"><span class="font-semibold w-56">Total Weight (KG):</span> <div class="flex-1 text-gray-700 total-weight-kg">0</div></div>
                    <div class="flex items-start gap-2"><span class="font-semibold w-56">Total No. of Units:</span> <div class="flex-1 text-gray-700 total-units">0</div></div>
                    <div class="flex items-start gap-2"><span class="font-semibold w-56">DGD:</span> <div class="flex-1 text-gray-700 dgd-value">AED</div></div>
                    <div class="flex items-start gap-2"><span class="font-semibold w-56">Labour Charges:</span> <div class="flex-1 text-gray-700 labour-value">AED</div></div>
                    <div class="flex items-start gap-2"><span class="font-semibold w-56">Shipping Cost:</span> <div class="flex-1 text-gray-700 shipping-cost-value">AED 0.00</div></div>
                </div>

                <!-- Right Editable Section -->
                <div class="space-y-2 border-4 border-zinc-500 p-5 bg-white">
                    <div class="flex items-start gap-2"><span class="font-semibold w-56">Mode of Transaction:</span> <input type="text" name="mode_of_transaction" placeholder="Enter Transaction Method" class="flex-1 editable-input w-full rounded px-2 py-1 bg-white border border-gray-300 mode-of-transaction-input" /></div>
                    <div class="flex items-start gap-2"><span class="font-semibold w-56">Receipt No:</span> <textarea name="receipt_no" placeholder="Enter receipt numbers" class="receipt-no-textarea flex-1 dynamic-textarea w-full rounded px-2 py-1 bg-white border border-gray-300 resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug text-[13px] md:text-[14px] receipt-no-input""></textarea></div>
                    <div class="flex items-start gap-2"><span class="font-semibold w-56">Remarks:</span> <textarea name="remarks" placeholder="Enter Remarks" class="flex-1 dynamic-textarea w-full rounded px-2 py-1 bg-white border border-gray-300 resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug text-[13px] md:text-[14px] remarks-input"></textarea></div>
                </div>
                </div>
            </div>

            <!-- Item Table + Add Button -->
            <div class="mt-4">
                <table class="min-w-full border-4 border-zinc-500 p-5 bg-white">
                <thead>
                    <tr>
                    <th class="border p-1 w-5">S.No</th>
                    <th class="border p-1 w-64">Description</th>
                    <th class="border p-1 w-24">No. of Units</th>
                    <th class="border p-1 w-40">Unit Material w/out VAT</th>
                    <th class="border p-1 w-20">VAT 5%</th>
                    <th class="border p-1 w-40">Total material buy</th>
                    <th class="border p-1 w-32">Weight / ctn</th>
                    <th class="border p-1 w-24">No. of CTNS</th>
                    <th class="border p-1 w-32">Total Weight</th>
                    </tr>
                </thead>
                <tbody id="itemTableBody-${rowId}">
                    <!-- Dynamic Rows Here -->
                </tbody>
                </table>
                <button class="add-item-btn mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600" data-target="${rowId}">+ Add More Items</button>
            </div>

            <!-- Summary Footer -->
            <div class="mt-4 border-4 border-zinc-700 bg-white">
                <div class="grid grid-cols-2 divide-x divide-gray-300">
                <div class="flex items-center border-b p-2 font-semibold w-full">Total Material w/out VAT:</div>
                <div class="flex items-center border-b p-2 w-full bg-yellow-100 total-material-without-vat">AED 0</div>

                <div class="flex items-center border-b p-2 font-semibold w-full">Total VAT:</div>
                <div class="flex items-center border-b p-2 w-full bg-yellow-100 total-vat">AED 0</div>

                <div class="flex items-center border-b p-2 font-semibold w-full">Total Material Buy:</div>
                <div class="flex items-center border-b p-2 w-full bg-yellow-100 total-material-buy">AED 0</div>

                <div class="flex items-center border-b p-2 font-semibold w-full">Shipping Cost:</div>
                <div class="flex items-center gap-1 border-b p-2 w-full bg-yellow-100">
                    <span class="font-medium">AED</span>
                    <input type="number" value="0" min="0" class="shipping-input w-full bg-yellow-100 border-0 focus:outline-none" />
                </div>

                <div class="flex items-center border-b p-2 font-semibold w-full">DGD:</div>
                <div class="flex items-center gap-1 border-b p-2 w-full bg-yellow-100">
                    <span class="font-medium">AED</span>
                    <input type="number" value="0" min="0" 
                        class="dgd-input w-full bg-yellow-100 border-0 focus:outline-none" />
                </div>

                <div class="flex items-center border-b p-2 font-semibold w-full">Labour:</div>
                <div class="flex items-center gap-1 border-b p-2 w-full bg-yellow-100">
                    <span class="font-medium">AED</span>
                    <input type="number" value="0" min="0" 
                        class="labour-input w-full bg-yellow-100 border-0 focus:outline-none" />
                </div>

                <div class="flex items-center p-2 font-semibold w-full">Total Shipping Cost:</div>
                <div class="flex items-center gap-1 p-2 w-full bg-yellow-100">
                    <span class="total-shipping-cost">0.00</span>
                </div>
            </div>
            </td>
        </tr>
        `);

        // Append both rows
        $tbody.append($headerRow).append($detailRow);
        
        const $rec = $detailRow.find('textarea.receipt-no-textarea, .receipt-no-input');
        const $rem = $detailRow.find('textarea.remarks-textarea, .remarks-input');

        // normalize + autosize
        [$rec, $rem].forEach($t => {
            const el = $t[0];
            if (!el) return;
            el.value = (el.value || '').trim();
            el.style.height = 'auto';
            window._autoSizeTA?.(el);        // grows only if needed
        });

        // autosize & compact immediately after DOM paint
        requestAnimationFrame(() => {
            $detailRow.find('textarea.dynamic-textarea').each((_, el) => window._autoSizeTA?.(el));
            _compactReceiptResize($detailRow);
        });

        const $itemTableBody = $detailRow.find(`#itemTableBody-${rowId}`);
        $itemTableBody.append(createItemRow(1));

        // Call this function to bind calculation immediately
        bindLiveCalculation($detailRow, $headerRow);

        $detailRow.find('.total-shipping-cost').text(aed(0));

        // Close Modal & Reset
        $('#customerAddRowModal').addClass('hidden').removeClass('flex');
        $('#customerAddRowForm')[0].reset();
    });

    // Toggle Detail Row
    $(document).off('click.customerHeaderToggle')
        .on('click.customerHeaderToggle', '.customer-header-row', function () {
        const id = $(this).data('id');
        $(`.detail-row[data-id="${id}"]`).toggleClass('hidden');
    });

    $(document)
      .off('click.addItem')
      .on('click.addItem', '.add-item-btn', function () {
        const target = $(this).data('target');
        const $tableBody = $(`#itemTableBody-${target}`);
        const sno = $tableBody.find('.item-row').length + 1;
        $tableBody.append(createItemRow(sno));
    });

    $(document)
      .off('click.delItem')
      .on('click.delItem', '.delete-item-btn', function () {
        $(this).closest('tr').remove();

        // Reindex S.NO
        $(this).closest('tbody').find('.item-row').each(function (index) {
            $(this).find('td:first').text(index + 1);
        });
    });

    // Save Button Click
    $(document).off('click.customerSave').on('click.customerSave', '#customerSaveBtn', function () {
        // scope to the row that contains the clicked button
        const $headerRow = $(this).closest('tr.customer-header-row');
        const rowId = String($headerRow.data('id'));
        const sheetId = Number($headerRow.data('sheet-id'));

        const $tbody = $(`#customerTableBody-${sheetId}`);
        const $detailRow = $tbody.find(`.detail-row[data-id="${rowId}"]`);

        if (!sheetId || !$detailRow.length) {
            alert('Missing sheet/row context.');
            return;
        }

        // Prefer header data; fallback to tempCustomerRowData
        const date = $headerRow.data('date') || (window.tempCustomerRowData?.date) || '';
        const supplier = $headerRow.data('supplier') || (window.tempCustomerRowData?.supplier) || '';
        const description = $headerRow.data('description') || (window.tempCustomerRowData?.description) || '';

        // ---- Totals from this row's detail only (scoped!) ----
        const num = s => parseFloat(String(s || '').replace(/[^\d.-]/g, '')) || 0;
        const calculatedMaterialBuy = num($detailRow.find('.total-material-buy').text());
        const calculatedShipping = num($detailRow.find('.total-shipping-cost').text());
        const calculatedVAT = num($detailRow.find('.total-vat').text());
        const calculatedWeight = num($detailRow.find('.total-weight-kg').text());
        const calculatedUnits = num($detailRow.find('.total-units').text().replace(/,/g, ''));
        const calculatedMaterialNoVAT = num($detailRow.find('.total-material-without-vat').text());
        const calculatedDGD = num($detailRow.find('.dgd-input').val() || $detailRow.find('.dgd-value').text());
        const calculatedLabour = num($detailRow.find('.labour-input').val() || $detailRow.find('.labour-value').text());
        const calculatedShippingRate = num($detailRow.find('.shipping-input').val() || $detailRow.find('.shipping-cost-value').text());

        // sum total weight from item rows (scoped)
        let sumTotalWeight = 0;
        $detailRow.find('tr.item-row').each(function () {
            sumTotalWeight += num($(this).find('.total-weight').text());
        });

        const modeOfTransaction =
            ($detailRow.find('[name="mode_of_transaction"]').val()
                || $detailRow.find('.mode-of-transaction-input').val()
                || '').trim();

        const receiptNo =
            ($detailRow.find('[name="receipt_no"]').val()
                || $detailRow.find('.receipt-no-input').val()
                || '').trim();

        const remarksText =
            ($detailRow.find('[name="remarks"]').val()
                || $detailRow.find('.remarks-input').val()
                || '').trim();

        // ---- Build items from this detail row ----
        const items = [];
        $detailRow.find('tr.item-row').each(function () {
            const $r = $(this);
            items.push({
                description: $r.find('[data-field="description"]').val() || '',
                units: num($r.find('[data-field="units"]').val()),
                unit_price: num($r.find('[data-field="unitPrice"]').val()),
                vat: num($r.find('[data-field="vat"]').val()),
                ctns: num($r.find('[data-field="ctns"]').val()),
                weight_per_ctn: num($r.find('[data-field="weightPerCtn"]').val()),
                total_weight: num($r.find('.total-weight').text()),
            });
        });

        const payload = {
            sheet_id: sheetId,
            date, supplier, description,

            total_material_without_vat: calculatedMaterialNoVAT,
            total_vat: calculatedVAT,
            total_material_buy: calculatedMaterialBuy,
            shipping_cost: calculatedShippingRate,
            dgd: calculatedDGD,
            labour: calculatedLabour,
            total_shipping_cost: calculatedShipping,
            total_weight: +sumTotalWeight.toFixed(2),
            total_units: calculatedUnits,

            mode_of_transaction: modeOfTransaction,
            receipt_no: receiptNo,
            remarks: remarksText,

            items
        };

        $(this).prop('disabled', true);

        // ---- POST -> save ----
        $.post({
            url: api('customer-sheet/store'),
            data: payload,
            headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
        })
            .done(() => {
                // reload just this sheet so the new DB row replaces temp
                loadCustomerSheetData(sheetId);
                loadLoanLedger(sheetId);
                // (optional) notify
                // alert('Saved successfully');
            })
            .fail(err => {
                console.error(err.responseJSON || err);
                alert('Save failed. See console.');
            })
            .always(() => {
                $(this).prop('disabled', false);
            });
    });

    // DELETE button inside each row
    $(document)
      .off('click.entryDeleteOpen')
      .on('click.entryDeleteOpen', '.delete-btn', function () {
        const $hdr = $(this).closest('tr.customer-header-row');        // header row
        rowToDeleteId = String($hdr.data('id')).replace('customer-', ''); // numeric entry id
        rowToDeleteSheetId = Number($hdr.data('sheet-id'))             // you already set data-sheet-id on header
            || Number($('#customer-sheet-id').val());  // fallback
        $('#deleteModal').removeClass('hidden').addClass('flex');
    });

    $(document)
      .off('click.entryDeleteCancel')
      .on('click.entryDeleteCancel', '#cancelCrowDeleteBtn', function () {
        $('#deleteModal').addClass('hidden').removeClass('flex');
        rowToDeleteId = null;
        rowToDeleteSheetId = null;
    });

    $(document)
      .off('click.entryDeleteConfirm')
      .on('click.entryDeleteConfirm', '#confirmCrowDeleteBtn', function () {
        if (!rowToDeleteId) return;

        $.ajax({
            url: withCycle(`/customer-sheet/delete-entry/${rowToDeleteId}`),
            method: 'DELETE',
            data: { _token: $('meta[name="csrf-token"]').attr('content') }
        })
            .done(() => {
                // Remove header + detail for this sheet only
                const sid = rowToDeleteSheetId || Number($('#customer-sheet-id').val());
                const $tbody = $(`#customerTableBody-${sid}`);

                $tbody.find(`tr.customer-header-row[data-id="customer-${rowToDeleteId}"]`).remove();
                $tbody.find(`tr.detail-row[data-id="customer-${rowToDeleteId}"]`).remove();

                // Reindex S.No within this sheet only
                $tbody.find('tr.customer-header-row').each(function (i) {
                    $(this).find('td').eq(0).text(i + 1);
                });

                // Close modal
                $('#deleteModal').addClass('hidden').removeClass('flex');
                rowToDeleteId = null;
                rowToDeleteSheetId = null;

                // Reload THIS sheet to refresh top cards + remaining balance (server sends totals)
                if (typeof loadCustomerSheetData === 'function' && sid) {
                    loadCustomerSheetData(sid);
                }
                // Loan ledger didn’t change, but if you compute remaining on the client, you can also:
                // if (typeof updateLoanLedgerTotals === 'function') {
                //   const sheetName = $('#headerTitle').text().replace('Customer Sheet: ', '');
                //   updateLoanLedgerTotals(sid, sheetName);
                // }
            })
            .fail(() => {
                alert('Server error');
            });
    });

    $(document).off('submit.blockUpdate')
        .on('submit.blockUpdate', 'form[action$="/update-customer-sheet"]', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.warn('Blocked legacy form submit to /update-customer-sheet');
        });

    $(document).off('click.saveUpdate')
        .on('click.saveUpdate', '.save-changes-btn', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (isRendering) return;

            const $saveBtn = $(this);
            const $headerRow = $saveBtn.closest('.customer-header-row');
            const rowId = $headerRow.data('id');             // "customer-<id>"
            const entryId = Number($headerRow.data('entry-id'));
            const sheetId = Number($headerRow.data('sheet-id') || $('#customer-sheet-id').val());
            const dateRaw = String($headerRow.data('date') || '');
            const supplier = String($headerRow.data('supplier') || '');
            const descRaw = String($headerRow.data('description') || '');

            // make the button visible & busy (prevents double clicks)
            $saveBtn.removeClass('hidden').addClass('opacity-60 pointer-events-none');

            if (!entryId || !sheetId || !dateRaw || !supplier) {
                console.error('❌ Missing:', { entryId, sheetId, dateRaw, supplier, headerData: $headerRow.data() });
                alert('Missing required fields (id/sheet_id/date/supplier). Open console.');
                $saveBtn.removeClass('opacity-60 pointer-events-none');
                return;
            }

            const $detailRow = $(`.detail-row[data-id="${rowId}"]`);
            const getN = s => parseFloat((s || '').toString().replace(/[^\d.-]/g, '')) || 0;

            // ---- collect inputs (your existing logic) ----
            const items = [];
            $detailRow.find('tr.item-row').each(function () {
                const $r = $(this);
                items.push({
                    description: $r.find('[data-field="description"]').val() || '',
                    units: getN($r.find('[data-field="units"]').val()),
                    unit_price: getN($r.find('[data-field="unitPrice"]').val()),
                    vat: getN($r.find('[data-field="vat"]').val()),
                    ctns: getN($r.find('[data-field="ctns"]').val()),
                    weight_per_ctn: getN($r.find('[data-field="weightPerCtn"]').val()),
                    total_weight: getN($r.find('.total-weight').text()),
                });
            });

            const sumUnits = items.reduce((t, i) => t + (i.units || 0), 0);
            const sumWeight = items.reduce((t, i) => t + (i.total_weight || 0), 0);
            const tmNoVAT = getN($detailRow.find('.total-material-without-vat').text());
            const tmBuy = getN($detailRow.find('.total-material-buy').text());
            const tVAT = getN($detailRow.find('.total-vat').text());
            const dgd = getN($detailRow.find('.dgd-input').val());
            const labour = getN($detailRow.find('.labour-input').val());
            const shipRate = getN($detailRow.find('.shipping-input').val());
            const shipTotal = dgd + labour + shipRate;

            $detailRow.find('.total-units').text(sumUnits.toFixed(2));
            $detailRow.find('.total-weight-kg').text(sumWeight.toFixed(2));
            $detailRow.find('.total-shipping-cost').text(aed(shipTotal));

            const payload = {
                id: entryId,
                sheet_id: sheetId,
                date: dateRaw,
                supplier,
                description: descRaw,
                total_material_without_vat: tmNoVAT,
                total_material_buy: tmBuy,
                total_vat: tVAT,
                shipping_cost: shipRate,
                dgd, labour,
                total_shipping_cost: shipTotal,
                total_weight: sumWeight,
                total_units: sumUnits,
                mode_of_transaction: ($detailRow.find('[name="mode_of_transaction"]').val() || '').trim(),
                receipt_no: ($detailRow.find('[name="receipt_no"]').val() || '').trim(),
                remarks: ($detailRow.find('[name="remarks"]').val() || '').trim(),
                items
            };

            // 1) Prefer data-* on #customer-sheet-root
            const rootUpdateUrl =
              document.getElementById('customer-sheet-root')?.dataset.updateUrl || '';
            
            // 2) Fallback to window.routes if present
            const routesUpdateUrl =
              (window.routes && typeof window.routes.updateCustomerEntry === 'string' && window.routes.updateCustomerEntry.trim())
                ? window.routes.updateCustomerEntry.trim()
                : '';
            
            // 3) Final URL: prefer explicit -> routes -> api('…')
            const UPDATE_URL = rootUpdateUrl
              || routesUpdateUrl
              || (typeof window.api === 'function' ? window.api('customer-sheet/entry/update')
                 : (typeof window.withCycle === 'function'
                    ? window.investmentUrl(window.withCycle('/customer-sheet/entry/update'))
                    : (typeof window.investmentUrl === 'function'
                       ? window.investmentUrl('/customer-sheet/entry/update')
                       : '/investment/customer-sheet/entry/update')));
            
            // Guard
            if (!UPDATE_URL || UPDATE_URL === '/') {
              console.error('Bad UPDATE_URL:', UPDATE_URL);
              alert('Update URL is not set. Refresh the page and try again.');
              $saveBtn.removeClass('opacity-60 pointer-events-none');
              return;
            }
            
            // POST
            $.ajax({
              type: 'POST',
              url: UPDATE_URL,
              data: payload,
              headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
            })
                .done(() => {
                    // mark row clean
                    $detailRow.find('input, textarea').each(function () { $(this).data('orig', $(this).val() || ''); });

                    // reflect numbers to header immediately
                    $headerRow.find('.header-total-material').text(aed(tmBuy));
                    $headerRow.find('.header-total-shipping').text(aed(shipTotal));

                    // update this sheet’s cards
                    if (typeof recalcSheetCards === 'function') recalcSheetCards(sheetId);

                    // finally hide + re-enable button (for next time)
                    $saveBtn.addClass('hidden').removeClass('opacity-60 pointer-events-none');
                })
                .fail(err => {
                    console.error('Update failed:', err.responseJSON || err);
                    alert('Update failed. See console for details.');
                    // allow retry
                    $saveBtn.removeClass('opacity-60 pointer-events-none');
                });
        });

    // ------- Modal open/close -------
    $(document)
      .off('click.loanOpen')
      .on('click.loanOpen', '.open-loan-modal-btn', function () {
        const sheetId = $(this).data('sheet-id');
        $('#loanRowId').val('');
        $('#loanForm').data('sheet-id', sheetId);
        $('#loanDate').val(new Date().toISOString().slice(0, 10));
        $('#loanDescription').val('');
        $('#loanAmount').val('');
        $('#loanModalTitle').text('Add Loan Entry');
        $('#loanModal').removeClass('hidden').addClass('flex');
    });

    $(document)
      .off('click.loanClose')
      .on('click.loanClose', '#closeLoanModal, #cancelLoanModal', function () {
        $('#loanModal').addClass('hidden').removeClass('flex');
    });

    // ------- Submit (Add / Update) -------
    $('#loanForm').off('submit.loanSave').on('submit.loanSave', function (e) {
      e.preventDefault();
    
      const sheetId = $(this).data('sheet-id') || Number($('#customer-sheet-id').val());
      if (!sheetId) return;
    
      if (isLoanBusy(sheetId)) return; // prevent double submit
      setLoanBusy(sheetId, true);
    
      const id = $('#loanRowId').val();
    
      // button feedback
      const $saveBtn = $(this).find('button[type="submit"]');
      const oldLabel = $saveBtn.text();
      $saveBtn.text('Saving…').prop('disabled', true).addClass('opacity-60 pointer-events-none');
    
      // robust route templates (fallbacks) — NO leading spaces
      const storeTpl  = (window.routes && window.routes.loanLedgerStore)  || '/customer-sheet/:sheetId/loan-ledger';
      const updateTpl = (window.routes && window.routes.loanLedgerUpdate) || '/customer-sheet/loan-ledger/:id';
    
      const storeUrl  = (window.withCycle ? window.withCycle(storeTpl.replace(':sheetId', sheetId)) : storeTpl.replace(':sheetId', sheetId));
      const updateUrl = (window.withCycle ? window.withCycle(updateTpl.replace(':id', id))          : updateTpl.replace(':id', id));
    
      // payload (always POST; _method for PUT)
      const cycleId =
        window.currentCycleId ||
        $('meta[name="cycle-id"]').attr('content') ||
        $('#cycleId').val() ||
        4; // last-resort default if you truly need one
    
      const payloadBase = {
        date: $('#loanDate').val(),
        description: $('#loanDescription').val(),
        amount: $('#loanAmount').val(),
        cycle_id: cycleId
      };
    
      const headers = { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') };
    
      // helper: apply withCycle if available
      const applyCycle = (u) => (typeof withCycle === 'function' ? withCycle(u) : u);
    
      const req = id
        ? $.ajax({ url: applyCycle(updateUrl), method: 'POST', headers, data: { ...payloadBase, _method: 'PUT' } })
        : $.ajax({ url: applyCycle(storeUrl),  method: 'POST', headers, data: payloadBase });
    
      req
        .done(() => {
          $('#loanModal').addClass('hidden').removeClass('flex');
    
          loadLoanLedger(sheetId, () => {
            if (typeof loadCustomerSheetData === 'function') loadCustomerSheetData(sheetId);
            if (typeof updateLoanLedgerTotals === 'function') {
              const sheetName = $('#headerTitle').text().replace('Customer Sheet: ', '');
              updateLoanLedgerTotals(sheetId, sheetName);
            }
          });
        })
        .fail(() => alert('Save failed'))
        .always(() => {
          $saveBtn.text(oldLabel).prop('disabled', false).removeClass('opacity-60 pointer-events-none');
          setLoanBusy(sheetId, false);
        });
    });

    // ------- Edit -------
    $(document)
      .off('click.loanEdit')
      .on('click.loanEdit', '.loan-edit', function () {
        const $tr = $(this).closest('tr');
        const id = $tr.data('loan-id');
        const sheet = $tr.data('sheet-id');
        const rawDate = $tr.data('loan-date');  // Expecting format: 2025-08-11
        const rawAmount = $tr.data('loan-amount'); // Expecting numeric value
        const desc = $tr.find('td').eq(2).text().trim();

        // make sure the form knows which sheet we are editing for
        $('#loanForm').data('sheet-id', sheet);

        $('#loanRowId').val(id);
        $('#loanDate').val(rawDate || '');
        $('#loanDescription').val(desc);
        $('#loanAmount').val(rawAmount || '');
        $('#loanModalTitle').text('Edit Loan Entry');
        $('#loanModal').removeClass('hidden').addClass('flex');
    });

    // ------- Delete -------
    $(document).off('click.loanDel').on('click.loanDel', '.loan-delete', function () {
      const $tr = $(this).closest('tr');
      const id = $tr.data('loan-id');
      const sheetId = $tr.data('sheet-id');
      if (!id || !sheetId) return;
      if (isLoanBusy(sheetId)) return;
      if (!confirm('Delete this loan entry?')) return;
    
      setLoanBusy(sheetId, true);
      const $btn = $(this); const wasHtml = $btn.html();
      $btn.html('Deleting…').prop('disabled', true).addClass('opacity-60 pointer-events-none');
    
      const destroyTpl = (window.routes && window.routes.loanLedgerDestroy) || '/customer-sheet/loan-ledger/:id';
      const destroyUrl = destroyTpl.replace(':id', id);
    
      $.ajax({
        url: withCycle(destroyUrl, false),      // don’t append cycle params to URL
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
        data: { _method: 'DELETE', cycle_id: (window.currentCycleId || $('#cycleId').val() || 4) }
      })
      .done(() => {
        loadLoanLedger(sheetId, () => {
          if (typeof loadCustomerSheetData === 'function') loadCustomerSheetData(sheetId);
          if (typeof updateLoanLedgerTotals === 'function') {
            const sheetName = $('#headerTitle').text().replace('Customer Sheet: ', '');
            updateLoanLedgerTotals(sheetId, sheetName);
          }
        });
      })
      .fail(() => alert('Delete failed'))
      .always(() => {
        $btn.html(wasHtml).prop('disabled', false).removeClass('opacity-60 pointer-events-none');
        setLoanBusy(sheetId, false);
      });
    });

    // -------- Upload modal (per-sheet) ----------
    $(document).off('click', '.btn-upload-attachments')
        .on('click', '.btn-upload-attachments', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            const entryId = $(this).data('entry-id');
            const sheetId = $(this).data('sheet-id');
            if (!entryId || !sheetId) return;

            // target THIS sheet's modal + hidden input
            const $modal = $(`#uploadAttachmentModal-${sheetId}`);
            $modal.find(`#attEntryId-${sheetId}`).val(entryId);
            $modal.removeClass('hidden').addClass('flex');
        });

    // Close upload (per-sheet)
    $(document).off('click', '.close-upload, .cancel-upload')
        .on('click', '.close-upload, .cancel-upload', function () {
            const $modal = $(this).closest('[id^="uploadAttachmentModal-"]');
            $modal.addClass('hidden').removeClass('flex');
        });

    // Submit upload (per-sheet)
    $(document).off('submit', '[id^="uploadAttachmentForm-"]').on('submit', '[id^="uploadAttachmentForm-"]', function (e) {
        e.preventDefault();

        const sheetId = this.id.split('-').pop();
        const $form = $(`#uploadAttachmentForm-${sheetId}`);
        const $modal = $(`#uploadAttachmentModal-${sheetId}`);
        const entryId = $modal.find(`#attEntryId-${sheetId}`).val();

        const fd = new FormData();
        const filesEl = $form.find('.attFiles')[0];
        if (filesEl && filesEl.files) {
            for (let i = 0; i < filesEl.files.length; i++) fd.append('files[]', filesEl.files[i]);
        }

        const typeVal = ($form.find('[name="type"]').val() || '').toLowerCase();

        fd.append('type', ['invoice', 'receipt', 'note'].includes(typeVal) ? typeVal : 'other');

        $.ajax({
            url: withCycle(`/customer-sheet/${entryId}/attachments`),
            method: 'POST',
            data: fd,
            processData: false, 
            contentType: false,
        }).done(function () {
            $form.find('.attFiles').val('');
            $form.find('.file-name-display').val('No file chosen');
            loadAttachments(entryId, sheetId);
            refreshAttachmentCount(entryId, sheetId);
            $modal.addClass('hidden').removeClass('flex');
        });
    });

    // -------- Viewer modal (per-sheet) ----------
    $(document).off('click', '.btn-view-attachments')
        .on('click', '.btn-view-attachments', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
            currentEntryId = $(this).data('entry-id');
            currentSheetId = $(this).data('sheet-id');

            if (!currentEntryId || !currentSheetId) return;

            openViewer(currentEntryId, currentSheetId);
        });

    $(document)
      .off('click', '[id^="downloadAllBtn-"]')
      .on('click', '[id^="downloadAllBtn-"]', function () {
        if (!currentEntryId) return;
    
        const path = `customer-sheet/${currentEntryId}/attachments/download-all`;
    
        // Build a URL that’s definitely under /investment
        let url =
          (typeof investmentUrl === 'function') ? investmentUrl(path) :
          (typeof withCycle === 'function') ? withCycle('/' + path, false) :
          '/investment/' + path;
    
        // If your backend wants cycle as a query param, append it here
        const cid = window.activeCycleId || 4;
        // (Skip if your helper already put /c/<id> in the path)
        if (!/\/c\/\d+/.test(url)) {
          url = url.includes('?') ? `${url}&cycle_id=${cid}` : `${url}?cycle_id=${cid}`;
        }
    
        window.location = url;
      });

    // Close viewer (per-sheet)
    $(document).off('click', '.close-view')
        .on('click', '.close-view', function () {
            const $modal = $(this).closest('[id^="viewAttachmentModal-"]');
            $modal.addClass('hidden').removeClass('flex');
        });

    $(document).off('click', '.del-att').on('click', '.del-att', function () {
        const id = $(this).data('id');
        const sheetId = $(this).data('sheet-id');
        const entryId = currentEntryId;
        if (!id || !sheetId || !entryId) return;
        if (!confirm('Delete this attachment?')) return;

        $.ajax({
            url: withCycle(`/customer-sheet/attachments/${id}`),
            method: 'DELETE',
            headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
            success: function () {
                // read entry id from the upload modal of this sheet (it stores the last used one)
                const entryId = $(`#uploadAttachmentModal-${sheetId}`).find(`#attEntryId-${sheetId}`).val()
                    || $(`#viewAttachmentModal-${sheetId}`).find('#attachmentViewerTitle').text().replace('#', '');
                loadAttachments(entryId, sheetId);
                refreshAttachmentCount(entryId, sheetId);
            }
        });
    });

    // Row toggle (ignore action buttons)
    $(document).off('click', '.customer-header-row')
        .on('click', '.customer-header-row', function (e) {
            if ($(e.target).closest('.btn-upload-attachments, .btn-view-attachments, .save-changes-btn, .delete-btn').length) {
                e.stopImmediatePropagation();  // belt & suspenders
                return;
            }
            const rowId = $(this).data('id');
            const $targetRow = $(`.detail-row[data-id="${rowId}"]`);
            $('.detail-row').not($targetRow).slideUp(200);
            $targetRow.stop(true, true).slideToggle(200);
        });
        
    // === Make header "Save" appear when summary costs change ===
    $(document)
        .off('input.custDirty change.custDirty',
            '.detail-row .dgd-input, .detail-row .labour-input, .detail-row .shipping-input')
        .on('input.custDirty change.custDirty',
            '.detail-row .dgd-input, .detail-row .labour-input, .detail-row .shipping-input',
            function () {
                const $detail = $(this).closest('.detail-row');
                const rowId = $detail.data('id');
                const $header = $(`.customer-header-row[data-id="${rowId}"]`);

                // single source of truth (handles fallbacks + AED formatting)
                recomputeShipping($detail, $header);

                setSaveState($header, isRowDirty($detail));
            });
            
    // (optional) If remarks / receipt / mode change should also trigger Save:
    $(document)
        .off('input.custDirtyMeta change.custDirtyMeta',
            '.detail-row [name="mode_of_transaction"], .detail-row [name="receipt_no"], .detail-row [name="remarks"]')
        .on('input.custDirtyMeta change.custDirtyMeta',
            '.detail-row [name="mode_of_transaction"], .detail-row [name="receipt_no"], .detail-row [name="remarks"]',
            function () {
                const $detail = $(this).closest('.detail-row');
                const rowId = $detail.data('id');
                const $header = $(`.customer-header-row[data-id="${rowId}"]`);
                const dirty = isRowDirty($detail);     // <-- define it
                setSaveState($header, dirty);
            });

    // Open the hidden file input
    $(document).off('click.attachBrowse')
        .on('click.attachBrowse', '.btn-browse', function () {
            const sheetId = $(this).data('sheet-id');
            $(`#uploadAttachmentForm-${sheetId}`).find('.attFiles')[0].click();
    });

    // Show selected names
    $(document).off('change.attachFiles')
        .on('change.attachFiles', '.attFiles', function () {
            const names = this.files && this.files.length
                ? [...this.files].map(f => f.name).join(', ')
                : 'No file chosen';
            $(this).closest('form').find('.file-name-display').val(names);
    });
    
    // react to a newly-created customer sheet
    $(document)
        .off('customerSheet:created.cust')
        .on('customerSheet:created.cust', function (_e, payload) {
            const id   = payload?.id ?? payload?.data?.id;
            const name = payload?.name ?? payload?.sheet_name ?? payload?.data?.sheet_name;
            if (!id || !name) return;
            addCustomerSheetUI({ id, name });
        });
        
    // Open a customer sheet when its tab is clicked (show section + load data)
    $(document)
      .off('click.customerTabsOpen')
      .on('click.customerTabsOpen', '.sheet-tab', function () {
        const key     = $(this).data('sheet');     // e.g. "customer-rh"
        const sheetId = Number($(this).data('sheet-id')); // DB id
    
        if (!key) return;
    
        // 1) Tabs visual state
        $('.sheet-tab').removeClass('bg-gray-100 font-semibold');
        $(this).addClass('bg-gray-100 font-semibold');
    
        // 2) Show the matching section, hide others
        // Sections are created with id="sheet-customer-<slug>".
        // key === "customer-<slug>", so section id is "sheet-" + key.
        $('.sheet-section').addClass('hidden').removeClass('flex');
        const secId = `#sheet-${key}`;
        $(secId).removeClass('hidden').addClass('flex');
    
        // 3) Load this sheet’s rows + loan ledger (single-flight helpers are inside)
        if (sheetId) {
          // Customer rows (entries)
          loadCustomerSheetData(sheetId);
    
          // Loan ledger (and its totals)
          // If you want to throttle GETs further, swap $.get in loadLoanLedger with safeGetJSON.
          loadLoanLedger(sheetId);
        }
      });

});

function refreshAttachmentCount(entryId, sheetId) {
    $.getJSON(withCycle(`/customer-sheet/${entryId}/attachments`), function (res) {
        const n = (res.attachments || []).length;
        $(`#att-count-${sheetId}-${entryId}`).text(n);
    });
}

// ----- helpers (SHEET-AWARE) -----
function openViewer(entryId, sheetId) {
    const $modal = $(`#viewAttachmentModal-${sheetId}`);
    const $row = $(`.customer-header-row[data-entry-id="${entryId}"][data-sheet-id="${sheetId}"]`);

    const supplier = ($row.data('supplier') || '').trim();
    const descr = ($row.data('description') || '').trim();
    const dateRaw = ($row.data('date') || '').trim();
    let niceDate = dateRaw;
    if (typeof formatDateToWords === 'function') {
        try { niceDate = formatDateToWords(dateRaw); } catch { }
    }

    const bits = [];
    if (supplier) bits.push(supplier);
    if (descr) bits.push(descr);
    if (niceDate) bits.push(niceDate);

    const titleText = bits.join(' • ');
    const title = titleText.length > 90 ? titleText.slice(0, 90) + '…' : titleText || 'Attachments';
    $modal.find('#attachmentViewerTitle').text(title);

    $modal.removeClass('hidden').addClass('flex');

    // Disable download until attachments are loaded
    const $dl = $(`#downloadAllBtn-${sheetId}`);
    $dl.prop('disabled', true).addClass('opacity-50 cursor-not-allowed');

    loadAttachments(entryId, sheetId);
}

function loadAttachments(entryId, sheetId) {
    $.getJSON(api(`customer-sheet/${entryId}/attachments`), function (res) {
        const $box = $(`#attachmentsList-${sheetId}`).empty();
        const $dl = $(`#downloadAllBtn-${sheetId}`);

        const list = res && Array.isArray(res.attachments) ? res.attachments : [];

        // update the badge
        $(`#att-count-${sheetId}-${entryId}`).text(list.length);

        if (list.length === 0) {
            $box.html(`
        <div class="text-center text-gray-500 py-10">
          <div class="text-lg font-semibold mb-1">Nothing added</div>
          <div class="text-sm">No attachments have been uploaded for this entry yet.</div>
        </div>
      `);
            $dl.prop('disabled', true).addClass('opacity-50 cursor-not-allowed');
            return;
        }

        $dl.prop('disabled', false).removeClass('opacity-50 cursor-not-allowed');

        // render every attachment (like your PDF “links list”)
        list.forEach(a => {
            const label = String(a.type || 'other').toLowerCase();
            // Use backend-provided streaming URL; fallback to route if you prefer
            const href  = a.url || (a.id ? api(`customer/attachments/${a.id}`) : '#');
            const name = a.original_name || '';
            const size = a.size ? (a.size / 1024).toFixed(1) + ' KB' : '';

            $box.append(`
        <div class="flex items-center justify-between border-b py-3">
          <div class="flex items-center gap-2">
            <span class="inline-block text-white text-[10px] px-2 py-0.5 rounded-full ${label === 'invoice' ? 'bg-blue-600' :
                    label === 'receipt' ? 'bg-green-600' :
                        label === 'note' ? 'bg-orange-500' : 'bg-gray-600'
                }">${label.charAt(0).toUpperCase() + label.slice(1)}</span>
            <a href="${href}" target="_blank" class="text-blue-600 hover:underline">Open</a>
            <span class="text-xs text-gray-500">${name}</span>
            <span class="text-[10px] text-gray-400">${size}</span>
          </div>
          <button class="del-att px-2 py-1 border rounded text-red-600" data-id="${a.id}" data-sheet-id="${sheetId}">
            Delete
          </button>
        </div>
      `);
        });
    });
}

function recomputeShipping($detailRow, $headerRow) {
  const n = v => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;

  const dgd    = n($detailRow.find('.dgd-input').val()      || $detailRow.find('.dgd-value').text());
  const labour = n($detailRow.find('.labour-input').val()   || $detailRow.find('.labour-value').text());
  const ship   = n($detailRow.find('.shipping-input').val() || $detailRow.find('.shipping-cost-value').text());

  const tot = +(dgd + labour + ship).toFixed(2);

  // reflect to UI
  $detailRow.find('.shipping-cost-value').text(aed(ship));
  $detailRow.find('.dgd-value').text(aed(dgd));
  $detailRow.find('.labour-value').text(aed(labour));
  $detailRow.find('.total-shipping-cost').text(aed(tot));
  $headerRow.find('.header-total-shipping').text(aed(tot));

  // keep top cards in sync
  const sid = Number($headerRow.data('sheet-id') || $detailRow.data('sheet-id'));
  if (sid && typeof recalcSheetCards === 'function') recalcSheetCards(sid);

  return tot;
}

function bindLiveCalculation($detailRow, $headerRow) {
  $detailRow.off('input.calc')
    .on('input.calc', '.item-row input, .dgd-input, .labour-input, .shipping-input', function () {
      // ---------- ITEMS ----------
      let totalMaterialNoVAT = 0;
      let totalMaterialBuy   = 0;
      let totalVAT           = 0;
      let totalWeight        = 0;
      let totalUnits         = 0;

      $detailRow.find('.item-row').each(function () {
        const $r = $(this);
        const units      = num($r.find('[data-field="units"]').val());
        const unitPrice  = num($r.find('[data-field="unitPrice"]').val());
        const vatRaw     = $r.find('[data-field="vat"]').val();
        const vatVal     = (vatRaw !== "" && !isNaN(parseFloat(vatRaw))) ? num(vatRaw) : 0;
        const weightPerC = num($r.find('[data-field="weightPerCtn"]').val());
        const ctns       = num($r.find('[data-field="ctns"]').val());

        const materialNoVAT = units * unitPrice;
        const materialBuy   = vatVal > 0 ? (materialNoVAT * vatVal) : materialNoVAT;
        const weight        = weightPerC * ctns;

        totalMaterialNoVAT += materialNoVAT;
        totalMaterialBuy   += materialBuy;
        totalVAT           += vatVal;
        totalUnits         += units;
        totalWeight        += weight;

        $r.find('.total-material').text(fmt(materialBuy));
        $r.find('.total-weight').text(weight > 0 ? fmt(weight) : '');
      });

      // ---------- SUMMARY ----------
      $detailRow.find('.total-material-without-vat').text(aed(totalMaterialNoVAT));
      $detailRow.find('.total-material-buy').text(aed(totalMaterialBuy));
      $detailRow.find('.total-vat').text(aed(totalVAT));
      $detailRow.find('.total-weight-kg').text(fmt(totalWeight));
      $detailRow.find('.total-units').text(fmt0(totalUnits));

      // ---------- COSTS (centralized) ----------
      recomputeShipping($detailRow, $headerRow);

      // header material cell
      $headerRow.find('.header-total-material').text(aed(totalMaterialBuy));

      // save-state only (cards were updated by recomputeShipping)
      if (typeof isRowDirty === 'function') setSaveState($headerRow, isRowDirty($detailRow));
    });
}

function loadCustomerSheet(sheetId) {
    $.get(api(`customer-sheet/load/${sheetId}`), function (entries) {
        const $tbody = $('#customerTableBody');
        $tbody.empty();

        entries.forEach((entry, index) => {
            const srNo = index + 1;
            const rowId = `customer-${Date.now()}-${srNo}`;

            // Header row
            const $headerRow = $(`
                <tr class="customer-header-row cursor-pointer hover:bg-gray-100" data-id="${rowId}" data-brief="${entry.description}" data-submitted="true">
                    <td class="border p-2 text-center">${srNo}</td>
                    <td class="border p-2">${entry.date}</td>
                    <td class="border p-2">${entry.supplier}</td>
                    <td class="border p-2">${entry.description}</td>
                    <td class="border p-2 header-total-material">AED ${entry.total_material_buy}</td>
                    <td class="border p-2 header-total-shipping">AED ${entry.total_shipping_cost}</td>
                    <td class="border p-2 text-center">
                        <div class="flex items-center justify-center gap-1">
                            <button class="edit-btn text-blue-600 hover:underline">Edit</button>
                            <button class="delete-btn text-red-600 hover:underline">Delete</button>
                        </div>
                    </td>
                </tr>
            `);

            $tbody.append($headerRow);

            // Detail rows
            entry.items.forEach(item => {
                const $detailRow = $(`
                    <tr class="customer-detail-row bg-gray-50 text-sm" data-parent="${rowId}">
                        <td class="border p-2 text-center"></td>
                        <td class="border p-2">${item.ctns}</td>
                        <td class="border p-2">${item.units}</td>
                        <td class="border p-2">${item.unit_price}</td>
                        <td class="border p-2">${item.vat}</td>
                        <td class="border p-2">${item.weight_per_ctn}</td>
                        <td class="border p-2">${item.total_material}</td>
                        <td class="border p-2">${item.total_weight}</td>
                        <td class="border p-2 text-center">–</td>
                    </tr>
                `);
                $tbody.append($detailRow);
            });
        });
    });
}

function formatCurrency(value) {
  return window.gtsFmt.aed(value);
}

function updateOverallTotals() {
    const n = s => parseFloat((s || '').toString().replace(/[^\d.-]/g, '')) || 0;

    let grandTotalMaterial = 0;
    let grandTotalShipping = 0;

    $('#customerTableBody tr.customer-header-row').each(function () {
        const id = $(this).data('id'); // e.g., "customer-12"
        const $detail = $(`tr.detail-row[data-id="${id}"]`);

        // Read from the summary footer in the detail row
        grandTotalMaterial += n($detail.find('.total-material-buy').text());
        grandTotalShipping += n($detail.find('.total-shipping-cost').text());
    });

    // If your cards have a separate "AED" label, write only the number here
    $('#overallTotalMaterial').text(grandTotalMaterial.toFixed(2));
    $('#overallTotalShipping').text(grandTotalShipping.toFixed(2));
}

function createItemRow(sno = 1) {
    return `
    <tr class="item-row bg-yellow-100">
        <td class="border p-1 text-center w-5">${sno}</td>

        <td class="border p-1 w-64 relative">
            <textarea placeholder="Description" data-field="description" rows="1"
                class="material-input editable-input w-full rounded px-1 py-0.5 align-middle bg-white border border-gray-300 focus:outline-none resize-none overflow-hidden whitespace-pre-wrap break-words"></textarea>
        </td>

        <td class="border p-1 w-24 relative">
            <input type="number" placeholder="0" data-field="units"
                class="material-input editable-input w-full rounded px-1 py-0.5 bg-white border border-gray-300 focus:outline-none" />
        </td>

        <td class="border p-1 w-40 relative">
            <input type="number" placeholder="0" data-field="unitPrice"
                class="material-input editable-input w-full rounded px-1 py-0.5 bg-white border border-gray-300 focus:outline-none" />
        </td>

        <td class="border p-1 w-20 relative">
            <input type="number" placeholder="0" data-field="vat"
                class="material-input editable-input w-full rounded px-1 py-0.5 bg-white border border-gray-300 focus:outline-none" />
        </td>

        <td class="border p-1 total-material w-40">0</td>

        <td class="border p-1 w-32 relative">
            <input type="number" placeholder="0" data-field="weightPerCtn"
                class="material-input editable-input w-full rounded px-1 py-0.5 bg-white border border-gray-300 focus:outline-none" />
        </td>

        <td class="border p-1 w-24 relative">
            <input type="number" placeholder="0" data-field="ctns"
                class="material-input editable-input w-full rounded px-1 py-0.5 bg-white border border-gray-300 focus:outline-none" />
        </td>

        <td class="border p-1 total-weight w-32">0</td>

        <td class="border p-1 text-center">
            <button class="delete-item-btn text-red-500 hover:text-red-700">&times;</button>
        </td>
    </tr>`;
}

let _attCountsTimer = null;
let _attCountsInflight = false;
let _attCountsPendingIds = null;

function scheduleAttachmentCounts(entries) {
  const ids = (entries || []).map(e => e.id).filter(Boolean);
  if (!ids.length) return;

  // merge with pending so multiple callers coalesce
  _attCountsPendingIds = Array.from(new Set([...( _attCountsPendingIds || [] ), ...ids]));

  clearTimeout(_attCountsTimer);
  _attCountsTimer = setTimeout(runAttachmentCountsOnce, 150); // small debounce
}

function runAttachmentCountsOnce() {
  if (_attCountsInflight) return;           // single-flight guard
  const ids = _attCountsPendingIds || [];
  _attCountsPendingIds = null;
  if (!ids.length) return;

  _attCountsInflight = true;
  $.post({
    url: withCycle('/customer-sheet/attachments/counts'),
    data: { entry_ids: ids },
    headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
  })
  .done(res => {
    const map = (res && res.counts) || {};
    // update all known counters; if you have customer_sheet_id use it, otherwise a simpler selector
    ids.forEach(id => $(`[data-att-count-for="${id}"], #att-count-${id}`).text(map[id] || 0));
  })
  .fail(xhr => {
    // Don’t spam the console on host “Loop Detected”
    if (xhr && xhr.status == 508) {
      console.warn('attachments/counts throttled by host (508). Backing off.');
    } else {
      console.error('attachments/counts failed', xhr?.responseJSON || xhr);
    }
  })
  .always(() => {
    _attCountsInflight = false;
    // if new ids accumulated while this call was inflight, run again (once)
    if (_attCountsPendingIds && _attCountsPendingIds.length) {
      _attCountsTimer = setTimeout(runAttachmentCountsOnce, 150);
    }
  });
}

function refreshAllAttachmentCounts(entries) {
  const ids = (entries || []).map(e => e.id).filter(Boolean);
  if (!ids.length) return;
  console.log('[attachments] POST counts for', ids.length, 'entries');

  $.post({
    url: withCycle('/customer-sheet/attachments/counts'),
    data: { entry_ids: ids },
    headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
  })
  .done(res => {
    const map = (res && res.counts) || {};
    entries.forEach(e => {
      $(`#att-count-${e.customer_sheet_id}-${e.id}`).text(map[e.id] || 0);
    });
  })
  .fail(err => console.error('counts failed', err.responseJSON || err));
}

let isRendering = false;

function loadCustomerSheetData(sheetId) {
  const path = `/customer-sheet/load/${encodeURIComponent(sheetId)}?with_items=1`;
  const url  = (typeof withCycle === 'function')
      ? withCycle(path)            // preferred — injects /c/{cycleId}
      : api(path);  
  $.getJSON(url)
    .done(res => {
      const entries = Array.isArray(res) ? res : (res?.data || []);
      renderCustomerSheetRows(sheetId, entries);
      $(document).trigger('customerSheets:totalsUpdated', { sheetId });
    })
    .fail(xhr => {
      console.error('[CustomerSheet] load failed', xhr?.status, xhr?.responseText);
      renderCustomerSheetRows(sheetId, []);
    });
}

$(function () {
  const url = new URL(location.href);
  const fromUrl = url.searchParams.get('tab');
  const saved = fromUrl || localStorage.getItem('activeSheet');

  if (saved) {
    const $btn = $(`.sheet-tab[data-sheet="${saved}"]`);
    if ($btn.length) {
      $btn.trigger('click');
      return;
    }
    // If the tab isn’t in DOM yet (because it’s loaded dynamically),
    // do nothing here; addCustomerSheetUI will handle it (next step).
  }

  // Fallback
  $('.sheet-tab').first().trigger('click');
});

function renderCustomerSheetRows(sheetId, entries) {
    const tbody = $(`#customerTableBody-${sheetId}`);
    tbody.empty();
    
    const closed =
        (typeof window.isSetClosed === 'function' && window.isSetClosed()) ||
        !!window.__SET_IS_CLOSED ||
        (window.cycle && window.cycle.status === 'closed') ||
        document.documentElement.classList.contains('is-cycle-closed');

    let serial = 1;
    let sumMaterial = 0;
    let sumShipping = 0;

    entries.forEach(entry => {
        const rowId = `customer-${entry.id}`;
        const serialNumber = serial++;

        const mat = Number(entry.total_material_buy || 0);
        const ship =
          num(entry.total_shipping_cost) ||
          (num(entry.shipping_cost) + num(entry.dgd) + num(entry.labour));
        sumMaterial += mat;
        sumShipping += ship;

        const itemsTotalWeight = (entry.items || []).reduce((sum, it) => {
            return sum + (parseFloat(it.total_weight) || 0);
        }, 0);

        const mode = entry.mode_of_transaction || '';
        const receipt = entry.receipt_no || '';
        const remarks = entry.remarks || '';

        // Build item rows
        let itemsHTML = '';
        if (entry.items && entry.items.length > 0) {
            entry.items.forEach((item, i) => {
                const units = parseFloat(item.units || 0);
                const unitPrice = parseFloat(item.unit_price || 0);
                const weightPerCtn = parseFloat(item.weight_per_ctn || 0);
                const ctns = parseFloat(item.ctns || 0);

                itemsHTML += `
                    <tr class="item-row text-center">
                        <td class="border p-1">${i + 1}</td>
                        <td class="border p-1">${item.description || ''}</td>
                        <td class="border p-1">${units}</td>
                        <td class="border p-1">${unitPrice.toFixed(2)}</td>
                        <td class="border p-1">${item.vat || '0%'}</td>
                        <td class="border p-1">${(units * unitPrice).toFixed(2)}</td>
                        <td class="border p-1">${weightPerCtn}</td>
                        <td class="border p-1">${ctns}</td>
                        <td class="border p-1">${(weightPerCtn * ctns).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            itemsHTML = `
                <tr>
                    <td colspan="9" class="text-center text-gray-400">No items found</td>
                </tr>
            `;
        }

        const actionCell = !closed ? `
        <td class="border p-2 text-center action-col" data-col="action">
            <div class="flex items-center justify-center gap-2">
            <button class="save-changes-btn hidden w-8 h-8 rounded bg-green-600 hover:bg-green-700 text-white"
                    data-id="${entry.id}" title="Save">
                <i class="bi bi-arrow-repeat text-lg"></i>
            </button>

            <!-- Upload -->
            <button type="button"
                    class="btn-upload-attachments inline-flex items-center justify-center
                            w-9 h-9 rounded-lg border border-gray-300 hover:bg-gray-50"
                    data-entry-id="${entry.id}" data-sheet-id="${entry.customer_sheet_id}" title="Upload Attachments">
                <i class="bi bi-upload text-base"></i>
            </button>

            <!-- View -->
            <button type="button"
                class="btn-view-attachments relative inline-flex items-center justify-center w-9 h-9 rounded-lg border hover:bg-gray-50"
                data-entry-id="${entry.id}" data-sheet-id="${entry.customer_sheet_id}" title="View Attachments">
                <i class="bi bi-paperclip text-base"></i>
                <span class="att-count absolute -top-1 -right-1 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-gray-800 text-white"
                        id="att-count-${entry.customer_sheet_id}-${entry.id}">0</span>
            </button>

            <button class="delete-btn text-red-600 hover:text-red-800"
                    data-id="${entry.id}" title="Delete Entry">
                <i class="bi bi-trash text-lg"></i>
            </button>
            </div>
        </td>` : '';
        
        const detailColspan = closed ? 6 : 7;

        // Create header row
        const $headerRow = $(`
            <tr class="customer-header-row cursor-pointer hover:bg-gray-100" data-id="${rowId}" data-entry-id="${entry.id}" data-sheet-id="${entry.customer_sheet_id}" data-date="${entry.date}" data-supplier="${entry.supplier || ''}" data-description="${(entry.description || '').replace(/"/g, '&quot;')}">
                <td class="border p-2 text-center">${serialNumber}</td>
                <td class="border p-2">${formatDateToWords(entry.date)}</td>
                <td class="border p-2">${entry.supplier || ''}</td>
                <td class="border p-2">${entry.description || ''}</td>
                <td class="border p-2 header-total-material">${aed(entry.total_material_buy)}</td>
                <td class="border p-2 header-total-shipping">${aed(
                num(entry.total_shipping_cost) ||
                (num(entry.shipping_cost) + num(entry.dgd) + num(entry.labour))
            )
                }</td>
                ${actionCell}
            </tr>
        `);

        // Create detail row with dynamic item table
        const $detailRow = $(`
            <tr class="detail-row relative hidden" data-new="true" data-id="${rowId}">
                <td colspan="${detailColspan}" class="p-2 bg-gray-50">
                    <div class="text-center font-bold text-xl mb-4 bg-blue-200 p-2">${entry.supplier}</div>
                    <div class="flex justify-center">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-5xl mx-auto">
                            <!-- Summary Left -->
                            <div class="space-y-2 border-4 border-zinc-500 p-5 bg-white">
                                <div class="flex items-start gap-2"><span class="font-semibold w-56">Total Weight (KG):</span><div class="flex-1 text-gray-700 total-weight-kg">${fmt0(itemsTotalWeight)}</div></div>
                                <div class="flex items-start gap-2"><span class="font-semibold w-56">Total No. of Units:</span><div class="flex-1 text-gray-700 total-units">${fmt0(entry.total_units || 0)}</div></div>
                                <div class="flex items-start gap-2"><span class="font-semibold w-56">DGD:</span><div class="flex-1 text-gray-700 dgd-value">${aed(entry.dgd || 0)}</div></div>
                                <div class="flex items-start gap-2"><span class="font-semibold w-56">Labour Charges:</span><div class="flex-1 text-gray-700 labour-value">${aed(entry.labour || 0)}</div></div>
                                <div class="flex items-start gap-2"><span class="font-semibold w-56">Shipping Cost:</span><div class="flex-1 text-gray-700 shipping-cost-value">${aed(num(entry.shipping_cost || 0))}</div></div>
                            </div>
                            <!-- Summary Right -->
                            <div class="space-y-2 border-4 border-zinc-500 p-5 bg-white">
                                <div class="flex items-start gap-2"><span class="font-semibold w-56">Mode of Transaction:</span><input type="text" name="mode_of_transaction" class="flex-1 editable-input w-full rounded px-2 py-1 bg-white border border-gray-300 mode-of-transaction-input" placeholder="Enter Transaction Method" value="${mode}" /></div>
                                <div class="flex items-start gap-2"><span class="font-semibold w-56">Receipt No:</span><textarea name="receipt_no" class="flex-1 dynamic-textarea w-full rounded px-2 py-1 bg-white border border-gray-300 resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug text-[13px] md:text-[14px] receipt-no-input" placeholder="Enter receipt numbers">${receipt}</textarea></div>
                                <div class="flex items-start gap-2"><span class="font-semibold w-56">Remarks:</span><textarea name="remarks" class="flex-1 dynamic-textarea w-full rounded px-2 py-1 bg-white border border-gray-300 resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug text-[13px] md:text-[14px] remarks-input" placeholder="Enter Remarks">${remarks}</textarea></div>
                            </div>
                        </div>
                    </div>

                    <!-- Items Table -->
                    <div class="mt-4">
                        <table class="min-w-full border-4 border-zinc-500 p-5 bg-white">
                            <thead>
                                <tr>
                                    <th class="border p-1 w-5">S.No</th>
                                    <th class="border p-1 w-64">Description</th>
                                    <th class="border p-1 w-24">No. of Units</th>
                                    <th class="border p-1 w-40">Unit Material w/out VAT</th>
                                    <th class="border p-1 w-20">VAT 5%</th>
                                    <th class="border p-1 w-40">Total material buy</th>
                                    <th class="border p-1 w-32">Weight / ctn</th>
                                    <th class="border p-1 w-24">No. of CTNS</th>
                                    <th class="border p-1 w-32">Total Weight</th>
                                </tr>
                            </thead>
                            <tbody id="itemTableBody-${rowId}">
                                ${itemsHTML}
                            </tbody>
                        </table>
                    </div>

                    <!-- Summary Footer -->
                    <div class="mt-4 border-4 border-zinc-500 bg-white">
                        <div class="grid grid-cols-2 divide-x divide-gray-300">
                            <div class="flex items-center border-b p-2 font-semibold w-full">Total Material w/out VAT:</div>
                            <div class="flex items-center gap-1 border-b p-2 w-full bg-yellow-100">
                            <span>AED</span>
                            <span class="total-material-without-vat">
                                ${fmt(entry.total_material_without_vat || 0)}
                            </span>
                            </div>
                            <div class="flex items-center border-b p-2 font-semibold w-full">Total VAT:</div>
                            <div class="flex items-center border-b p-2 w-full bg-yellow-100 total-vat">
                                ${aed(entry.total_vat || 0)}
                            </div>
                            <div class="flex items-center border-b p-2 font-semibold w-full">Total Material Buy:</div>
                            <div class="flex items-center border-b p-2 w-full bg-yellow-100 total-material-buy">
                                ${aed(entry.total_material_buy || 0)}
                            </div>

                            <!-- Shipping Cost -->
                            <div class="flex items-center border-b p-2 font-semibold w-full">Shipping Cost:</div>
                            <div class="flex items-center gap-1 border-b p-2 w-full bg-yellow-100">
                            <span class="font-medium">AED</span>
                            <input
                                type="number" min="0" step="0.01"
                                class="shipping-input w-full bg-yellow-100 border-0 focus:outline-none"
                                value="${num(entry.shipping_cost ?? 0).toFixed(2)}"
                            />
                            </div>

                            <!-- DGD -->
                            <div class="flex items-center border-b p-2 font-semibold w-full">DGD:</div>
                            <div class="flex items-center gap-1 border-b p-2 w-full bg-yellow-100">
                            <span class="font-medium">AED</span>
                            <input
                                type="number" min="0" step="0.01"
                                class="dgd-input w-full bg-yellow-100 border-0 focus:outline-none"
                                value="${num(entry.dgd ?? 0).toFixed(2)}"
                            />
                            </div>

                            <!-- Labour -->
                            <div class="flex items-center border-b p-2 font-semibold w-full">Labour:</div>
                            <div class="flex items-center gap-1 border-b p-2 w-full bg-yellow-100">
                            <span class="font-medium">AED</span>
                            <input
                                type="number" min="0" step="0.01"
                                class="labour-input w-full bg-yellow-100 border-0 focus:outline-none"
                                value="${num(entry.labour ?? 0).toFixed(2)}"
                            />
                            </div>

                            <!-- Total Shipping Cost (display only) -->
                            <div class="flex items-center p-2 font-semibold w-full">Total Shipping Cost:</div>
                            <div class="flex items-center gap-1 p-2 w-full bg-yellow-100">
                            <span>AED</span>
                            <span class="total-shipping-cost">${fmt(num(entry.total_shipping_cost) ||
            (num(entry.dgd) + num(entry.labour) + num(entry.shipping_cost)))
            }
                            </span>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `);

        // Summary Right originals
        $detailRow.find('input[name="mode_of_transaction"]')
            .prop('readonly', false)
            .each(function () { $(this).data('orig', $(this).val() || ''); });

        $detailRow.find('[name="receipt_no"], [name="remarks"]')
            .prop('readonly', false)
            .each(function () { $(this).data('orig', $(this).val() || ''); });

        // Convert item table cells to inputs immediately (if not already)
        $detailRow.find('tr.item-row').each(function () {
            const $row = $(this);
            if ($row.data('editable')) return;

            const td = (i) => $row.find(`td:nth-child(${i})`);

            const desc = td(2).text().trim();
            const units = parseFloat(td(3).text()) || 0;
            const unitPrice = parseFloat(td(4).text()) || 0;
            const vat = parseFloat((td(5).text() || '').replace('%', '')) || 0;
            const weightPerCtn = parseFloat(td(7).text()) || 0;
            const ctns = parseFloat(td(8).text()) || 0;

            td(2).html(`<input data-field="description" class="w-full border px-2 py-1" value="${desc}">`);
            td(3).html(`<input data-field="units" class="w-24 border px-2 py-1 text-right" type="number" step="1" value="${units}">`);
            td(4).html(`<input data-field="unitPrice" class="w-24 border px-2 py-1 text-right" type="number" step="0.01" value="${unitPrice}">`);
            td(5).html(`<input data-field="vat" class="w-20 border px-2 py-1 text-right" type="number" step="0.01" value="${vat}">`);
            td(7).html(`<input data-field="weightPerCtn" class="w-24 border px-2 py-1 text-right" type="number" step="0.01" value="${weightPerCtn}">`);
            td(8).html(`<input data-field="ctns" class="w-24 border px-2 py-1 text-right" type="number" step="1" value="${ctns}">`);

            td(6).html(`<span class="total-material">${fmt(units * unitPrice)}</span>`);
            td(9).html(`<span class="total-weight">${fmt(weightPerCtn * ctns)}</span>`);

            // store originals
            $row.find('input').each(function () { $(this).data('orig', $(this).val() || ''); });

            $row.data('editable', true);
        });

        tbody.append($headerRow).append($detailRow);
        
        const $rec = $detailRow.find('textarea.receipt-no-textarea, .receipt-no-input');
        const $rem = $detailRow.find('textarea.remarks-textarea, .remarks-input');

        // normalize + autosize
        [$rec, $rem].forEach($t => {
            const el = $t[0];
            if (!el) return;
            el.value = (el.value || '').trim();
            el.style.height = 'auto';
            window._autoSizeTA?.(el);        // grows only if needed
        });

        requestAnimationFrame(() => {
            $detailRow.find('textarea.dynamic-textarea').each((_, el) => window._autoSizeTA?.(el));
            _compactReceiptResize($detailRow);
        });

        // seed originals for cost inputs (you already do this above; keep it)
        $detailRow.find('.dgd-input, .labour-input, .shipping-input')
        .each(function () { $(this).data('orig', $(this).val() || '0'); });
        
        recomputeShipping($detailRow, $headerRow);

        initAlwaysEditable($detailRow, $headerRow);
    });
    
    if (Array.isArray(entries) && entries.length) {
      scheduleAttachmentCounts(entries);
    }

    // set this sheet's top totals
    $(`#totalMaterial-${sheetId}`).text(formatCurrency(sumMaterial));
    $(`#totalShipping-${sheetId}`).text(formatCurrency(sumShipping));
}

function initAlwaysEditable($detailRow, $headerRow) {
    // recalc as you type
    if (typeof bindLiveCalculation === 'function') {
        bindLiveCalculation($detailRow, $headerRow);
    }

    const $saveBtn = $headerRow.find('.save-changes-btn');

    // On any input change, update totals and toggle Save button based on dirty state
    $detailRow
        .off('input.custDirty change.custDirty blur.custDirty', 'input, textarea')
        .on('input.custDirty change.custDirty blur.custDirty', 'input, textarea', function () {
            setSaveState($headerRow, isRowDirty($detailRow));
        });

    // Initial state (should be clean)
    setSaveState($headerRow, false); // hidden + disabled
}

// Compare current values vs originals
function isRowDirty($detailRow) {
    let dirty = false;
    const n = v => Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;
    const numEq = (a, b) => Math.abs(n(a) - n(b)) < 0.005; // ~0.5 fils

    // 1) Meta fields (text)
    $detailRow.find('input[name="mode_of_transaction"], [name="receipt_no"], textarea[name="remarks"]').each(function () {
        const cur = String($(this).val() ?? '').trim();
        const orig = String($(this).data('orig') ?? '').trim();
        if (cur !== orig) { dirty = true; return false; }
    });
    if (dirty) return true;

    // 2) Item inputs (numeric-aware + format-aware)
    $detailRow.find('tr.item-row input[data-field]').each(function () {
        const curRaw = String($(this).val() ?? '').trim();
        const origRaw = String($(this).data('orig') ?? '').trim();

        const looksNumeric = $(this).is('[type="number"]') || /^[\d\.,\-]+$/.test(curRaw + origRaw);

        if (looksNumeric) {
            const sameNumber = numEq(curRaw, origRaw);
            const sameString = curRaw === origRaw;

            // mark dirty if number changed OR (number same but formatting changed)
            if (!sameNumber || !sameString) { dirty = true; return false; }
        } else {
            if (curRaw !== origRaw) { dirty = true; return false; }
        }
    });
    if (dirty) return true;

    // 3) Cost inputs (numeric + format-aware)
    $detailRow.find('.dgd-input, .labour-input, .shipping-input').each(function () {
        const curRaw = String($(this).val() ?? '').trim();
        const origRaw = String($(this).data('orig') ?? '0').trim();
        if ($(this).data('orig') === undefined) $(this).data('orig', curRaw || '0'); // lazy seed

        const sameNumber = numEq(curRaw, origRaw);
        const sameString = curRaw === origRaw;

        if (!sameNumber || !sameString) { dirty = true; return false; }
    });

    return dirty;
}

function calculateTotalMaterialAndShipping() {
    let totalMaterial = 0;
    let totalShipping = 0;

    $('#customerTableBody tr.customer-header-row').each(function () {
        const material = parseFloat($(this).find('.header-total-material').text().replace('AED', '').trim()) || 0;
        const shipping = parseFloat($(this).find('.header-total-shipping').text().replace('AED', '').trim()) || 0;

        totalMaterial += material;
        totalShipping += shipping;
    });

    $('#totalMaterial').text(`AED ${totalMaterial.toFixed(2)}`);
    $('#totalShipping').text(`AED ${totalShipping.toFixed(2)}`);
}

function formatDateToWords(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
}

// ------- Loan Ledger Helpers -------
function loanRoute(tpl, params = {}) {
  // sane defaults so .replace never runs on undefined
  tpl = tpl || '/customer-sheet/:sheetId/loan-ledger';
  return tpl
    .replace(':sheetId', params.sheetId ?? '')
    .replace(':id',      params.id ?? '');
}

function loadLoanLedger(sheetId, after) {
  const tpl = (window.routes && window.routes.loanLedgerIndex)
    || '/customer-sheet/:sheetId/loan-ledger';

  // loading placeholder
  const $body = $(`#loanLedgerBody-${sheetId}`);
  $body.html(`<tr><td class="px-4 py-3 text-gray-500" colspan="5">Loading…</td></tr>`);

  $.get(withCycle(loanRoute(tpl, { sheetId })))
    .done(res => {
      renderLoanLedgerRows(res.data || [], sheetId);
      if (typeof updateLoanLedgerTotals === 'function') {
        const sheetName = $('#headerTitle').text().replace('Customer Sheet: ', '');
        updateLoanLedgerTotals(sheetId, sheetName);
      }
      $(document).trigger('loanLedger:updated');
      if (typeof after === 'function') after();
    })
    .fail(err => {
      console.error('Loan rows fetch failed:', err);
      $body.html(`<tr><td colspan="5" class="px-4 py-3 text-red-600">Failed to load ledger.</td></tr>`);
    })
    .always(() => setLoanBusy(sheetId, false));
}

function updateLoanLedgerTotals(sheetId, sheetName) {
    // A) loan total from ledger footer (already per-sheet)
    const loanPaid = num($(`#loanLedgerTotal-${sheetId}`).text());

    // B) sheet totals for THIS sheet
    const totalMaterial = num($(`#totalMaterial-${sheetId}`).text());
    const totalShipping = num($(`#totalShipping-${sheetId}`).text());

    const sheetTotal = totalMaterial + totalShipping;
    const remaining = loanPaid - sheetTotal;

    $(`#totalLoanPaid-${sheetId}`).text(aed(loanPaid));
    $(`#sheetTotal-${sheetId}`).text(aed(sheetTotal));
    $(`#remainingBalance-${sheetId}`).text(aed(remaining));
}

function renderLoanLedgerRows(rows, sheetId) {
    const $body = $(`#loanLedgerBody-${sheetId}`);
    $body.empty();
    
    const closed =
        (typeof window.isSetClosed === 'function' && window.isSetClosed()) ||
        !!window.__SET_IS_CLOSED ||
        (window.cycle && window.cycle.status === 'closed') ||
        document.documentElement.classList.contains('is-cycle-closed');

    let total = 0;
    rows.forEach((r, i) => {
        const amt = Number(r.amount || 0);
        total += amt;

        const formattedDate = formatFullDate(r.date);
        
        const actionCell = !closed ? `
            <td class="border p-2 text-center action-col" data-col="action">
                <button class="loan-edit text-green-600 hover:text-green-800 has-tip mr-2"
                        data-tippy-content="Edit Entry">
                <i class="bi bi-pencil"></i>
                </button>
                <button class="loan-delete text-red-600 hover:text-red-800 has-tip"
                        data-tippy-content="Delete Entry">
                <i class="bi bi-trash"></i>
                </button>
            </td>` : '';

        $body.append(`
        <tr class="border-t" data-loan-id="${r.id}" data-sheet-id="${sheetId}" data-loan-date="${r.date}" data-loan-amount="${amt}">
            <td class="border p-2">${i + 1}</td>
            <td class="border p-2 whitespace-nowrap">${formattedDate}</td>
            <td class="border p-2">${escapeHtml(r.description || '')}</td>
            <td class="border p-2 text-right">${aed(amt)}</td>
            ${actionCell}
        </tr>
        `);
    });

    $(`#loanLedgerTotal-${sheetId}`).text(aed(total));
    initTooltips();
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
}

function initTooltips() {
    if (!window.tippy) return;
    // Optional: destroy old instances to avoid duplicates
    if (window._loanTips) window._loanTips.forEach(i => i.destroy());
    window._loanTips = tippy('.has-tip', {
        appendTo: () => document.body,
        placement: 'top',
        theme: 'light',
        animation: 'shift-away',
        offset: [0, 6],
        zIndex: 9999
    });
}

function formatFullDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function getAllCustomerSheetTotals() {
    let material = 0, shipping = 0;

    $('[id^="totalMaterial-"]').each(function () {
        material += parseFloat($(this).text().replace(/[^\d.-]/g, '')) || 0;
    });
    $('[id^="totalShipping-"]').each(function () {
        shipping += parseFloat($(this).text().replace(/[^\d.-]/g, '')) || 0;
    });

    return { material, shipping };
}

(function (w) {
    w.gtsFmt = w.gtsFmt || {};
    if (typeof w.gtsFmt.numAE !== 'function') {
        w.gtsFmt.numAE = n => (Number(n) || 0).toLocaleString('en-AE', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
    }
    if (typeof w.gtsFmt.aed !== 'function') {
        w.gtsFmt.aed = n => 'AED ' + w.gtsFmt.numAE(n);
    }
    if (typeof w.gtsFmt.fmtAED !== 'function') {
        w.gtsFmt.fmtAED = w.gtsFmt.numAE; // numbers-only alias
    }
})(window);

// helpers to build a tab + inject the sheet section HTML ---
function slugifyCustomerName(s) {
    return String(s || '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Injects the rendered Blade HTML for a sheet’s section,
 * appends a tab button, and switches to it.
 * Call with: addCustomerSheetUI({ id, name });
 */
function addCustomerSheetUI({ id, name }) {
  if (!id || !name) return;

  const slug = slugifyCustomerName(name);
  const key  = `customer-${slug}`;            // used by .sheet-tab click handler
  const secId = `sheet-customer-${slug}`;     // container id for section

  // --- De-dupe guards ---
  // Already have a tab for this DB id?
  if ($(`#customerTabsContainer .sheet-tab[data-sheet-id="${id}"]`).length) {
    // ensure section exists; if not, we still fetch below
  } else if ($(`#customerTabsContainer .sheet-tab[data-sheet="${key}"]`).length) {
    // already have a tab for this slug/name; don't add another
  } else {
    // Add the tab exactly once
    $('#customerTabsContainer').append(
      `<button class="sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100"
               data-sheet="${key}" data-sheet-id="${id}">
         ${name}
       </button>`
    );
  }

  // Fetch the section HTML and inject (idempotent)
  $.get(api(`customer-sheet/section/${id}`))
    .done(function (html) {
      // remove any stale node with the same id, then insert fresh
      $('#' + secId).remove();
      const $node = $(html);
      if (!$node.attr('id')) $node.attr('id', secId);
      $node.addClass('sheet-section hidden');
      $('#sheetContainer').append($node);

      // Only switch if this tab is the saved one (or none saved)
        const url = new URL(location.href);
        const saved = url.searchParams.get('tab') || localStorage.getItem('activeSheet');
        if (!saved || saved === key) {
          $(`.sheet-tab[data-sheet="${key}"]`).trigger('click');
        }
    });
}

window.addCustomerSheetUI = window.addCustomerSheetUI || addCustomerSheetUI;
window.loadCustomerSheetData = window.loadCustomerSheetData || loadCustomerSheetData;

function setSaveState($headerRow, dirty) {
    const $btn = $headerRow.find('.save-changes-btn');
    // visible when dirty
    $btn.toggleClass('hidden', !dirty);
    // enabled when dirty, disabled when clean
    $btn.toggleClass('opacity-60 pointer-events-none', !dirty);
}

function recalcSheetCards(sheetId) {
    const $tbody = $(`#customerTableBody-${sheetId}`);
    let mat = 0, ship = 0;

    $tbody.find('tr.customer-header-row').each(function () {
        // numbers are like "AED 1,234.56" – use the global num()
        mat += num($(this).find('.header-total-material').text());
        ship += num($(this).find('.header-total-shipping').text());
    });

    // Update the two per-sheet cards
    $(`#totalMaterial-${sheetId}`).text(aed(mat));
    $(`#totalShipping-${sheetId}`).text(aed(ship));

    // Keep remaining balance in sync (uses those two values)
    if (typeof updateLoanLedgerTotals === 'function') {
        const sheetName = $('#headerTitle').text().replace('Customer Sheet: ', '');
        updateLoanLedgerTotals(sheetId, sheetName);
    }

    // Let any listeners (if you have them) react to the change
    $(document).trigger('customerSheets:totalsUpdated', { sheetId, material: mat, shipping: ship });
}