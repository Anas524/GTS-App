window.sheetTotals = window.sheetTotals || { material: 0, shipping: 0, investment: 0 };
const MAT_ROOT = '#sheet-gts-material';
const DETAIL_SEL = '.mat-detail-row, .detail-row';

const IS_CLOSED = !!window.__SET_IS_CLOSED;

window._autoSizeTA = window._autoSizeTA || function (el) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
};
window.__matAttCache = window.__matAttCache || {};

window.resetViewer = function () {
  $('#matPreviewFrame').addClass('hidden').attr('src', '');
  $('#matPreviewImg').addClass('hidden').attr('src', '');
  $('#matPreviewEmpty').removeClass('hidden');

  $('#matDownloadBtn')
    .addClass('pointer-events-none opacity-50')
    .attr('href', '#');
};

window.openPreview = function openPreview(url, fileName = '') {
  resetViewer();
  
  zoom = 1;
  $('#matPreviewImg').css('transform', 'scale(1)');

  if (!url) return;

  const raw = String(url);
  const clean = raw.toLowerCase();

  $('#matPreviewEmpty').addClass('hidden');

  const isPdf = clean.includes('.pdf');
  const isImg = /\.(jpg|jpeg|png|webp)$/i.test(clean);

  if (isPdf) {
    $('#matPreviewFrame')
      .removeClass('hidden')
      .attr('src', raw);

  } else if (isImg) {
    $('#matPreviewImg')
      .removeClass('hidden')
      .attr('src', raw);

  } else {
    $('#matPreviewFrame')
      .removeClass('hidden')
      .attr('src', raw);
  }

  $('#matDownloadBtn')
    .removeClass('pointer-events-none opacity-50')
    .attr('href', forceDownloadUrl(raw));
};

// show/hide
function showPM($m){ $m.removeClass('hidden').css('display','flex'); }
function hidePM($m){ $m.addClass('hidden').css('display',''); }

// when rows load, autosize immediately
function autosizeHeaderTextareas($scope){
  $scope.find('.header-row textarea.mh-supplier-name, .header-row textarea.mh-brief')
    .each((_, el) => window._autoSizeTA?.(el));
}

function forceDownloadUrl(url){
  if (!url || url === '#') return '#';
  const sep = url.includes('?') ? '&' : '?';
  return url + sep + 'download=1';
}

// OPEN UPLOAD MODAL (works even if section hidden)
$(document)
  .off('click.pmMatUpload')
  .on('click.pmMatUpload', '.upload-btn', function(e){
    e.preventDefault(); e.stopPropagation();

    const id = $(this).data('id');
    if (!id) return;

    const $modal = $('#matAttUploadModal');
    if (!$modal.length) {
      console.warn('matAttUploadModal not found in DOM');
      return;
    }

    // store row id
    $('#matAttRowId').val(id);

    // reset file inputs + labels
    $('#matInvoiceInput,#matReceiptInput,#matNoteInput').val('');
    if (window.__matAttCache?.[id]) {
      setUploadLabels(window.__matAttCache[id]);
    }

    // DO NOT clear if cache exists
    if (!window.__matAttCache?.[id]) {
      $('#matExistingList').empty();
    }
    showExistingLoading(true);

    // open and load
    showPM($modal);
    fastLoadAttachments(id);
  });
 
// CLOSE UPLOAD MODAL
$(document)
  .off('click.pmMatUploadClose')
  .on('click.pmMatUploadClose', '#matAttUploadClose, #matAttUploadCancel, #matAttUploadBackdrop', function(){
    hidePM($('#matAttUploadModal'));
  });
  
// OPEN VIEWER MODAL (global)
$(document)
  .off('click.pmMatView')
  .on('click.pmMatView', '.view-btn', function(e){
    e.preventDefault(); e.stopPropagation();

    const id = $(this).data('id');
    if (!id) return;

    const $modal = $('#matAttViewerModal');
    if (!$modal.length) {
      console.warn('matAttViewerModal not found in DOM');
      return;
    }

    resetViewer();
    $('#matViewerList').empty();
    $('#matViewerSubTitle').text(`Row ID: ${id}`);
    $('#matDownloadAllBtn').attr('href', api(`gts-materials/download-pdf/${id}`));

    showPM($modal);
    $modal.data('row-id', id);

    // IMPORTANT: use SAME endpoint as fastLoadAttachments
    $.get(api(`gts-materials/get-attachments/${id}`))
      .done(function(data){
          const types = [
            { key: 'invoice', label: 'Invoice' },
            { key: 'receipt', label: 'Bank Receipt' },
            { key: 'note', label: 'Delivery Note' },
          ];
        
          const $list = $('#matViewerList').empty();
          let firstFile = null;
        
          types.forEach(type => {
            const files = Array.isArray(data[type.key]) ? data[type.key] : [];
        
            const $group = $(`
              <div class="mb-3">
                <div class="text-xs font-semibold text-slate-500 mb-2 px-1">
                  ${type.label}
                </div>
              </div>
            `);
        
            if (!files.length) {
              $group.append(`<div class="text-xs text-slate-400 px-2 py-1">Not uploaded</div>`);
            } else {
              files.forEach(file => {
                if (!firstFile) firstFile = file.url;
        
                const $btn = $(`
                  <button type="button"
                    class="mat-view-item w-full text-left border border-slate-200 rounded-xl px-3 py-2 mb-1 hover:bg-slate-50">
                    <div class="text-xs pm-subtext truncate">${file.name}</div>
                  </button>
                `);
        
                $btn.attr('data-url', file.url);
        
                $btn.on('click', function () {
                  $('#matViewerList .mat-view-item').removeClass('ring-2 ring-slate-400');
                  $btn.addClass('ring-2 ring-slate-400');
                  openPreview(file.url);
                });
        
                $group.append($btn);
              });
            }
        
            $list.append($group);
          });
        
          if (firstFile) {
            $('#matViewerList .mat-view-item').first().addClass('ring-2 ring-slate-400');
            openPreview(firstFile);
          }
        
          updateRowAttachmentBadge(id, data || {});
        })
      .fail(function(){
        $('#matViewerList').html(`<div class="text-sm text-red-600">Failed to load attachments.</div>`);
      });
  });
  
  $(document)
  .off('click.matViewPick')
  .on('click.matViewPick', '.mat-view-item[data-url]', function () {
    const url = $(this).data('url');
    const name = $(this).data('name') || '';
    $('#matViewerList .mat-view-item').removeClass('ring-2 ring-slate-400');
    $(this).addClass('ring-2 ring-slate-400');
    window.openPreview(url, name);
  });
  
  $(document)
  .off('click.matDownloadAll')
  .on('click.matDownloadAll', '#matDownloadAllBtn', function (e) {
    e.preventDefault();
    e.stopPropagation();

    const id = $('#matAttViewerModal').data('row-id');
    if (!id) return;

    // download ZIP (your downloadAttachments now returns ZIP)
    window.location.href = api(`gts-materials/download-pdf/${id}`);
  });

// CLOSE VIEWER MODAL
$(document)
  .off('click.pmMatViewClose')
  .on('click.pmMatViewClose', '#matAttViewerClose, #matAttViewerBackdrop', function(){
    hidePM($('#matAttViewerModal'));
  });

function renderExistingList(data, rowId) {
  const types = [
    { key: 'invoice', label: 'Invoice' },
    { key: 'receipt', label: 'Bank Receipt' },
    { key: 'note', label: 'Delivery Note' },
  ];

  const $list = $('#matExistingList').empty();

  types.forEach(type => {
    const files = Array.isArray(data?.[type.key]) ? data[type.key] : [];

    const $group = $(`
      <div class="border border-slate-200 rounded-xl p-3">
        <div class="text-sm font-semibold mb-2">${type.label}</div>
      </div>
    `);

    if (!files.length) {
      $group.append(`<div class="text-xs text-slate-400">Not uploaded</div>`);
    } else {
      files.forEach((file, index) => {
        $group.append(`
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="truncate">${file.name}</span>
            <button type="button"
              class="mat-att-del-btn text-red-600"
              data-id="${rowId}"
              data-type="${type.key}"
              data-index="${index}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        `);
      });
    }

    $list.append($group);
  });
}

function countAttachments(data) {
  return ['invoice','receipt','note']
    .map(k => Array.isArray(data?.[k]) ? data[k].length : (data?.[k] ? 1 : 0))
    .reduce((a,b)=>a+b,0);
}

function updateRowAttachmentBadge(id, attObj) {
  const n = countAttachments(attObj);

  const $viewBtn = $(`.view-btn[data-id="${id}"]`);
  if (!$viewBtn.length) return;

  $viewBtn.find('.mat-att-dot').remove();

  if (n > 0) {
    $viewBtn.append(`
      <span class="mat-att-dot absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
        rounded-full bg-slate-500 text-white text-[11px] font-bold
        flex items-center justify-center leading-none">${n}</span>
    `);
  }
}

function showExistingLoading(on) {
  $('#matExistingLoading').toggleClass('hidden', !on);
}

function attUrl(v) {
  if (!v) return null;
  if (typeof v === 'object') return v.url || null;
  return String(v);
}

function attName(v) {
  if (!v) return '';
  if (typeof v === 'object') return v.name || getFileName(v.url || '');
  return getFileName(v);
}

function setUploadLabels(data) {
  const inv = Array.isArray(data?.invoice) ? data.invoice : [];
  const rec = Array.isArray(data?.receipt) ? data.receipt : [];
  const note = Array.isArray(data?.note) ? data.note : [];

  $('#matInvoiceLabel').text(inv.length ? `${inv.length} file(s) selected` : 'No file selected yet.');
  $('#matReceiptLabel').text(rec.length ? `${rec.length} file(s) selected` : 'No file selected yet.');
  $('#matNoteLabel').text(note.length ? `${note.length} file(s) selected` : 'No file selected yet.');
}

function fastLoadAttachments(id) {
  showExistingLoading(true);

  // use cache FIRST (no clearing UI)
  if (window.__matAttCache?.[id]) {
    const cached = window.__matAttCache[id];

    setUploadLabels(cached);
    renderExistingList(cached, id);
    updateRowAttachmentBadge(id, cached);

    showExistingLoading(false);
  } else {
    $('#matExistingList').empty(); // only clear if no cache
  }

  return $.get(api(`gts-materials/get-attachments/${id}`))
    .done(data => {

      const normalized = {
        invoice: Array.isArray(data?.invoice) ? data.invoice : [],
        receipt: Array.isArray(data?.receipt) ? data.receipt : [],
        note: Array.isArray(data?.note) ? data.note : []
      };

      window.__matAttCache = window.__matAttCache || {};
      if (normalized.invoice.length || normalized.receipt.length || normalized.note.length) {
            window.__matAttCache[id] = normalized;
        }

      // ALWAYS render normalized
      setUploadLabels(normalized);
      renderExistingList(normalized, id);
      updateRowAttachmentBadge(id, normalized);
    })
    .fail(() => {
      if (!window.__matAttCache?.[id]) {
        $('#matExistingList').html(`
          <div class="text-sm text-red-600 border border-red-200 bg-red-50 rounded-xl p-3">
            Failed to load attachments.
          </div>
        `);
      }
    })
    .always(() => {
      showExistingLoading(false);
    });
}

function showModal($m) {
  $m.removeClass('hidden').addClass('flex').css('display', 'flex');
}
function hideModal($m) {
  $m.addClass('hidden').removeClass('flex').css('display', '');
}

function normalizeAttUrl(u) {
  if (!u) return null;
  const s = String(u).trim();

  // already absolute
  if (/^https?:\/\//i.test(s)) return s;

  // protocol-relative
  if (s.startsWith('//')) return window.location.protocol + s;

  // make it absolute from site root
  if (s.startsWith('/')) return s;

  return '/' + s.replace(/^\/+/, '');
}

function _compactReceiptResize(scope) {
  const rec = $(scope).find('textarea.receipt-no-textarea')[0];
  const rem = $(scope).find('textarea.remarks-textarea')[0];
  if (!rec || !rem) return;

  const v = (rec.value || '').trim();
  const short = v.length === 0 || (v.length <= 20 && !v.includes('\n'));

  if (short) {
    // collapse receipt to a single row
    rec.style.minHeight = '36px';
    rec.style.height = '36px';
    // give more space to remarks
    rem.style.minHeight = '180px';
  } else {
    rec.style.minHeight = '0px';
    rec.style.height = 'auto';
    rem.style.minHeight = '120px';
  }

  // autosize both after min-heights are set
  window._autoSizeTA?.(rec);
  window._autoSizeTA?.(rem);
}

// Pull fresh totals from server -> paint cards -> cache -> fire event
window.fetchAndUpdateMaterialTotals = (function () {
  let inflight = null;
  let timer = null;

  const fmt = (v) => window.gtsFmt.aed(Number(v) || 0);

  function apply(t) {
    const material   = Number(t?.material)   || 0;
    const shipping   = Number(t?.shipping)   || 0;
    const investment = Number(t?.investment) || Number(window.sheetTotals?.investment) || 0;

    $('#gtsMaterialTotal').text(fmt(material));
    $('#gtsShippingTotal').text(fmt(shipping));
    $('#totalInvestmentAmount-material').text(fmt(investment));

    window.sheetTotals = { material, shipping, investment };
    if (typeof setGtsTotalsToStorage === 'function') setGtsTotalsToStorage(window.sheetTotals);
    document.dispatchEvent(new CustomEvent('gts:totals-changed', { detail: window.sheetTotals }));
  }

  function runOnce() {
    inflight = $.getJSON(investmentUrl('gts-materials/total'), {
      cycle_id: window.activeCycleId || ''
    })
      .done(apply)
      .fail(xhr => {
        console.warn('totals fetch failed', xhr?.status, xhr?.responseText);
        const sums = (typeof updateGtsTotalsFromDOM === 'function')
          ? updateGtsTotalsFromDOM()
          : { material: 0, shipping: 0 };
        apply({ material: sums.material, shipping: sums.shipping });
      })
      .always(() => { inflight = null; });
  }

  // public API
  return function fetchAndUpdateMaterialTotals(forceServer = true) {
    if (forceServer) {
      if (inflight) return inflight;            // single-flight guard
      clearTimeout(timer);
      timer = setTimeout(runOnce, 120);         // small debounce
      return inflight;
    } else {
      const sums = (typeof updateGtsTotalsFromDOM === 'function')
        ? updateGtsTotalsFromDOM()
        : { material: 0, shipping: 0 };
      apply({ material: sums.material, shipping: sums.shipping });
    }
  };
})();

function updateCombinedCard() {
  const st = window.sheetTotals || { material: 0, shipping: 0, investment: 0 };
  const combined = (Number(st.material) || 0) + (Number(st.investment) || 0);

  const $el = $("#materialPlusInvestment");
  if ($el.length) {
    $el.text(`AED ${combined.toLocaleString('en-US', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })}`);
  }
}

// 3) One-time listener + initial paint
if (!window.__gtsCombinedHooked) {
  window.__gtsCombinedHooked = true;

  document.addEventListener('gts:totals-changed', () => {
    if (typeof updateCombinedCard === 'function') updateCombinedCard();
  });

  if (typeof updateCombinedCard === 'function') updateCombinedCard();
}

$(function () {
  // already there
  if (typeof fetchAndUpdateMaterialTotals === 'function') fetchAndUpdateMaterialTotals();
  window.fetchAndUpdateInvestmentTotal();

  // init + load (guarded by element presence so other pages don’t run this)
  if ($(MAT_ROOT).length) { 
    initMaterialLogic();
    loadGtsMaterials();
  }
  if ($('#investmentTableBody').length) {
    initInvestmentLogic();
    loadGtsInvestments();
  }
});

function formatLongDate(iso) {
      if (!iso) return '';
    
      // force safe parse (YYYY-MM-DD)
      const d = new Date(iso + 'T00:00:00');
      if (isNaN(d)) return '';
    
      return d.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
}

function initMaterialLogic() {
  $.ajaxSetup({
    headers: {
      'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
    }
  });

  if (window.materialLogicInitialized) return;
  window.materialLogicInitialized = true;

  const $tableBody = $("#materialTableBody");
  const $modal = $("#addRowModal");
  const $modalInvoiceDate = $("#modalInvoiceDate");
  const $modalSupplierName = $("#modalSupplierName");
  const $modalDescription = $("#modalDescription");

  $("#addRowBtn").on("click", function () {
    if (IS_CLOSED) return;
    $("#typeSelectModal").removeClass("hidden").addClass("flex");
  });

  // Cancel the type modal safely
  $("#cancelTypeSelectBtn").on("click", function () {
    $("#typeSelectModal").addClass("hidden").removeClass("flex");
  });

  // Open Add Row modal manually when Material Layout is clicked
  $("#selectMaterialBtn").on("click", function () {
    $("#typeSelectModal").addClass("hidden").removeClass("flex");

    // Clear all input fields
    $("#modalInvoiceDate").val("");
    $("#modalInvoiceNo").val("");
    $("#modalSupplierName").val("");
    $("#modalDescription").val("");

    // Ensure buttons are correct
    $("#submitMaterialBtn").show();      // Show submit for new row
    $("#saveMaterialBtn").hide();        // Hide save button for new
    $("#deleteMaterialBtn").hide();      // Hide delete on new add

    // Just show modal — don't add any row automatically
    $("#addRowModal").removeClass("hidden").addClass("flex");
  });

  // Cancel Add Row modal
  $("#modalCancelBtn").on("click", function () {
    $("#addRowModal").addClass("hidden").removeClass("flex");
  });

  $("#addRowForm").on("submit", function (e) {
    e.preventDefault();

    // Extract input values
    const rawDate = $modalInvoiceDate.val().trim();
    const invoiceNo = $("#modalInvoiceNo").val().trim();
    const supplierName = $modalSupplierName.val().trim();
    const description = $modalDescription.val().trim();
    const serialNumber = $("#materialTableBody .header-row").length + 1;

    // Hide modal
    $("#addRowModal").addClass("hidden").removeClass("flex");
    
    const COLS = IS_CLOSED ? 7 : 8; // header columns without Action vs with Action
    
    const actionCellHtml = IS_CLOSED
      ? '' // no action cell when closed
      : `<td class="border p-2 text-center">
          <div class="flex items-center justify-center gap-1">
            <button class="materials-submit-btn bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded">Submit</button>
            <button class="remove-row bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded">Delete</button>
          </div>
        </td>`;
        
    const rawDateISO = rawDate || ''; // from modal input (type=date gives YYYY-MM-DD)
        
    // Create header row
    const $headerRow = $(`
      <tr class="header-row cursor-pointer hover:bg-gray-100" data-brief="${description}" data-submitted="false" data-new="true">
        <td class="border p-2 text-center">${serialNumber}</td>
        
        <td class="border p-2">
          <span class="mh-date-text block ${IS_CLOSED ? '' : 'cursor-pointer'}">
            ${formatLongDate(rawDateISO)}
          </span>
        
          <input type="date"
                 class="mh-invoice-date w-full bg-transparent outline-none hidden"
                 value="${rawDateISO}"
                 ${IS_CLOSED ? 'disabled' : ''}>
        </td>
    
        <td class="border p-2">
          <input type="text" class="mh-invoice-no w-full bg-transparent outline-none"
                 value="${invoiceNo || ''}" ${IS_CLOSED ? 'disabled' : ''}>
        </td>
    
        <td class="border p-2">
          <input type="text" class="mh-supplier-name w-full bg-transparent outline-none"
                 value="${supplierName || ''}" ${IS_CLOSED ? 'disabled' : ''}>
        </td>
    
        <td class="border p-2">
          <input type="text" class="mh-brief w-full bg-transparent outline-none"
                 value="${description || ''}" ${IS_CLOSED ? 'disabled' : ''}>
        </td>
        
        <td class="border p-2 header-total-material">AED 0</td>
        <td class="border p-2 header-total-shipping">AED 0</td>
        ${actionCellHtml}
      </tr>
    `);

    // Create detail row
    const $detailRow = $(`
      <tr class="mat-detail-row detail-row relative hidden" data-new="true">
        <td colspan="${COLS}" class="p-2 bg-gray-50">
        <div class="text-center font-bold text-xl mb-4 bg-blue-200 p-2">${supplierName}</div>

          <div class="flex justify-center">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-5xl mx-auto">
              <!-- Left Section -->
              <div class="space-y-2 border-4 border-zinc-500 p-5 bg-white">
                <div class="flex items-start gap-2"><span class="font-semibold w-56">Invoice No:</span> <div class="flex-1 text-gray-700">${invoiceNo}</div></div>
                <div class="flex items-start gap-2"><span class="font-semibold w-56">Total Weight (KG):</span> <div class="flex-1 text-gray-700 total-weight-kg">0</div></div>
                <div class="flex items-start gap-2"><span class="font-semibold w-56">Total No. of Units:</span> <div class="flex-1 text-gray-700 total-units">0</div></div>
                <div class="flex items-start gap-2"><span class="font-semibold w-56">DGD:</span> <div class="flex-1 text-gray-700 dgd-value">AED</div></div>
                <div class="flex items-start gap-2"><span class="font-semibold w-56">Labour Charges:</span> <div class="flex-1 text-gray-700 labour-value">AED</div></div>
                <div class="flex items-start gap-2"><span class="font-semibold w-56">Shipping Cost:</span> <div class="flex-1 text-gray-700 shipping-cost-value">0</div></div>
              </div>
              <!-- Right Section -->
              <div class="space-y-2 border-4 border-zinc-500 p-5 bg-white">
                <div class="flex items-start gap-2"><span class="font-semibold w-56">Mode of Transaction:</span> <input type="text" placeholder="Enter Transaction Method" class="flex-1 editable-input w-full rounded px-2 py-1 bg-white border border-gray-300 focus:outline-none" /></div>
                <div class="flex items-start gap-2"><span class="font-semibold w-56">Receipt No:</span> <textarea placeholder="Enter receipt numbers" class="gts-area receipt-no-textarea flex-1 dynamic-textarea w-full rounded px-2 py-1 bg-white border border-gray-300 focus:outline-none resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug text-[13px] md:text-[14px]"></textarea></div>
                <div class="flex items-start gap-2"><span class="font-semibold w-56">Remarks:</span> <textarea placeholder="Enter Remarks" class="gts-area dynamic-textarea flex-1 w-full rounded px-2 py-1 bg-white border border-gray-300 focus:outline-none resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug text-[13px] md:text-[14px]"></textarea></div>
              </div>
            </div>
          </div>

          <!-- Item Table -->
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
              <tbody class="item-table-body">
                <!-- Rows added here -->
              </tbody>
            </table>

            <button type="button" class="add-item-row-btn mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">+ Add More Items</button>
          </div>

          <!-- Summary Footer -->
          <div class="mt-4 border-4 border-zinc-700 bg-white">
            <div class="grid grid-cols-2 divide-x divide-gray-300">

              <!-- Total Material Without VAT -->
              <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">Total Material w/out VAT:</div>
              <div class="flex items-center border-b border-gray-300 p-2 w-full bg-yellow-100 total-material-without-vat">AED 0</div>

              <!-- Total VAT -->
              <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">Total VAT:</div>
              <div class="flex items-center border-b border-gray-300 p-2 w-full bg-yellow-100 total-vat">AED 0</div>

              <!-- Total Material Buy -->
              <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">Total Material Buy:</div>
              <div class="flex items-center border-b border-gray-300 p-2 w-full bg-yellow-100 total-material-buy">AED 0</div>

              <!-- Shipping Cost -->
              <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">Shipping Cost:</div>
              <div class="flex items-center gap-1 border-b border-gray-300 p-2 w-full bg-yellow-100">
                <span class="font-medium">AED</span>
                <input
                  type="number"
                  value="0"
                  min="0"
                  data-field="shippingCost"
                  class="shipping-input w-full bg-yellow-100 border-0 focus:outline-none"
                />
              </div>

              <!-- DGD -->
              <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">DGD:</div>
              <div class="flex items-center gap-1 border-b border-gray-300 p-2 w-full bg-yellow-100">
                <span class="font-medium">AED</span>
                <input
                  type="number"
                  value="0"
                  min="0"
                  data-field="dgd"
                  class="shipping-input flex-1 bg-yellow-100 border-0 focus:outline-none"
                />
              </div>

              <!-- Labour -->
              <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">Labour:</div>
              <div class="flex items-center gap-1 border-b border-gray-300 p-2 w-full bg-yellow-100">
                <span class="font-medium">AED</span>
                <input
                  type="number"
                  value="0"
                  min="0"
                  data-field="labour"
                  class="shipping-input flex-1 bg-yellow-100 border-0 focus:outline-none"
                />
              </div>

              <!-- Total Shipping Cost -->
              <div class="flex items-center p-2 font-semibold w-full">Total Shipping Cost:</div>
              <div class="flex items-center p-2 w-full bg-yellow-100 total-shipping-cost">
                AED 0
              </div>
            </div>
          </div>
        </td>
      </tr>
    `);

    // Append rows
    const $tableBody = $("#materialTableBody");
    $tableBody.append($headerRow, $detailRow);

    // Setup correct S.NO for item row
    const $itemTableBody = $detailRow.find(".item-table-body");
    const nextSerial = 1;
    const firstRow = $("#itemRowTemplate").html().replace(/__SNO__/g, nextSerial);
    $itemTableBody.append(firstRow);

    // Reset & initialize all values inside this detail row
    $detailRow.find("input, textarea").val("");
    
    $detailRow.find('textarea.dynamic-textarea').each(function () { window._autoSizeTA?.(this); });
    _compactReceiptResize($detailRow);
    
    $detailRow.find(".total-vat, .total-material-buy, .total-material-without-vat, .total-shipping-cost").text("AED 0");
    $detailRow.find(".total-weight-kg").text("0");

    $detailRow.find(".dgd-value, .labour-value, .shipping-cost-value").text("AED 0");

    // Add dynamic input listeners to this row
    $detailRow.find("input[data-field], textarea").on("input", function () {
      calculateRowTotals($detailRow, $headerRow);
    });

    // Trigger initial calculation
    calculateRowTotals($detailRow, $headerRow);
    
    // create initial snapshot for new draft row
    $detailRow.data('snapshot', buildMaterialSnapshot($detailRow));

    // drafts are not submitted/loaded -> icon stays hidden (fine)
    toggleUpdateButtonForDetail($detailRow);
  });

  // On blur or input: adjust based on content
  $(document).on("blur input", ".editable-input", function () {
    if ($(this).val().trim() === "") {
      // EMPTY: white background + border
      $(this)
        .removeClass("border-0")
        .addClass("border border-gray-300 bg-white");
    } else {
      // FILLED: gray background + no border
      $(this)
        .removeClass("border border-gray-300")
        .addClass("border-0 bg-white");
    }
  });

  // Auto-resize on input for <textarea>
  $(document).on("input", ".dynamic-textarea", function () {
    const $textarea = $(this);

    // Auto-resize
    this.style.height = "auto";
    this.style.height = this.scrollHeight + "px";

    // While typing, make it visually editable
    $textarea.css({
      "border": "1px solid #ccc",
      "background": "#fff",
      "outline": "none",
      "box-shadow": "none",
      "resize": "none",
      "overflow": "hidden"
    });
  });
  
  $(document).on('input', '.header-row textarea.mh-supplier-name, .header-row textarea.mh-brief', function () {
        window._autoSizeTA?.(this);
    });

  // Grow as you type
  $(document)
    .off('input.dynamicTA')
    .on('input.dynamicTA', '.dynamic-textarea', function () {
      window._autoSizeTA(this);
    });

  // Keep full height after blur; keep borders intact
  $(document)
    .off('blur.dynamicTA')
    .on('blur.dynamicTA', '.dynamic-textarea', function () {
      this.value = this.value.trim();
      window._autoSizeTA(this);
    });

  // when typing in Receipt No, re-evaluate the layout
  $(document)
    .off('input.receiptCompact')
    .on('input.receiptCompact', 'textarea.receipt-no-textarea', function () {
      _compactReceiptResize($(this).closest('.detail-row, .mat-detail-row'));
    });

  // Live typing: recalc only the current row
  $(document).on(
    'input.gtsmat',
    `${MAT_ROOT} ${DETAIL_SEL} .material-input, ${MAT_ROOT} ${DETAIL_SEL} .shipping-input`,
    function () {
      const $detailRow = $(this).closest(DETAIL_SEL);
      const $headerRow = $detailRow.prev('.header-row');
      calculateRowTotals($detailRow, $headerRow);
      updateGtsTotalsFromDOM();
      document.dispatchEvent(new CustomEvent('gts:totals-changed'));
    }
  );
  
  // Ensure summary-footer inputs (shipping/dgd/labour) also toggle the Update button
  $(document).on('input change', `${MAT_ROOT} ${DETAIL_SEL} .shipping-input`, function () {
    const $detailRow = $(this).closest('.detail-row');
    const $headerRow = $detailRow.prev('.header-row');

    // keep totals right while typing
    calculateRowTotals($detailRow, $headerRow);

    // show/hide Update Row button based on diff
    toggleUpdateButtonForDetail($detailRow);
  });

  // auto-grow the description textarea
  $(document).on("input", ".material-input[data-field='description']", function () {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight) + "px";
  });

  // “Add item row” (id → class, and scoped)
  $(document).on('click', `${MAT_ROOT} .add-item-row-btn`, function () {
    const $detailRow = $(this).closest(DETAIL_SEL);
    const $headerRow = $detailRow.prev(".header-row");
    const $tbody = $detailRow.find('.item-table-body');

    // Get the last S.No from the last row
    let nextSerial = 1;
    const lastRow = $tbody.find("tr:last-child");

    if (lastRow.length) {
      const lastSno = parseInt(lastRow.find("td:first").text(), 10);
      if (!isNaN(lastSno)) nextSerial = lastSno + 1;
    }

    // Replace the serial in the template
    const $newRow = $($("#itemRowTemplate").html().replace("__SNO__", nextSerial));
    $newRow.attr("data-new", "true"); // Mark row as new

    $tbody.append($newRow);

    // Mark detail row as dirty
    $detailRow.data("dirty", true);

    // Recalculate row + overall totals
    $(".detail-row").each(function () {
      const $row = $(this);
      const $header = $row.prev(".header-row");
      calculateRowTotals($row, $header);
    });
    updateGtsTotalsFromDOM();
    
    // Now, after everything: re-check if update button should show
    toggleUpdateButtonForDetail($detailRow);
  });

  $(document).on("click.gtsmat", `${MAT_ROOT} .remove-row`, function () {
      const $headerRow = $(this).closest("tr.header-row");
      const $detailRow = $headerRow.next(DETAIL_SEL);   // detail is adjacent for drafts
    
      // Remove both rows
      if ($detailRow.length) $detailRow.remove();
      $headerRow.remove();
    
      // Renumber header S.No and (optionally) item S.No’s
      reindexSerialNumbers();           // renumbers header serials
      renumberRows($(MAT_ROOT));        // (your helper) renumbers item rows inside details
    
      paintCardsFromDOM('delete');
      window.fetchAndUpdateMaterialTotals(true); 
  });

  // Renumber (scoped + class-based)
  function renumberRows($scope = $(MAT_ROOT)) {
    $scope.find('.item-table-body tr').each(function (i) {
      $(this).find('td:first').text(i + 1);
    });
  }

  $(document).on("click", `${MAT_ROOT} .header-row`, function (e) {
      if ($(e.target).is("button") || $(e.target).closest("button").length || $(e.target).is("a")) return;
    
      const $detail = $(this).next(DETAIL_SEL);
      if (!$detail.length) return;
    
      // close other details (TAILWIND way)
      $(`${MAT_ROOT} ${DETAIL_SEL}`).not($detail).each(function(){
        $(this).addClass('hidden').removeClass('flex').css('display',''); // reset any inline display too
      });
    
      // toggle this one
      const isHidden = $detail.hasClass('hidden');
      if (isHidden) {
        $detail.removeClass('hidden').css('display',''); // let table-row render normally
      } else {
        $detail.addClass('hidden').css('display','');
      }
    
      // if now visible, autosize
      if (!$detail.hasClass('hidden')) {
        requestAnimationFrame(() => {
          $detail.find('textarea.dynamic-textarea').each((_, el) => window._autoSizeTA?.(el));
          _compactReceiptResize($detail);
        });
      }
    });
  
    // When user edits header row fields -> show/hide Update button
    $(document)
      .off('input.headerDirty change.headerDirty')
      .on('input.headerDirty change.headerDirty', `${MAT_ROOT} .header-row .mh-invoice-date,
                                            ${MAT_ROOT} .header-row .mh-invoice-no,
                                            ${MAT_ROOT} .header-row .mh-supplier-name,
                                            ${MAT_ROOT} .header-row .mh-brief`, function () {
        const $headerRow = $(this).closest('tr.header-row');
        const $detailRow = $headerRow.next(DETAIL_SEL); // use your DETAIL_SEL
        if (!$detailRow.length) return;
    
        // only for saved/loaded rows
        if ($detailRow.attr('data-loaded') === 'true' || $detailRow.hasClass('submitted')) {
          toggleUpdateButtonForDetail($detailRow);
        }
      });
      
    // Click the long text -> show date picker input
    $(document).on('click', '.mh-date-text', function () {
      if (IS_CLOSED) return;
    
      const $cell = $(this).closest('td');
      const $span = $(this);
      const $input = $cell.find('.mh-invoice-date');
    
      $span.addClass('hidden');
      $input.removeClass('hidden').trigger('focus');
    
      // Open picker if supported
      if ($input[0] && typeof $input[0].showPicker === 'function') {
        $input[0].showPicker();
      }
    });
    
    // When date changes -> update span text + mark dirty
    $(document).on('change', '.mh-invoice-date', function () {
      const $input = $(this);
      const iso = ($input.val() || '').trim();
    
      const $cell = $input.closest('td');
      $cell.find('.mh-date-text').text(formatLongDate(iso));
    
      // IMPORTANT: trigger your dirty logic
      const $detailRow = $input.closest('tr.header-row').next('.detail-row');
      if (!$detailRow.length) return;
      
      toggleUpdateButtonForDetail($detailRow);
    });
    
    // Blur -> hide input, show long text again
    $(document).on('blur', '.mh-invoice-date', function () {
      const $input = $(this);
      const $cell = $input.closest('td');
    
      $input.addClass('hidden');
      $cell.find('.mh-date-text').removeClass('hidden');
    });

  $(document).on("click.gtsmat", `${MAT_ROOT} .materials-submit-btn`, function () {
    const $headerRow = $(this).closest("tr");
    const $detailRow = $headerRow.next(DETAIL_SEL);
    
    calculateRowTotals($detailRow, $headerRow);
        
    // pull what the UI shows in the table
    const uiTotalMaterial =
    parseFloat(String($headerRow.find(".header-total-material").text()).replace(/[^0-9.\-]/g, "")) || 0;

    // Extract header fields
    const invoiceDate = ($headerRow.find('.mh-invoice-date').val() || '').trim();
    const invoiceNo = ($headerRow.find('.mh-invoice-no').val() || '').trim();
    const supplierName = ($headerRow.find('.mh-supplier-name').val() || '').trim();
    const briefDescription = ($headerRow.find('.mh-brief').val() || '').trim();
    const totalMaterial =
        parseFloat(String($headerRow.find(".header-total-material").text()).replace(/[^0-9.\-]/g, "")) || 0;
    const totalShipping =
        parseFloat(String($headerRow.find(".header-total-shipping").text()).replace(/[^0-9.\-]/g, "")) || 0;

    // Build the payload
    const data = {
      invoice_date: invoiceDate,
      invoice_no: invoiceNo,
      supplier_name: supplierName,
      brief_description: briefDescription,
      shipping_cost: parseFloat($detailRow.find('[data-field="shippingCost"]').val()) || 0,
      dgd:           parseFloat($detailRow.find('[data-field="dgd"]').val()) || 0,
      labour:        parseFloat($detailRow.find('[data-field="labour"]').val()) || 0,
      total_material: parseFloat(totalMaterial),
      total_vat: parseFloat($detailRow.find('.total-vat').text().replace(/[^\d.]/g, "")) || 0,
      total_material_buy: parseFloat($detailRow.find('.total-material-buy').text().replace(/[^\d.]/g, "")) || 0,
      total_weight: parseFloat($detailRow.find('.total-weight-kg').text().replace(/[^\d.]/g, "")) || 0,
      ui_total_material: uiTotalMaterial,
      total_shipping_cost: totalShipping,
      mode_of_transaction: $detailRow.find('input[placeholder="Enter Transaction Method"]').val(),
      receipt_no: $detailRow.find('textarea[placeholder="Enter receipt numbers"]').val(),
      remarks: $detailRow.find('textarea[placeholder="Enter Remarks"]').val(),
      items: []
    };

    // THIS LOOP RIGHT HERE to collect item rows
    $detailRow.find(".item-row").each(function () {
      const $row = $(this);
        data.items.push({
          description:    $row.find('[data-field="description"]').val(),
          units:          parseFloat($row.find('[data-field="units"]').val()) || 0,
          unit_price:     parseFloat($row.find('[data-field="unitPrice"]').val()) || 0,
          vat:            parseFloat($row.find('[data-field="vat"]').val()) || 0,
          weight_per_ctn: parseFloat($row.find('[data-field="weightPerCtn"]').val()) || 0,
          ctns:           parseFloat($row.find('[data-field="ctns"]').val()) || 0,
        });
    });

    // Send to backend
    $.ajax({
      url: investmentUrl('gts-materials'),
      method: "POST",
      data,
      headers: {
        "X-CSRF-TOKEN": $('meta[name="csrf-token"]').attr("content")
      },
      success: function (response) {
        // 1) persist ids on both rows
        const materialId = response.id;
        $headerRow.attr("data-id", materialId);
        $detailRow.addClass("submitted").attr("data-loaded", "true");

        // 2) ensure header totals reflect what we just typed
        calculateRowTotals($detailRow, $headerRow);

        // 3) rebuild the full action button cluster (upload / view / delete)
        const fullActions = `
        <div class="action-buttons flex justify-center gap-1">
          ${createMaterialIcon('upload-btn', 'bi-cloud-arrow-up-fill', 'Upload Attachments',
          'bg-blue-500 hover:bg-blue-600 text-white', materialId)}
          ${createMaterialIcon('view-btn', 'bi-paperclip', 'View Attachments',
            'bg-gray-700 hover:bg-gray-800 text-white', materialId)}
          ${createMaterialIcon('delete-material-btn', 'bi-trash-fill', 'Delete Row',
              'bg-red-500 hover:bg-red-600 text-white', materialId)}
        </div>`;
        $headerRow.find('td:last').html(fullActions);

        // 4) make sure cards repaint AFTER header cells are updated
        paintCardsFromDOM('save');
        fetchAndUpdateMaterialTotals(true);

        if (typeof window.fetchAndUpdateInvestmentTotal === 'function') window.fetchAndUpdateInvestmentTotal();

        // 5) UX: show saved state
        const $cell = $headerRow.find('td:last').addClass('bg-green-50');
        setTimeout(() => $cell.removeClass('bg-green-50'), 600);
      },
      error: function (xhr) {
        console.error("Error saving material:", xhr.responseText);
        alert("Failed to save. See console for details.");
      }
    });
  });
  

    $(document)
      .off('click.materialUpdate')
      .on('click.materialUpdate', '.update-row-btn', function (e) {
    e.preventDefault();
    e.stopPropagation();
    
    const $btn = $(this);
    if ($btn.data('loading')) return;
    
    const $headerRow = $(this).closest('tr.header-row');
    const $detailRow = $headerRow.next(DETAIL_SEL);
    const id = $headerRow.data('id');
    if (!id || !$detailRow.length) return;
    
    // Prevent double clicks
    if ($btn.data('busy')) return;
    $btn.data('busy', true).prop('disabled', true);
    
    // Optional: swap icon to spinner while saving
    const $icon = $btn.find('i');
    const oldIconClass = $icon.attr('class');
    $icon.attr('class', 'bi bi-arrow-repeat').addClass('animate-spin');

    calculateRowTotals($detailRow, $headerRow);

    const totalMaterialBuy =
      parseFloat(String($detailRow.find('.total-material-buy').text()).replace(/[^0-9.\-]/g,'')) || 0;

    const uiTotalMaterial =
      parseFloat(String($headerRow.find('.header-total-material').text()).replace(/[^0-9.\-]/g,'')) || 0;
      
    const headerInvoiceDate = ($headerRow.find('.mh-invoice-date').val() || '').trim();
    const headerInvoiceNo = ($headerRow.find('.mh-invoice-no').val() || '').trim();
    const headerSupplier = ($headerRow.find('.mh-supplier-name').val() || '').trim();
    const headerBrief = ($headerRow.find('.mh-brief').val() || '').trim();

    const payload = {
      invoice_date: headerInvoiceDate,
      invoice_no: headerInvoiceNo,
      supplier_name: headerSupplier,
      brief_description: headerBrief,
      
      mode_of_transaction: ($detailRow.find('input[placeholder="Enter Transaction Method"]').val() || '').trim(),
      receipt_no: ($detailRow.find('textarea.receipt-no-textarea').val() || '').trim(),
      remarks: ($detailRow.find('textarea[placeholder="Enter Remarks"]').val() || '').trim(),
      shipping_cost: parseFloat($detailRow.find('[data-field="shippingCost"]').val()) || 0,
      dgd: parseFloat($detailRow.find('[data-field="dgd"]').val()) || 0,
      labour: parseFloat($detailRow.find('[data-field="labour"]').val()) || 0,
      total_material: parseFloat(String($headerRow.find('.header-total-material').text()).replace(/[^0-9.\-]/g, '')) || 0,
      total_shipping_cost: parseFloat(String($headerRow.find('.header-total-shipping').text()).replace(/[^0-9.\-]/g, '')) || 0,
      total_material_buy: totalMaterialBuy,
      ui_total_material: uiTotalMaterial,
      materials: []
    };

    $detailRow.find('tr.item-row').each(function () {
      const $r = $(this);
      const m = {
        description: ($r.find('[data-field="description"]').val() || '').trim(),
        units: parseFloat($r.find('[data-field="units"]').val()) || 0,
        unit_price: parseFloat($r.find('[data-field="unitPrice"]').val()) || 0,
        vat: parseFloat($r.find('[data-field="vat"]').val()) || 0,
        weight_per_ctn: parseFloat($r.find('[data-field="weightPerCtn"]').val()) || 0,
        ctns: parseFloat($r.find('[data-field="ctns"]').val()) || 0
      };
      const itemId = $r.attr('data-item-id');
      if (itemId) m.id = itemId;
      payload.materials.push(m);
    });
    
    // lock UI + spinner
    setUpdateBtnLoading($btn, true);

    $.ajax({
      url: investmentUrl(`/gts-materials/${id}`),
      method: 'PUT',
      headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
      data: payload,
      timeout: 20000
    })
      .done(function () {
        // After success: refresh snapshot using the SAME snapshot builder
        $detailRow.data('snapshot', buildMaterialSnapshot($detailRow));

        // hide update icon (since no longer dirty)
        toggleUpdateButtonForDetail($detailRow);
        
        // flash success
        const $cell = $headerRow.find('td:last').addClass('bg-green-50');
        setTimeout(() => $cell.removeClass('bg-green-50'), 600);

        calculateRowTotals($detailRow, $headerRow);
        paintCardsFromDOM('update');
        window.fetchAndUpdateMaterialTotals(true);
      })
      .fail(function (xhr) {
        alert(xhr?.responseJSON?.message || 'Update failed.');
        console.error(xhr?.responseText || xhr);
        
        // keep update icon visible if still dirty
         toggleUpdateButtonForDetail($detailRow);
      })
      .always(function () {
        // unlock button + restore icon
        $btn.data('busy', false).prop('disabled', false);
        $icon.removeClass('animate-spin').attr('class', oldIconClass || 'bi bi-arrow-repeat');
        
        setUpdateBtnLoading($btn, false);
      });
  });


  let deleteTargetHeader = null;
  let deleteTargetDetail = null;
  let deleteTargetId = null;

  $(document).on("click.gtsmat", `${MAT_ROOT} .delete-material-btn`, function () {
    deleteTargetHeader = $(this).closest("tr.header-row");
    deleteTargetDetail = deleteTargetHeader.next(DETAIL_SEL);
    
    // ALWAYS take id from the button (cannot mismatch)
    deleteTargetId = $(this).data("id") || deleteTargetHeader.data("id");
    
    console.log('Deleting material id=', deleteTargetId, 'cycle=', window.activeCycleId);

    $("#deleteConfirmModal").removeClass("hidden").addClass("flex");
  });

  $("#cancelDeleteBtn").on("click", function () {
    $("#deleteConfirmModal").addClass("hidden").removeClass("flex");
    deleteTargetHeader = null;
    deleteTargetDetail = null;
    deleteTargetId = null;
  });

  $("#confirmDeleteBtn").on("click", function () {
      if (!deleteTargetId) return;
    
      const $btn = $(this);
      if ($btn.data('busy')) return;
      $btn.data('busy', true).prop('disabled', true);
    
      $.ajax({
        url: api(`gts-materials/${deleteTargetId}`),
        method: 'DELETE',
        headers: { "X-CSRF-TOKEN": $('meta[name="csrf-token"]').attr("content") }
      })
      .done(function () {
        // remove UI rows
        const $header = $(`#materialTableBody tr.header-row[data-id="${deleteTargetId}"]`);
        const $detail  = $(`${DETAIL_SEL}[data-id="${deleteTargetId}"]`);
        $detail.remove();
        $header.remove();
    
        reindexSerialNumbers();
        paintCardsFromDOM('delete');
        if (typeof fetchAndUpdateMaterialTotals === 'function') fetchAndUpdateMaterialTotals(true);
    
        $("#deleteConfirmModal").addClass("hidden").removeClass("flex");
        deleteTargetHeader = deleteTargetDetail = deleteTargetId = null;
      })
      .fail(function (xhr) {
        console.error(xhr.responseText);
        alert(xhr?.responseJSON?.message || "Delete failed.");
      })
      .always(function(){
        $btn.data('busy', false).prop('disabled', false);
      });
    });

  let $rowToDelete = null; // temp store clicked row

  $(document).on("click", `${MAT_ROOT} .delete-item-btn`, function () {
    $rowToDelete = $(this).closest("tr");
    const itemId = $rowToDelete.data("item-id");

    if (itemId) {
      // Show confirmation modal only for saved items
      $("#confirmItemDeleteModal").removeClass("hidden flex").addClass("flex");
    } else {
      // Just remove from DOM if unsaved
      $rowToDelete.remove();
      
      // Re-check if update button is needed
      const $detailRow = $rowToDelete.closest(DETAIL_SEL);
      toggleUpdateButtonForDetail($detailRow);
    }
  });

  $("#confirmItemDeleteBtn").on("click", function () {
    const itemId = $rowToDelete && $rowToDelete.data("item-id");
    if (!itemId) return;

    $.ajax({
      url: investmentUrl(`gts-materials/items/${itemId}`),
      method: "DELETE",
      headers: { "X-CSRF-TOKEN": $('meta[name="csrf-token"]').attr("content") }
    })
      .done(function (res) {
        // Remove the item row in the UI
        const $detailRow = $rowToDelete.closest(DETAIL_SEL);
        const $headerRow = $detailRow.prev('.header-row');
        $rowToDelete.remove();

        // Recompute this detail+header numbers and repaint top cards
        calculateRowTotals($detailRow, $headerRow);
        paintCardsFromDOM('item-delete');

        // Server totals (used by dashboard & cold starts)
        if (typeof fetchAndUpdateMaterialTotals === 'function') fetchAndUpdateMaterialTotals();

        // If backend returned fresh totals, update header cells directly too
        if (res && typeof res.ui_total_material !== "undefined") {
          $headerRow.find(".header-total-material").text(formatCurrency(res.ui_total_material));
        }
        $("#confirmItemDeleteModal").addClass("hidden");
        $rowToDelete = null;
      })
      .fail(function (xhr) {
        alert("Failed to delete item. See console for details.");
        console.error(xhr.responseText);
      });
  });

  $("#cancelItemDeleteBtn").on("click", function () {
    $("#confirmItemDeleteModal").addClass("hidden");
    $rowToDelete = null;
  });

  // ---------- MATERIAL ATTACHMENTS (Metal-ledger style) ----------

  const $upModal = $('#matAttUploadModal');
  const $vwModal = $('#matAttViewerModal');

  $(document).on('click', '.mat-att-del-btn', function () {
    const id = $(this).data('id');
    const type = $(this).data('type');
    const index = $(this).data('index');

    if (!confirm('Delete this file?')) return;

    $.ajax({
        url: investmentUrl(`gts-materials/${id}/delete-attachment`),
        method: 'POST',
        data: { type, index },
        headers: {
            'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        }
    })
    .done(function (res) {

        // THIS IS YOUR FIX 2 LOCATION
        if (res?.attachments) {
            window.__matAttCache[id] = res.attachments;
        }

        setUploadLabels(window.__matAttCache[id] || {});
        renderExistingList(window.__matAttCache[id] || {}, id);
        updateRowAttachmentBadge(id, window.__matAttCache[id] || {});
    })
    .fail(function () {
        alert('Delete failed');
    });
  });
  
  // Browse buttons
  $(document).on('click', '[data-browse="invoice"]', () => $('#matInvoiceInput').trigger('click'));
  $(document).on('click', '[data-browse="receipt"]', () => $('#matReceiptInput').trigger('click'));
  $(document).on('click', '[data-browse="note"]', () => $('#matNoteInput').trigger('click'));

  // Dropzone click
  $(document).on('click', '.pm-dropzone[data-pick="invoice"]', (e) => {
    if ($(e.target).closest('button').length) return;
    $('#matInvoiceInput').trigger('click');
  });
  $(document).on('click', '.pm-dropzone[data-pick="receipt"]', (e) => {
    if ($(e.target).closest('button').length) return;
    $('#matReceiptInput').trigger('click');
  });
  $(document).on('click', '.pm-dropzone[data-pick="note"]', (e) => {
    if ($(e.target).closest('button').length) return;
    $('#matNoteInput').trigger('click');
  });

  // File label updates
  $('#matInvoiceInput').on('change', function () { $('#matInvoiceLabel').text(this.files?.[0]?.name || 'No file selected yet.'); $('#matRemoveInvoice').val('0'); });
  $('#matReceiptInput').on('change', function () { $('#matReceiptLabel').text(this.files?.[0]?.name || 'No file selected yet.'); $('#matRemoveReceipt').val('0'); });
  $('#matNoteInput').on('change', function () { $('#matNoteLabel').text(this.files?.[0]?.name || 'No file selected yet.'); $('#matRemoveNote').val('0'); });
  
  // Upload submit button
  $('#matAttUploadBtn').on('click', function () {
    const id = $('#matAttRowId').val();
    if (!id) return;

    const fd = new FormData($('#matAttUploadForm')[0]);

    const $btn = $(this);
    $btn.prop('disabled', true).addClass('opacity-70 pointer-events-none').html(`<i class="bi bi-arrow-repeat animate-spin"></i> Uploading...`);

    $.ajax({
      url: investmentUrl(`gts-materials/upload-attachments/${id}`),
      method: 'POST',
      data: fd,
      processData: false,
      contentType: false,
      headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
    })
      .done(function (res) {
        window.__matAttCache[id] = res?.attachments ?? window.__matAttCache[id] ?? {};
        updateRowAttachmentBadge(id, window.__matAttCache[id]);

        alert(res?.message ?? 'Attachments saved.');
        hidePM($upModal);
        fastLoadAttachments(id);
        loadGtsMaterials(); // refresh list/buttons state
      })
      .fail(function (xhr) {
        alert(xhr?.responseJSON?.message || 'Upload failed.');
        console.error(xhr?.responseText || xhr);
      })
      .always(function () {
        $btn.prop('disabled', false).removeClass('opacity-70 pointer-events-none').html(`<i class="bi bi-cloud-arrow-up"></i> Upload`);
      });
  });

  // Download current file (single)
  $('#matDownloadBtn').on('click', function (e) {
    const href = $(this).attr('href');
    if (!href || href === '#') { e.preventDefault(); return; }
    // allow normal download/open
  });

  // Close viewer modal
  $('#matAttViewerClose, #matAttViewerBackdrop')
    .off('click.matVwClose')
    .on('click.matVwClose', function () { hidePM($vwModal); });

  $(document).on('click', '#viewInvoiceLink, #viewReceiptLink, #viewNoteLink', function (e) {
    const href = $(this).attr('href');
    if (!href || href === '#') return;
    e.preventDefault();
    renderPreview('#matPreview', href);
  });

  $('#closeMaterialViewModal, #closeMaterialViewModalBottom').on('click', function () {
    $("#viewAttachmentModal").fadeOut(300, function () {
      $(this).addClass("hidden").removeClass("flex");
    });
  });

  // Any input change inside a material detail row => re-check diff
  $(document).off('input.matChange change.matChange')
  .on('input.matChange change.matChange', `${MAT_ROOT} ${DETAIL_SEL} input, ${MAT_ROOT} ${DETAIL_SEL} textarea`, function () {
    const $detailRow = $(this).closest('.detail-row');
    if ($detailRow.attr('data-loaded') === 'true' || $detailRow.hasClass('submitted')) {
      toggleUpdateButtonForDetail($detailRow);
    }
  });

  // Recalc + re-format the summary footer whenever Shipping/DGD/Labour change
  $(document).off('input.materialShip change.materialShip')
    .on('input.materialShip change.materialShip',
      `${MAT_ROOT} ${DETAIL_SEL} input[data-field="shippingCost"], ${MAT_ROOT} ${DETAIL_SEL} input[data-field="dgd"], ${MAT_ROOT} ${DETAIL_SEL} input[data-field="labour"]`,
      function () {
        const $detailRow = $(this).closest(DETAIL_SEL);
        const $headerRow = $detailRow.prev('.header-row');

        // Recompute totals for THIS row (keeps AED prefix correct)
        calculateRowTotals($detailRow, $headerRow);

        // Also keep the Action “Update” icon logic in sync
        toggleUpdateButtonForDetail($detailRow);
      });

}

$(document).ready(function () {

  const $box = $('#matPreviewBox');
  let zoom = 1;

  function setZoom(newZoom) {
    zoom = Math.max(1, Math.min(3, newZoom));
    $('#matPreviewImg').css('transform', `scale(${zoom})`);
  }

  // =============================
  // SCROLL ZOOM
  // =============================
  $box.on('wheel', function (e) {
    const hasImg = $('#matPreviewImg').attr('src');
    if (!hasImg) return;

    e.preventDefault();

    const delta = e.originalEvent.deltaY;

    if (delta < 0) {
      setZoom(zoom + 0.1);
    } else {
      setZoom(zoom - 0.1);
    }
  });

  // =============================
  //️ DRAG TO PAN
  // =============================
  let isDragging = false;
  let startX, startY, scrollLeft, scrollTop;

  $box.on('mousedown', function (e) {
    if (zoom <= 1) return;

    isDragging = true;
    $box.addClass('dragging');

    startX = e.pageX;
    startY = e.pageY;
    scrollLeft = this.scrollLeft;
    scrollTop = this.scrollTop;
  });

  $(document).on('mousemove', function (e) {
    if (!isDragging) return;

    e.preventDefault();

    const dx = e.pageX - startX;
    const dy = e.pageY - startY;

    $box[0].scrollLeft = scrollLeft - dx;
    $box[0].scrollTop = scrollTop - dy;
  });

  $(document).on('mouseup', function () {
    isDragging = false;
    $box.removeClass('dragging');
  });

  // =============================
  // RESET ZOOM WHEN IMAGE LOADS
  // =============================
  $('#matPreviewImg').on('load', function () {
    zoom = 1;
    $(this).css('transform', 'scale(1)');
  });

});

// helper once, near top of your file
function fileLabel(v) {
  if (!v) return 'No file chosen';
  // new shape: { url, name }
  if (typeof v === 'object') return v.name || 'Existing file';
  // legacy: plain URL string
  if (typeof v === 'string') {
    try { return v.split('/').pop() || 'Existing file'; } catch { return 'Existing file'; }
  }
  return 'Existing file';
}

function linkUrl(v) {
  return (v && typeof v === 'object') ? v.url : (typeof v === 'string' ? v : null);
}

function updateFileLabel(inputId, labelId) {
  const el = document.getElementById(inputId);
  const name = el && el.files && el.files[0] ? el.files[0].name : 'No file chosen';
  document.getElementById(labelId).textContent = name;
}
// $(document).on('change', '#gtsAttachInvoice', () => updateFileLabel('gtsAttachInvoice', 'gtsAttachInvoiceFilename'));
$(document).on('change', '#gtsAttachReceipt', () => updateFileLabel('gtsAttachReceipt', 'gtsAttachReceiptFilename'));
$(document).on('change', '#gtsAttachNote', () => updateFileLabel('gtsAttachNote', 'gtsAttachNoteFilename'));

function reindexSerialNumbers() {
  let i = 1;
  $("#materialTableBody tr.header-row").each(function () {
    $(this).find("td:first").text(i++);
  });
}

// Try multiple selector variants (input value or text content)
function getNumber($root, selectors) {
  for (const sel of selectors) {
    const $el = $root.find(sel).first();
    if ($el.length) {
      const raw = ($el.is('input, textarea, select')) ? $el.val() : $el.text();
      // strip currency text & thousand separators here (no external num())
      const n = Number(String(raw ?? '').replace(/[^0-9.\-]/g, '')) || 0;
      return n;
    }
  }
  return 0;
}

// Write currency whether target is <td> or <input>
function writeCurrency($root, selector, value) {
  const s = formatCurrency(value);
  $root.find(selector).each(function () {
    const $el = $(this);
    if ($el.is('input, textarea, select')) $el.val(s); else $el.text(s);
  });
}

// Robust VAT interpreter: 0, %, or multiplier
function vatAmount(base, vatRaw) {
  const v = Number(vatRaw);
  if (!isFinite(v) || v <= 0) return 0;
  if (v > 1 && v < 2) return base * (v - 1.0); // 1.05 => +5%
  if (v > 1 && v <= 100) return base * (v / 100); // 5 => 5%
  if (v > 0 && v < 1) return base * v;           // 0.05 => 5%
  return 0;
}

function stripZeros(n) {
  const s = String(n);
  return s.includes('.') ? s.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1') : s;
}

function setUpdateBtnLoading($btn, loading) {
  if (!$btn || !$btn.length) return;

  if (loading) {
    if ($btn.data('loading')) return; // already loading
    $btn.data('loading', true);

    $btn.data('oldHtml', $btn.html());
    $btn.prop('disabled', true).addClass('opacity-70 pointer-events-none');

    // replace icon with spinner
    $btn.html(`
      <i class="bi bi-arrow-repeat animate-spin" style="font-size:16px;line-height:1"></i>
    `);
  } else {
    $btn.data('loading', false);
    $btn.prop('disabled', false).removeClass('opacity-70 pointer-events-none');

    const old = $btn.data('oldHtml');
    if (old) $btn.html(old);
  }
}

function calculateRowTotals($detailRow, $headerRow) {
  const num = (v) => {
    if (v == null) return 0;
    return Number(String(v).replace(/[^0-9.\-]/g, '')) || 0;
  };

  let totalWeight = 0;
  let totalUnits = 0;
  let totalMaterialBuy = 0;
  let totalVATMoney = 0;       // monetary VAT (kept for other uses if any)
  let totalMaterialNoVAT = 0;

  // Use the nearest section that actually contains header labels/inputs
  const $scope = $detailRow.closest('.gts-material-detail, .material-card, .card, form').first().length
    ? $detailRow.closest('.gts-material-detail, .material-card, .card, form').first()
    : $detailRow;

  // Per-row calculations
  $detailRow.find(".item-row").each(function () {
    const $row = $(this);

    const units = num($row.find('[data-field="units"]').val());
    const unitPrice = num($row.find('[data-field="unitPrice"]').val());
    const vatInput = Number(($row.find('[data-field="vat"]').val() ?? '').toString().trim()) || 0;
    const weightPerCtn = num($row.find('[data-field="weightPerCtn"]').val());
    const ctns = num($row.find('[data-field="ctns"]').val());

    const base = units * unitPrice;                     // NO VAT
    const vatRaw = (vatInput === 1) ? 0 : vatInput;     // treat 1 as "no VAT"
    const vatAmt = vatAmount(base, vatRaw);

    // MATERIALS rule: if VAT input > 1, treat as multiplier; else show base
    const rowBuy = (vatInput > 1) ? (base * vatInput) : base;
    $row.find(".total-material").text(fmtNum7(rowBuy));

    totalMaterialNoVAT += base;
    totalVATMoney += vatAmt;
    totalMaterialBuy += rowBuy;

    const weightTotal = weightPerCtn * ctns;
    $row.find(".total-weight").text(fmtNum7(weightTotal));
    totalWeight += weightTotal;
    totalUnits += units;
  });

  // Read shipping numbers (header labels or real inputs)
  const shippingCost = getNumber($scope, [
    '[data-field="shippingCost"]',
    '[name="shipping_cost"]', '#shipping_cost',
    '.shipping-cost-input', '.header-shipping-cost'
  ]);
  const dgd = getNumber($scope, [
    '[data-field="dgd"]',
    '[name="dgd"]', '#dgd',
    '[name="dgd_charges"]', '.dgd-input', '.header-dgd'
  ]);
  const labour = getNumber($scope, [
    '[data-field="labour"]',
    '[name="labour"]', '#labour',
    '[name="labour_charges"]', '.labour-input', '.header-labour'
  ]);
  const totalShipping = shippingCost + dgd + labour;

  // Paint detail footer: weights & units
  $detailRow.find(".total-weight-kg").text(
    totalWeight.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 7 })
  );
  $detailRow.find(".total-units").text(totalUnits.toLocaleString());
  
  // 5% VAT on total material (without VAT)
  const computedVat = totalMaterialNoVAT * 0.05;
  
  // use AED 7dp for detail/footer and header cells
  const writeAED7 = (sel, val) => {
    $detailRow.find(sel).text(fmtAED7(val));
  };
  
  // Footer money cells
  writeAED7(".total-vat", computedVat);
  writeAED7(".total-material-buy", totalMaterialBuy);
  writeAED7(".total-material-without-vat", totalMaterialNoVAT);
  writeAED7(".shipping-cost-value", shippingCost);
  writeAED7(".dgd-value", dgd);
  writeAED7(".labour-value", labour);

  // *** THE FIX: total shipping = shipping + dgd + labour ***
  $detailRow.find(".total-shipping-cost").text(fmtAED7(totalShipping));

  // Header paints
  $headerRow.find(".header-total-material").text(fmtAED7(totalMaterialBuy));
  $headerRow.find(".header-total-shipping").text(fmtAED7(totalShipping));

  // Defensive final paint so no legacy code overwrites it
  queueMicrotask(() => {
    $detailRow.find(".total-shipping-cost").text(fmtAED7(totalShipping));
    $headerRow.find(".header-total-shipping").text(fmtAED7(totalShipping));
  });

  // Notify rest of app / caches (one call is enough)
  if (typeof updateGtsTotalsFromDOM === 'function') updateGtsTotalsFromDOM();
  document.dispatchEvent(new CustomEvent('gts:totals-changed'));
}

function updateMaterialTotals(totalMaterial, totalShipping) {
  const material = Number(totalMaterial) || 0;
  const shipping = Number(totalShipping) || 0;
  const investment = Number(window.sheetTotals?.investment) || 0; // add cached inv

  window.sheetTotals.material = material;
  window.sheetTotals.shipping = shipping;

  // save for Summary cold-starts (now with inv too)
  setGtsTotalsToStorage({ material, shipping, investment });

  // native listeners
  document.dispatchEvent(new CustomEvent('gts:totals-changed', {
    detail: { material, shipping, investment }
  }));
}

function gtsTotalsKey() {
  return 'gtsTotals:' + String(window.activeCycleId ?? 'global');
}

function formatCurrency(value) {
  return fmtAED7(value);
}

function loadGtsMaterials() {
  $.get(investmentUrl('gts-materials'), function (data) {
    if (!Array.isArray(data)) {
      console.error('Invalid response:', data);
      return;
    }

    // Clear any existing rows
    $("#materialTableBody").empty();

    data.reverse().forEach(function (entry, index) {
      const id = entry.id;
      const serialNo = index + 1;
      const num = (v) => Number(String(v ?? 0).replace(/[^0-9.\-]/g, '')) || 0;

      const attCount = [entry.invoice_path, entry.receipt_path, entry.note_path].filter(Boolean).length;

      const actionButtons = IS_CLOSED ? '' : `
          <div class="action-buttons flex justify-center gap-1 items-center">
            ${createMaterialIcon('upload-btn', 'bi-cloud-arrow-up-fill', 'Upload Attachments',
              'bg-blue-500 hover:bg-blue-600 text-white', id)}
        
            ${createMaterialIcon('view-btn', 'bi-paperclip', 'View Attachments',
              'bg-gray-800 hover:bg-gray-900 text-white', id, attCount)}
        
            ${createMaterialIcon('delete-material-btn', 'bi-trash-fill', 'Delete Row',
              'bg-red-500 hover:bg-red-600 text-white', id)}
          </div>
        `;

      // compute exactly what the cards/summary use
      const headerMat = num(
        entry.ui_total_material ?? entry.total_material_buy ?? entry.total_material ?? 0
      );

      const headerShip = (() => {
        const tsc = num(entry.total_shipping_cost);
        if (tsc) return tsc; // prefer explicit total if present (even as string)
        // fallback: sum individual parts
        return num(entry.shipping_cost) + num(entry.dgd) + num(entry.labour);
      })();
      
      const COLS = IS_CLOSED ? 7 : 8;
      
      const isoDate = entry.invoice_date ? String(entry.invoice_date).slice(0, 10) : '';

      // Create header row
      const $headerRow = $(`
        <tr class="header-row cursor-pointer hover:bg-gray-100" data-id="${id}" data-loaded="true">
          <td class="border p-2 text-center">${serialNo}</td>
          
          <td class="border p-2">
              <span class="mh-date-text block ${IS_CLOSED ? '' : 'cursor-pointer'}">
                ${formatLongDate(isoDate)}
              </span>
              <input type="date"
                     class="mh-invoice-date w-full bg-transparent outline-none hidden"
                     value="${isoDate}" ${IS_CLOSED ? 'disabled' : ''}>
            </td>
        
            <td class="border p-2">
              <input type="text" class="mh-invoice-no w-full bg-transparent outline-none"
                     value="${escapeHtml(entry.invoice_no ?? '')}" ${IS_CLOSED ? 'disabled' : ''}>
            </td>
        
            <td class="border p-2 align-top">
              <textarea
                class="mh-supplier-name w-full bg-transparent outline-none resize-none leading-snug"
                rows="1"
                style="white-space:pre-wrap; word-break:break-word; overflow:hidden;"
                ${IS_CLOSED ? 'disabled' : ''}>${escapeHtml(entry.supplier_name ?? '')}</textarea>
            </td>
            
            <td class="border p-2 align-top">
              <textarea
                class="mh-brief w-full bg-transparent outline-none resize-none leading-snug"
                rows="1"
                style="white-space:pre-wrap; word-break:break-word; overflow:hidden;"
                ${IS_CLOSED ? 'disabled' : ''}>${escapeHtml(entry.brief_description ?? '')}</textarea>
            </td>
            
          <td class="border p-2 header-total-material">${formatCurrency(headerMat)}</td>
          <td class="border p-2 header-total-shipping">${formatCurrency(headerShip)}</td>
          ${IS_CLOSED ? '' : `<td class="border p-2 text-center">
            <div class="flex flex-col items-center gap-1">
              ${actionButtons}
            </div>
          </td>`}
        </tr>
      `);

      const $detailRow = $(`
        <tr class="mat-detail-row detail-row relative hidden" data-id="${id}">
          <td colspan="${COLS}" class="p-2 bg-gray-50">
          <div class="text-center font-bold text-xl mb-4 bg-blue-200 p-2">${entry.supplier_name}</div>

            <div class="flex justify-center">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-5xl mx-auto">
                <!-- Left Section -->
                <div class="space-y-2 border-4 border-zinc-500 p-5 bg-white">
                  <div class="flex items-start gap-2"><span class="font-semibold w-56">Invoice No:</span> <div class="flex-1 text-gray-700">${entry.invoice_no ?? '-'}</div></div>
                  <div class="flex items-start gap-2"><span class="font-semibold w-56">Total Weight (KG):</span> <div class="flex-1 text-gray-700 total-weight-kg">0</div></div>
                  <div class="flex items-start gap-2"><span class="font-semibold w-56">Total No. of Units:</span> <div class="flex-1 text-gray-700 total-units">0</div></div>
                  <div class="flex items-start gap-2"><span class="font-semibold w-56">DGD:</span> <div class="flex-1 text-gray-700 dgd-value">AED</div></div>
                  <div class="flex items-start gap-2"><span class="font-semibold w-56">Labour Charges:</span> <div class="flex-1 text-gray-700 labour-value">AED</div></div>
                  <div class="flex items-start gap-2"><span class="font-semibold w-56">Shipping Cost:</span> <div class="flex-1 text-gray-700 shipping-cost-value">0</div></div>
                </div>
                <!-- Right Section -->
                <div class="space-y-2 border-4 border-zinc-500 p-5 bg-white">
                  <div class="flex items-start gap-2"><span class="font-semibold w-56">Mode of Transaction:</span> <input type="text" placeholder="Enter Transaction Method" class="flex-1 editable-input w-full rounded px-2 py-1 bg-white border border-gray-300 focus:outline-none" /></div>
                  <div class="flex items-start gap-2"><span class="font-semibold w-56">Receipt No:</span> <textarea placeholder="Enter receipt numbers" class="gts-area receipt-no-textarea flex-1 dynamic-textarea w-full rounded px-2 py-1 bg-white border border-gray-300 focus:outline-none overflow-y-auto whitespace-pre-wrap break-words leading-snug text-[13px] md:text-[14px]"></textarea></div>
                  <div class="flex items-start gap-2"><span class="font-semibold w-56">Remarks:</span> <textarea placeholder="Enter Remarks" class="gts-area flex-1 dynamic-textarea w-full rounded px-2 py-1 bg-white border border-gray-300 focus:outline-none resize-none overflow-hidden whitespace-pre-wrap break-words leading-snug text-[13px] md:text-[14px]"></textarea></div>
                </div>
              </div>
            </div>

            <!-- Item Table -->
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
                <tbody class="item-table-body">
                  <!-- Rows added here -->
                </tbody>
              </table>

              <button type="button" class="add-item-row-btn mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">+ Add More Items</button>
            </div>

            <!-- Summary Footer -->
            <div class="mt-4 border-4 border-zinc-700 bg-white">
              <div class="grid grid-cols-2 divide-x divide-gray-300">

                <!-- Total Material Without VAT -->
                <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">Total Material w/out VAT:</div>
                <div class="flex items-center border-b border-gray-300 p-2 w-full bg-yellow-100 total-material-without-vat">AED 0</div>

                <!-- Total VAT -->
                <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">Total VAT:</div>
                <div class="flex items-center border-b border-gray-300 p-2 w-full bg-yellow-100 total-vat">AED 0</div>

                <!-- Total Material Buy -->
                <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">Total Material Buy:</div>
                <div class="flex items-center border-b border-gray-300 p-2 w-full bg-yellow-100 total-material-buy">AED 0</div>

                <!-- Shipping Cost -->
                <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">Shipping Cost:</div>
                <div class="flex items-center gap-1 border-b border-gray-300 p-2 w-full bg-yellow-100">
                  <span class="font-medium">AED</span>
                  <input
                    type="number"
                    value="0"
                    min="0"
                    data-field="shippingCost"
                    class="shipping-input w-full bg-yellow-100 border-0 focus:outline-none"
                  />
                </div>

                <!-- DGD -->
                <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">DGD:</div>
                <div class="flex items-center gap-1 border-b border-gray-300 p-2 w-full bg-yellow-100">
                  <span class="font-medium">AED</span>
                  <input
                    type="number"
                    value="0"
                    min="0"
                    data-field="dgd"
                    class="shipping-input flex-1 bg-yellow-100 border-0 focus:outline-none"
                  />
                </div>

                <!-- Labour -->
                <div class="flex items-center border-b border-gray-300 p-2 font-semibold w-full">Labour:</div>
                <div class="flex items-center gap-1 border-b border-gray-300 p-2 w-full bg-yellow-100">
                  <span class="font-medium">AED</span>
                  <input
                    type="number"
                    value="0"
                    min="0"
                    data-field="labour"
                    class="shipping-input flex-1 bg-yellow-100 border-0 focus:outline-none"
                  />
                </div>

                <!-- Total Shipping Cost -->
                <div class="flex items-center p-2 font-semibold w-full">Total Shipping Cost:</div>
                <div class="flex items-center p-2 w-full bg-yellow-100 total-shipping-cost">
                  AED 0
                </div>
              </div>
            </div>
          </td>
        </tr>
      `);

      $detailRow.addClass("submitted").attr("data-loaded", "true");

      $("#materialTableBody").append($headerRow).append($detailRow);
      
      autosizeHeaderTextareas($("#materialTableBody"));

      // Hide border/background in right-side grid
      $detailRow.find("input, textarea").each(function () {
        $(this).css({
          "border": "none",
          "background": "transparent",
          "outline": "none",
          "box-shadow": "none",
          "resize": "none",
          "overflow": "hidden",
          "height": "auto"
        }).val($(this).val().trim());
      });

      // Also apply to item table inputs (excluding summary footer)
      $detailRow.find("tr.item-row input").each(function () {
        $(this).css({
          "border": "none",
          "background": "transparent",
          "outline": "none",
          "box-shadow": "none"
        });
      });

      // Update summary fields inside detail row
      $detailRow.find('.total-weight-kg').text(entry.total_weight || 0);
      $detailRow.find('.total-vat').text(formatCurrency(entry.total_vat ?? 0));
      $detailRow.find('.total-material-buy').text(formatCurrency(entry.total_material_buy));
      $detailRow.find('.dgd-value').text(formatCurrency(entry.dgd));
      $detailRow.find('.labour-value').text(formatCurrency(entry.labour));
      $detailRow.find('.shipping-cost-value').text(formatCurrency(entry.shipping_cost));

      // Update input values in editable section
      $detailRow.find('input[data-field="shippingCost"]').val(entry.shipping_cost || 0);
      $detailRow.find('input[data-field="dgd"]').val(entry.dgd || 0);
      $detailRow.find('input[data-field="labour"]').val(entry.labour || 0);
      $detailRow.find('input[placeholder="Enter Transaction Method"]').val(entry.mode_of_transaction || "");

      const $receiptTextarea = $detailRow.find('textarea.receipt-no-textarea');
      if ($receiptTextarea.length) {
        const normalizedReceipt = (entry.receipt_no || '').replace(/<br\s*\/?>/gi, '\n');
        $receiptTextarea.val(normalizedReceipt);
        window._autoSizeTA?.($receiptTextarea[0]);
      }

      // Remarks
      const $remarksTextarea = $detailRow.find('textarea[placeholder="Enter Remarks"]');
      $remarksTextarea.val(entry.remarks || "");
      window._autoSizeTA?.($remarksTextarea[0]);
      
      // Layout pass AFTER values are in
      _compactReceiptResize($detailRow);
      // one more after paint to be safe
      queueMicrotask(() => _compactReceiptResize($detailRow));

      // Now render item rows
      const $itemTableBody = $detailRow.find('.item-table-body');

      if (entry.items && Array.isArray(entry.items)) {
        entry.items.forEach((item, idx) => {
          const $row = $($('#itemRowTemplate').html());

          $row.attr('data-item-id', item.id);

          $row.find('td').eq(0).text(idx + 1); // S.No
          $row.find('[data-field="description"]').val(item.description || '');
          $row.find('[data-field="units"]').val(item.units || 0);
          $row.find('[data-field="unitPrice"]').val(item.unit_price || 0);
          $row.find('[data-field="vat"]').val(item.vat || 0);
          $row.find('[data-field="weightPerCtn"]').val(item.weight_per_ctn || 0);
          $row.find('[data-field="ctns"]').val(item.ctns || 0);

          // Calculated
          const totalMaterial = (item.unit_price || 0) * (item.units || 0);
          const totalWeight = (item.weight_per_ctn || 0) * (item.ctns || 0);
          $row.find('.total-material').text(fmtNum7(totalMaterial));
          $row.find('.total-weight').text(fmtNum7(totalWeight));

          $itemTableBody.append($row);
        });
      }
      
      // snapshot AFTER the row is fully rendered
      $detailRow.data('snapshot', buildMaterialSnapshot($detailRow));
      toggleUpdateButtonForDetail($detailRow);
    });

    $(".mat-detail-row, .detail-row").each(function () {
      const $detailRow = $(this);
      const $headerRow = $detailRow.prev(".header-row");
      calculateRowTotals($detailRow, $headerRow);
    });
    
    paintCardsFromDOM('dom');
    window.fetchAndUpdateInvestmentTotal(true);
  });
}

// Collect numbers from the row DOM. Do NOT paint cards from here.
// We only compute + cache, and return the sums.
function updateGtsTotalsFromDOM() {
  const num = (v) => Number(String(v ?? 0).replace(/[^0-9.\-]/g, '')) || 0;
  let totalMaterial = 0;
  let totalShipping = 0;

  $('.header-total-material').each(function () {
    totalMaterial += num($(this).text());
  });
  $('.header-total-shipping').each(function () {
    totalShipping += num($(this).text());
  });

  // OPTIONAL: cache for cold starts on other tabs; DO NOT PAINT here.
  if (typeof window.setGtsTotalsToStorage === 'function') {
    window.setGtsTotalsToStorage({
      material: totalMaterial,
      shipping: totalShipping,
      investment: Number(window.sheetTotals?.investment) || 0,
    });
  }

  return { material: totalMaterial, shipping: totalShipping };
}

// Materials-only icon button factory (does not collide with Investment's createIconButton)
function createMaterialIcon(type, iconClass, tooltipText, btnClass = '', dataId = '', badgeCount = 0) {
  const icon = String(iconClass || '').trim();
  const finalIcon = icon.startsWith('bi ') ? icon : `bi ${icon}`;
  const n = Number(badgeCount) || 0;

  return `
    <div class="relative group inline-block">
      <button class="${type} ${btnClass} px-2 py-1 rounded text-sm relative" data-id="${dataId}">
        <i class="${finalIcon}" style="font-size:16px;line-height:1"></i>

        ${n > 0 ? `
          <span class="mat-att-dot absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
            rounded-full bg-slate-500 text-white text-[11px] font-bold
            flex items-center justify-center leading-none">${n}</span>
        ` : ``}
      </button>

      <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1
                  scale-0 group-hover:scale-100 transition duration-200
                  bg-black text-white text-xs px-2 py-1 rounded pointer-events-none z-10 whitespace-nowrap">
        ${tooltipText}
      </div>
    </div>
  `;
}

function setMaterialRowDirty($detailRow, dirty) {
  const $headerRow = $detailRow.prev('.header-row');
  if (!$headerRow.length) return;

  const id = $headerRow.data('id');

  // Rebuild default action buttons (upload, view, delete)
  const defaultActions = `
  <div class="action-buttons flex justify-center gap-1">
    ${createMaterialIcon('upload-btn', 'bi-cloud-arrow-up-fill', 'Upload Attachments', 'bg-blue-500 hover:bg-blue-600 text-white', id || '')}
    ${createMaterialIcon('view-btn', 'bi-paperclip', 'View Attachments', 'bg-gray-700 hover:bg-gray-800 text-white', id || '')}
    ${createMaterialIcon('delete-material-btn', 'bi-trash-fill', 'Delete Row', 'bg-red-500 hover:bg-red-600 text-white', id || '')}
  </div>`;

  const saveBtn = createMaterialIcon(
    'update-row-btn',
    'bi-arrow-repeat',              // <<< your preferred icon
    'Update Row',
    'bg-green-600 hover:bg-green-700 text-white',
    id || ''
  );

  const $cell = $headerRow.find('td:last > div');
  if (!$cell.length) return;

  if (dirty) {
    // Show Save button to the LEFT of the normal actions (no duplicates)
    if ($headerRow.find('.update-row-btn').length === 0) {
      $cell.prepend(saveBtn);
    }
  } else {
    // Remove save button if no changes
    $headerRow.find('.update-row-btn').remove();
    // Ensure default actions exist (in case of previous replacements)
    if (!$cell.find('.upload-btn').length) $cell.html(defaultActions);
  }
}

// Build a snapshot of a detail row for change detection
function buildMaterialSnapshot($detailRow) {
  const t = v => (v == null ? '' : String(v).trim()); // store typed text
  
  const $headerRow = $detailRow.prev('.header-row');

  const snap = {
    // header snapshot (so header edits trigger Update button)
    header: {
      invoice_date: t($headerRow.find('.mh-invoice-date').val()),
      invoice_no: t($headerRow.find('.mh-invoice-no').val()),
      supplier_name: t($headerRow.find('.mh-supplier-name').val()),
      brief_description: t($headerRow.find('.mh-brief').val()),
      brief_data: t($headerRow.data('brief'))
    },
    
    mot: t($detailRow.find('input[placeholder="Enter Transaction Method"]').val()),
    receipt: t(($detailRow.find('textarea.receipt-no-textarea, textarea[placeholder="Enter receipt numbers"]').val() || '').replace(/\r/g, '')),
    remarks: t($detailRow.find('textarea[placeholder="Enter Remarks"]').val()),
    shipping: t($detailRow.find('input[data-field="shippingCost"]').val()),
    dgd: t($detailRow.find('input[data-field="dgd"]').val()),
    labour: t($detailRow.find('input[data-field="labour"]').val()),
    items: []
  };

  $detailRow.find('tr.item-row').each(function () {
    const $r = $(this);
    snap.items.push({
      id: $r.attr('data-item-id') || null,
      desc: t($r.find('[data-field="description"]').val()),
      units: t($r.find('[data-field="units"]').val()),
      unit: t($r.find('[data-field="unitPrice"]').val()),
      vat: t($r.find('[data-field="vat"]').val()),
      wctn: t($r.find('[data-field="weightPerCtn"]').val()),
      ctns: t($r.find('[data-field="ctns"]').val())
    });
  });

  return snap;
}

// Compare current vs snapshot (numeric-safe)
function isDetailChanged($detailRow) {
  const prev = $detailRow.data('snapshot') || {};
  const curr = buildMaterialSnapshot($detailRow);
  return JSON.stringify(prev) !== JSON.stringify(curr);
}

// Ensure the icon exists once in Action cell when changed; remove when not
function toggleUpdateButtonForDetail($detailRow) {
  const $headerRow = $detailRow.prev('.header-row');
  const $actionCell = $headerRow.find('td:last');

  // we only show update for submitted/loaded rows
  const isSaved = $detailRow.hasClass('submitted') || $detailRow.attr('data-loaded') === 'true';
  const changed = isSaved && isDetailChanged($detailRow);

  // make sure there is a single action container
  let $wrap = $actionCell.find('.action-buttons');
  if (!$wrap.length) {
    $wrap = $('<div class="action-buttons flex justify-center gap-1"></div>');
    // move any existing action buttons into this wrapper once
    $wrap.append($actionCell.children().detach());
    $actionCell.empty().append($wrap);
  }
  
  // DEDUPE: if duplicated icons exist, keep only the first
  $wrap.find('.update-row-btn').slice(1).remove();

  if (changed) {
    if (!$wrap.find('.update-row-btn').length) {
      // add exactly once
      $wrap.prepend(
        createMaterialIcon('update-row-btn', 'bi-arrow-repeat', 'Update Row',
          'bg-green-600 hover:bg-green-700 text-white', $headerRow.data('id') || '')
      );
    }
  } else {
    $wrap.find('.update-row-btn').remove(); // remove if no longer dirty
  }
}

function paintCardsFromDOM(origin) {
  const sums = updateGtsTotalsFromDOM(); // { material, shipping }

  if (typeof window.paintMaterialsFromDom === 'function') {
    // New single call → lets gts-totals.js decide priority/locking
    window.paintMaterialsFromDom({
      material: sums.material,
      shipping: sums.shipping
    });
  } else if (typeof window.updateTotals === 'function') {
    // Fallback (in case the helper isn’t loaded yet)
    window.updateTotals(
      {
        material: sums.material,
        shipping: sums.shipping,
        investment: Number(window.sheetTotals?.investment) || 0
      },
      {
        origin: origin || 'dom',
        force: true,
        allowAfterLock: true
      }
    );
  }

  document.dispatchEvent(new CustomEvent('gts:totals-changed'));
}

// Show up to 7 decimals, trim trailing zeros
function fmtNum7(n) {
  const v = Number(n) || 0;
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 7 });
}

// AED with up to 7 dp (detail/footer/header cells). KPIs can keep 2dp elsewhere.
function fmtAED7(n) {
  const v = Number(n) || 0;
  return 'AED ' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 7 });
}

function initInvestmentLogic() {
  $.ajaxSetup({
    headers: {
      'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
    }
  });

  if (window.investmentLogicInitialized) return;
  window.investmentLogicInitialized = true;

  $("#addInvestmentRowBtn").on("click", function () {
    // Reset the modal fields
    $("#modalInvestmentDate").val("");
    $("#modalInvestmentInvestor").val("");

    // Show the modal
    $("#investmentRowModal").removeClass("hidden").addClass("flex");
  });

  $("#investmentForm").on("submit", function (e) {
    e.preventDefault(); // stop actual form submit

    const investmentDate = $("#modalInvestmentDate").val().trim();
    const investor = $("#modalInvestmentInvestor").val().trim();

    if (!investmentDate || !investor) {
      alert("Please fill in both Date and Investor.");
      return;
    }

    // Use createInvestmentLayout like this:
    createInvestmentLayout(Date.now(), investmentDate, investor);

    // Hide the modal
    $("#investmentRowModal").addClass("hidden").removeClass("flex");

    // Optional: Reset form
    this.reset();
  });

  $("#investmentCancelBtn").on("click", function () {
    $("#investmentRowModal").addClass("hidden").removeClass("flex");
  });

  $(document).on("click", ".investment-header", function (e) {
    if ($(e.target).is("button") || $(e.target).closest("button").length || $(e.target).is("a")) return;
    $(this).next(".investment-detail-row").toggleClass("hidden");
  });


  $(document).on("input", ".investment-amount", function () {
    const $input = $(this);
    const rawValue = $input.val().trim().replace(/,/g, "");
    const numericValue = parseFloat(rawValue);

    const $headerRow = $input.closest("tr").prev(".investment-header");

    if (!isNaN(numericValue)) {
      $input.data("numericValue", numericValue);

      // Update header's amount cell live
      const formatted = numericValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      $headerRow.find("td").eq(3).text(`AED ${formatted}`);
    } else {
      $headerRow.find("td").eq(3).text(`AED 0.00`);
      $input.data("numericValue", 0);
    }

    window.fetchAndUpdateInvestmentTotal(); // also update top total live
  });

  // It show murabahaInput at top if it have any value
  $(document).on("input", "#murabahaInput", function () {
    const value = $(this).val().trim();
    if (value !== "") {
      $("#murabahaAmount").text(value);
      $("#murabahaTotalLine").removeClass("hidden");
    } else {
      $("#murabahaAmount").text("");
      $("#murabahaTotalLine").addClass("hidden");
    }
  });

  $(document).on("click", ".submit-investment-btn", function (e) {
    e.preventDefault();
    if (!ensureOpenOrToast()) return;

    const $headerRow = $(this).closest("tr");
    const $detailRow = $headerRow.next(".investment-detail-row");
    const investmentId = $detailRow.data("id");
    const $form = $detailRow.find(`#investmentDetailsForm-${investmentId}`);


    if ($form.length === 0) {
      alert("Form not found!");
      return;
    }

    // Get values from form fields
    const investmentDate = $form.find(".investment-date").val();
    const investor = $form.find(".investment-investor").val()?.trim() || "";
    const investmentAmount = parseFloat($form.find(".investment-amount").val()) || 0;
    const investmentNo = $form.find(".investment-no").val()?.trim() || "";
    const modeOfTransaction = $form.find(".mode-of-transaction").val();
    const murabaha = $form.find(".murabaha-input").val()?.trim() || "";
    const repaymentTerms = $form.find(".repayment-terms").val();
    const loanTenure = $form.find(".loan-tenure").val();
    const repaymentDate = $form.find(".repayment-date").val();
    const remarks = $form.find(".remarks").val()?.trim() || "";
    const paymentMethod = $form.find(".payment-method").val() || "";

    const $submitBtn = $headerRow.find(".submit-investment-btn");

    $.ajax({
      url: invStoreUrl(),
      method: "POST",
      data: {
        date: investmentDate,
        investor: investor,
        investment_amount: investmentAmount,
        investment_no: investmentNo,
        mode_of_transaction: modeOfTransaction,
        murabaha: murabaha,
        repayment_terms: repaymentTerms,
        loan_tenure: loanTenure,
        repayment_date: repaymentDate,
        remarks: remarks,
        payment_method: paymentMethod,
      },
      headers: {
        "X-CSRF-TOKEN": $('meta[name="csrf-token"]').attr("content")
      },
      success: function (res) {
        $form.find("input, select, textarea").prop("disabled", true);

        // Replace temp id with DB id
        $headerRow.attr("data-id", res.id).removeClass('is-draft');
        $detailRow.attr("data-id", res.id).removeClass('is-draft');
        
        // Refresh header fields
        const methodText = paymentMethod || '—';
        $headerRow.find(".payment-method-display").text(methodText);

        const amount = parseFloat($detailRow.find(".investment-amount").val()) || 0;
        $headerRow.find(".investment-amount-display").text(
          `AED ${amount.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`
         );

        // Remove Submit button
        $headerRow.find(".submit-investment-btn").remove();

        // Reset the baseline snapshot so Update icon stays hidden until next edits
        $detailRow.data('snapshot', buildInvestmentSnapshot($detailRow));
        toggleUpdateButtonForInvestment($detailRow);

        // Live total refresh (no hard reload)
        window.fetchAndUpdateInvestmentTotal(true);
        
        alert("Saved!");
      },
      error: function (xhr) {
        $submitBtn.prop("disabled", false);
        alert("Error saving.");
        console.error(xhr.responseText);
      }
    });
  });

  $(document).on("click", ".delete-investment-btn", function () {
    const $headerRow = $(this).closest("tr");
    const investmentId = $headerRow.data("id");

    if (!confirm("Are you sure you want to delete this investment?")) return;
    if (!ensureOpenOrToast()) return;

    $.ajax({
      url: invUpdateUrl(investmentId),
      method: "DELETE",
      headers: {
        "X-CSRF-TOKEN": $('meta[name="csrf-token"]').attr("content")
      },
      success: function () {
        $headerRow.next(".investment-detail-row").remove();
        $headerRow.remove();
        updateInvestmentSerialNumbers();
        window.fetchAndUpdateInvestmentTotal();
        alert("Investment deleted successfully.");
      },
      error: function () {
        alert("Failed to delete investment.");
      }
    });
  });

  $(document).on("input change", ".investment-detail-row input, .investment-detail-row select, .investment-detail-row textarea", function () {
    const $form = $(this).closest("form");
    const currentSnapshot = {};
    const savedSnapshot = $form.data("snapshot");

    if (!savedSnapshot) return;

    $form.find("input, select, textarea").each(function () {
      const name = $(this).attr("name") || $(this).attr("class");
      let val = $(this).val();
      if ($(this).is("input[type='number']")) val = parseFloat(val) || 0;
      currentSnapshot[name] = val?.toString().trim() || "";
    });

    const hasChanged = JSON.stringify(currentSnapshot) !== JSON.stringify(savedSnapshot);

    if (hasChanged) {
      $form.find(".invest-save-changes-btn").removeClass("hidden");
    } else {
      $form.find(".invest-save-changes-btn").addClass("hidden");
    }
  });

  $(document).on("click", ".invest-save-changes-btn", function () {
    if (!ensureOpenOrToast()) return;
      
    if (!$(this).closest('#sheet-gts-investment').length) return;
    const $form = $(this).closest("form");
    const $detailRow = $form.closest("tr.investment-detail-row");
    const $headerRow = $detailRow.prev(".investment-header");
    const investmentId = $detailRow.data("id");

    if (!investmentId) {
      alert("Missing ID");
      return;
    }

    const updatedData = {
      date: $form.find(".investment-date").val(),
      investor: $form.find(".investment-investor").val(),
      investment_amount: parseFloat($form.find(".investment-amount").val()) || 0,
      investment_no: $form.find(".investment-no").val(),
      mode_of_transaction: $form.find(".mode-of-transaction").val(),
      murabaha: $form.find(".murabaha-input").val(),
      repayment_terms: $form.find(".repayment-terms").val(),
      loan_tenure: $form.find(".loan-tenure").val(),
      repayment_date: $form.find(".repayment-date").val(),
      remarks: $form.find(".remarks").val(),
      payment_method: $form.find(".payment-method").val() || "",
    };

    $.ajax({
      url: invUpdateUrl(investmentId),
      method: "PUT",
      data: updatedData,
      success: function () {
        // Update header values
        $headerRow.find("td:nth-child(3)").text(updatedData.investor);
        $headerRow.find("td:nth-child(4)").text(
          `AED ${updatedData.investment_amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`
        );
        $headerRow.find("td:nth-child(5) .payment-method-display").text(updatedData.payment_method || '—');

        // Update stored original data
        $form.data("original", { ...updatedData });

        // Hide save button again
        $form.find(".invest-save-changes-btn").addClass("hidden");
        
        window.fetchAndUpdateInvestmentTotal(true); 
        
        alert("Changes saved!");
      },
      error: function () {
        alert("Failed to save changes.");
      }
    });
  });

  // ANY edit inside an investment detail row => toggle action Update icon
  $(document).on('input change', '.investment-detail-row input, .investment-detail-row select, .investment-detail-row textarea', function () {
    const $detailRow = $(this).closest('.investment-detail-row');
    toggleUpdateButtonForInvestment($detailRow);
  });

  $(".investment-amount-display").each(function () {
    console.log("Text:", $(this).text());
  });

  // Show upload modal
  $(document).on("click", ".investment-attachment-btn", function () {
    const investmentId = $(this).data("id");

    // Set ID in modal
    $("#uploadAttachmentModal").data("investment-id", investmentId);

    // Clear file inputs and filenames
    $("#invoice, #receipt, #note").val('');
    $("#invoiceFileName, #receiptFileName, #noteFileName").val('');

    // Load existing file names
    $.get(invAttachmentsUrl(investmentId), function (res) {
      if (res.invoice) {
        $("#invoiceFileName").val(fileLabel(res.invoice));
      }
      if (res.receipt) {
        $("#receiptFileName").val(fileLabel(res.receipt));
      }
      if (res.note) {
        $("#noteFileName").val(fileLabel(res.note));
      }
    });

    // Show modal
    $("#uploadAttachmentModal").removeClass("hidden").addClass("flex").hide().fadeIn();
  });

  // Hide modal
  $('#closeAttachmentModal, #cancelAttachmentUpload').on('click', function () {
    $('#uploadAttachmentModal').fadeOut().css('display', 'none');;
  });

  $("#attachmentUploadForm").on("submit", function (e) {
    e.preventDefault();
    if (!ensureOpenOrToast()) return;

    const investmentId = $("#uploadAttachmentModal").data("investment-id"); // this must NOT be undefined

    if (!investmentId) {
      alert("Missing investment ID.");
      return;
    }

    const formData = new FormData(this);
    formData.append("_token", $('meta[name="csrf-token"]').attr("content"));

    $.ajax({
      url: invUploadAttachmentsUrl(investmentId),
      method: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function () {
        $("#uploadAttachmentModal").fadeOut();
      },
      error: function () {
        alert("Failed to upload attachments");
      }
    });
  });

  $(document).on("click", ".btn-view-attachment", function () {
      const row = $(this).closest('tr');
      const id = row.data('id');
      const investor = row.find('td:nth-child(3)').text().trim();
    
      $('#attachmentViewerTitle').text(`ID: ${id} – ${investor}`);
    
      const $inv = $("#iviewInvoiceLink");
      const $rec = $("#iviewReceiptLink");
      const $note = $("#iviewNoteLink");
    
      const $invName = $("#iviewInvoiceName");
      const $recName = $("#iviewReceiptName");
      const $noteName = $("#iviewNoteName");
    
      [$inv, $rec, $note].forEach($a => {
        $a.attr("href", "#")
          .removeClass("text-blue-600")
          .addClass("text-gray-400")
          .text("Not Uploaded");
      });
      [$invName, $recName, $noteName].forEach($s => $s.text(""));
    
      $('#invDownloadBtn')
        .addClass('pointer-events-none opacity-50')
        .text('Download PDF');
    
      $.ajax({
        url: invAttachmentsUrl(id),
        type: 'GET',
        dataType: 'json', // ensure JSON parsing
        success: function (data) {
          const inv = data.invoice;
          const rec = data.receipt;
          const note = data.note;
    
          const invHref = linkUrl(inv);
          const recHref = linkUrl(rec);
          const noteHref = linkUrl(note);
    
          if (invHref) {
            $inv.attr("href", invHref)
                .removeClass("text-gray-400")
                .addClass("text-blue-600")
                .text("Open");
            $invName.text(fileLabel(inv));
          }
    
          if (recHref) {
            $rec.attr("href", recHref)
                .removeClass("text-gray-400")
                .addClass("text-blue-600")
                .text("Open");
            $recName.text(fileLabel(rec));
          }
    
          if (noteHref) {
            $note.attr("href", noteHref)
                .removeClass("text-gray-400")
                .addClass("text-blue-600")
                .text("Open");
            $noteName.text(fileLabel(note));
          }
    
          const hasAny = !!(invHref || recHref || noteHref);
          $('#invDownloadBtn')
            .toggleClass('pointer-events-none opacity-50', !hasAny)
            .text('Download PDF');
    
          $('#investmentAttachmentModal')
            .data('current-id', id)
            .removeClass('hidden')
            .addClass('flex')
            .fadeIn();
        },
        error: function () {
          alert('Failed to load attachments.');
        }
      });
    });

  $(document).on('click', '#invDownloadBtn', function () {
    const id = $('#investmentAttachmentModal').data('current-id');
    if (id) window.open(invAttachmentsDlUrl(id), '_blank');
  });

  $('#closeInvestmentViewModal, #closeInvestmentViewModalBottom').on('click', function () {
    $("#investmentAttachmentModal").fadeOut(200, function () {
      $(this).addClass("hidden").css("display", "none");
    });
  });

  let currentMurabahaRowId = null;

  $(document).on('change', '.murabaha-radio', function () {
    const value = $(this).val();
    const row = $(this).closest('tr');
    currentMurabahaRowId = row.data('id');

    if (value === 'yes') {
      // Get existing date from hidden input
      const existingDate = row.find('.murabaha-date-hidden').val();

      // Set investment ID in modal for saving
      $('#murabahaDateModal').data('investment-id', currentMurabahaRowId);

      // Pre-fill date input if exists
      $('#murabahaDateInput').val(existingDate || '');

      // Show modal
      $('#murabahaDateModal').css('display', 'flex').hide().fadeIn();

    } else {
      // "No" selected — clear hidden date
      row.find('.murabaha-date-hidden').val('');
      row.find('.murabaha-date-display').text(''); // Clear from view
    }
  });

  $('#cancelMurabahaDate').on('click', function () {
    $('#murabahaDateModal').fadeOut();

    // Reset radio to "No"
    if (currentMurabahaRowId) {
      $(`tr[data-id="${currentMurabahaRowId}"] input[type=radio][value=no]`).prop('checked', true);
    }
  });

  $("#saveMurabahaDateBtn").on("click", function () {
     if (!ensureOpenOrToast()) return;
     
    const selectedDate = $("#murabahaDateInput").val();
    const investmentId = $("#murabahaDateModal").data("investment-id"); // match modal ID

    if (!selectedDate) {
      alert("Please select a date.");
      return;
    }

    $.ajax({
      url: invMurabahaUrl(investmentId),
      method: 'POST',
      data: {
        murabaha_status: "yes",
        murabaha_date: selectedDate,
        _token: $('meta[name="csrf-token"]').attr("content")
      },
      success: function (res) {
        $("#murabahaDateModal").fadeOut();
        // Update display and hidden value
        $(`.murabaha-date-display[data-id="${investmentId}"]`).text(selectedDate);
        $(`tr[data-id="${investmentId}"]`).find('.murabaha-date-hidden').val(selectedDate);
      },
      error: function () {
        alert("Failed to save Murabaha date.");
      }
    });
  });
  
  // submit updates from the green icon in Action column
  $(document)
    .off('click.investUpdate')
    .on('click.investUpdate', '.update-invest-btn', function () {
      if (!ensureOpenOrToast()) return;
        
      const $headerRow = $(this).closest('tr.investment-header');
      const $detailRow = $headerRow.next('.investment-detail-row');
      const id = $headerRow.data('id');
      if (!id) return;

      const $f = $detailRow.find('form');

      const payload = {
        date: $f.find('.investment-date').val(),
        investor: $f.find('.investment-investor').val(),
        investment_amount: parseFloat($f.find('.investment-amount').val()) || 0,
        investment_no: $f.find('.investment-no').val(),
        mode_of_transaction: $f.find('.mode-of-transaction').val(),
        murabaha: $f.find('.murabaha-input').val(),
        repayment_terms: $f.find('.repayment-terms').val(),
        loan_tenure: parseInt($f.find('.loan-tenure').val()) || 0,
        repayment_date: $f.find('.repayment-date').val(),
        remarks: $f.find('.remarks').val(),
        payment_method: $f.find('.payment-method').val() || '',
        murabaha_status: $detailRow.find('input.murabaha-radio:checked').val() || 'no',
        murabaha_date: $detailRow.find('.murabaha-date-hidden').val() || ''
      };

      $.ajax({
        url: invUpdateUrl(id),
        method: 'PUT',
        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
        data: payload
      })
        .done(function () {
          // header refresh
          const formattedAmt = `AED ${Number(payload.investment_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          $headerRow.find('.investment-amount-display').text(formattedAmt);
          $headerRow.find('.payment-method-display').text(payload.payment_method || '—');

          // reset baseline + remove icon
          $detailRow.data('snapshot', buildInvestmentSnapshot($detailRow));
          toggleUpdateButtonForInvestment($detailRow);

          window.fetchAndUpdateInvestmentTotal(true);
          const $cell = $headerRow.find('td:last').addClass('bg-green-50');
          setTimeout(() => $cell.removeClass('bg-green-50'), 600);
        })
        .fail(function (xhr) {
          alert(xhr?.responseJSON?.message || 'Update failed.');
          console.error(xhr?.responseText || xhr);
        });
    });

  $(document)
    .off('input.investDirty change.investDirty')
    .on('input.investDirty change.investDirty', '#investmentTableBody .investment-detail-row :input', function () {
      toggleUpdateButtonForInvestment($(this).closest('.investment-detail-row'));
    });

}

function renderPreview(previewSelector, fileUrl) {
  const preview = $(previewSelector);
  preview.empty();

  if (!fileUrl) {
    preview.text("Not uploaded");
    return;
  }

  const lowerUrl = fileUrl.toLowerCase();
  if (lowerUrl.endsWith('.pdf')) {
    preview.html(`<iframe src="${fileUrl}" class="w-full h-[400px] border rounded"></iframe>`);
  } else if (/\.(jpg|jpeg|png|webp)$/i.test(lowerUrl)) {
    preview.html(`<img src="${fileUrl}" class="max-w-full max-h-[400px] rounded border" alt="Attachment Preview" />`);
  } else {
    preview.html(`<a href="${fileUrl}" target="_blank" class="text-blue-600 underline">Open file</a>`);
  }
}

function getFileName(url) {
  if (!url) return '';
  try {
    const clean = url.split('?')[0];                 // strip query
    return decodeURIComponent(clean.split('/').pop());
  } catch { return url; }
}

function isClosed() {
  return !!window.__SET_IS_CLOSED ||
         (window.cycle && window.cycle.status === 'closed') ||
         document.documentElement.classList.contains('is-cycle-closed');
}

function createInvestmentLayout(
  investmentId = Date.now(),
  investmentDate,
  investor,
  investmentAmount = 0,
  investmentNo = "",
  modeOfTransaction = "",
  murabaha = "",
  repaymentTerms = "",
  loanTenure = "",
  repaymentDate = "",
  remarks = "",
  status = "draft",
  murabahaStatus = 'no',
  murabahaDate = '',
  paymentMethod = ''
) {
  // Calculate serial number
  const serialNo = $("#investmentTableBody tr.investment-header").length + 1;

  // Format with commas
  const formattedAmount = `AED ${investmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const dateObj = new Date(investmentDate);
  const formattedDate = isNaN(dateObj)
    ? "Invalid Date"
    : dateObj.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    
  const showActions = !isClosed();

  const actionButtons = showActions ? `
      <div class="action-buttons flex items-center justify-center gap-1">
          ${status === "draft" ? `
            <button type="button" class="submit-investment-btn px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
              Submit
            </button>` : ''}
    
          ${createInvestmentIconButton('investment-attachment-btn', 'bi-cloud-arrow-up-fill', 'Upload Attachments', 'bg-blue-500 hover:bg-blue-600 text-white', investmentId)}
          ${createInvestmentIconButton('btn-view-attachment', 'bi-paperclip', 'View Attachments', 'bg-gray-700 hover:bg-gray-800 text-white', investmentId)}
          ${createInvestmentIconButton('delete-investment-btn', 'bi-trash-fill', 'Delete Row', 'bg-red-500 hover:bg-red-600 text-white', investmentId)}
      </div>
    ` : '';

  const safeId = String(investmentId).replace(/[^a-zA-Z0-9_-]/g, '');
  
  const safePayment = paymentMethod || '—';

  const $headerRow = $(`
      <tr class="investment-header cursor-pointer hover:bg-gray-100 ${status === 'draft' ? 'is-draft' : ''}" data-id="${investmentId}">
        <td class="border p-2 text-center">${serialNo}</td>
        <td class="border p-2">${formattedDate}</td>
        <td class="border p-2">${investor}</td>
        <td class="border p-2">
          <span class="investment-amount-display">${formattedAmount}</span>
        </td>
        <td class="border p-2"><span class="payment-method-display">${escapeHtml(safePayment)}</span></td>
        ${showActions ? `<td class="border p-2 text-center action-col" data-col="action">${actionButtons}</td>` : ``}
      </tr>
    `);

  const $detailRow = $(`
    <tr class="investment-detail-row relative hidden ${status === 'draft' ? 'is-draft' : ''}" data-id="${investmentId}">
      <td colspan="${showActions ? 6 : 5}" class="p-4 bg-white">
        <form id="investmentDetailsForm-${investmentId}" data-id="${investmentId}">
          <div class="mt-3 text-right">
            ${status !== "draft" ? `
              <button type="button"
                class="invest-save-changes-btn hidden px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                Save Changes
              </button>` : ""}
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">Date</label>
              <input type="text" value="${escapeHtml(formattedDate)}" class="investment-date w-full bg-yellow-100 px-3 py-2 rounded" readonly />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Investor</label>
              <input type="text" value="${escapeHtml(investor)}" class="investment-investor w-full bg-yellow-100 px-3 py-2 rounded" readonly />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Investment Amount</label>
              <input type="number" min="0" placeholder="e.g., 10000" value="${escapeHtml(investmentAmount)}" class="investment-amount w-full bg-yellow-100 px-3 py-2 rounded editable-field" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Investment No.</label>
              <input type="text" placeholder="e.g., GTS-..." value="${escapeHtml(investmentNo)}" class="investment-no w-full bg-yellow-100 px-3 py-2 rounded editable-field" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Mode of Transaction</label>
              <select class="mode-of-transaction w-full bg-blue-100 px-3 py-2 rounded editable-field">
                <option ${modeOfTransaction === "Bank Deposit" ? "selected" : ""}>Bank Deposit</option>
                <option ${modeOfTransaction === "Cash" ? "selected" : ""}>Cash</option>
                <option ${modeOfTransaction === "Cheque" ? "selected" : ""}>Cheque</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Murabaha (Profit Sharing)</label>
              <input type="text" value="${escapeHtml(murabaha)}" class="murabaha-input w-full bg-yellow-100 px-3 py-2 rounded editable-field" />
            </div>

            <div class="mt-2">
              <label class="block text-sm font-medium mb-1">Murabaha Applicable?</label>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-2">
                  <input type="radio" name="murabaha_status_${safeId}" class="murabaha-radio" value="yes" ${murabahaStatus === 'yes' ? 'checked' : ''} />
                  <span>Yes</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="radio" name="murabaha_status_${safeId}" class="murabaha-radio" value="no" ${murabahaStatus === 'no' ? 'checked' : ''} />
                  <span>No</span>
                </label>

                <span class="murabaha-date-display text-sm text-blue-600 font-semibold" data-id="${investmentId}">
                  ${murabahaDate || ''}
                </span>
              </div>
            </div>
            <input type="hidden" name="murabaha_date_${investmentId}" class="murabaha-date-hidden" value="" />

            <div>
              <label class="block text-sm font-medium mb-1">Repayment Terms</label>
              <select class="repayment-terms w-full bg-blue-100 px-3 py-2 rounded editable-field">
                <option ${repaymentTerms === "Monthly" ? "selected" : ""}>Monthly</option>
                <option ${repaymentTerms === "Quarterly" ? "selected" : ""}>Quarterly</option>
                <option ${repaymentTerms === "Annually" ? "selected" : ""}>Annually</option>
                <option ${repaymentTerms === "Lump sum" ? "selected" : ""}>Lump sum</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Loan Tenure (Duration Months)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g., 12"
                value="${escapeHtml(loanTenure)}"
                class="loan-tenure w-full bg-yellow-100 px-3 py-2 rounded editable-field"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Repayment Date</label>
              <input type="date" value="${escapeHtml(repaymentDate)}" class="repayment-date w-full bg-yellow-100 px-3 py-2 rounded editable-field" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Payment Method</label>
              <select class="payment-method w-full bg-blue-100 px-3 py-2 rounded editable-field">
                <option value="" ${!paymentMethod ? 'selected' : ''}>Select…</option>
                <option value="Cash" ${paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
                <option value="Bank transfer" ${paymentMethod === 'Bank transfer' ? 'selected' : ''}>Bank transfer</option>
                <option value="Other" ${paymentMethod === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Remarks</label>
              <textarea class="remarks w-full bg-yellow-100 px-3 py-2 rounded editable-field">${remarks}</textarea>
            </div>
          </div>

          <input type="hidden" name="investment_id" value="${escapeHtml(investmentId)}" />

        </form>
      </td>
    </tr>
  `);

  $("#investmentTableBody").append($headerRow).append($detailRow);
  
  $detailRow.data('snapshot', buildInvestmentSnapshot($detailRow));
  toggleUpdateButtonForInvestment($detailRow);

  const $form = $detailRow.find(`#investmentDetailsForm-${investmentId}`);

  // Define a clean function to sanitize input values
  function clean(val) {
    return val === "null" || val == null ? "" : val.toString().trim();
  }

  // Store original data using sanitized values
  const originalData = {
    investor: clean(investor),
    investment_amount: parseFloat(investmentAmount) || 0,
    investment_no: clean(investmentNo),
    mode_of_transaction: clean(modeOfTransaction),
    murabaha: clean(murabaha),
    repayment_terms: clean(repaymentTerms),
    loan_tenure: parseInt(loanTenure) || 0,
    repayment_date: repaymentDate?.split("T")[0] || "",
    remarks: clean(remarks),
    payment_method: clean(paymentMethod),
  };

  $form.data("original", originalData);

  $detailRow.find(".investmentAmount").on("input", function () {
    const amount = parseFloat($(this).val()) || 0;
    const formatted = `AED ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const $header = $detailRow.prev(".investment-header");
    if ($header.length) {
      $header.find("td:nth-child(4)").html(`<span class="investment-amount-display">${formatted}</span>`);
    }

    window.fetchAndUpdateInvestmentTotal(); // your new method
  });


  $('html, body').animate({
    scrollTop: $headerRow.offset().top - 80
  }, 400);

  updateInvestmentSerialNumbers();
  window.fetchAndUpdateInvestmentTotal();
}

// Investment-only icon factory (doesn't clash with Materials)
function createInvestmentIconButton(btnClass, iconClass, tooltipText, bgClasses, id) {
  return `
    <div class="relative group inline-block investment-action-buttons">
      <button
        class="${btnClass} ${bgClasses} h-8 w-8 p-0 rounded text-sm flex items-center justify-center"
        data-id="${id}"
        type="button"
      >
        <i class="bi ${iconClass} text-[16px] leading-none"></i>
      </button>
      <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1
                  scale-0 group-hover:scale-100 transition duration-200
                  bg-black text-white text-xs px-2 py-1 rounded pointer-events-none z-10 whitespace-nowrap">
        ${tooltipText}
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// --- Investments base resolver (runs once, caches globally) ---
window.__INV_BASE_PATH = window.__INV_BASE_PATH || null; // 'investments' or 'gts-investments'

function invStoreUrl()                { return api('/investment/investments'); }
function invUpdateUrl(id)             { return api(`/investment/investments/${id}`); }
function invMurabahaUrl(id)           { return api(`/investment/investments/${id}/murabaha`); }
function invAttachmentsUrl(id)        { return api(`/investment/investments/${id}/attachments`); }
function invUploadAttachmentsUrl(id)  { return api(`/investment/investments/${id}/upload-attachments`); }
function invAttachmentsDlUrl(id)      { return api(`/investment/investments/${id}/attachments/download`); }

// --- Resolve the correct LIST path and cache it ---
// Will end up caching something like "gts-investments/list" or "investments"
window.__INV_LIST_PATH = window.__INV_LIST_PATH || null;

function loadGtsInvestments() {
  $.getJSON(api('/investment/investments'))   // <— was dynamic resolver
    .done(function (data) {
      $("#investmentTableBody").empty();
      const rows = Array.isArray(data) ? data
                 : Array.isArray(data?.data) ? data.data
                 : Array.isArray(data?.items) ? data.items
                 : [];
      rows.forEach(function (item) {
        createInvestmentLayout(
          item.id,
          item.date,
          item.investor,
          item.investment_amount,
          item.investment_no,
          item.mode_of_transaction,
          item.murabaha,
          item.repayment_terms,
          item.loan_tenure,
          item.repayment_date,
          item.remarks,
          item.status,
          item.murabaha_status,
          item.murabaha_date,
          item.payment_method
        );
      });
      updateInvestmentSerialNumbers();
      if (typeof window.fetchAndUpdateInvestmentTotal === 'function') window.fetchAndUpdateInvestmentTotal();
    })
    .fail(function (err) {
      console.error('Failed to load investments', err);
      alert('Failed to load investments');
    });
}

function updateInvestmentSerialNumbers() {
  $("#investmentTableBody tr.investment-header").each(function (index) {
    $(this).find("td:first").text(index + 1);
  });
}

// Build a snapshot of a detail row (for change detection)
function buildInvestmentSnapshot($detailRow) {
  const $f = $detailRow.find('form');
  const t = v => (v == null ? '' : String(v).trim());
  const n = v => (Number(String(v).replace(/[^\d.-]/g, '')) || 0);

  return {
    date: t($f.find('.investment-date').val()),
    investor: t($f.find('.investment-investor').val()),
    // NOTE: keep raw text so removing ".00" counts as a change
    amount_raw: t($f.find('.investment-amount').val()),
    inv_no: t($f.find('.investment-no').val()),
    mot: t($f.find('.mode-of-transaction').val()),
    murabaha: t($f.find('.murabaha-input').val()),
    repay_terms: t($f.find('.repayment-terms').val()),
    tenure: t($f.find('.loan-tenure').val()), // keep as text for strict diff
    repay_date: t($f.find('.repayment-date').val()),
    remarks: t($f.find('.remarks').val()),
    payment: t($f.find('.payment-method').val()),
    murabaha_status: $detailRow.find('input.murabaha-radio:checked').val() || 'no',
    murabaha_date: t($detailRow.find('.murabaha-date-hidden').val() || '')
  };
}

function isInvestmentChanged($detailRow) {
  const prev = $detailRow.data('snapshot') || {};
  const curr = buildInvestmentSnapshot($detailRow);
  try { return JSON.stringify(prev) !== JSON.stringify(curr); }
  catch { return true; }
}

// Ensure/update the update icon in the Action cell for this row
function toggleUpdateButtonForInvestment($detailRow) {
  const $headerRow = $detailRow.prev('.investment-header');
  const $cell = $headerRow.find('td:last');
  
  // Draft rows never show Update icon
  if ($headerRow.hasClass('is-draft') || $detailRow.hasClass('is-draft')) {
    $cell.find('.update-invest-btn').remove();
    return;
  }

  // Single wrapper in Action cell
  let $wrap = $cell.find('.action-buttons');
  if (!$wrap.length) {
    $wrap = $('<div class="action-buttons flex items-center justify-center gap-1"></div>');
    $wrap.append($cell.children().detach());
    $cell.empty().append($wrap);
  }

  const changed = isInvestmentChanged($detailRow);
  const $existing = $wrap.find('.update-invest-btn');

  if (changed) {
    if ($existing.length === 0) {
      $wrap.prepend(
        createInvestmentIconButton(
          'update-invest-btn',
          'bi-arrow-repeat',
          'Update Row',
          'bg-green-600 hover:bg-green-700 text-white',
          $headerRow.data('id') || ''
        )
      );
    } else if ($existing.length > 1) {
      // if somehow duplicated, keep the first and remove the rest
      $existing.slice(1).remove();
    }
  } else {
    $existing.remove();
  }
}

(function purgeLegacyBenKeys() {
  try {
    ['localTotal', 'sqTotal', 'usTotal', 'gtsTotals', 'customerTotals'].forEach(k =>
      localStorage.removeItem(k)
    );
    localStorage.removeItem('localSalesTotal');
  } catch { }
})();