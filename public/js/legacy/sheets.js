// === Global AED formatting helpers (US grouping) ===
(function (w) {
  w.gtsFmt = w.gtsFmt || {};

  // numbers-only (2dp)
  w.gtsFmt.numAE = function (n) {
    return (Number(n) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // "AED 12,345.67"
  w.gtsFmt.aed = function (n) {
    return 'AED ' + w.gtsFmt.numAE(n);
  };

  // parse any "AED 12,345.67" → Number
  w.gtsFmt.parse = function (v) {
    return Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;
  };
})(window);

// --- Summary chart globals (init early, avoid TDZ) ---
if (!('_chartDebounce' in window)) window._chartDebounce = null;
if (!('_chartIntroPlayed' in window)) window._chartIntroPlayed = false;
if (!('_chartPendingTarget' in window)) window._chartPendingTarget = null;

// summary paint gate
if (!('_summaryFirstServerPainted' in window)) window._summaryFirstServerPainted = false;

// tiny helper: placeholders while waiting for server
function setSummaryPlaceholders() {
  $('#totalPurchaseMaterial, #totalShippingCost, #totalInvestmentAmount-investment, #cashOutAmount, #profitAmount')
    .text('…');
}

// --- SAFE GLOBAL DEFAULTS (load before anything might call them) ---
if (typeof window.isCyclePage === 'undefined') {
  window.isCyclePage = /\/c\/\d+(?:\/|$)/.test(location.pathname);
}
if (window.isCyclePage) {
  try { localStorage.removeItem('activeSheet'); } catch {}
}
if (typeof window.setKpiText !== 'function') {
  window.setKpiText = function setKpiText(selector, value /*, source */) {
    var n = Number(value) || 0;
    try {
      $(selector).text('AED ' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } catch (e) {
      var el = document.querySelector(selector);
      if (el) el.textContent = 'AED ' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };
}

// --- Active sheet persistence ---
function getActiveSheetKey() { return localStorage.getItem('activeSheet') || 'summary'; }
function setActiveSheetKey(name) { localStorage.setItem('activeSheet', name); }

// Centralized sheet change handler
function onSheetChange(name) {
  setActiveSheetKey(name);
  // your existing show/hide logic:
  // e.g., showSheet(name)
  if (typeof showSheet === 'function') showSheet(name);
}

(function () {
    // ===== Guard against double init =====
    if (window.__GTS_INIT__) {
        console.warn('GTS already initialized – skipping second init');
        return;
     }
    window.__GTS_INIT__ = true;
      
      // ===== CSRF for all jQuery requests =====
      $.ajaxSetup({
        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
      });
      
      // ===== Optional XHR registry (keep if you still call xhrAbort) =====
      window.GTS = window.GTS || {};
      GTS.xhr = GTS.xhr || {};
      window.xhrAbort = function (key) {
        const r = GTS.xhr[key];
        if (r && r.readyState !== 4) { try { r.abort(); } catch (e) {} }
        GTS.xhr[key] = null;
      };
  
    const SHEET_META = {
        'gts-material': {
            title: 'GTS Material Entries',
            icon: '/images/investment/material-sheet-logo.png',
        },
        'gts-investment': {
            title: 'GTS Investment Entries',
            icon: '/images/investment/investment-sheet-logo.png',
        },
        us: {
            title: 'US Client Payment',
            icon: '/images/investment/us-sheet-logo.png',
        },
        sq: {
            title: 'SQ Sheet',
            icon: '/images/investment/sq-sheet-icon.png',
        },
        local: {
            title: 'Local Sales',
            icon: '/images/investment/local-sales-icon.png',
        },
        summary: {
            title: 'Summary Sheet',
            icon: '/images/investment/sub-logo.png',
        },
        beneficiary: {
            title: 'Beneficiary Sheet',
            icon: '/images/investment/beneficiary-logo.png',
        }
    };
    
    const GTS_LOGO = (window.ASSETS && window.ASSETS.gtsLogo) || '/images/investment/GTS-web-logo.png';
    const CUSTOMER_LOGO = (window.ASSETS && window.ASSETS.customerLogo) || '/images/investment/customer-sheet-logo.png';
    
    // --- Bootstrap Icons mapping (non-breaking; images still supported) ---
    const BI = {
      material:    'box-seam',
      investment:  'safe2',
      us:          'wallet2',
      sq:          'person-badge',
      local:       'shop',
      summary:     'bar-chart-line',
      beneficiary: 'bank',
      customer:    'people'
    };
    
    // map sheet key -> BI icon
    const SHEET_BI = {
      'gts-material':   BI.material,
      'gts-investment': BI.investment,
      us:               BI.us,
      sq:               BI.sq,
      local:            BI.local,
      summary:          BI.summary,
      beneficiary:      BI.beneficiary,
      customer:         BI.customer
    };
    
    // optional tints (matches your local)
    const SHEET_TINT = {
      'gts-material':   'is-sky',
      'gts-investment': 'is-green',
      us:               'is-green',
      sq:               'is-green',
      local:            'is-default',
      summary:          'is-green',
      beneficiary:      'is-amber'
    };
    const ICON_TINT_CLASSES = ['is-sky','is-amber','is-green','is-default'];
    
    /**
     * Set header icon:
     * - If #headerIcon is <i> (or any non-img), use Bootstrap Icons + tint
     * - Else fall back to the existing image logic (safeSetHeaderIcon)
     */
    function setHeaderIconBI(sheetKey, fallbackSrc) {
      const $el = $('#headerIcon');
      if (!$el.length) return;
    
      // Non-img → use BI classes
      if (!$el.is('img')) {
        const iconName = SHEET_BI[sheetKey] || SHEET_BI.summary;
        // remove old tint classes
        ICON_TINT_CLASSES.forEach(c => $el.removeClass(c));
        const tint = SHEET_TINT[sheetKey] || '';
        const klass = `bi bi-${iconName} header-icon` + (tint ? ` ${tint}` : '');
        $el.attr('class', klass);
        return;
      }
    
      // <img> → keep existing safe behavior
      safeSetHeaderIcon(fallbackSrc);
    }
    
    function safeSetHeaderIcon(src) {
      const $img = $('#headerIcon');
      $img.off('error.iconfix').on('error.iconfix', function () {
        if (!this.dataset.fellBack) {
          this.dataset.fellBack = '1';
          this.src = GTS_LOGO + '?ts=' + Date.now();
        } else {
          // last try—force a fresh fetch
          this.src = (src || GTS_LOGO) + '&ts=' + Date.now();
        }
      });
      $img.attr('src', (src || GTS_LOGO) + '?v=' + (window.APP_VERSION || '1'));
    }
    
    function showSheet(key) {
        // hide all, show target
        const $target = $(`#sheet-${key}`);
        $('.sheet-section').hide();
        $target.css('display', 'block').removeClass('hidden');
    
        // active state on tabs
        $('.sheet-tab').removeClass('active').attr('aria-current','false');
        $(`.sheet-tab[data-sheet="${key}"]`).addClass('active').attr('aria-current','page');
    
        // header
        const meta = SHEET_META[key];
        if (meta) {
          $('#headerTitle').text(meta.title);
          setHeaderIconBI(key, meta.icon || GTS_LOGO);
        } else if (key.startsWith('customer-')) {
          const name = key.slice('customer-'.length).toUpperCase();
          $('#headerTitle').text(`Customer Sheet: ${name}`);
          setHeaderIconBI('customer', CUSTOMER_LOGO); 
        }else {
          // fallback
          $('#headerTitle').text('Sheets');
          setHeaderIconBI('summary', GTS_LOGO);
        }
    
        // sheet-specific bootstraps
        if (key === 'gts-material') {
          if (typeof initMaterialLogic === 'function') initMaterialLogic();
          if (typeof loadGtsMaterials === 'function') loadGtsMaterials();
          if (typeof fetchAndUpdateInvestmentTotal === 'function') fetchAndUpdateInvestmentTotal();
          if (typeof fetchAndUpdateMaterialTotals === 'function') fetchAndUpdateMaterialTotals();
        } else if (key === 'gts-investment') {
          if (typeof initInvestmentLogic === 'function') initInvestmentLogic();
          if (typeof loadGtsInvestments === 'function') loadGtsInvestments();
          if (typeof fetchInvestmentTotal === 'function') {
            fetchInvestmentTotal()
              .then(total => {
                if (typeof paintInvestmentCardOnce === 'function') paintInvestmentCardOnce(total);
                if (typeof updateTotals === 'function') updateTotals({ investment: total }, { origin: 'server' });
              })
              .catch(() => { if (typeof paintInvestmentCardOnce === 'function') paintInvestmentCardOnce(0); });
          }
        } else if (key === 'us') {
          if (typeof loadUSClients === 'function') loadUSClients();
        } else if (key === 'sq') {
          if (typeof loadSQClients === 'function') loadSQClients();
        } else if (key === 'local') {
          if (typeof initLocalLogic === 'function') initLocalLogic();
          if (typeof loadLocalSales === 'function') loadLocalSales();
        } else if (key === 'summary') {
          if (typeof initSummaryLogic === 'function') initSummaryLogic();
          if (window.isCyclePage) {
            window._summaryLockedToCycle = true;
            if (typeof fetchAndRenderSummary === 'function') fetchAndRenderSummary();
            if (typeof loadCashInBreakdown === 'function') loadCashInBreakdown({ dontTouchCards: true, force: true });
          } else {
            if (typeof loadCashInBreakdown === 'function') loadCashInBreakdown();
            if (typeof fetchAndUpdateInvestmentTotal === 'function') fetchAndUpdateInvestmentTotal();
            if (typeof refreshLoanOutstandingHybrid === 'function') refreshLoanOutstandingHybrid();
          }
          if (typeof paintSummaryFromServer === 'function') paintSummaryFromServer();
        } else if (key === 'beneficiary') {
          if (typeof initBenLogic === 'function') initBenLogic();
          if (typeof loadBeneficiaries === 'function') loadBeneficiaries();
          if (typeof computeAndRenderProfit === 'function') computeAndRenderProfit();
    }

    $('#headerTitle').css('margin-bottom', key === 'summary' ? '0' : '5px');
    
    // loans polling tied to Summary visibility
    if (key === 'summary') startLoansPolling();
    else stopLoansPolling();

    // customer sheet lazy-loads
    if (key.startsWith('customer-')) {
      const $sec = $(`#sheet-${key}`);
      if ($sec.is(':visible')) {             // <-- guard
        const sheetId = $sec.find('.customer-sheet-id, #customer-sheet-id').val();
        if (sheetId) {
          if (typeof loadCustomerSheetData === 'function') loadCustomerSheetData(sheetId, $sec);
          if (typeof loadLoanLedger === 'function') loadLoanLedger(sheetId);
        }
      }
    }

    // broadcast (if anything listens)
    try { document.dispatchEvent(new CustomEvent('sheet:changed', { detail: { key } })); } catch {}
  }

  // delegate clicks (works for dynamically added customer tabs)
  $(document)
    .off('click.sheetTab')
    .on('click.sheetTab', '.sheet-tab', function (e) {
      e.preventDefault();
      const key = $(this).data('sheet');
      if (!key) return;
      const cycle = window.activeCycleId || (location.pathname.match(/\/c\/(\d+)/)?.[1]) || 'global';
      try { localStorage.setItem(`activeSheet:${cycle}`, key); } catch {}
      showSheet(key);
    });
    
    // ---- Boot AFTER SHEET_META exists ----
  (function bootActiveSheet() {
    const urlTab = new URLSearchParams(location.search).get('tab');
    const cycle = window.activeCycleId || (location.pathname.match(/\/c\/(\d+)/)?.[1]) || 'global';
    const start = urlTab || localStorage.getItem(`activeSheet:${cycle}`) || 'summary';
    const $btn = $(`.sheet-tab[data-sheet="${start}"]`);
    if ($btn.length) showSheet(start); else showSheet('summary');
  })();

  // expose (optional)
  window.showSheet = showSheet;
})();

    // US Sheet
    let originalUSClients = [];
    
    // SQ Sheet
    let originalSQClients = [];

    // ---- Summary globals (declare early) ----
    window.sheetTotals = window.sheetTotals || { material: 0, shipping: 0, investment: 0 };
    let _lastGoodSummary = { material: 0, shipping: 0, investment: 0 }; // must exist before first render
    if (!('_summaryReqId' in window)) window._summaryReqId = 0;
    if (!('_gtsReqId' in window)) window._gtsReqId = 0;
    if (!('_gtsAppliedReqId' in window)) window._gtsAppliedReqId = 0;
    if (typeof window._toNum !== 'function') {
      window._toNum = v => {
        const n = Number(String(v ?? '').replace(/,/g,'').trim());
        return Number.isFinite(n) ? n : 0;
      };
    }
    if (!('__summaryBooted' in window)) window.__summaryBooted = false;   // avoid double boot when navigating tabs
    if (!('__summaryReqId' in window)) window.__summaryReqId = 0;

    // Cycle presence: normalize onto the global you set at the very top
    window.isCyclePage = !!(window.cycle && window.cycle.id) || !!window.isCyclePage;
    
    // ---- CASH-IN builder globals (must exist before first use) ----
    if (typeof window._cashInBuildSeq === 'undefined') window._cashInBuildSeq = 0;
    if (typeof window._ciLast         === 'undefined') window._ciLast         = null;

    // ---- currency helper used across Summary/Investment etc. ----
    if (typeof window.formatAED !== 'function') {
      window.formatAED = function (val) {
        const n = Number(val);
        if (!isFinite(n)) return 'AED 0.00';
        return 'AED ' + n.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      };
    }
    
    // Always point the global alias to the core (avoid recursion via indirection)
    window.fmtAED = window.formatAED;
    window._benPie = null;

    // honor the Materials server-lock from gts-totals.js
    window.__materialsLockedToServer = window.__materialsLockedToServer || false;


    // ---- canonical key builders (cycle-scoped)
    function benKey(k) {
        const id = String(window.activeCycleId || '0');
        return `c${id}:ben:${k}`;              // <-- keep YOUR current pattern
    }
    function gtsKey(k) {
        const id = String(window.activeCycleId || '0');
        return `c${id}:gts:${k}`;              // <-- cycle-scoped GTS totals too
    }
    
    function isSummaryLocked() {
        return !!(window.__summaryLocked && document.getElementById('summary-root'));
    }
    
    function isSectionVisible($el) {
      if (!$el || !$el.length) return false;
      const $sec = $el.closest('.sheet-section');
      return $sec.length ? $sec.is(':visible') : $el.is(':visible');
    }

    window.setKpiText = function setKpiText(sel, value, tag) {
      if (isSummaryLocked()) {
        // allow Cash-In from the breakdown
        if (tag === 'cash-in-breakdown' && sel === '#cashInAmount') {
          $(sel).text(fmtAED(value));
          return;
        }
        // allow our authoritative GTS writer to paint while locked
        if (tag === 'gtsTotals') {
          $(sel).text(fmtAED(value));
          return;
        }
        console.warn('[Summary] blocked overwrite by', tag || 'unknown', sel, value);
        return;
      }
      $(sel).text(fmtAED(value));
    };

    // ---------- Summary-page helpers ----------
    function fxAED(n) {
        const v = Number(n) || 0;
        return 'AED ' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function parseAEDText(txt) {
        if (!txt) return 0;
        return Number(String(txt).replace(/[^\d.]/g, '')) || 0;
    }
    function paintCashOutSummaryCards({ material, shipping, investment }) {
        $('#totalPurchaseMaterial').text(fxAED(material));
        $('#totalShippingCost').text(fxAED(shipping));
        $('#totalInvestmentAmount-investment').text(fxAED(investment));
    }

    $(function () {
      if (window.__GTS_BOOTED__) return;      // prevent double wiring
      window.__GTS_BOOTED__ = true;
  
      // purge caches first (once)
      if (window.isCyclePage && typeof purgeOtherCycleGts === 'function') {
            purgeOtherCycleGts();
      }
      // also nuke the old legacy key once
      try { localStorage.removeItem('gtsTotals'); } catch (e) { }

      // Render customer tabs (inline or dropdown)
      if (typeof renderCustomerTabs === 'function') renderCustomerTabs();
  
      // === Cycle-page hardening ===
      (function () {
        if (!window.isCyclePage) return;

        // lock summary to this cycle

        // clear any old timers you might have stored
        (window._legacyTimers || []).forEach(id => { try { clearInterval(id); } catch { } });
        window._legacyTimers = [];

        // Only block true legacy DOM writers. Allow our data loaders to run on cycle pages.
        ['loadLoanOutstandingLegacy', 'fetchAndUpdateInvestmentTotal']
          .forEach(function (name) {
            if (typeof window[name] === 'function') {
              const orig = window[name];
              window[name] = function () {
                if (window._summaryLockedToCycle) {
                  console.debug('[cycle-lock] blocked', name);
                  return $.Deferred().resolve().promise();
                }
                return orig.apply(this, arguments);
              };
            }
          });
    })();
    });
    
    // This is where you put the handler for the "Investment Layout" button
    $("#selectInvestmentBtn").on("click", function () {
        $("#typeSelectModal").addClass("hidden").removeClass("flex");
        $('.sheet-tab[data-sheet="gts-investment"]').click();
        // If you want to auto-show Add Row modal:
        setTimeout(() => {
            $("#addInvestmentRowBtn").click();
        }, 300);
    });

    // near top of sheets.js
    $(document).off('submit.blockUpdate')
        .on('submit.blockUpdate', 'form[action$="/update-customer-sheet"]', function (e) {
            e.preventDefault();
            e.stopPropagation();
            console.warn('Blocked legacy submit to /update-customer-sheet');
        });

    // =======================
    // US CLIENT PAYMENT JS
    // =======================

    $(document).on('click', '.delete-us-btn', function () {
        const id = $(this).data('id');
        $('#usDeleteId').val(id);
        $('#usDeleteModal').removeClass('hidden').addClass('flex');
    });

    $('#confirmUsDeleteBtn').on('click', function () {
        const id = $('#usDeleteId').val();

        $.ajax({
            url: investmentUrl(`us-client/delete/${id}`),
            type: 'DELETE',
            data: {
                _token: $('meta[name="csrf-token"]').attr('content')
            },
            success: function (response) {
                $('#usDeleteModal').addClass('hidden').removeClass('flex');
                $('button[data-id="' + id + '"]').closest('tr').remove();
                loadUSClients();
            },
            error: function () {
                alert('Failed to delete record.');
            }
        });
    });

    // Handle Edit
    let editingId = null;
    $(document).on('click', '.edit-us-btn', function () {
        const tr = $(this).closest('tr');
        editingId = tr.data('id');

        const rawDate = tr.data('date');
        const amount = tr.find('td:eq(2)').text().replace('AED', '').replace(/,/g, '').trim();
        const remarks = tr.find('td:eq(3)').text().trim();

        $('#usDate').val(rawDate);
        $('#usAmount').val(amount);
        $('#usRemarks').val(remarks);

        $('button[type="submit"]').text('Update').data('editing', true);

        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Update Mode
    $('#usClientForm').on('submit', function (e) {
        e.preventDefault();

        const formData = {
            date: $('#usDate').val(),
            amount: $('#usAmount').val(),
            remarks: $('#usRemarks').val(),
            _token: $('meta[name="csrf-token"]').attr('content')
        };

        if ($('button[type="submit"]').data('editing')) {
            $.ajax({
                url: investmentUrl(`us-client/update/${editingId}`),
                type: 'PUT',
                data: formData,
                success: function () {
                    $('#usClientForm')[0].reset();
                    $('button[type="submit"]').text('Submit').removeData('editing');
                    loadUSClients(); // reload from DB
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
            });
        } else {
            $.post(investmentUrl('us-client/save'), $(this).serialize())
                .done(function (res) {
                    if (res.success) {
                        $('#usClientForm')[0].reset();
                        loadUSClients(); // reload from DB, avoids NaN & wrong dates
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }
                })
                .fail(function (xhr) {
                    if (xhr.status === 422) {
                        const errors = xhr.responseJSON.errors;
                        let message = 'Validation error:\n';
                        for (let field in errors) {
                            message += `${errors[field].join(', ')}\n`;
                        }
                        alert(message);
                    } else {
                        alert('Something went wrong while saving.');
                    }
                });
        }
    });

    // Show popup
    $('#usDateFilterInput').on('click', function () {
        const $popup = $('#usDateFilterPopup');
        const inputRect = this.getBoundingClientRect();
        const spaceBelow = window.innerHeight - inputRect.bottom;
        const spaceAbove = inputRect.top;

        // Show popup and decide direction
        $popup.removeClass('top-full bottom-full mt-1 mb-1');

        if (spaceBelow < 260 && spaceAbove > 260) {
            $popup.addClass('bottom-full mb-1'); // show above
        } else {
            $popup.addClass('top-full mt-1'); // show below
        }

        $popup.removeClass('hidden');
    });

    // Hide popup when clicking outside
    $(document).on('click', function (e) {
        if (!$(e.target).closest('#usDateFilterPopup, #usDateFilterInput').length) {
            $('#usDateFilterPopup').addClass('hidden');
        }
    });

    // Apply filter
    $('#applyUsDateFilterBtn').on('click', function () {
        const from = $('#usDateFilterFrom').val();
        const to = $('#usDateFilterTo').val();

        if (!from || !to) {
            alert("Please select both dates.");
            return;
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // Include full day

        $('#us-client-body tr').each(function () {
            // Use raw data-date from the <tr>
            const rowDateStr = $(this).data('date'); // e.g., "2025-03-04"
            const rowDate = new Date(rowDateStr);
            rowDate.setHours(12); // Normalize to avoid timezone issues

            if (rowDate >= fromDate && rowDate <= toDate) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        $('#usDateFilterPopup').addClass('hidden');
    });

    // Clear filter
    $('#clearUsDateFilterBtn').on('click', function () {
        $('#usDateFilterFrom').val('');
        $('#usDateFilterTo').val('');
        $('#usDateFilterInput').val('');

        $('#us-client-body tr').show();
    });

    $('#usFilteredExcelBtn').on('click', function () {
        const wb = XLSX.utils.book_new();
        const wsData = [];

        wsData.push(['SR.NO', 'Date', 'Amount', 'Remarks']);
        $('#us-client-body tr').each(function () {
            const row = [
                $(this).find('td:eq(0)').text(),
                $(this).find('td:eq(1)').text(),
                $(this).find('td:eq(2)').text(),
                $(this).find('td:eq(3)').text()
            ];
            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Filtered US Client Sheet");
        XLSX.writeFile(wb, "us_client_filtered.xlsx");
    });

    $(document).on('input', '.column-filter', function () {
        const filters = [];

        // Store each filter value along with its column index
        $('.column-filter').each(function () {
            filters.push({
                index: $(this).data('index'),
                value: $(this).val().toLowerCase()
            });
        });

        // Apply filters to each row
        $('#us-client-body tr').each(function () {
            const cells = $(this).find('td');
            const visible = filters.every(filter => {
                if (!filter.value) return true;
                return cells.eq(filter.index).text().toLowerCase().includes(filter.value);
            });

            $(this).toggle(visible);
        });
    });


    // =======================
    // SQ Sheet JS
    // =======================

    $(document).on('click', '.delete-sq-btn', function () {
        const id = $(this).data('id');
        $('#sqDeleteId').val(id);
        $('#sqDeleteModal').removeClass('hidden').addClass('flex');
    });

    $('#confirmSqDeleteBtn').on('click', function () {
        const id = $('#sqDeleteId').val();

        $.ajax({
            url: investmentUrl(`sq-client/delete/${id}`),
            type: 'DELETE',
            data: { _token: $('meta[name="csrf-token"]').attr('content') },
            success: function (response) {
                $('#sqDeleteModal').addClass('hidden').removeClass('flex');
                $('button[data-id="' + id + '"]').closest('tr').remove();
                loadSQClients();
            },
            error: function () {
                alert('Failed to delete record.');
            }
        });
    });

    $(document).on('click', '.edit-sq-btn', function () {
        const tr = $(this).closest('tr');
        editingId = tr.data('id');

        const rawDate = tr.data('date');
        const amount = tr.find('td:eq(2)').text().replace('AED', '').replace(/,/g, '').trim();
        const remarks = tr.find('td:eq(3)').text().trim();

        $('#sqDate').val(rawDate);
        $('#sqAmount').val(amount);
        $('#sqRemarks').val(remarks);

        $('button[type="submit"]').text('Update').data('editing', true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    $('#sqClientForm').on('submit', function (e) {
        e.preventDefault();

        const formData = {
            date: $('#sqDate').val(),
            amount: $('#sqAmount').val(),
            remarks: $('#sqRemarks').val(),
            _token: $('meta[name="csrf-token"]').attr('content')
        };

        if ($('button[type="submit"]').data('editing')) {
            $.ajax({
                url: investmentUrl(`sq-client/update/${editingId}`),
                type: 'PUT',
                data: formData,
                success: function () {
                    $('#sqClientForm')[0].reset();
                    $('button[type="submit"]').text('Submit').removeData('editing');
                    loadSQClients();
                    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                }
            });
        } else {
            $.post(investmentUrl('sq-client/save'), $(this).serialize())
                .done(function (res) {
                    if (res.success) {
                        $('#sqClientForm')[0].reset();
                        loadSQClients();
                        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }
                })
                .fail(function (xhr) {
                    if (xhr.status === 422) {
                        const errors = xhr.responseJSON.errors;
                        let message = 'Validation error:\n';
                        for (let field in errors) {
                            message += `${errors[field].join(', ')}\n`;
                        }
                        alert(message);
                    } else {
                        alert('Something went wrong while saving.');
                    }
                });
        }
    });

    $('#sqDateFilterInput').on('click', function () {
        const $popup = $('#sqDateFilterPopup');
        const inputRect = this.getBoundingClientRect();
        const spaceBelow = window.innerHeight - inputRect.bottom;
        const spaceAbove = inputRect.top;

        // Show popup and decide direction
        $popup.removeClass('top-full bottom-full mt-1 mb-1');

        if (spaceBelow < 260 && spaceAbove > 260) {
            $popup.addClass('bottom-full mb-1'); // show above
        } else {
            $popup.addClass('top-full mt-1'); // show below
        }

        $popup.removeClass('hidden');
    });

    $(document).on('click', function (e) {
        if (!$(e.target).closest('#sqDateFilterPopup, #sqDateFilterInput').length) {
            $('#sqDateFilterPopup').addClass('hidden');
        }
    });

    $('#applySqDateFilterBtn').on('click', function () {
        const from = $('#sqDateFilterFrom').val();
        const to = $('#sqDateFilterTo').val();

        if (!from || !to) {
            alert("Please select both dates.");
            return;
        }

        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); // Include full day

        $('#sq-client-body tr').each(function () {
            // Use raw data-date from the <tr>
            const rowDateStr = $(this).data('date'); // e.g., "2025-03-04"
            const rowDate = new Date(rowDateStr);
            rowDate.setHours(12); // Normalize to avoid timezone issues

            if (rowDate >= fromDate && rowDate <= toDate) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        $('#sqDateFilterPopup').addClass('hidden');
    });

    $('#clearSqDateFilterBtn').on('click', function () {
        $('#sqDateFilterFrom').val('');
        $('#sqDateFilterTo').val('');
        $('#sqDateFilterInput').val('');

        $('#sq-client-body tr').show();
    });

    $('#sqFilteredExcelBtn').on('click', function () {
        const wb = XLSX.utils.book_new();
        const wsData = [];

        wsData.push(['SR.NO', 'Date', 'Amount', 'Remarks']);
        $('#sq-client-body tr').each(function () {
            const row = [
                $(this).find('td:eq(0)').text(),
                $(this).find('td:eq(1)').text(),
                $(this).find('td:eq(2)').text(),
                $(this).find('td:eq(3)').text()
            ];
            wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Filtered SQ Sheet");
        XLSX.writeFile(wb, "sq_client_filtered.xlsx");
    });

    $(document).on('input', '.column-filter', function () {
        const filters = [];

        // Store each filter value along with its column index
        $('.column-filter').each(function () {
            filters.push({
                index: $(this).data('index'),
                value: $(this).val().toLowerCase()
            });
        });

        // Apply filters to each row
        $('#sq-client-body tr').each(function () {
            const cells = $(this).find('td');
            const visible = filters.every(filter => {
                if (!filter.value) return true;
                return cells.eq(filter.index).text().toLowerCase().includes(filter.value);
            });

            $(this).toggle(visible);
        });
    });

    $(document)
      .off('click.createSheetOpen')
      .on('click.createSheetOpen', '#openCreateCustomerModalBtn', function (e) {
        e.preventDefault();
        $('#createCustomerSheetModal').removeClass('hidden').addClass('flex');
      });

    $(document)
      .off('click.createSheetClose')
      .on('click.createSheetClose', '.cancelCustomerSheetModalBtn', function (e) {
        e.preventDefault();
        $('#createCustomerSheetModal').addClass('hidden').removeClass('flex');
      });
      
    // ALWAYS bind this (works on cycle pages and normal pages)
    $(document)
      .off('submit.createSheet', '#createCustomerSheetForm')
      .on('submit.createSheet', '#createCustomerSheetForm', function (e) {
        e.preventDefault();
        e.stopPropagation();
    
        if (window._creatingSheet) return false;
        window._creatingSheet = true;
    
        const name = ($('#newCustomerSheetName').val() || '').trim();
        if (!name) { window._creatingSheet = false; return false; }
    
        const url = (typeof window.api === 'function')
          ? window.api('customer/sheets/create')
          : '/investment/customer/sheets/create';
    
        $.ajax({
          url,
          method: 'POST',
          headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
          data: {
            sheet_name: name,
            cycle_id: window.activeCycleId || (window.cycle && window.cycle.id) || null
          }
        })
        .done(function (res) {
          const payload = res?.data || res?.sheet || res;
          if (!payload?.id || !payload?.sheet_name) {
            alert(res?.message || 'Failed to create sheet'); return;
          }
    
          if (typeof window.addCustomerSheetUI === 'function') {
            window.addCustomerSheetUI({ id: payload.id, name: payload.sheet_name });
          } else {
            // minimal fallback tab
            const slug = (payload.sheet_name || '')
              .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'sheet';
            const tabs = document.getElementById('customerTabsContainer');
            const btn  = document.createElement('button');
            btn.className = 'sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100';
            btn.setAttribute('data-sheet', `customer-${slug}`);
            btn.textContent = (payload.sheet_name || '').toUpperCase();
            tabs.appendChild(btn);
          }
    
          // close & reset
          $('#createCustomerSheetModal').addClass('hidden').removeClass('flex');
          $('#newCustomerSheetName').val('');
        })
        .fail(function (xhr) {
          const j = xhr.responseJSON || {};
          const msg =
            (j.code === '23000' || /duplicate entry/i.test(j.message || ''))
              ? 'A customer sheet with this name already exists in this set. Please choose a different name.'
              : (j.message || 'Server error creating sheet.');
          alert(msg);
          console.error('Create sheet error:', j || xhr);
        })
        .always(function () { window._creatingSheet = false; });
    
        return false; // belt & suspenders
      });

    $(document)
        .off('click.summaryNav')
        .on('click.summaryNav', '#nav-summary', function (e) {
            e.preventDefault();
            // delegate to the Summary tab → it will run the loaders once
            $('.sheet-tab[data-sheet="summary"]').trigger('click');
        });

    $(document)
        .off('customerSheets:totalsUpdated.summaryTable')
        .on('customerSheets:totalsUpdated.summaryTable', function () {
            if ($('#sheet-summary').is(':visible')) {
                loadCashInBreakdown();
            }
        });

    $(document)
        .off('click.summaryNavSticky')
        .on('click.summaryNavSticky', '#nav-summary, .sheet-tab[data-sheet="summary"]', function () {
            // after you switch and render summary UI:
            setTimeout(ensureKpiStickyBackdrop, 0);
        });

    // also call once on page load in case Summary is the initial view
    $(function () {
        setTimeout(ensureKpiStickyBackdrop, 0);
    });

    // On Summary nav click (initial load)
    $(document)
        .off('click.summaryNavLoans')
        .on('click.summaryNavLoans', '#nav-summary, .sheet-tab[data-sheet="summary"]', function () {
            stopLoansPolling();        // ensure only one timer
            loadCustomerLoansOnce();   // immediate refresh
            startLoansPolling();       // keep it fresh every 30s
        });

    // Whenever the loan ledger updates anywhere in the app
    $(document)
        .off('loanLedger:updated.summaryLoans')
        .on('loanLedger:updated.summaryLoans', function () {
            refreshLoanOutstandingHybrid();
        });
        
    // Toggle menu
    $(document)
        .off('click.custdd')
        .on('click.custdd', '#custDropBtn', function (e) {
            e.stopPropagation();
            $('#custDropMenu').toggleClass('hidden');
        });

    // Close when clicking outside
    $(document)
        .off('click.custddclose')
        .on('click.custddclose', function (e) {
            if (!$(e.target).closest('#customerTabsContainer').length) {
                $('#custDropMenu').addClass('hidden');
            }
        });

    // When choosing an item, update label and close (the global .sheet-tab handler will switch sheets)
    $(document)
        .off('click.custdditem')
        .on('click.custdditem', '#custDropMenu .sheet-tab', function () {
            $('#custDropMenu').addClass('hidden');
            $('#custDropBtn').contents().filter(function () { return this.nodeType === 3; }).remove();
            // Set new label (keep the caret icon)
            const label = $(this).text().trim();
            $('#custDropBtn').prepend(label + ' ');
        });

function fetchSqTotal() {
    return $.getJSON(api('/summary/sq/total'))
        .then(res => {
            const t = Number(res?.total) || 0;
            try { localStorage.setItem(cycleKey('sqTotal'), String(t)); } catch { }
            return t;
        })
        .catch(() => {
            try {
                const raw = localStorage.getItem(cycleKey('sqTotal'));
                return raw != null ? Number(raw) || 0 : 0;
            } catch { return 0; }
        });
}

function switchToSheet(sheetId) {
  const $tab = $(`.sheet-tab[data-sheet="${sheetId}"]`);
  if ($tab.length) {
    $tab[0].click();
    return;
  }
  // fallback show/hide if no tab exists yet
  const $section = $(`#sheet-${sheetId}`);
  $('.sheet-section').not($section).hide();
  $section.removeClass('hidden').css('display', 'block');

  // persist per-cycle (not global)
  const cycle = window.activeCycleId || (location.pathname.match(/\/c\/(\d+)/)?.[1]) || 'global';
  try { localStorage.setItem(`activeSheet:${cycle}`, sheetId); } catch {}
}

// All number have comma 
function applyNumberFormatting() {
    $('.format-aed').each(function () {
        const numText = $(this).text().replace(/[^0-9.-]+/g, ''); // Remove "AED" etc.
        const num = parseFloat(numText);
        if (!isNaN(num)) {
            $(this).text('AED ' + num.toLocaleString(undefined, { minimumFractionDigits: 2 }));
        }
    });
}

function updateSummaryCards() {
    let totalMaterial = 0;
    let totalMaterialInclVAT = 0;
    let totalVAT = 0;
    let totalShipment = 0;

    $('table tbody tr').each(function () {
        const vat = parseFloat($(this).find('td:eq(12)').text().replace('AED', '').trim()) || 0;
        const material = parseFloat($(this).find('td:eq(13)').text().replace('AED', '').trim()) || 0;
        const materialInclVAT = parseFloat($(this).find('td:eq(14)').text().replace('AED', '').trim()) || 0;
        const shipment = parseFloat($(this).find('td:eq(18)').text().replace('AED', '').trim()) || 0;

        totalVAT += vat;
        totalMaterial += material;
        totalMaterialInclVAT += materialInclVAT;
        totalShipment += shipment;
    });

    const grandTotal = totalMaterialInclVAT + totalShipment;

    $('#totalMaterialAED').text('AED ' + totalMaterial.toFixed(2));
    $('#totalMaterialInclVAT').text('AED ' + totalMaterialInclVAT.toFixed(2));
    $('#totalVAT').text('AED ' + totalVAT.toFixed(2));
    $('#totalShipmentAED').text('AED ' + totalShipment.toFixed(2));
    $('#grandTotalAED').text('AED ' + grandTotal.toFixed(2));
}

function printAttachments() {
    const content = document.getElementById('pdfContentForDownload').innerHTML;

    const win = window.open('', '_blank');
    win.document.write(`
      <html>
      <head>
        <title>Attachments</title>
        <style>
          body { font-family: Arial; padding: 10px; margin: 0; }
            .pdf-block {
                margin-bottom: 20px;
                page-break-inside: avoid;
                text-align: center;
            }
            .pdf-title {
                margin-bottom: 10px;
                font-size: 16px;
                text-align: left;
            }
            .pdf-image {
                width: 100%;
                max-height: 850px;
                object-fit: contain;
            }
        </style>
      </head>
      <body>
        ${content}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
}

function fetchAndFillEditForm(id) {
    $.ajax({
        url: investmentUrl(`get-investment/${id}`),
        method: 'GET',
        success: function (data) {
            if (!data) {
                alert("No data found.");
                return;
            }

            $('#date').val(data.date);
            $('#supplier').val(data.supplier_name);
            $('#buyer').val(data.buyer);
            let cleanInvoice = (data.invoice_number ?? '').split('-copy-')[0];
            $('#invoice').val(cleanInvoice);
            $('#transaction').val(data.transaction_mode);
            $('#description').val(data.description);
            $('#ctns').val(data.no_of_ctns);
            $('#unitsPerCtn').val(data.units_per_ctn);
            $('#unitPrice').val(data.unit_price);
            $('#vatPercentage').val(data.vat_percentage);
            $('#weight').val(data.weight);
            $('#shippingRatePerKg').val(data.shipping_rate_per_kg);
            $('#remarks').val(data.remarks);

            $('#investmentForm').data('edit-id', data.id);
            $('#investmentForm').data('original-invoice', data.invoice_number);
            $('#investmentForm').data('original-sub-serial', data.sub_serial);

            $('#submitBtn').hide();
            $('#saveChangesBtn').show();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: function () {
            alert("Error loading entry for editing.");
        }
    });
}

function parseRowDate(dateStr) {
    // Expected format: "Friday, 28 March 2025"
    const parts = dateStr.split(',')[1]?.trim().split(' ');
    if (!parts || parts.length !== 3) return '';

    const day = parts[0].padStart(2, '0');
    const monthName = parts[1];
    const year = parts[2];

    const monthMap = {
        January: '01', February: '02', March: '03', April: '04',
        May: '05', June: '06', July: '07', August: '08',
        September: '09', October: '10', November: '11', December: '12'
    };

    const month = monthMap[monthName];
    if (!month) return '';

    return `${year}-${month}-${day}`; // yyyy-mm-dd
}

// US CLIENT PAYMENT Logic Initialization

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateISO(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    return d.toISOString().split('T')[0]; // "2025-03-04"
}

function exportUSClientExcel() {
    const wb = XLSX.utils.book_new();
    const wsData = [];

    wsData.push(['SR.NO', 'Date', 'Amount (AED)', 'Remarks']);

    $('#us-client-body tr').each(function (index) {
        const row = [];
        const cells = $(this).find('td');
        row.push(index + 1);
        row.push(cells.eq(1).text().trim());
        row.push(cells.eq(2).text().trim());
        row.push(cells.eq(3).text().trim());
        wsData.push(row);
    });

    wsData.push([]);
    wsData.push(['Total Amount', $('#us-total-amount').text()]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "US Client Sheet");
    XLSX.writeFile(wb, 'us_client_payment.xlsx');
}

function loadUSClients() {
  $.get(investmentUrl('us-client/data'), function (data) {
    const clients = (data && Array.isArray(data.clients)) ? data.clients : [];
    originalUSClients = filterByCycle(clients);
    renderUSClients(clients);

    const total = Number(data && data.totalAmount) || 0;
    $('#us-total-amount').text(
      'AED ' + total.toLocaleString(undefined, { minimumFractionDigits: 2 })
    );

    // cache for Summary/Beneficiary (optional)
    window.usTotal = total;
    try { localStorage.setItem('usTotal', String(total)); } catch {}
  })
  .fail(function (xhr) {
    console.error('US clients fetch failed:', xhr?.status, xhr?.responseText);
    $('#us-total-amount').text('AED 0.00');
  })
  .always(function () {
    $(document).trigger('us:totalsUpdated');
  });
}

function renderUSClients(clients) {
    const tbody = $('#us-client-body').empty();
    
    // closed/open?
    const isClosed =
        (typeof window.isSetClosed === 'function' && window.isSetClosed()) ||
        !!window.__SET_IS_CLOSED ||
        (window.cycle && window.cycle.status === 'closed') ||
        document.documentElement.classList.contains('is-cycle-closed');

    // Use the first-fetched baseline, else fall back to current list
    const base = Array.isArray(window.originalUSClients) && window.originalUSClients.length
        ? window.originalUSClients
        : clients;
        
    const indexMap = new Map(base.map((c, i) => [c.id, i + 1]));

    clients.forEach((item) => {
        const srNo = indexMap.get(item.id) ?? '-';
        
        const actionCell = !isClosed ? `
            <td class="w-24 action-col" data-col="action">
                <button class="edit-us-btn px-2 py-1 text-sm rounded bg-green-600 hover:bg-green-700 text-white" title="Edit">
                <i class="bi bi-pencil-square"></i>
                </button>
                <button class="delete-us-btn px-2 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white" data-id="${item.id}" title="Delete">
                <i class="bi bi-trash"></i>
                </button>
            </td>` : '';
        
        const amt = Number(item.amount) || 0;

        const row = `
            <tr data-id="${item.id}" data-date="${formatDateISO(item.date)}">
                <td class="w-5">${srNo}</td>
                <td class="w-35">${formatDate(item.date)}</td>
                <td class="format-aed w-32">AED ${amt.toFixed(2)}</td>
                <td class="w-40">${item.remarks || ''}</td>
                ${actionCell}
            </tr>`;
        tbody.append(row);
    });

    if (typeof applyNumberFormatting === 'function') applyNumberFormatting();
}

// SQ Sheet Logic Initialization
function loadSQClients() {
    $.get(investmentUrl('sq-client/data'), function (data) {
        originalSQClients = data.clients;
        renderSQClients(data.clients);
        $('#sq-total-amount').text(
            'AED ' + parseFloat(data.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })
        );
        // cache it so Summary can use immediately on next visit/refresh
        try {
            window.sqTotal = Number(data.totalAmount) || 0;
            localStorage.setItem('sqTotal', String(window.sqTotal));
        } catch { }
        $(document).trigger('sq:totalsUpdated');
    });
}

function renderSQClients(clients) {
    const tbody = $('#sq-client-body').empty();
    
    // closed/open?
    const isClosed =
        (typeof window.isSetClosed === 'function' && window.isSetClosed()) ||
        !!window.__SET_IS_CLOSED ||
        (window.cycle && window.cycle.status === 'closed') ||
        document.documentElement.classList.contains('is-cycle-closed');
        
    // Use the first-fetched baseline, else fall back to current list
    const base = Array.isArray(window.originalSQClients) && window.originalSQClients.length
        ? window.originalSQClients
        : clients;

    const indexMap = new Map(base.map((c, i) => [c.id, i + 1]));

    clients.forEach((item) => {
        const srNo = indexMap.get(item.id) ?? '-';
        
        const actionCell = !isClosed ? `
                <td class="w-24 action-col" data-col="action">
                    <button class="edit-sq-btn px-2 py-1 text-sm rounded bg-green-600 hover:bg-green-700 text-white" title="Edit">
                        <i class="bi bi-pencil-square"></i>
                    </button>
    
                    <button class="delete-sq-btn px-2 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white" data-id="${item.id}" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>` : '';
                
        const amt = Number(item.amount) || 0;

        const row = `
            <tr data-id="${item.id}" data-date="${formatDateISO(item.date)}">
                <td class="w-5">${srNo}</td>
                <td class="w-35">${formatDate(item.date)}</td>
                <td class="format-aed w-32">AED ${amt.toFixed(2)}</td>
                <td class="w-40">${item.remarks || ''}</td>
                ${actionCell}
            </tr>`;
        tbody.append(row);
    });

    if (typeof applyNumberFormatting === 'function') applyNumberFormatting();
}

function exportSQExcel() {
    const wb = XLSX.utils.book_new();
    const wsData = [];

    wsData.push(['SR.NO', 'Date', 'Amount (AED)', 'Remarks']);

    $('#sq-client-body tr').each(function (index) {
        const row = [];
        const cells = $(this).find('td');
        row.push(index + 1);
        row.push(cells.eq(1).text().trim());
        row.push(cells.eq(2).text().trim());
        row.push(cells.eq(3).text().trim());
        wsData.push(row);
    });

    wsData.push([]);
    wsData.push(['Total Amount', $('#sq-total-amount').text()]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "SQ Sheet");
    XLSX.writeFile(wb, 'sq_sheet.xlsx');
}

// Local Sales: cache items per header row so we only fetch once
window.localItemsCache = window.localItemsCache || {};

// ---------- Local Sales: render master+detail ----------
function renderLocalRows(rows) {
  const $body = $('#localSalesBody').empty();
  
  const showActions =
        !((typeof window.isSetClosed === 'function' && window.isSetClosed()) ||
            !!window.__SET_IS_CLOSED ||
            (window.cycle && window.cycle.status === 'closed') ||
            document.documentElement.classList.contains('is-cycle-closed'));

  if (!rows || !rows.length) {
    $body.append(`<tr class="ls-empty">
      <td colspan="${showActions ? 6 : 5}" class="px-3 py-3 text-gray-500">No rows yet.</td>
    </tr>`);
    $('#localTotalSales').text('AED 0.00');
    $('#localTotalCount').text('0 records');
    initTippy();
    return;
  }

  const esc    = (s = '') => String(s).replace(/</g, '&lt;');

  let grandInc = 0;

  // Do NOT sort; respect backend order (id ASC)
  rows.forEach((r, i) => {
    const id     = r.id;
    const ymd    = (r.date || '').slice(0, 10);         // "YYYY-MM-DD"
    const dateUi = formatSheetDateUTC(ymd);             // e.g., "Thursday 10 April 2025"
    const client = esc(r.client || '');
    const brief  = esc(r.description || '');
    const pstat  = (r.payment_status || 'pending').toLowerCase();
    const rem    = esc(r.remarks || '');

    // Use backend aggregate directly
    const rowInc = Number(r.total_inc_vat) || 0;
    grandInc += rowInc;

    // If items are present inline, render them; else lazy-load placeholder
    let itemRowsHtml = `<tr class="ls-items-placeholder">
        <td colspan="9" class="p-3 text-sm text-gray-500">Expand to load items…</td>
      </tr>`;
    if (Array.isArray(r.items)) {
      itemRowsHtml = buildEditableItemRowsHtml(r.items, pstat);
    }
    
    const actionCell = showActions ? `
        <td class="px-3 py-2 align-top text-center actions-cell action-col" data-col="action">
            <div class="flex items-center justify-center gap-2">
            <button class="row-save px-2 py-1 text-sm rounded bg-green-600 hover:bg-green-700 text-white mr-2 hidden"
                    data-tippy-content="Save changes"><i class="bi bi-check2-circle"></i></button>
            <button class="ls-upload px-2 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white"
                    data-id="${id}" data-tippy-content="Upload"><i class="bi-cloud-arrow-up-fill"></i></button>
            <button class="ls-view px-2 py-1 text-sm rounded bg-slate-700 hover:bg-slate-800 text-white"
                    data-id="${id}" data-tippy-content="View"><i class="bi bi-paperclip"></i></button>
            <button class="local-delete px-2 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white"
                    data-id="${id}" data-tippy-content="Delete"><i class="bi bi-trash-fill"></i></button>
            </div>
        </td>` : '';

    // MASTER row
    const $master = $(`
      <tr class="group hover:bg-gray-50 master-row" data-id="${id}" data-date="${ymd}">
        <td class="px-3 py-2 align-top">${i + 1}</td>
        <td class="px-3 py-2 align-top">${dateUi}</td>
        <td class="px-3 py-2 align-top">${client}</td>
        <td class="px-3 py-2 align-top">${brief}</td>
        <td class="px-3 py-2 align-top text-right font-semibold ls-total-cell">${fmtAED(rowInc)}</td>
        ${actionCell}
      </tr>
    `);

    // DETAIL row
    const $detail = $(`
      <tr class="detail-row" data-parent="${id}">
        <td colspan="${showActions ? 6 : 5}" class="pt-2 pb-4 bg-transparent">
          <div class="ls-detail-wrapper overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
            <div class="px-4 py-2 bg-[#d7efff] border-b text-xs font-semibold text-gray-700 uppercase tracking-wider">Items</div>
            <table class="w-full text-sm">
              <thead class="text-gray-600">
                <tr>
                  <th class="px-4 py-3 text-left w-12">#</th>
                  <th class="px-4 py-3 text-left min-w-[18rem]">Description</th>
                  <th class="px-4 py-3 text-right w-28">No. of Units</th>
                  <th class="px-4 py-3 text-right w-28">Unit Price</th>
                  <th class="px-4 py-3 text-right w-36">Total w/o VAT</th>
                  <th class="px-4 py-3 text-right w-28">VAT</th>
                  <th class="px-4 py-3 text-right w-36">Total w/ VAT</th>
                  <th class="px-4 py-3 text-center w-40">Payment</th>
                  <th class="px-4 py-3 text-left min-w-[18rem]">Remarks</th>
                </tr>
              </thead>
              <tbody class="ls-items-body divide-y divide-gray-100">
                ${itemRowsHtml}
              </tbody>
            </table>
            <div class="p-3">
              <button class="add-item-btn mt-1 px-3 py-1 bg-blue-800 text-white rounded hover:bg-blue-900" data-target="${id}">+ Add Item</button>
            </div>
          </div>
        </td>
      </tr>
    `).addClass('hidden'); // collapsed by default

    $body.append($master, $detail);

    // Baselines & UI inits
    setItemsBaseline($detail, getItemsFromDetail($detail));
    updateRowDirtyUI($detail);
    $detail.find('.auto-grow').each(function () { autosizeTextarea(this); });
    refreshSerialVisibility($detail);
    autoGrowTextareas($detail);
  });

  // Totals / counts
  $('#localTotalSales').text(fmtAED(grandInc));
  $('#localTotalCount').text(`${rows.length} record${rows.length === 1 ? '' : 's'}`);

  initTippy();
}

// ---------- Local Sales: expand/collapse, modal, CRUD ----------
function initLocalLogic() {
    // toggle detail
    $(document)
        .off('click.lsRowToggle')
        .on('click.lsRowToggle', '#localSalesBody > tr:not(.detail-row)', function (e) {
            if ($(e.target).closest('.actions-cell,button,a,.bi,input,select,textarea,label').length) return;

            const id = $(this).data('id');
            const $detail = $(`tr.detail-row[data-parent="${id}"], tr.detail-row[data-id="${id}"]`);
            const wasHidden = $detail.hasClass('hidden');

            // close all details first
            $('#localSalesBody tr.detail-row').addClass('hidden');

            if (wasHidden) {
                // if already rendered with inputs (draft or previously loaded), just show
                if ($detail.find('.ls-items-body :input').length) {
                    $detail.removeClass('hidden');
                    return;
                }
                // first open → lazy load items (persisted rows)
                loadLocalItemsOnce($detail, id).always(() => {
                    $detail.removeClass('hidden');
                    autoGrowTextareas($detail);
                    updateRowDirtyUI($detail);
                });
            }
        });

    // open Quick-add modal
    $(document).off('click.lsAdd').on('click.lsAdd', '#localAddBtn', function () {
        $('#qDate').val('');
        $('#qClient').val('');
        $('#qDesc').val('');
        $('#localModal').removeClass('hidden').addClass('flex');
    });

    // close quick modal
    $(document).off('click.lsClose').on('click.lsClose', '#closeLocalModal,#cancelLocal', function () {
        $('#localModal').addClass('hidden').removeClass('flex');
    });

    $(document).off('submit.lsQuick').on('submit.lsQuick', '#localQuickForm', function (e) {
        e.preventDefault();
        const ymd = ($('#qDate').val() || '').trim();
        const dateUi = formatSheetDateUTC(ymd); 
        const client = $('#qClient').val();
        const desc = $('#qDesc').val();

        $('#localModal').addClass('hidden').removeClass('flex');

        const draftId = 'draft-' + Date.now();
        // drop the "No rows yet." placeholder if present
        $('#localSalesBody .ls-empty').remove();
        // count only master rows (exclude detail rows and placeholder)
        const idx = $('#localSalesBody > tr').not('.detail-row,.ls-empty').length + 1;

        const [$m, $d] = buildLocalDraftRow({ id: draftId, idx, date: dateUi, client, desc });
        $m.attr('data-date', ymd);
        $('#localSalesBody').append($m).append($d);
        $d.removeClass('hidden');

        // start with one item; prefill description from header "Brief Description"
        const $first = addLocalItemRow($d);
        $first.find('.li-desc').val(desc);
        refreshSerialVisibility($d);
        // initial totals
        recalcItemTable($d);
        initTippy();
    });

    // discard draft
    $(document).off('click.lsDraftCancel').on('click.lsDraftCancel', '.draft-cancel', function () {
        const $m = $(this).closest('tr[data-draft="1"]');
        const id = $m.data('id');

        // remove the matching detail (covers draft + non-draft patterns)
        $(`tr.detail-row[data-parent="${id}"], tr.detail-row[data-id="${id}"]`).remove();
        $m.remove();

        // optional: clear any cached items for this id
        if (window.localItemsCache) delete window.localItemsCache[id];

        // reindex S.No (first cell)
        $('#localSalesBody > tr').not('.detail-row,.ls-empty').each(function (i) {
            $(this).children('td').eq(0).text(i + 1);
        });
    });

    // save draft -> POST to /local-sales
    $(document).off('click.lsDraftSave').on('click.lsDraftSave', '.draft-save', function () {
        const $m = $(this).closest('tr[data-draft="1"]');
        const id = $m.data('id');
        const $d = $(`tr.detail-row[data-id="${id}"]`);

        recalcItemTable($d);
        const agg = $d.data('agg') || {};

        // collect items (optional)
        const items = [];
        $d.find('.ls-items-body > tr').each(function () {
            items.push({
                description: $(this).find('.li-desc').val() || '',
                units: Number($(this).find('.li-units').val() || 0),
                unit_price: Number($(this).find('.li-unitprice').val() || 0),
                vat: Number($(this).find('.li-vat').val() || 0),
                status: ($(this).find('.li-status').val() || 'pending'),
                remarks: $(this).find('.li-remarks').val() || ''
            });
        });

        // derive top-level payment_status (any pending > partial > paid)
        const statuses = items.map(x => x.status);
        let payment_status = 'paid';
        if (statuses.includes('pending')) payment_status = 'pending';
        else if (statuses.includes('partial')) payment_status = 'partial';

        const payload = {
            date: String($m.data('date') || '').trim(),
            client: $m.children('td').eq(2).text().trim(),
            description: $m.children('td').eq(3).text().trim(), // brief description
            payment_status,

            // map aggregates to existing schema (no schema change)
            total_units: agg.total_units || 0,
            total_ex_vat: agg.total_ex_vat || 0,
            vat_amount: agg.vat_amount || 0,
            total_inc_vat: agg.total_inc_vat || 0,

            // legacy fields not applicable in itemized mode
            no_of_ctns: 0,
            units_per_ctn: 0,
            unit_price: 0,
            vat_percent: 5,

            // optional extra (server can ignore)
            items: JSON.stringify(items),
            remarks: items.map(x => x.remarks).filter(Boolean).join(' | ')
        };

        $.ajax({ url: investmentUrl('local-sales'), method: 'POST', data: payload })
            .done(() => {
                setItemsBaseline($d, getItemsFromDetail($d));
                updateRowDirtyUI($d);
                loadLocalSales();
                $(document).trigger('localSales:updated');
            })
            .fail(err => { console.error('Local save failed', err); alert('Failed to save.'); });
    });

    $('#localSalesBody')
        .off('click.lsRowSave', '.row-save')
        .on('click.lsRowSave', '.row-save', function () {
            const $master = $(this).closest('tr');
            const id = $master.data('id');
            const $detail = $(`tr.detail-row[data-parent="${id}"]`);

            // make sure totals are fresh
            recalcItemTable($detail);

            // 1) collect current editable values
            const items = getItemsFromDetail($detail); // uses YOUR function

            // 2) aggregates
            const sums = items.reduce((a, it) => {
                const ex = Number(it.units) * Number(it.unit_price);
                const inc = ex + Number(it.vat);
                a.units += Number(it.units);
                a.ex += ex;
                a.vat += Number(it.vat);
                a.inc += inc;
                return a;
            }, { units: 0, ex: 0, vat: 0, inc: 0 });

            // 3) roll-up payment status
            const sts = items.map(x => String(x.status || '').toLowerCase());
            let payment_status = 'paid';
            if (sts.includes('pending')) payment_status = 'pending';
            else if (sts.includes('partial')) payment_status = 'partial';

            // 4) PUT
            $.ajax({
                url: investmentUrl(`local-sales/${id}`),
                method: 'PUT',
                data: {
                    replace_items: 1,
                    items: JSON.stringify(items),
                    total_units: sums.units,
                    total_ex_vat: sums.ex,
                    vat_amount: sums.vat,
                    total_inc_vat: sums.inc,
                    payment_status
                }
            })
                .done(() => {
                    // 1) Read the CURRENT values from the DOM and normalize
                    const normalized = getItemsFromDetail($detail); // <- your function returns normalized items

                    // 2) Update the cache so reopening uses fresh items
                    window.localItemsCache = window.localItemsCache || {};
                    window.localItemsCache[id] = normalized;

                    // 3) Reset baseline + hide Save (clean state)
                    if (typeof setItemsBaseline === 'function') setItemsBaseline($detail, normalized);
                    if (typeof updateRowDirtyUI === 'function') updateRowDirtyUI($detail);

                    // discard stale cache so items re-fetch cleanly on next expand
                    if (window.localItemsCache) delete window.localItemsCache[id];
                    loadLocalSales(); // full redraw
                })
                .fail(xhr => {
                    const j = xhr.responseJSON;
                    const msg = j?.message || 'Failed to save changes.';
                    alert(msg);
                    console.error('Local update failed', xhr);
                });
        });

    // delete
    $(document).off('click.lsDelete').on('click.lsDelete', '.local-delete', function () {
        const $master = $(this).closest('tr');
        const id = $master.data('id');
        if (!confirm('Delete this row?')) return;

        $.ajax({ url: investmentUrl('local-sales/' + id), method: 'DELETE' })
            .done(() => {
                $(`tr.detail-row[data-parent="${id}"]`).remove();
                $master.remove();
                // reindex S.No
                $('#localSalesBody > tr').not('.detail-row,.ls-empty').each(function (i) {
                    $(this).children('td').eq(0).text(i + 1);
                });
                $(document).trigger('localSales:updated');
            })
            .fail(err => {
                console.error('Local delete failed', err);
                alert('Failed to delete.');
            });
    });

    $('#localSalesBody')
        .off('click.lsAddItem', '.add-item-btn')
        .on('click.lsAddItem', '.add-item-btn', function () {
            const $detail = $(this).closest('tr.detail-row');
            const $newRow = addLocalItemRow($detail);

            refreshSerialVisibility($detail);
            recalcItemTable($detail);
            autoGrowTextareas($newRow);

            const id = $detail.data('parent') || $detail.data('id');
            $(`#localSalesBody > tr[data-id="${id}"] .row-save`).removeClass('hidden');

            // focus first editable field in the new row
            $newRow.find('.li-desc, .li-units, .li-unitprice, .li-vat')
                .filter(':input')
                .first()
                .focus();
        });

    // ONE unified delegate for edit → recalc → autosize → dirty UI
    $('#localSalesBody')
        .off('input.lsDirty change.lsDirty keyup.lsDirty paste.lsDirty', '.ls-items-body :input')
        .on('input.lsDirty change.lsDirty keyup.lsDirty paste.lsDirty', '.ls-items-body :input', function () {
            const $detail = $(this).closest('tr.detail-row');

            // recalcs totals + aggregates on the detail row
            recalcItemTable($detail);

            // autosize if it's a textarea we marked as growable
            if ($(this).is('textarea.ls-plain, textarea.auto-grow')) {
                autosizeTextarea(this);
            }

            // show/hide the Save button depending on real changes
            updateRowDirtyUI($detail);
        });

    // live auto-grow while typing
    $('#localSalesBody')
        .off('input.autogrow', 'textarea.ls-plain')
        .on('input.autogrow', 'textarea.ls-plain', function () {
            autosizeTextarea(this);
        });

    // After you append rows in renderLocalRows / addLocalItemRow:
    $('#localSalesBody .auto-grow').each(function () { autosizeTextarea(this); });

    // when opening the Upload modal, clear prior selection + labels
    $(document).off('click.lsUpload').on('click.lsUpload', '.ls-upload', function (e) {
          e.stopPropagation();
        
          const id = $(this).data('id');
          $('#lsUploadSaleId').val(id);
        
          // clear chosen files & reset labels
          $('#lsUploadForm .fp-input').val('');
          $('#lsUploadForm [data-fp-label]').each(function () {
            setLabel($(this), 'No file chosen');
          });
        
          $('#lsUploadModal').removeClass('hidden').addClass('flex');
        
          // fetch existing attachment names
          $.ajax({
            url: investmentUrl(`local-sales/${encodeURIComponent(id)}/attachments`),
            type: 'GET',
            dataType: 'json'
          }).done(function (res) {
            // v can be {url,name} or a legacy string
            const labelFrom = v =>
              v && typeof v === 'object' ? (v.name || 'No file chosen') :
              (typeof v === 'string' ? (v.split('/').pop() || 'No file chosen') : 'No file chosen');
        
            // IMPORTANT: match your data-fp-label values (hyphenated)
            setLabel($('[data-fp-label="ls-invoice"]'), labelFrom(res.invoice));
            setLabel($('[data-fp-label="ls-receipt"]'), labelFrom(res.receipt));
            setLabel($('[data-fp-label="ls-note"]'),    labelFrom(res.note));
          }).fail(function () {
            // leave defaults
          });
        });

    // Close upload modal
    $('#lsUploadClose,#lsUploadCancel').off('click.lsUploadClose').on('click.lsUploadClose', function () {
        $('#lsUploadModal').addClass('hidden').removeClass('flex');
    });

    // Submit upload
    $('#lsUploadForm').off('submit.lsUpload').on('submit.lsUpload', function (e) {
        e.preventDefault();
        const id = $('#lsUploadSaleId').val();
        const fd = new FormData(this);

        $.ajax({
            url: investmentUrl(`local-sales/${id}/attachments`),
            method: 'POST',
            data: fd,
            processData: false,
            contentType: false,
            headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
        })
            .done(() => {
                $('#lsUploadModal').addClass('hidden').removeClass('flex');
                $(document).trigger('localSales:attachmentsUpdated', { id });
                initTippy();
            })
            .fail(xhr => {
                alert(xhr?.responseJSON?.message || 'Upload failed.');
                console.error('ls upload fail', xhr);
            });
    });

    // --- Attachments: open viewer modal ---
    $(document).off('click.lsView').on('click.lsView', '.ls-view', function (e) {
        e.stopPropagation();
        const id = $(this).data('id');
        const attBase = investmentUrl(`local-sales/${encodeURIComponent(id)}`);

        // try API; if it fails (404 etc), still open with all "Not Uploaded"
        $.getJSON(`${attBase}/attachments`)
            .done(res => {
                $('#lsViewBody').html(
                    lsMkAttRow('Invoice', res.invoice) +
                    lsMkAttRow('Bank Transfer Receipt', res.receipt) +
                    lsMkAttRow('Delivery Note', res.note)
                );
                // enable/disable download based on presence
                const hasAny = !!(res?.invoice?.url || res?.receipt?.url || res?.note?.url);
                $('#lsDownloadPdfBtn')
                  .toggleClass('pointer-events-none opacity-50', !hasAny)
                  .attr('href', `${attBase}/attachments/pdf`);
                $('#lsViewModal').removeClass('hidden').addClass('flex');
            })
            .fail(() => {
                // open with all empty instead of alert
                $('#lsViewBody').html(
                    lsMkAttRow('Invoice', null) +
                    lsMkAttRow('Bank Transfer Receipt', null) +
                    lsMkAttRow('Delivery Note', null)
                );
                $('#lsDownloadPdfBtn').attr('href', `${attBase}/attachments/pdf`);
                $('#lsViewModal').removeClass('hidden').addClass('flex');
            });
    });

    $('#lsViewClose,#lsViewClose2').off('click.lsViewClose').on('click.lsViewClose', function () {
        $('#lsViewModal').addClass('hidden').removeClass('flex');
    });

    $(document).on('localSales:attachmentsUpdated', function (e, payload) {
        const id = payload?.id;
        if (!id) return;
        $.getJSON(investmentUrl(`local-sales/${id}/attachments`), function (res) {
            const hasAny = !!(res?.invoice?.url || res?.receipt?.url || res?.note?.url);
            const $btn = $(`#localSalesBody > tr[data-id="${id}"] .ls-view`);
            $btn.toggleClass('ring-2 ring-offset-1 ring-blue-300', hasAny);
        });
    });

    // open OS picker
    $(document).off('click.fpBrowse').on('click.fpBrowse', '.fp-browse', function () {
        const id = $(this).data('for');
        $('#' + id).trigger('click');
    });

    // show picked filename
    $(document).off('change.fpInput').on('change.fpInput', '.fp-input', function () {
        const id = this.id;
        const name = this.files && this.files.length ? this.files[0].name : 'No file chosen';
        $(`[data-fp-label="${id}"]`).val(name);
    });

}

// helper: works for <input> or <span>/<div>
function setLabel($el, text) {
  if (!$el || !$el.length) return;
  if ($el.is('input, textarea')) $el.val(text);
  else $el.text(text);
}

// Format "YYYY-MM-DD" as "21 Aug 2025" using UTC to avoid TZ shifts
function formatSheetDateUTC(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); // UTC safe
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(dt);
}

// If you still need a normalized Y-M-D (strip any time)
function normalizeYMD(s) {
  return (s || '').slice(0, 10); // "YYYY-MM-DD"
}

function fileNameFromUrl(url) {
    if (!url) return '';
    try {
        const clean = url.split('?')[0]; // strip query
        const last = clean.substring(clean.lastIndexOf('/') + 1);
        return decodeURIComponent(last || '');
    } catch { return ''; }
}

// Safely get link + label from either {url,name} or legacy string
function lsMkAttRow(label, item) {
  const url =
    item && typeof item === 'object' ? item.url :
    (typeof item === 'string' ? item : null);

  const name =
    item && typeof item === 'object' ? (item.name || '') :
    (typeof item === 'string' ? (item.split('/').pop() || '') : '');

  const right = url
    ? `<span class="ml-2 text-gray-500 break-all">${escapeHtml(name)}</span>
       <a class="text-blue-600 underline" href="${escapeAttr(url)}" target="_blank" rel="noopener">Open</a>`
    : `<span class="text-gray-400">Not Uploaded</span>`;

  return `
    <div class="flex items-center justify-between gap-3">
      <div class="font-medium">${escapeHtml(label)}:</div>
      <div class="text-right">${right}</div>
    </div>`;
}

// tiny helpers to avoid HTML issues
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function escapeAttr(s) { return escapeHtml(s); }

function buildEditableItemRowsHtml(items, defaultStatus = 'pending') {
    const esc = s => String(s || '').replace(/</g, '&lt;');
    const num = n => (Number(n) || 0);
    const fmt = n => (Number(n) || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return items.map((it, idx) => {
        const u = num(it.units);
        const up = num(it.unit_price);
        const v = num(it.vat);
        const ex = u * up;
        const inc = ex + v;
        const st = (it.status || defaultStatus).toLowerCase();

        return `
      <tr class="ls-item odd:bg-white even:bg-gray-50" data-idx="${idx + 1}">
        <td class="px-4 py-2 text-left"><span class="sn-text">${idx + 1}</span></td>
        <td class="px-4 py-2 align-top">
          <textarea class="li-desc ls-plain w-full text-gray-800 px-2 py-1" rows="1"
            placeholder="Description">${esc(it.description || '')}</textarea>
        </td>
        <td class="px-4 py-2 text-right">
          <input type="number" min="0" step="1" class="li-units w-full border rounded px-2 py-1 text-right" value="${u}">
        </td>
        <td class="px-4 py-2 text-right">
          <input type="number" min="0" step="0.01" class="li-unitprice w-full border rounded px-2 py-1 text-right" value="${up}">
        </td>
        <td class="px-4 py-3 text-right tabular-nums li-ex">${fmt(ex)}</td>
        <td class="px-4 py-2 text-right">
          <input type="number" min="0" step="0.01" class="li-vat w-full border rounded px-2 py-1 text-right" value="${v}">
        </td>
        <td class="px-4 py-3 text-right tabular-nums li-inc font-semibold">${fmt(inc)}</td>
        <td class="px-4 py-2 text-center">
          <select class="li-status w-full border rounded px-2 py-1">
            <option value="paid" ${st === 'paid' ? 'selected' : ''}>Paid</option>
            <option value="pending" ${st === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="partial" ${st === 'partial' ? 'selected' : ''}>Partially Paid</option>
          </select>
        </td>
        <td class="px-4 py-2 align-top">
          <textarea class="li-remarks ls-plain w-full text-gray-800 px-2 py-1" rows="1"
            placeholder="Remarks">${esc(it.remarks || '')}</textarea>
        </td>
      </tr>
    `;
    }).join('');
}

function loadLocalItemsOnce($detail, id) {
    if ($detail.data('loaded') === 1) {
        return $.Deferred().resolve(window.localItemsCache[id] || []).promise();
    }

    if (window.localItemsCache[id]) {
        renderItemsIntoDetail($detail, window.localItemsCache[id]);
        return $.Deferred().resolve(window.localItemsCache[id]).promise();
    }

    return $.getJSON(investmentUrl(`local-sales/${id}/items`))
        .done(res => {
            const items = Array.isArray(res?.data) ? res.data : [];
            window.localItemsCache[id] = items;      // cache fresh copy
            renderItemsIntoDetail($detail, items);   // use the new renderer
        })
        .fail(() => {
            $detail.find('.ls-items-body')
                .empty()
                .append(`<tr><td colspan="9" class="p-3 text-center text-red-600">Failed to load items.</td></tr>`);
        });
}

function toISODateSafe(s) {
    if (!s) return '';
    // force local midnight to avoid TZ shifts
    const d = new Date(`${s}T00:00:00`);
    return isNaN(d) ? s : d.toISOString().slice(0, 10);
}

// helper for status badge (include once)
function lsStatusBadge(status) {
    const s = (status || 'pending').toLowerCase();
    const cls =
        s === 'paid' ? 'bg-green-100 text-green-700' :
            s === 'partial' ? 'bg-blue-100 text-blue-700' :
                'bg-yellow-100 text-yellow-700';
    const label = s === 'partial' ? 'Partially Paid' : (s.charAt(0).toUpperCase() + s.slice(1));
    return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cls}">${label}</span>`;
}

function initTippy() {
    try {
        if (typeof tippy === 'function') {
            tippy('[data-tippy-content]', { theme: 'light', delay: [150, 0], appendTo: document.body });
        }
    } catch { }
}

// Build master + rich detail (colspan = 5 to match your table)
function buildLocalDraftRow({ id, idx, date, client, desc }) {

    const $master = $(`
        <tr class="group hover:bg-gray-50 cursor-pointer" data-id="${id}" data-draft="1">
            <td class="px-3 py-2 align-top">${idx}</td>
            <td class="px-3 py-2 align-top">${date}</td>
            <td class="px-3 py-2 align-top">${client}</td>
            <td class="px-3 py-2 align-top">${desc}</td>
            <td class="px-3 py-2 align-top text-right font-semibold ls-total-cell">AED 0.00</td>
            <td class="px-3 py-2 align-top text-center actions-cell cursor-default">
                <div class="flex items-center justify-center gap-1">
                    <button type="button" class="draft-save px-2 py-1 text-sm rounded bg-green-600 hover:bg-green-700 text-white mr-2" title="Save" data-tippy-content="Save"><i class="bi bi-check2-circle"></i></button>
                    <button type="button" class="draft-cancel px-2 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white" title="Discard" data-tippy-content="Discard"><i class="bi bi-x-circle"></i></button>
                </div>
            </td>
        </tr>
    `);

    const $detail = $(`
        <tr class="detail-row bg-gray-50/40" data-id="${id}" data-draft="1">
        <td colspan="6" class="px-3 py-3">
            <div class="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="px-4 py-2 bg-gray-50 border-b text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Items
            </div>

            <table class="w-full text-sm">
                <thead class="bg-gray-50 text-gray-600">
                <tr>
                    <th class="px-4 py-3 text-left w-12">#</th>
                    <th class="px-4 py-3 text-left">Description</th>
                    <th class="px-4 py-3 text-right w-28">No. of Units</th>
                    <th class="px-4 py-3 text-right w-28">Unit Price</th>
                    <th class="px-4 py-3 text-right w-36">Total w/o VAT</th>
                    <th class="px-4 py-3 text-right w-28">VAT</th>
                    <th class="px-4 py-3 text-right w-36">Total w/ VAT</th>
                    <th class="px-4 py-3 text-center w-40">Payment Status</th>
                    <th class="px-4 py-3 text-left w-64">Remarks</th>
                </tr>
                </thead>
                <tbody class="ls-items-body divide-y divide-gray-100"></tbody>
            </table>

            <div class="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                <button class="add-item-btn inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700" data-target="${id}">
                <i class="bi bi-plus-lg"></i><span>Add Item</span>
                </button>

                <div class="text-xs text-gray-500">Totals auto-update as you type.</div>
            </div>
            </div>
        </td>
        </tr>
        `);

    return [$master, $detail];
}

function addLocalItemRow($detail) {
    const idx = $detail.find('.ls-items-body > tr').length + 1;
    const $row = $(`
    <tr class="ls-item" data-idx="${idx}">
      <td class="px-4 py-2 text-left"><span class="sn-text">${idx}</span></td>
      <td class="px-4 py-2 align-top">
        <textarea
            class="li-desc ls-plain w-full text-gray-800 bg-transparent
                border border-transparent rounded px-2 py-1
                focus:border-gray-300 focus:ring-0 resize-none"
            rows="1" placeholder="Description"></textarea>
        </td>
      <td class="px-4 py-2 text-right"><input type="number" min="0" step="1" class="li-units w-full border rounded px-2 py-1 text-right" value="0"></td>
      <td class="px-4 py-2 text-right"><input type="number" min="0" step="0.01" class="li-unitprice w-full border rounded px-2 py-1 text-right" value="0"></td>
      <td class="px-4 py-3 text-right tabular-nums li-ex">0.00</td>
      <td class="px-4 py-2 text-right"><input type="number" min="0" step="0.01" class="li-vat w-full border rounded px-2 py-1 text-right" value="0"></td>
      <td class="px-4 py-3 text-right tabular-nums li-inc">0.00</td>
      <td class="px-4 py-2 text-center">
        <select class="li-status w-full border rounded px-2 py-1">
          <option value="paid">Paid</option>
          <option value="pending" selected>Pending</option>
          <option value="partial">Partially Paid</option>
        </select>
      </td>
      <td class="px-4 py-2 align-top">
        <textarea
            class="li-remarks ls-plain w-full text-gray-800 bg-transparent
                border border-transparent rounded px-2 py-1
                focus:border-gray-300 focus:ring-0 resize-none"
            rows="1" placeholder="Remarks"></textarea>
        </td>
    </tr>
  `);
    $detail.find('.ls-items-body').append($row);
    return $row;
}

// you already have this:
function autosizeTextarea(el) {
    el.style.height = 'auto';
    el.style.height = (el.scrollHeight || 0) + 'px';
}

function autoGrowTextareas($scope) {
    // $scope can be a detail row; default to document
    const $root = ($scope && $scope.length) ? $scope : $(document);
    $root.find('textarea.ls-plain').each((_, el) => autosizeTextarea(el));
}

function setItemsBaseline($detail, items) {
    $detail.data('baseline', JSON.stringify(normalizeItems(items || [])));
}

function getBaselineItems($detail) {
    try {
        const raw = $detail.data('baseline');
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

// --- render items into a detail row as EDITABLE inputs ---
function renderItemsIntoDetail($detail, items) {
    const normalized = normalizeItems(items || []);
    const html = buildEditableItemRowsHtml(normalized, 'pending');
    $detail.find('.ls-items-body').empty().append(html);

    refreshSerialVisibility($detail);
    $detail.attr('data-loaded', '1').data('loaded', 1);
    autoGrowTextareas($detail);
    setItemsBaseline($detail, normalized);
    updateRowDirtyUI($detail);
}

// --- Dirty tracking helpers ---
function normalizeItems(arr) {
    // keep only the fields that matter, normalize numbers
    return (arr || []).map(x => ({
        description: String(x.description || '').trim(),
        units: Number(x.units || 0),
        unit_price: Number(x.unit_price || 0),
        vat: Number(x.vat || 0),
        status: String(x.status || 'pending').toLowerCase(),
        remarks: String(x.remarks || '').trim(),
    }));
}

function getItemsFromDetail($detail) {
    const items = [];
    $detail.find('.ls-items-body > tr').each(function () {
        const $r = $(this);
        items.push({
            description: $r.find('.li-desc').val() || '',
            units: Number($r.find('.li-units').val() || 0),
            unit_price: Number($r.find('.li-unitprice').val() || 0),
            vat: Number($r.find('.li-vat').val() || 0),
            status: ($r.find('.li-status').val() || 'pending').toLowerCase(),
            remarks: $r.find('.li-remarks').val() || '',
        });
    });
    return normalizeItems(items);
}

function itemsEqual(a, b) {
    return JSON.stringify(normalizeItems(a)) === JSON.stringify(normalizeItems(b));
}

// show/hide the Save button based on diff vs baseline
function updateRowDirtyUI($detail) {
    const id = $detail.data('parent') || $detail.data('id');
    const $save = $(`#localSalesBody > tr[data-id="${id}"] .row-save`);

    const baselineStr = String($detail.data('baseline') || '[]'); // already normalized+stringified
    const currentStr = JSON.stringify(normalizeItems(getItemsFromDetail($detail)));

    $save.toggleClass('hidden', baselineStr === currentStr);
}

function refreshSerialVisibility($detail) {
    const $rows = $detail.find('.ls-items-body > tr');
    const single = $rows.length <= 1;
    $rows.find('.sn-text')[single ? 'addClass' : 'removeClass']('invisible');
}

function recalcItemTable($detail) {
    let sumUnits = 0, sumEx = 0, sumVat = 0, sumInc = 0;

    $detail.find('.ls-items-body > tr').each(function () {
        const $r = $(this);
        const u = Number($r.find('.li-units').val() || 0);
        const up = Number($r.find('.li-unitprice').val() || 0);
        const v = Number($r.find('.li-vat').val() || 0);
        const ex = u * up;
        const inc = ex + v;

        $r.find('.li-ex').text(ex.toFixed(2));
        $r.find('.li-inc').text(inc.toFixed(2));

        sumUnits += u; sumEx += ex; sumVat += v; sumInc += inc;
    });

    $detail.data('agg', {
        total_units: sumUnits,
        total_ex_vat: sumEx,
        vat_amount: sumVat,
        total_inc_vat: sumInc
    });

    const id = $detail.data('parent') || $detail.data('id');
    $(`#localSalesBody > tr[data-id="${id}"] .ls-total-cell`).text(fmtAED(sumInc));

    updateLocalTotalsCard();
}

function updateLocalTotalsCard() {
    let total = 0;
    $('#localSalesBody .ls-total-cell').each(function () {
        // parse "AED 1,234.56"
        const n = parseFloat($(this).text().replace(/[^\d.-]/g, '')) || 0;
        total += n;
    });
    $('#localTotalSales').text(fmtAED(total));
    const count = $('#localSalesBody > tr').not('.detail-row,.ls-empty').length;
    $('#localTotalCount').text(`${count} record${count === 1 ? '' : 's'}`);

    // NEW: persist for Summary
    try {
        window.localSalesTotal = total;                  // fast in-memory
        localStorage.setItem('localSalesTotal', String(total)); // survives refresh
    } catch { }
    $(document).trigger('localSales:updated');
}

// loader
function loadLocalSales() {
    const $body = $('#localSalesBody');
    if (!$body.length) return;
    $.get(investmentUrl('local-sales'))
        .done(res => renderLocalRows(res.data || []))
        .fail(() => $body.html(`<tr><td colspan="6" class="px-3 py-3 text-red-600">Failed to load.</td></tr>`));
}

// ---- Summary helpers ----

// --- Summary: Customer Loans renderer (safe fallback) ---
window.paintCustomerLoans = window.paintCustomerLoans || function (res) {
  // Accept either {data:[...]} or an array
  const rows = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
  const $host = $('#customerLoansTable, #summaryLoansBody'); // try a couple of common ids

  if (!$host.length) return; // nothing to paint into, just exit

  // basic table body paint; adapt columns if you have different markup
  const html = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.customer || r.name || '-'}</td>
      <td>${r.type || r.kind || '-'}</td>
      <td>${(Number(r.amount) || Number(r.outstanding) || 0)
              .toLocaleString(undefined,{minimumFractionDigits:2})}</td>
    </tr>`).join('');

  // if it's a <tbody>, just drop in; if it's a container, wrap
  if ($host.is('tbody')) $host.html(html);
  else $host.html(`<table class="min-w-full"><tbody>${html}</tbody></table>`);
};

// === Customer Loans (Summary) ===============================================
function loadCustomerLoansOnce() {
  const url = withCycle(investmentUrl('summary/customer-sheets/loans'));
  safeGetJSON(url, { key: 'cust-loans' })
    .then(window.paintCustomerLoans)    
    .catch(err => console.warn('[summary] loans failed', err?.status || err));
}

function startLoansPolling() {
  if (window.__custLoansTimer) return;
  loadCustomerLoansOnce();                 // initial fetch
  window.__custLoansTimer = setInterval(loadCustomerLoansOnce, 30000);
}

function stopLoansPolling() {
  if (!window.__custLoansTimer) return;
  clearInterval(window.__custLoansTimer);
  window.__custLoansTimer = null;
}



function hasRealTotals(x) {
    return !!x && (Number(x.material) > 0 || Number(x.shipping) > 0);
    // or: return Boolean(x) && (Number(x.material) > 0 || Number(x.shipping) > 0);
}

function setGtsTotalsToStorage(totals) {
    try { localStorage.setItem(gtsKey('totals'), JSON.stringify(totals || {})); } catch { }
}

// Fallback API for a hard refresh before user visits Local sheet
function fetchLocalSalesTotal() {
    return $.getJSON(api('summary/local-sales/total'), { _t: Date.now() })
        .then(res => {
            const tot = Number(res?.total) || 0;
            try { localStorage.setItem('localSalesTotal', String(tot)); } catch { }
            return tot;
        })
        .catch(() => {
            // fallback to cache on network error
            try {
                const v = localStorage.getItem(cycleKey('localSalesTotal'));
                return v != null ? (Number(v) || 0) : 0;
            } catch { return 0; }
        });
}

function renderSummaryFromGtsTotals(totals, tag = 'gtsTotals') {
    const material = Number(totals?.material) || 0;
    const shipping = Number(totals?.shipping) || 0;
    const investment = Number(totals?.investment) || 0;

    // Cash Out Summary cards (IDs in summary.blade.php)
    setKpiText('#totalPurchaseMaterial', material, tag);
    setKpiText('#totalShippingCost', shipping, tag);
    setKpiText('#totalInvestmentAmount-investment', investment, tag);

    // Top “Cash Out” KPI = material + shipping + investment
    const cashOut = material + shipping + investment;
    setKpiText('#cashOutAmount', cashOut, tag);

    // Profit KPI (if Cash-In already drawn)
    const cashIn = parseFloat(($('#cashInAmount').text() || '').replace(/[^\d.-]/g, '')) || 0;
    setKpiText('#profitAmount', (cashIn - cashOut), tag);
}

// Summary boot — single source of truth
$(function () {
    // Run only on Summary page
    if (!document.getElementById('summary-root')) return;

    // 1) Listen once for live totals coming from GTS Materials/Investments
    if (!window.__summaryTotalsHooked) {
        window.__summaryTotalsHooked = true;
        document.addEventListener('gts:totals-changed', (ev) => {
            const st = (ev && ev.detail) ? ev.detail : (window.sheetTotals || {});
            renderSummaryFromGtsTotals(st, 'gtsTotals');
        });
    }

    // 2) No cache seed → show placeholders while waiting for the server
    setSummaryPlaceholders();

    // 3) Immediately fetch authoritative numbers and repaint (prevents stale/wrong cash-out)
    if (typeof paintSummaryFromServer === 'function') {
        paintSummaryFromServer();
    }
});

// Bind the listener ONCE at file scope
(function bindGtsTotalsListenerOnce() {
  if (window.__gtsTotalsListenerBound) return;
  window.__gtsTotalsListenerBound = true;

  // normalize: default to false if not defined
  const isCycle = !!window.isCyclePage;

  // On cycle pages we don't repaint Summary from this listener
  if (isCycle) return;

  document.addEventListener('gts:totals-changed', (e) => {
    // If this is the Summary page and we haven't had a server paint yet, ignore
    if (!window._summaryFirstServerPainted) return;
    // re-check in case page state flips
    if (!!window.isCyclePage) return;

    // only when the Summary tab is active
    if (localStorage.getItem('activeSheet') === 'summary') {
      const detail = (e && e.detail) ? e.detail : (window.sheetTotals || {});
      if (typeof renderSummaryFromGtsTotals === 'function') {
        renderSummaryFromGtsTotals(detail); // same API you were using
      }
    }
  });
})();

let summaryChart = null;
let cachedCashOut = 0;

// Helpers (put once near your summary code)
function getNum(sel) {
    const el = document.querySelector(sel);
    if (!el) return 0;
    return parseFloat((el.textContent || '').replace(/[^\d.-]/g, '')) || 0;
}

function getLocalSalesAmount() {
    // Prefer the Local Sales total card if present
    const txt = ($('#localTotalSales').text() || '').trim();
    if (txt) return parseFloat(txt.replace(/[^\d.-]/g, '')) || 0;

    // Fallback: sum master-row totals in the Local Sales sheet (if rendered)
    let sum = 0;
    $('#localSalesBody .ls-total-cell').each(function () {
        sum += parseFloat($(this).text().replace(/[^\d.-]/g, '')) || 0;
    });
    return sum;
}

// ONE global instance
window.summaryChart = window.summaryChart || null;

// helper: are we on a small screen?
const isSmall = () => window.matchMedia('(max-width: 640px)').matches;

// apply responsive sizing to an existing chart
function applyChartSizing(chart) {
    const s = isSmall();
    const ds = chart.data.datasets[0];

    // bar geometry
    ds.categoryPercentage = s ? 0.6 : 0.8;
    ds.barPercentage = s ? 0.6 : 0.8;
    ds.barThickness = s ? undefined : 72; // unlock on small, cap on larger
    ds.maxBarThickness = s ? 56 : 110;

    // ticks/labels
    chart.options.scales.x.ticks.maxTicksLimit = s ? 3 : 6;
    chart.options.scales.x.ticks.font = { size: s ? 10 : 12 };
    chart.options.scales.y.ticks.font = { size: s ? 10 : 12 };

    // legend can be hidden on phones to save space
    chart.options.plugins.legend.display = !s;
}

function ensureSummaryChart() {
    const canvas = document.getElementById('summaryChart');
    if (!canvas || typeof Chart === 'undefined') return null;

    if (window.summaryChart && typeof window.summaryChart.update === 'function') {
        applyChartSizing(window.summaryChart);
        return window.summaryChart;
    }

    const ctx = canvas.getContext('2d');
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Cash In', 'Cash Out', 'Profit'],
            datasets: [{
                label: 'AED',
                data: [0, 0, 0], // start at baseline
                backgroundColor: ['#22c55e', '#ef4444', '#3b82f6'],
                hoverBackgroundColor: ['#16a34a', '#dc2626', '#2563eb'],
                borderColor: ['#16a34a', '#dc2626', '#2563eb'],
                borderWidth: 1,
                borderRadius: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // we control animations on update
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: (ctx) => 'AED ' + (ctx.parsed.y || 0)
                            .toLocaleString(undefined, { minimumFractionDigits: 2 })
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: {} },
                y: {
                    grid: { color: 'rgba(0,0,0,0.06)' },
                    ticks: {
                        callback: v => 'AED ' + Number(v).toLocaleString()
                    }
                }
            }
        }
    });
    
    // initial responsive sizing
    applyChartSizing(chart);

    // keep it crisp on resize/orientation change
    if (!window._summaryResizeBound) {
        window.addEventListener('resize', () => {
            if (!window.summaryChart) return;
            applyChartSizing(window.summaryChart);
            window.summaryChart.update('none');
        });
        window._summaryResizeBound = true;
    }

    window.summaryChart = chart;
    return chart;
}

function scheduleChartUpdate(cashIn, cashOut, profit, fromZeroOnce = false) {
    window._chartPendingTarget = [cashIn, cashOut, profit];

    // ignore early calls until we explicitly run the intro
    if (!window._chartIntroPlayed && !fromZeroOnce) return;

    clearTimeout(window._chartDebounce);
    window._chartDebounce = setTimeout(() => {
        const ch = ensureSummaryChart();
        if (!ch) return;

        const target = window._chartPendingTarget || [cashIn, cashOut, profit];

        // ---- ONE-TIME INTRO (bottom → top) ----
        if (fromZeroOnce && !window._chartIntroPlayed) {
            window._chartIntroPlayed = true;

            // IMPORTANT: animate bars from the baseline (y=0) pixel
            const fromBase = (ctx) => ctx.chart.scales.y.getPixelForValue(0);

            // don’t set data to zeros first (that causes extra flicker)
            ch.options.animation = { duration: 900, easing: 'easeOutCubic' };
            ch.options.animations = {
                y: { type: 'number', from: fromBase, duration: 900, easing: 'easeOutCubic' }, // top edge
                base: { type: 'number', from: fromBase, duration: 900, easing: 'easeOutCubic' }  // bottom edge
            };
            ch.data.datasets[0].data = target;
            ch.update();
            return;
        }

        // ---- NORMAL UPDATES (no flicker) ----
        ch.options.animation = { duration: 400, easing: 'easeOutCubic' };
        ch.options.animations = { y: { duration: 400, easing: 'easeOutCubic' }, base: { duration: 400, easing: 'easeOutCubic' } };
        ch.data.datasets[0].data = target;
        ch.update();
    }, 120);
}

function updateCashInBreakdown(data) {
    const breakdownTable = $('#cashInBreakdownTable');
    breakdownTable.empty();

    const sheets = ['rh', 'ff', 'bl', 'ws'];
    const labels = {
        rh: 'RH Sheet',
        ff: 'FF Sheet',
        bl: 'BL Sheet',
        ws: 'WS Sheet'
    };

    sheets.forEach(sheet => {
        const material = parseFloat(data[sheet + '_material']) || 0;
        const shipping = parseFloat(data[sheet + '_shipping']) || 0;
        const total = material + shipping;

        breakdownTable.append(`
            <tr>
                <td>${labels[sheet]}</td>
                <td>AED ${material.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td>AED ${shipping.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                <td><strong>AED ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
            </tr>
        `);
    });
}

// Helper: always fetch fresh total for a given key; cycle-aware
function fetchSheetTotalAlways(key) {
    const url = (typeof investmentUrl === 'function')
        ? investmentUrl(`summary/${key}/total`)
        : `/summary/${key}/total`;

    // Keep the same pattern: try fresh; fall back to 0 on error
    return $.getJSON(withCycle(url))
        .then(r => Number(r?.total) || 0)
        .catch(() => 0);
}

// Build an absolute URL to the investment endpoints.
// - If investmentUrl(path) exists, we use that (whatever it returns).
// - If it does NOT include '/investment/', we prefix it.
// - Always ensure it starts with a single leading slash.
function buildInvestmentUrl(path) {
  let out;

  if (typeof investmentUrl === 'function') {
    out = investmentUrl(path); // can return '/investment/summary/...', 'summary/...', etc.
  } else {
    out = path;
  }

  // ensure leading slash
  if (!out.startsWith('/')) out = '/' + out;

  // ensure it has '/investment/' once
  if (!out.startsWith('/investment/')) {
    out = '/investment' + out; // out already starts with '/...'
  }

  // collapse accidental '/investment/investment/...'
  out = out.replace(/\/investment\/(?:\/)?investment\//, '/investment/');

  return out;
}

function loadCashInBreakdown(opts = {}) {
  opts = opts || {};
  if (window._summaryLockedToCycle && !opts.force) return;
  if (!$('#sheet-summary').is(':visible')) return;

  const force = !!opts.force;

  const rowsP  = safeGetJSON((force ? withForceBust : withCycle)(window.INV_API.rows),  { force });
  const usP    = safeGetJSON((force ? withForceBust : withCycle)(window.INV_API.us),    { force });
  const sqP    = safeGetJSON((force ? withForceBust : withCycle)(window.INV_API.sq),    { force });
  const localP = safeGetJSON((force ? withForceBust : withCycle)(window.INV_API.local), { force });

  $.when(rowsP, usP, sqP, localP).done(function (rowsResp, usResp, sqResp, localResp) {
      // 1) raw payloads
      console.log('[CIB] raw rowsResp:', rowsResp);
      console.log('[CIB] raw us/sq/local:', { usResp, sqResp, localResp });
    
      // 2) normalize customer rows (handles tsc/sc/total_shipping)
      const rawRows = Array.isArray(rowsResp?.rows) ? rowsResp.rows
                    : (Array.isArray(rowsResp) ? rowsResp : []);
      const rows = rawRows.map(r => ({
        name:      r.name || r.sheet || r.sheet_name || '-',
        material:  Number(
                     r.material ??
                     r.total_material ?? r.material_total ?? r.m ?? 0
                   ),
        shipping:  Number(
                     r.shipping ?? r.tsc ?? r.total_shipping ??
                     r.sc ?? r.shipping_cost ?? 0
                   ),
      }));
      console.log('[CIB] normalized customer rows:', rows);
    
      // 3) other sources (material-only)
      const usAmt    = Number((usResp && (usResp.total ?? usResp.amount ?? usResp.material)) || 0);
      const sqAmt    = Number((sqResp && (sqResp.total ?? sqResp.amount ?? sqResp.material)) || 0);
      const localAmt = Number((localResp && (localResp.total ?? localResp.amount ?? localResp.material)) || 0);
    
      // 4) compute grand (material + shipping for customers)
      const cm = rows.reduce((a, r) => a + (Number(r.material) || 0), 0);
      const cs = rows.reduce((a, r) => a + (Number(r.shipping) || 0), 0);
      const grand = usAmt + sqAmt + localAmt + cm + cs;
    
      // 5) render
      const data = {
        us:    { name:'US Client Payment', material: usAmt },
        sq:    { name:'SQ Sheet',          material: sqAmt },
        local: { name:'Local Sales',       material: localAmt },
        customers: rows
      };
      renderCashInBreakdown(data, grand);
    }).fail(function (err) {
      console.error('[Summary] CashInBreakdown failed', err?.responseJSON || err);
      if (err && err.responseText) {
        try { console.log('server says:', JSON.parse(err.responseText)); }
        catch { console.log('server says (raw):', err.responseText); }
      }
      renderCashInBreakdown({ customers: [], us:{material:0}, sq:{material:0}, local:{material:0} }, 0);
    });
}

// US total fetch (always)
function fetchUsTotalAlways() {
    // 1st choice: dedicated endpoint
    const usUrl = (typeof investmentUrl === 'function')
        ? investmentUrl('summary/us/total')
        : '/summary/us/total';

    return $.getJSON(withCycle(usUrl))
        .then(r => Number(r?.total) || 0)
        .catch(() => {
            const bUrl = (typeof investmentUrl === 'function')
                ? investmentUrl('summary/cash-in-breakdown')
                : '/summary/cash-in-breakdown';

            return $.getJSON(withCycle(bUrl))
                .then(list => {
                      const arr = Array.isArray(list) ? list : [];
                      const r = arr.find(x => /US Client Payment/i.test((x && (x.sheet || x.name)) || '')) || {};
                      return Number((r.total != null ? r.total
                                : (r.material != null ? r.material
                                : (r.amount != null ? r.amount : 0)))) || 0;
                    })
                .catch(() => 0); // <— no cache fallback
        });
}

function updateProfitBreakdown(profit) {
    const charity = profit * 0.05;
    const remaining = profit - charity;
    const shareholder1 = remaining / 2;
    const shareholder2 = remaining / 2;

    $('#charityAmount').text('AED ' + charity.toLocaleString(undefined, { minimumFractionDigits: 2 }));
    $('#shareholder1Amount').text('AED ' + shareholder1.toLocaleString(undefined, { minimumFractionDigits: 2 }));
    $('#shareholder2Amount').text('AED ' + shareholder2.toLocaleString(undefined, { minimumFractionDigits: 2 }));
}

// ---- Shared Totals Cache + Broadcaster ----
window.sheetTotals = window.sheetTotals || { material: 0, shipping: 0, investment: 0 };

// One path only → let gts-totals.js decide whether to paint or ignore
window.updateMaterialTotals = function (material, shipping, opts = {}) {
    // If server already painted, ignore DOM recalcs unless explicitly allowed
    if (window.__materialsLockedToServer && !opts.allowAfterLock) return;

    const mat = Number(material) || 0;
    const ship = Number(shipping) || 0;

    if (typeof updateTotals === 'function') {
        // mark this as a DOM-origin update so server paints always win
        updateTotals({ material: mat, shipping: ship }, { origin: 'dom', reqId: opts.reqId });
    } else {
        // Fallback (shouldn’t be used): just touch Summary if not locked
        window.sheetTotals = { ...(window.sheetTotals || {}), material: mat, shipping: ship };
        if (typeof renderSummaryFromGtsTotals === 'function' && !window.__summaryLocked) {
            renderSummaryFromGtsTotals({ material: mat, shipping: ship, investment: Number(window.sheetTotals?.investment)||0 }, 'dom-fallback');
        }
    }
};

let summaryInited = false;

function initSummaryLogic() {
    if (window.isCyclePage) return; // skip legacy totals on cycle pages
    if (summaryInited) return;      // prevent multiple binds
    summaryInited = true;

    // Seed once from in-memory only (no localStorage), and only if not locked
    const mem = window.sheetTotals || {};
    if (!window.__summaryLocked && hasRealTotals(mem)) {
        renderSummaryFromGtsTotals(
            {
                material: Number(mem.material) || 0,
                shipping: Number(mem.shipping) || 0,
                investment: Number(mem.investment) || 0
            },
            'mem-seed'
        );
    }

    refreshSummaryFromServer('initial-fetch');

    $(document)
        .off('click.summaryTab')
        .on('click.summaryTab', '.sheet-tab[data-sheet="summary"], #summaryTab', () => {
            // Give this interaction its own req id
            window._gtsReqId = (window._gtsReqId || 0) + 1;
            const reqId = window._gtsReqId;

            // Read ONLY from in-memory snapshot (no storage)
            const gts = {
                material: Number(window.sheetTotals?.material) || 0,
                shipping: Number(window.sheetTotals?.shipping) || 0
            };

            // Do a quick paint with in-memory + live investment (only if not locked)
            fetchInvestmentTotal().then(investment => {
                if (window.__summaryLocked) return; // don’t overwrite authoritative numbers
                if (reqId < (window._gtsAppliedReqId || 0)) return; // respect newer paints

                window.sheetTotals = { ...window.sheetTotals, ...gts, investment };
                renderSummaryFromGtsTotals({ ...gts, investment }, 'tab-mem', reqId);
            });

            // kick a fresh server repaint (it will use its own reqId internally)
            refreshSummaryFromServer('tab-fresh');
        });

    $(document)
        .off('customerSheets:totalsUpdated.summary')      // kill old namespace if present
        .off('customerSheets:totalsUpdated.summaryInit')
        .on('customerSheets:totalsUpdated.summaryInit', (/*e*/) => {
            if (!$('#sheet-summary').is(':visible')) return;

            // debounce to avoid thrash
            clearTimeout(window.__summaryDomBridgeDebounce);
            window.__summaryDomBridgeDebounce = setTimeout(() => {
                const all = (typeof getAllCustomerSheetTotals === 'function')
                    ? getAllCustomerSheetTotals()
                    : { material: 0, shipping: 0 };

                const mat = Number(all.material) || 0;
                const ship = Number(all.shipping) || 0;
                var inv = (_lastGoodSummary && _lastGoodSummary.investment != null
                    ? Number(_lastGoodSummary.investment) || 0
                    : (window.sheetTotals && window.sheetTotals.investment != null
                        ? Number(window.sheetTotals.investment) || 0
                        : 0));

                // only repaint when we actually have numbers; otherwise keep last good
                if (mat > 0 || ship > 0 || inv > 0) {
                    renderSummaryFromGtsTotals({ material: mat, shipping: ship, investment: inv }, 'bridge:init');
                } else if (_lastGoodSummary) {
                    renderSummaryFromGtsTotals(_lastGoodSummary, 'bridge:init-skip-zero');
                }
            }, 80);
        });
        
    $(document).on('keydown.summaryRefreshKey', (e) => {
        const key = (e.key || '').toLowerCase();
        const isTyping = /input|textarea|select/.test((e.target.tagName || '').toLowerCase()) || e.target.isContentEditable;
        const hasModifier = e.ctrlKey || e.metaKey || e.altKey;
        if (key === 'r' && !isTyping && !hasModifier && $('#sheet-summary').is(':visible')) {
            $('#refreshSummaryBtn').trigger('click');
        }
    });

    // --- Summary: keep Cash Out Summary cards in sync with shared totals ---
    if (!window.__summaryTotalsHooked) {
        window.__summaryTotalsHooked = true;

        document.addEventListener('gts:totals-changed', (ev) => {
            // Always paint Summary when totals update (material/shipping/investment)
            if (ev && ev.detail) {
                renderSummaryFromGtsTotals({ tag: 'gtsTotals', ...ev.detail });
            }
        });
    }
    
}

function paintKpis({ cashIn, cashOut }) {
    if (!Number.isNaN(cashOut)) $('#cashOutAmount').text(fxAED(cashOut));
    if (!Number.isNaN(cashIn) && !Number.isNaN(cashOut)) {
        $('#profitAmount').text(fxAED(cashIn - cashOut));
    }
}
// Reuse gts-totals.js fetchers if present; otherwise call endpoints directly.
function fetchMaterialTotalsFast() {
  if (typeof window.fetchMaterialTotals === 'function') {
    return window.fetchMaterialTotals();
  }

  // Prefer api(); fall back to investmentUrl(); then to raw path.
  const url = (typeof window.api === 'function')
    ? window.api('gts-materials/total')
    : (typeof window.investmentUrl === 'function')
      ? window.investmentUrl('gts-materials/total')
      : 'gts-materials/total';

  return $.getJSON(url)
    .then(r => ({
      material: Number(r?.material ?? r?.total_material ?? 0) || 0,
      shipping: Number(r?.shipping ?? r?.total_shipping ?? 0) || 0,
    }))
    .catch(() => ({ material: 0, shipping: 0 }));
}

function fetchInvestmentTotalFast() {
  // Use api() if available; URL-join inside your api helper
  const url = (typeof window.api === 'function')
    ? window.api('gts-investments/total')
    : '/gts-investments/total';

  // Prefilter will add ?cycle_id= automatically; no need to wrap withCycle here
  return $.getJSON(url)
    .then(r => Number(r?.total ?? r?.investment ?? 0))
    .catch(() => 0);
}

function fetchCashInTotalFast() {
    // if you already paint Cash In elsewhere, just read it to avoid an extra request
    return Promise.resolve(parseAEDText($('#cashInAmount').text()));
}

async function paintSummaryFromServer() {
  const reqId = ++window.__summaryReqId;

  let ms, inv, cashIn;
  try {
    [ms, inv, cashIn] = await Promise.all([
      fetchMaterialTotalsFast(),   // -> { material, shipping }
      fetchInvestmentTotalFast(),  // -> number
      fetchCashInTotalFast()       // -> number
    ]);
  } catch (_e) {
    ms = { material: 0, shipping: 0 }; inv = 0; cashIn = 0;
  }

  // ignore stale
  if (reqId !== window.__summaryReqId) return;

  const material   = Number(ms?.material)   || 0;
  const shipping   = Number(ms?.shipping)   || 0;
  const investment = Number(inv)            || 0;

  // update the “Cash Out breakdown” cards (if available)
  if (typeof paintCashOutSummaryCards === 'function') {
    paintCashOutSummaryCards({ material, shipping, investment });
  }

  // Cash Out = Material + Shipping + Investment
  const cashOut = material + shipping + investment;

  // KPIs
  if (typeof paintKpis === 'function') {
    paintKpis({ cashIn: Number(cashIn) || 0, cashOut });
  }

  // Update chart (read back from KPI DOM to stay consistent with what’s painted)
  if (typeof scheduleChartUpdate === 'function') {
    const cashInText  = Number(($('#cashInAmount').text()  || '').replace(/[^\d.]/g, '')) || 0;
    const cashOutText = Number(($('#cashOutAmount').text() || '').replace(/[^\d.]/g, '')) || 0;
    const profit = cashInText - cashOutText;
    scheduleChartUpdate(cashInText, cashOutText, profit, /*force*/ true);
  }
  
  // we’ve now painted from the server once
  window._summaryFirstServerPainted = true;
}

async function loadSummaryOnce() {
  if (window.__summaryBooted) return;
  window.__summaryBooted = true;
  try {
    await paintSummaryFromServer();
  } catch (err) {
    console.error('[Summary] initial load failed:', err);
    // allow retry if first paint fails
    window.__summaryBooted = false;
  }
}

function onSummaryCycleChanged() {
    window.__summaryReqId++; // cancel inflight
    paintSummaryFromServer();
}

// Boot the Summary page (no zeros, no refresh button, single-flight)
$(function () {
  const onSummaryPage = $('#summary-root').length > 0;
  if (!onSummaryPage) return;

  // kill any legacy wiring and button
  $(document).off('click', '#refreshSummaryBtn');
  $('#refreshSummaryBtn').remove();

  // placeholders now, then one authoritative paint
  setSummaryPlaceholders();
  Promise.resolve(paintSummaryFromServer()).catch(console.error);

  // repaint when cycle changes (dispatched by your app)
  document.addEventListener('cycle:changed', onSummaryCycleChanged);
  // legacy alias some code paths still use
  document.addEventListener('set:changed', onSummaryCycleChanged);
});

// Normalize numeric
function _toNum(v){ const n = Number(String(v).replace(/,/g,'').trim()); return Number.isFinite(n) ? n : 0; }

// Fetch /summary-data → returns {ci, co, pf}
function fetchAuthoritativeSummary() {
  const url = (typeof investmentUrl === 'function')
    ? investmentUrl('summary-data')      // prefilter will add cycle_id
    : withCycle('/summary-data');        // direct add for safety

  window._summaryReqId = (window._summaryReqId || 0) + 1;
  const reqId = window._summaryReqId;

  return $.getJSON(url).then(res => {
    if (reqId < (window._gtsAppliedReqId || 0)) {
      return $.Deferred().reject('stale').promise();
    }
    const ci = _toNum(res?.cash_in);
    const co = _toNum(res?.cash_out);
    const pf = Number.isFinite(_toNum(res?.profit)) ? _toNum(res?.profit) : (ci - co);
    return { ci, co, pf, _reqId: reqId };
  });
}

// Authoritative refresh: paint KPIs from /summary-data, then (optionally) update GTS widgets
function refreshSummaryFromServer(reason = 'auto') {
    // optional loading placeholder (keep if you like)
    $('#cashInAmount, #cashOutAmount, #profitAmount').text('…');
    $('#summaryMaterial, #summaryShipping, #summaryInvestment, #summaryRemaining').text('…');

    // Fetch authoritative totals (this render will lock afterward)
    return fetchGtsTotalsForSummary(reason)
        .then(() => {
            // Build Cash-In table/KPI even when locked
            loadCashInBreakdown({ force: true });
        })
        .catch(err => console.error('[Summary] refresh failed', err));
}

function fetchInvestmentTotal() {
    return $.getJSON(api('gts-investments/total'))
        .then(res => Number(res?.total) || 0)
        .catch(() => 0);
}

// --- Authoritative totals for Summary (all from one endpoint) ---
function fetchGtsTotalsForSummary(reason = 'initial') {
    const reqId = ++window._summaryReqId;

    return $.getJSON(gtsTotalsUrl())
        .done(function (res) {
            if (reqId !== window._summaryReqId) return;

            const mat = Number(res?.material) || 0;
            const ship = Number(res?.shipping) || 0;
            const inv = Number(res?.investment) || 0;
            
            console.log('[Summary] GTS totals payload:', res, '→', { mat, ship, inv, reason });

            renderSummaryFromGtsTotals(
                { material: mat, shipping: ship, investment: inv },
                'gtsTotals',
                reqId,
                { allowZero: true }
            );
        })
        .fail(function (xhr) {
            console.error('[Summary] gtsTotals failed', xhr.status, xhr.responseText);
        });
}

function renderCashInBreakdown(data = {}, precomputedGrand = null) {
    
    if (isSummaryLocked()) {
        console.warn('[Summary] cash-in writer skipped (locked)');
        return;
    }
    
    window._ciLast = data;

    let grand = precomputedGrand;
    if (grand == null) {
        grand =
            (Number(data.us?.material) || 0) +
            (Number(data.sq?.material) || 0) +
            (Number(data.local?.material) || 0);
        if (Array.isArray(data.customers)) {
            data.customers.forEach(c => {
                grand += Number(c.material || 0) + Number(c.shipping || 0);
            });
        }
    }

    setKpiText('#cashInAmount', grand, 'renderCashInBreakdown');

    // compute cash-out from the three Cash-Out cards so we aren't
    // dependent on the KPI timing
    const mat = getNum('#totalPurchaseMaterial');
    const ship = getNum('#totalShippingCost');
    const inv  = getNum('#totalInvestmentAmount-investment');
    const cashOut = (mat + ship + inv) || 0;
    
    // immediately update the KPI + profit
    setKpiText('#cashOutAmount', cashOut, 'renderCashInBreakdown');
    const profit = grand - cashOut;
    setKpiText('#profitAmount', profit, 'renderCashInBreakdown');

    // Chart: run intro on first paint only
    scheduleChartUpdate(grand, cashOut, profit, !window._chartIntroPlayed);

    // Table
    renderCashInTable(data, grand);
}

// --- Debounced refresher (file-scope) ---
let _cashInRefreshTimer = null;
function requestCashInRefresh() {
    clearTimeout(_cashInRefreshTimer);
    _cashInRefreshTimer = setTimeout(() => {
        if ($('#sheet-summary').is(':visible')) loadCashInBreakdown();
    }, 120);
}

// --- Bind once ---
$(function () {
    $(document)
        .off('us:totalsUpdated.summary sq:totalsUpdated.summary customerSheets:totalsUpdated.summary localSales:updated.summary')
        .on('us:totalsUpdated.summary sq:totalsUpdated.summary customerSheets:totalsUpdated.summary localSales:updated.summary', requestCashInRefresh);
});

// Easing + count-up helper (no flicker, preserves AED format)
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function animateNumberTo($el, finalValue, { duration = 1000, fromValue = null } = {}) {
    const start = (fromValue == null) ? (parseFloat(($el.text() || '').replace(/[^\d.-]/g, '')) || 0) : fromValue;
    const end = Number(finalValue || 0);
    const delta = end - start;
    const t0 = performance.now();

    return new Promise(resolve => {
        function step(now) {
            const t = Math.min(1, (now - t0) / duration);
            const v = start + delta * easeOutCubic(t);
            $el.text(fmtAED(v));
            if (t < 1) requestAnimationFrame(step); else resolve();
        }
        requestAnimationFrame(step);
    });
}

function playKpiAnimationOnce() {
    if (isSummaryLocked()) {
        // We already have authoritative numbers; don't zero/animate over them
        return Promise.resolve();
    }
    
    // If you want “every click”, clear this before calling (see below)
    if (localStorage.getItem('summaryKpiPlayed') === '1') return Promise.resolve();

    const cashIn = getNum('#cashInAmount');
    const cashOut = getNum('#cashOutAmount');
    const profit = getNum('#profitAmount');

    $('#cashInAmount').text(fmtAED(0));
    $('#cashOutAmount').text(fmtAED(0));
    $('#profitAmount').text(fmtAED(0));

    return Promise.all([
        animateNumberTo($('#cashInAmount'), cashIn, { duration: 900, fromValue: 0 }),
        animateNumberTo($('#cashOutAmount'), cashOut, { duration: 900, fromValue: 0 }),
        animateNumberTo($('#profitAmount'), profit, { duration: 900, fromValue: 0 })
    ]).then(() => localStorage.setItem('summaryKpiPlayed', '1'));
}

function renderCashInTable(cashInSources, precomputedGrand = null) {
    const $body = $('#cashInTableBody').empty();

    const rows = [];
    let grand = 0;

    const pushRow = (name, material = 0, shipping = 0, hasShipping = true) => {
        const m = Number(material || 0);
        const s = hasShipping === false ? 0 : Number(shipping || 0);
        const total = m + s;
        grand += total;
        rows.push({ name, m, s: hasShipping === false ? 0 : s, total });
    };

    // Only user-created customer_sheets
    if (Array.isArray(cashInSources.customers)) {
        cashInSources.customers.forEach(c =>
            pushRow(c.name || 'Customer', c.material, c.shipping, c.hasShipping)
        );
    } else if (cashInSources.customer) {
        // single aggregated “Customer Sheets”
        const c = cashInSources.customer;
        pushRow(c.name || 'Customer Sheets', c.material, c.shipping, c.hasShipping);
    }

    // Keep these sources (no shipping)
  if (cashInSources.us)    pushRow(cashInSources.us.name    || 'US Client Payment', cashInSources.us.material, 0, false);
  if (cashInSources.sq)    pushRow(cashInSources.sq.name    || 'SQ Sheet',           cashInSources.sq.material, 0, false);
  if (cashInSources.local) pushRow(cashInSources.local.name || 'Local Sales',        cashInSources.local.material, 0, false);

    // Build rows
    rows.forEach(r => {
        $body.append(`
      <tr>
        <td class="px-4 py-3 text-gray-700">${r.name}</td>
        <td class="px-4 py-3 text-right">${fmtAED(r.m)}</td>
        <td class="px-4 py-3 text-right">${fmtAED(r.s)}</td>
        <td class="px-4 py-3 text-right font-semibold">${fmtAED(r.total)}</td>
      </tr>
    `);
    });

    // Grand total
    const gt = precomputedGrand != null ? precomputedGrand : grand;
    $('#cashInTableGrand').text(fmtAED(gt));
}

function fetchCustomerSheetsRows() {
  const rowsURL =
    (window.routes && window.routes.customerRows) ||
    (typeof investmentUrl === 'function'
      ? investmentUrl('summary/customer-sheets/rows')
      : '/summary/customer-sheets/rows');

  // add ?debug=1 so backend includes raw parts in payload
  const url = rowsURL + (rowsURL.includes('?') ? '&' : '?') + 'debug=1&_t=' + Date.now();

  return $.getJSON(url).then(
    (res) => {
      console.log('[CIB] rows URL:', url);
      console.log('[CIB] raw payload:', res);

      const arr = Array.isArray(res?.rows) ? res.rows : (Array.isArray(res) ? res : []);
      const rows = arr.map(r => ({
        name: r.name || r.sheet || '-',
        material: Number(r.material) || 0,
        shipping: Number(r.shipping) || 0,
      }));

      console.log('[CIB] normalized rows (first 5):', rows.slice(0, 5));

      const rh = rows.find(r => String(r.name).toUpperCase() === 'RH');
      if (rh) {
        console.log('[CIB] RH normalized → material:', rh.material, 'shipping:', rh.shipping, 'total:', rh.material + rh.shipping);
      } else {
        console.warn('[CIB] RH not present in normalized rows');
      }

      // if server sent debug.raw, show the components for RH
      if (res.debug && Array.isArray(res.debug.raw)) {
        const rhr = res.debug.raw.find(x => String(x.name).toUpperCase() === 'RH');
        if (rhr) {
          console.log('[CIB] RH parts from server:', {
            name: rhr.name,
            ship_total_shipping_cost_raw: Number(rhr.ship_total_shipping_cost_raw),
            ship_shipping_cost_raw: Number(rhr.ship_shipping_cost_raw),
            ship_dgd_raw: Number(rhr.ship_dgd_raw),
            ship_labour_raw: Number(rhr.ship_labour_raw),
            shipping_raw: Number(rhr.shipping_raw),
            material_raw: Number(rhr.material_raw),
          });
        }
      }

      return { rows };
    },
    (xhr) => {
      console.error('rows fetch failed:', xhr.status, xhr.responseText);
      return { rows: [] };
    }
  );
}

function ensureKpiStickyBackdrop() {
    if (window.__kpiStickyBound) return;         // bind once
    const row = document.getElementById('kpiSticky');
    if (!row) return;                             // summary not mounted yet

    window.__kpiStickyBound = true;

    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    row.parentNode.insertBefore(sentinel, row);

    const io = new IntersectionObserver(([entry]) => {
        const stuck = entry.intersectionRatio === 0;
        row.classList.toggle('is-stuck', stuck);
    }, { threshold: [0, 1] });

    io.observe(sentinel);
}

function renderLoanOutstanding(rows) {
    const numAE = window.gtsFmt?.numAE || (n =>
        (Number(n) || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    const aed = window.gtsFmt?.aed || (n => 'AED ' + numAE(n));

    const $sec = $('#loanOutstandingSection');
    const $body = $('#loanOutstandingBody').empty();
    $sec.removeClass('hidden');

    if (!Array.isArray(rows)) rows = [];

    // sort purely by name or by magnitude if you like; here keep by name
    rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));

    if (rows.length === 0) {
        $body.append(`<tr><td colspan="2" class="px-4 py-3 text-gray-600">No customer sheets found.</td></tr>`);
        $('#loanOutstandingGrand').text(aed(0));
        return;
    }

    // signed grand total (no filtering): e.g. -75809.50 + 1000 = -74809.50
    let grand = 0;

    rows.forEach(r => {
        const rem = Number(r.remaining || 0);
        grand += rem;

        // no color classes on rows now
        $body.append(`
      <tr>
        <td class="px-4 py-3 text-gray-700">${r.name}</td>
        <td class="px-4 py-3 text-right">${numAE(rem)}</td>
      </tr>
    `);
    });

    // footer remains blue via your blade class; just set the value:
    $('#loanOutstandingGrand').text(aed(grand));
}

// Read remaining balances already rendered in each customer sheet section
function collectLoanOutstandingFromDOM() {
    const rows = [];

    $('.sheet-section').each(function () {
        const $sec = $(this);

        // 1) Prefer explicit data attribute
        let name = ($sec.data('sheetName') || $sec.data('sheet-name') || '').toString().trim();

        // 2) Infer from id="sheet-customer-XXXX"
        if (!name) {
            const id = $sec.attr('id') || '';
            const m = id.match(/^sheet-customer-([a-z0-9_-]+)$/i);
            if (m) name = m[1].toUpperCase();
        }

        // 3) As LAST resort, only use a heading if it starts with "Customer Sheet:"
        if (!name) {
            const h = ($sec.find('h2').first().text() || '').trim();
            const m2 = h.match(/^Customer Sheet:\s*(.+)$/i);
            if (m2) name = m2[1].trim();
        }

        if (!name) name = 'UNKNOWN';

        // Read remaining balance value from the section
        const $rem = $sec.find('[id^="remainingBalance-"]').first();
        if (!$rem.length) return;

        const rem = parseFloat(($rem.text() || '').replace(/[^\d.-]/g, '')) || 0;
        if (rem > 0) rows.push({ name, remaining: rem });
    });

    rows.sort((a, b) => b.remaining - a.remaining);
    return rows;
}

function fetchLoanOutstandingRows() {
    const url = (window.routes && window.routes.loanOutstanding)
        || investmentUrl('summary/customer-sheets/loans'); // fallback
    return $.ajax({
        url,
        data: { _t: Date.now() },
        dataType: 'json',
        cache: false
    }).fail((xhr) => {
        console.error('loan rows fetch failed:', xhr.status, xhr.responseText);
    });
}

// one tiny helper, once
function _computeLoansGrand(rows) {
  // grand = sum of dues only (positive absolute of negatives)
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((s, r) => {
    const rem = Number(r?.remaining) || 0;   // signed (e.g. RH = -75809.50)
    return s + (rem < 0 ? Math.abs(rem) : 0);
  }, 0);
}

function refreshLoanOutstandingHybrid() {
  // allow running on cycle pages; the endpoint is cycle-scoped via withCycle()

  const startedAt = Date.now();
  console.log('[Summary] loans: refresh start…');

  // keep your existing fetcher if you like; otherwise hit the endpoint directly
  const jq = (typeof fetchLoanOutstandingRows === 'function')
    ? fetchLoanOutstandingRows()
    : $.getJSON(withCycle(
        typeof investmentUrl === 'function'
          ? investmentUrl('summary/customer-sheets/loans')
          : '/summary/customer-sheets/loans'
      ));

  return jq
    .done(res => {
      const apiRows = Array.isArray(res?.rows) ? res.rows : [];
      const apiGrand = Number(res?.grand) || _computeLoansGrand(apiRows);

      console.log('[Summary] Outstanding loans (API):', apiRows, 'grand:', apiGrand);

      if (apiRows.length) {
        renderLoanOutstanding(apiRows);
        $('#loanOutstandingGrand').text(fmtAED(apiGrand));
      } else {
        // empty payload → fall back to DOM snapshot
        const domRows = collectLoanOutstandingFromDOM() || [];
        const domGrand = _computeLoansGrand(domRows);
        console.warn('[Summary] loans: API returned 0 rows; using DOM snapshot. grand:', domGrand);
        renderLoanOutstanding(domRows);
        $('#loanOutstandingGrand').text(fmtAED(domGrand));
      }

      console.log('[Summary] loans: refresh ok in', Date.now() - startedAt, 'ms');
    })
    .fail(xhr => {
      const code = xhr?.status;
      console.error('[Summary] loans: API failed', code, xhr?.responseText);

      // fallback to current table state
      const domRows = collectLoanOutstandingFromDOM() || [];
      const domGrand = _computeLoansGrand(domRows);
      renderLoanOutstanding(domRows);
      $('#loanOutstandingGrand').text(fmtAED(domGrand));

      // Optional gentle backoff for rate/loop errors
      if (code === 429 || code === 508) {
        setTimeout(() => console.warn('[Summary] loans: backoff complete after API error', code), 1500);
      }
    });
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

function unhideAncestors($el) {
    $el.parents().each(function () {
        const $p = $(this);
        if ($p.css('display') === 'none') $p.css('display', 'block');
        $p.removeClass('hidden');
    });
}

// Beneficiary Sheet Logic

if (typeof window.benInited === 'undefined') window.benInited = false;
if (typeof window.benFirstPaintDone === 'undefined') window.benFirstPaintDone = false;
let __benAttachEntryId = null;

function initBenLogic() {
    if (window.benInited) return;
    // Guard: sheet HTML not mounted yet? bail and try again later.
    // (You can check the wrapper or a specific form. Wrapper is more robust.)
    if (!document.getElementById('sheet-beneficiary')) return;
    // or: if (!document.getElementById('benFormSH1')) return;

    window.benInited = true;

    // Submit handlers (delegated so it works if DOM is re-rendered)
    $(document)
        .off('submit.ben', '#benFormSH1')
        .on('submit.ben', '#benFormSH1', function (e) {
            e.preventDefault();
            submitBenForm($(this));
        });

    $(document)
        .off('submit.ben', '#benFormSH2')
        .on('submit.ben', '#benFormSH2', function (e) {
            e.preventDefault();
            submitBenForm($(this));
        });

    // If other sheets fire total updates, refresh profit when this tab is visible
    $(document)
        .off('us:totalsUpdated.ben sq:totalsUpdated.ben localSales:updated.ben customerSheets:totalsUpdated.ben')
        .on('us:totalsUpdated.ben sq:totalsUpdated.ben localSales:updated.ben customerSheets:totalsUpdated.ben', function () {
            if ($('#sheet-beneficiary').is(':visible')) computeAndRenderProfit();
        });

    // Edit / Save / Cancel
    $(document)
        .off('click.ben', '.ben-edit')
        .on('click.ben', '.ben-edit', function () {
            enterBenEdit($(this).closest('tr'));
        });

    $(document)
        .off('click.ben', '.ben-cancel')
        .on('click.ben', '.ben-cancel', function () {
            cancelBenEdit($(this).closest('tr'));
        });

    $(document)
        .off('click.ben', '.ben-save')
        .on('click.ben', '.ben-save', function () {
            saveBenEdit($(this).closest('tr'));
        });

    // Delete → open modal (no alerts)
    $(document)
        .off('click.ben', '.ben-del')
        .on('click.ben', '.ben-del', function () {
            openBenDeleteModal($(this).closest('tr'));
        });

    // Modal buttons
    $(document)
        .off('click.ben', '#benDelCancel, #benDelClose')
        .on('click.ben', '#benDelCancel, #benDelClose', closeBenDeleteModal);

    $(document)
        .off('click.ben', '#benDelConfirm')
        .on('click.ben', '#benDelConfirm', function () {
            if (!benDeleteId) return;
            deleteBenRow(benDeleteId).always(closeBenDeleteModal);
        });

    $(document)
        .off('input.benAutosize', '.ben-autosize-num')
        .on('input.benAutosize', '.ben-autosize-num', function () {
            benAutosizeNumber(this);
        });

    // Recompute charity KPI when other totals change (if visible)
    $(document)
        .off('us:totalsUpdated.ben2 sq:totalsUpdated.ben2 localSales:updated.ben2 customerSheets:totalsUpdated.ben2')
        .on('us:totalsUpdated.ben2 sq:totalsUpdated.ben2 localSales:updated.ben2 customerSheets:totalsUpdated.ben2', function () {
            if ($('#sheet-beneficiary').is(':visible')) computeAndRenderProfit();
        });

    // First paint: wait for BOTH data + KPIs, then render once
    $.when(loadBeneficiaries(), computeAndRenderProfit()).done(function () {
        benRenderAllocTable();      // single, clean initial render (no zero flicker)
        renderBenPieChart();
        benFirstPaintDone = true;   // subsequent updates re-render on their own
    });
    $(document)
        .off('cycle:changed.benPie')
        .on('cycle:changed.benPie', function () {
            destroyBenPie();
            $('#benPieWrap').empty();
            $.when(loadBeneficiaries(), computeAndRenderProfit())
                .done(renderBenPieChart);
        });
    $(document)
        .off('click.benPieTab')
        .on('click.benPieTab', '.sheet-tab[data-sheet="beneficiary"]', function () {
            $.when(loadBeneficiaries(), computeAndRenderProfit()).done(renderBenPieChart);
        });
        
    $(document)
        .off('click.ben', '.ben-edit, .ben-save, .ben-cancel, .ben-del')
        .on('click.ben', '.ben-edit, .ben-save, .ben-cancel, .ben-del', function (e) {
            if (benIsClosed()) { e.preventDefault(); e.stopImmediatePropagation(); return; }
        });

    // open modal from action button
    $(document)
        .off('click.benAttach', '.ben-attach')
        .on('click.benAttach', '.ben-attach', function () {
            const id = $(this).closest('tr').data('id');
            if (!id) return;
            openBenAttachModal(id);
        });

    // close modal
    $(document)
        .off('click.benAttachClose', '#benAttachClose')
        .on('click.benAttachClose', '#benAttachClose', closeBenAttachModal);

    // ----- Upload handler (prevent empty) -----
    $(document)
        .off('submit.benAttach', '#benAttachForm')
        .on('submit.benAttach', '#benAttachForm', function (e) {
            e.preventDefault();
            if (!__benAttachEntryId) return;

            const files = $('#benAttFiles')[0]?.files;
            if (!files || !files.length) return;  // no-op if nothing chosen

            const { store } = benAttachApi(__benAttachEntryId);
            
            const fd = new FormData(this);

            // ensure files[] appended explicitly (keeps names)
            fd.delete('files[]');
            [...files].forEach(f => fd.append('files[]', f));

            $.ajax({
                url: store,
                method: 'POST',
                data: fd,
                processData: false,
                contentType: false,
                headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
            }).done(() => {
                $('#benAttFiles').val('');
                $('#benAttChosen').text('No file chosen');
                benFetchAttachments(__benAttachEntryId);
            }).fail(xhr => {
                alert(xhr?.responseJSON?.message || 'Upload failed.');
            });
        });

    // ----- Delete using your API helper -----
    $(document)
    .off('click.benAttachDel', '.ben-att-del')
    .on('click.benAttachDel', '.ben-att-del', function () {
        const id = $(this).data('id');
        if (!id) return;
        const { del } = benAttachApi(__benAttachEntryId || 0);
        $.ajax({
        url: del(id),    
        method: 'DELETE',
        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
        }).done(() => {
        if (__benAttachEntryId) benFetchAttachments(__benAttachEntryId);
        }).fail(() => alert('Failed to delete attachment.'));
    });

    $(document)
        .off('click.benAttBrowse', '#benAttBrowse')
        .on('click.benAttBrowse', '#benAttBrowse', () => $('#benAttFiles').trigger('click'));

    $(document)
        .off('change.benAttFiles', '#benAttFiles')
        .on('change.benAttFiles', '#benAttFiles', function () {
            const names = [...(this.files || [])].map(f => f.name);
            $('#benAttChosen').text(names.length ? names.join(', ') : 'No file chosen');
        });

    // backdrop click + ESC to close (optional but nice)
    $(document)
        .off('click.benAttachBackdrop')
        .on('click.benAttachBackdrop', '#benAttachModal > .absolute.inset-0', closeBenAttachModal);

    $(document)
        .off('keydown.benAttachEsc')
        .on('keydown.benAttachEsc', e => { if ($('#benAttachModal').is(':visible') && e.key === 'Escape') closeBenAttachModal(); });
}

function benIsClosed() {
    return (typeof window.isSetClosed === 'function' && window.isSetClosed()) ||
        !!window.__SET_IS_CLOSED ||
        (window.cycle && window.cycle.status === 'closed') ||
        document.documentElement.classList.contains('is-cycle-closed');
}

// ---------- small helpers ----------
const benFmtAED = n => 'AED ' + (Number(n) || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const benEsc = s => String(s ?? '').replace(/</g, '&lt;');
const pickNum = v => { const n = parseFloat(String(v || '').replace(/[^\d.-]/g, '')); return isNaN(n) ? 0 : n; };

const BEN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const BEN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function benDate(dStr) {
    if (!dStr) return '';
    const d = new Date(dStr);
    if (isNaN(d)) return dStr;
    const wk = BEN_WEEKDAYS[d.getDay()];
    const dd = String(d.getDate()).padStart(2, '0');
    const mon = BEN_MONTHS[d.getMonth()];
    return `${wk} ${dd} ${mon} ${d.getFullYear()}`;
}

// ---------- renderers ----------
function renderBenTable($tbody, rows) {
    $tbody.empty();
    
    const isClosed =
        (typeof window.isSetClosed === 'function' && window.isSetClosed()) ||
        !!window.__SET_IS_CLOSED ||
        (window.cycle && window.cycle.status === 'closed') ||
        document.documentElement.classList.contains('is-cycle-closed');
        
    if (!rows || rows.length === 0) {
        $tbody.append(`<tr><td colspan="7" class="px-4 py-4 text-center text-gray-500">No entries yet.</td></tr>`);
        return;
    }
    rows.forEach((r, i) => {
        const iso = r.date || ''; // keep raw ISO for editing
        
        const actionCell = !isClosed ? `
            <td class="px-4 py-3 text-center action-col" data-col="action">
                <div class="flex items-center justify-center gap-2">
                <button class="ben-attach p-1 rounded text-indigo-600 hover:bg-gray-100" title="Attachments"><i class="bi bi-paperclip"></i></button>
                <button class="ben-edit p-1 rounded text-green-600 hover:bg-gray-100" title="Edit"><i class="bi bi-pencil-square"></i></button>
                <button class="ben-save p-1 rounded bg-green-600 hover:bg-green-700 text-white hidden" title="Save"><i class="bi bi-check2"></i></button>
                <button class="ben-cancel p-1 rounded bg-gray-600 hover:bg-gray-700 text-white hidden" title="Cancel"><i class="bi bi-x-lg"></i></button>
                <button class="ben-del p-1 rounded hover:bg-red-50 text-red-600" title="Delete"><i class="bi bi-trash"></i></button>
                </div>
            </td>` : '';
            
        $tbody.append(`
          <tr data-id="${r.id}" data-raw-date="${iso}" data-type="${(r.type || '').toLowerCase()}" data-charity="${r.charity || 0}">
            <td class="px-4 py-3">${i + 1}</td>
            <td class="px-4 py-3 ben-cell-date">${benEsc(benDate(iso))}</td>
            <td class="px-4 py-3 ben-cell-type">${benTypeBadge(r.type)}</td>
            <td class="px-4 py-3 text-right ben-cell-amount">${benFmtAED(Number(r.amount || 0))}</td>
            <td class="px-4 py-3 text-right ben-cell-charity">${benFmtAED(Number(r.charity || 0))}</td>
            <td class="px-4 py-3 ben-cell-remark">${benEsc(r.remarks || '')}</td>
            ${actionCell}
          </tr>
        `);
    });
}

// ---------- data loads (beneficiaries) ----------
function loadBeneficiaries() {
    return $.getJSON(api('beneficiaries/data'), { _t: Date.now() }).done(data => {
        window._benData = data; // <-- cache current set rows
        
        renderBenTable($('#benBodySH1'), data?.shareholder1?.rows || []);
        renderBenTable($('#benBodySH2'), data?.shareholder2?.rows || []);

        // Entries totals (sum of Amount column for each shareholder)
        const sh1EntriesTotal =
            (data && data.shareholder1 && typeof data.shareholder1.total === 'number')
                ? data.shareholder1.total
                : (data?.shareholder1?.rows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);

        const sh2EntriesTotal =
            (data && data.shareholder2 && typeof data.shareholder2.total === 'number')
                ? data.shareholder2.total
                : (data?.shareholder2?.rows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);

        $('#benSH1EntriesTotal').text(benFmtAED(sh1EntriesTotal));
        $('#benSH2EntriesTotal').text(benFmtAED(sh2EntriesTotal));

        const sh1CharityTotal =
            (data?.shareholder1?.rows || []).reduce((s, r) => s + (Number(r.charity) || 0), 0);
        const sh2CharityTotal =
            (data?.shareholder2?.rows || []).reduce((s, r) => s + (Number(r.charity) || 0), 0);

        $('#benSH1CharityTotal').text(benFmtAED(sh1CharityTotal));
        $('#benSH2CharityTotal').text(benFmtAED(sh2CharityTotal));

        $(document).trigger('beneficiaries:updated');
        if (benFirstPaintDone) benRenderAllocTable(); // render later updates only
    });
}

function submitBenForm($form) {
    const fd = $form.serialize();
    return $.ajax({
        url: api('beneficiaries'),
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') },
        data: fd
    }).done(() => {
        $form[0].reset();
        loadBeneficiaries();
        computeAndRenderProfit(); // optional: profit might depend on payouts, keep fresh
    }).fail(xhr => {
        alert(xhr?.responseJSON?.message || 'Failed to add entry');
    });
}

let benDeleteId = null;

function openBenDeleteModal($tr) {
    benDeleteId = $tr.data('id');
    $('#benDelDate').text($tr.find('.ben-cell-date').text().trim());
    $('#benDelAmount').text($tr.find('.ben-cell-amount').text().trim());
    $('#benDelRemark').text($tr.find('.ben-cell-remark').text().trim());
    $('#benDeleteModal').removeClass('hidden').addClass('flex');
}

function closeBenDeleteModal() {
    benDeleteId = null;
    $('#benDeleteModal').addClass('hidden').removeClass('flex');
}

function deleteBenRow(id) {
    return $.ajax({
        url: api('beneficiaries/' + id),
        method: 'DELETE',
        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
    }).done(() => {
        loadBeneficiaries();
        computeAndRenderProfit();
    }).fail(() => alert('Failed to delete entry.'));
}

function enterBenEdit($tr) {
    if ($tr.data('editing')) return;
    $tr.data('editing', 1);

    const rawDate = $tr.data('rawDate'); // jQuery maps data-raw-date -> rawDate
    const amount = pickNum($tr.find('.ben-cell-amount').text());
    const charity = Number($tr.data('charity') || 0);
    const remarks = $tr.find('.ben-cell-remark').text().trim();
    const type = ($tr.data('type') || '').toLowerCase();

    $tr.find('.ben-cell-date').html(
        `<input type="date" class="ben-edit-date w-auto border rounded-xl px-3 py-2
                              focus:border-blue-500 focus:ring-2 focus:ring-blue-200" style="min-width:16ch" value="${rawDate || ''}">`
    );

    // modern dropdown in edit cell
    $tr.find('.ben-cell-type').html(benTypeFieldHtml(type, 'ben-edit-type'));
    hydrateBenSelect($tr);  // set label & highlight

    // amount — auto width based on value length
    const amountStr = Number.isFinite(amount) ? amount.toFixed(2) : String(amount || 0);
    const amountCh = Math.max(18, amountStr.length + 4);
    $tr.find('.ben-cell-amount').html(
        `<input type="number" step="0.01" inputmode="decimal"
            class="ben-edit-amount ben-autosize-num w-autol border rounded-xl px-3 py-2 text-right
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-200" style="width:${amountCh}ch" value="${amountStr}">`
    );

    // charity — auto width based on value length
    const charityStr = Number.isFinite(charity) ? charity.toFixed(2) : String(charity || 0);
    const charityCh = Math.max(16, charityStr.length + 4);
    $tr.find('.ben-cell-charity').html(
        `<input type="number" step="0.01" inputmode="decimal"
        class="ben-edit-charity ben-autosize-num w-auto border rounded-xl px-3 py-2 text-right
                focus:border-blue-500 focus:ring-2 focus:ring-blue-200" style="width:${charityCh}ch" value="${charityStr}">`
    );

    $tr.find('.ben-cell-remark').html(
        `<input type="text"
            class="ben-edit-remarks w-full border rounded-xl px-3 py-2
                   focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            value="${benEsc(remarks).replace(/"/g, '&quot;')}">`
    );

    $tr.find('.ben-edit, .ben-del').addClass('hidden');
    $tr.find('.ben-save, .ben-cancel').removeClass('hidden');
}

// autosize number inputs as user types
function benAutosizeNumber(el) {
  const base = parseInt(el.getAttribute('data-basech') || '16', 10);
  const v = (el.value || '').toString();
  const ch = Math.max(base, v.length + 4);   // a bit of padding
  el.style.width = ch + 'ch';
}

function cancelBenEdit($tr) {
    // simplest: reload the list to restore view state
    $tr.data('editing', 0);
    loadBeneficiaries();
}

function saveBenEdit($tr) {
    const id = $tr.data('id');
    const payload = {
        date: ($tr.find('.ben-edit-date').val() || '').trim(),
        type: ($tr.find('.ben-edit-type input[name="type"]').val() || 'cash'),
        amount: Number($tr.find('.ben-edit-amount').val() || 0),
        charity: Number($tr.find('.ben-edit-charity').val() || 0),
        remarks: ($tr.find('.ben-edit-remarks').val() || '').trim(),
    };

    return $.ajax({
        url: api('beneficiaries/' + id),
        method: 'PUT',
        data: payload,
        headers: { 'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') }
    }).done(() => {
        $tr.data('editing', 0);
        loadBeneficiaries();
        computeAndRenderProfit();
    }).fail(xhr => {
        // keep inline; no alert requested — you can show a subtle error if you want
        console.error('Update failed', xhr?.responseJSON || xhr);
    });
}

// ---- getters
function getLocalSalesCached() { return null; }
function getSqCached() { return null; }
function getUsCached() { return null; }

function fetchCashOutTotals() {
    // summary-data returns total_purchase_of_material + total_shipping_cost
    return $.getJSON(api('summary-data')).then(d => ({
        material: Number(d?.total_purchase_of_material || 0),
        shipping: Number(d?.total_shipping_cost || 0)
    })).catch(() => ({ material: 0, shipping: 0 }));
}

function fetchCustomerSheetsTotals() {
  return $.getJSON(api('summary/customer-sheets/totals'), { _t: Date.now() })
    .then(d => ({
      material: Number(d?.material || 0),
      shipping: Number(d?.shipping || 0)
    }))
    .catch(() => ({ material: 0, shipping: 0 }));
}

function fetchUsTotal() {
    // Try the slim endpoint first; fallback to /us-client/data (which includes totalAmount)
    return $.getJSON(api('summary/us/total'))
        .then(r => {
            const t = Number(r?.total) || 0;
            try { localStorage.setItem(cycleKey('usTotal'), String(t)); } catch { }
            return t;
        })
        .catch(() =>
            $.getJSON(api('us-client/data'))
                .then(d => {
                    const t = Number(d?.totalAmount) || 0;
                    try { localStorage.setItem(cycleKey('usTotal'), String(t)); } catch { }
                    return t;
                })
                .catch(() => {
                    try {
                        const raw = localStorage.getItem(cycleKey('usTotal'));
                        return raw != null ? Number(raw) || 0 : 0;
                    } catch { return 0; }
                })
        );
}

// Parse "AED 1,234.56" or "1,234.56" to Number
function _parseMoneyFromText(sel) {
    const txt = $(sel).first().text() || '';
    const n = Number(txt.replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
}

// Prefer DOM values from the Summary KPIs (which you already painted correctly).
// Fallback to /summary-data (cycle-aware) if DOM isn't available yet.
function fetchSummaryProfitOnly() {
    // Prefer DOM if Summary KPIs are present (same page session)
    const domCI = _parseMoneyFromText('#cashInAmount');
    const domCO = _parseMoneyFromText('#cashOutAmount');
    const domP = _parseMoneyFromText('#profitAmount');
    if (domP !== null && domCI !== null && domCO !== null) {
        return $.Deferred().resolve({ profit: domP, cash_in: domCI, cash_out: domCO }).promise();
    }

    // Otherwise wait until cycle is ready, then hit the API
    const url = (typeof investmentUrl === 'function') ? investmentUrl('summary-data') : '/summary-data';
    return whenCycleReady().then(() =>
        $.getJSON(api(url))
            .then(res => {
                const ci = Number(res?.cash_in) || 0;
                const co = Number(res?.cash_out) || 0;
                let p = Number(res?.profit);
                if (!Number.isFinite(p)) p = ci - co;
                // Optional legacy guard:
                // if (ci === 0) p = 0;
                return { profit: p, cash_in: ci, cash_out: co };
            })
            .catch(() => ({ profit: 0, cash_in: 0, cash_out: 0 }))
    );
}

function unwrap(arg) { return Array.isArray(arg) ? arg[0] : arg; }

function computeAndRenderProfit() {
    return whenCycleReady().then(() =>
        fetchSummaryProfitOnly().then(({ profit }) => {
            $('#benTotalProfit').text(benFmtAED(profit));

            const charityValue = Math.max(0, profit * 0.05);
            $('#benCharityKpi').text(benFmtAED(charityValue));

            const eachShare = Math.max(0, (profit - charityValue) / 2);
            $('#benSH1Balance, #benSH1InlineBalance').text(benFmtAED(eachShare));
            $('#benSH2Balance, #benSH2InlineBalance').text(benFmtAED(eachShare));

            window.__benComputedKpis = { sh1: eachShare, sh2: eachShare, charity: charityValue };
            renderBenPieChart();
        })
    );
}

// === Allocation model (percent only; allocated comes from KPIs) ===
const BEN_ALLOC = {
    sh1: { label: 'Shareholder 1', percent: 47.5 },
    sh2: { label: 'Shareholder 2', percent: 47.5 },
    charity: { label: 'Charity', percent: 5 },
};

// Row color classes (file scope)
const BEN_ROW_CLASSES = {
    sh1: 'bg-amber-50 hover:bg-amber-100/60',
    sh2: 'bg-violet-50 hover:bg-violet-100/60',
    charity: 'bg-emerald-50 hover:bg-emerald-100/60',
};

function benRenderAllocTable() {
    const $body = $('#benAllocBody');
    if (!$body.length) return;
    $body.empty();

    const parseAED = (t) => parseFloat(String(t || '').replace(/[^\d.-]/g, '')) || 0;
    const txt = (sel) => ($(sel).length ? $(sel).text() : '');
    const fmt = benFmtAED;

    // Allocated (from KPI cards)
    const sh1Allocated = parseAED(txt('#benSH1Balance'));
    const sh2Allocated = parseAED(txt('#benSH2Balance'));
    const charityAllocated = parseAED(txt('#benCharityKpi')); // full 5%

    // Withdrawn (derived from tables)
    const sh1Withdrawn = parseAED(txt('#benSH1EntriesTotal'));
    const sh2Withdrawn = parseAED(txt('#benSH2EntriesTotal'));

    // Charity withdrawn = SH1 charity total + SH2 charity total
    let ch1 = parseAED(txt('#benSH1CharityTotal'));
    if (!ch1) {
        ch1 = 0;
        $('#benBodySH1 .ben-cell-charity').each(function () { ch1 += parseAED($(this).text()); });
    }
    let ch2 = parseAED(txt('#benSH2CharityTotal'));
    if (!ch2) {
        ch2 = 0;
        $('#benBodySH2 .ben-cell-charity').each(function () { ch2 += parseAED($(this).text()); });
    }
    const charityWithdrawn = ch1 + ch2;

    const rowCls = (k) => BEN_ROW_CLASSES[k] || '';
    const mkRow = (label, percent, allocated, withdrawn, cls = '') => {
        const balance = (allocated || 0) - (withdrawn || 0);
        const balCls = balance < 0 ? 'text-red-600' : 'text-gray-800';
        return `
      <tr class="${cls}">
        <td class="px-4 py-3">${label}</td>
        <td class="px-4 py-3 text-right">${percent}%</td>
        <td class="px-4 py-3 text-right">${fmt(allocated)}</td>
        <td class="px-4 py-3 text-right">${fmt(withdrawn)}</td>
        <td class="px-4 py-3 text-right ${balCls}">${fmt(balance)}</td>
      </tr>`;
    };

    // Final 3 rows
    $body.append(mkRow('Shareholder 1 - Mr. Khurram', 47.5, sh1Allocated, sh1Withdrawn, rowCls('sh1')));
    $body.append(mkRow('Shareholder 2 - Mr. Zeeshan', 47.5, sh2Allocated, sh2Withdrawn, rowCls('sh2')));
    $body.append(mkRow('Charity', 5, charityAllocated, charityWithdrawn, rowCls('charity')));
}

function benTypeLabel(t) {
    switch ((t || '').toLowerCase()) {
        case 'cash': return 'Cash';
        case 'bank_transfer': return 'Bank transfer';
        case 'adjustment': return 'Adjustment';
        default: return '—';
    }
}

function benTypeBadge(t) {
    const map = {
        cash: 'bg-yellow-100 text-yellow-800',
        bank_transfer: 'bg-blue-100 text-blue-800',
        adjustment: 'bg-purple-100 text-purple-800'
    };
    const cls = map[(t || '').toLowerCase()] || 'bg-gray-100 text-gray-800';
    return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${cls}">${benTypeLabel(t)}</span>`;
}

// Build the same modern dropdown for inline edit cells
function benTypeFieldHtml(value = 'cash', extraClass = '') {
    return `
    <div class="ben-select ${extraClass} relative" data-name="type">
      <input type="hidden" name="type" value="${(value || 'cash')}">
      <button type="button"
              class="ben-sel-btn w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-3 pr-10
                     text-gray-800 shadow-sm text-left
                     focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200">
        <span class="ben-sel-label"></span>
        <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500"
             viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                clip-rule="evenodd" />
        </svg>
      </button>
      <div class="ben-sel-menu hidden absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg">
        <button type="button" class="ben-sel-opt w-full px-3 py-2 text-left hover:bg-gray-50" data-value="cash">Cash</button>
        <button type="button" class="ben-sel-opt w-full px-3 py-2 text-left hover:bg-gray-50" data-value="bank_transfer">Bank transfer</button>
        <button type="button" class="ben-sel-opt w-full px-3 py-2 text-left hover:bg-gray-50" data-value="adjustment">Adjustment</button>
      </div>
    </div>`;
}

// Hydrate labels & active option
function hydrateBenSelect(root = document) {
    $('.ben-select', root).each(function () {
        const $sel = $(this);
        const val = $sel.find('input[type="hidden"]').val() || 'cash';
        const $opt = $sel.find(`.ben-sel-opt[data-value="${val}"]`);
        $sel.find('.ben-sel-label').text($opt.text().trim() || 'Select');
        $sel.find('.ben-sel-opt').removeClass('bg-gray-100');
        $opt.addClass('bg-gray-100');
    });
}

// Bind once (delegated)
(function bindBenSelectOnce() {
    if (window.__benSelectBound) return;
    window.__benSelectBound = true;

    // Toggle menu
    $(document).on('click', '.ben-sel-btn', function (e) {
        e.stopPropagation();
        const $sel = $(this).closest('.ben-select');
        $('.ben-select.open').not($sel).removeClass('open').find('.ben-sel-menu').addClass('hidden');
        $sel.toggleClass('open');
        $sel.find('.ben-sel-menu').toggleClass('hidden');
    });

    // Pick option
    $(document).on('click', '.ben-sel-opt', function () {
        const $opt = $(this);
        const $sel = $opt.closest('.ben-select');
        const val = $opt.data('value');
        const label = $opt.text().trim();

        $sel.find('input[type="hidden"]').val(val).trigger('change');
        $sel.find('.ben-sel-label').text(label);
        $sel.find('.ben-sel-opt').removeClass('bg-gray-100');
        $opt.addClass('bg-gray-100');

        $sel.removeClass('open');
        $sel.find('.ben-sel-menu').addClass('hidden');
    });

    // Close on outside click
    $(document).on('click', function () {
        $('.ben-select.open').removeClass('open').find('.ben-sel-menu').addClass('hidden');
    });

    // Initial hydration on page load
    $(function () { hydrateBenSelect(document); });
})();

function ensureApexCharts(cb) {
    if (window.ApexCharts) return cb();
    let s = document.getElementById('apexcharts-cdn');
    if (!s) {
        s = document.createElement('script');
        s.id = 'apexcharts-cdn';
        s.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
        document.head.appendChild(s);
    }
    s.addEventListener('load', () => cb());
    s.addEventListener('error', () => {
        console.warn('ApexCharts failed to load.');
        cb(false);
    });
}

function destroyBenPie() {
    if (window.__benPie) {
        try { window.__benPie.destroy(); } catch { }
        window.__benPie = null;
    }
}

function renderBenPieChart() {
    const $wrap = $('#benPieWrap');
    if (!$wrap.length) return;
    if (!$('#sheet-beneficiary').is(':visible')) return;

    // Prefer the freshly computed KPI numbers (always in sync with Summary)
    const parseKpi = (sel) => Number(String($(sel).text()).replace(/[^\d.-]/g, '')) || 0;

    let sh1 = parseKpi('#benSH1InlineBalance') || parseKpi('#benSH1Balance');
    let sh2 = parseKpi('#benSH2InlineBalance') || parseKpi('#benSH2Balance');
    let charity = parseKpi('#benCharityKpi');

    // Fallback to any computed cache (same as KPIs)
    if (!(sh1 || sh2 || charity)) {
        if (window.__benComputedKpis) {
            sh1 = Number(window.__benComputedKpis.sh1) || 0;
            sh2 = Number(window.__benComputedKpis.sh2) || 0;
            charity = Number(window.__benComputedKpis.charity) || 0;
        }
    }

    // Final fallback to beneficiary entry totals (if you want to keep legacy behavior available)
    if (!(sh1 || sh2 || charity)) {
        const d = window._benData || {};
        sh1 = Number(d?.shareholder1?.total || 0);
        sh2 = Number(d?.shareholder2?.total || 0);
        charity = Number(d?.charity?.total || 0);
    }

    const series = [sh1, sh2, charity];
    const hasData = series.some(v => v > 0);

    ensureApexCharts(() => {
        if (!window.ApexCharts) return;

        // Destroy stale chart when switching sets or going from 0 -> data
        if (window.__benPie) {
            try { window.__benPie.destroy(); } catch { }
            window.__benPie = null;
        }

        if (!hasData) {
            // No pie content for this set — remove DOM node if present
            $wrap.find('#benPie').remove();
            return;
        }

        // Ensure the container exists
        if (!$wrap.find('#benPie').length) {
            $wrap.html('<div id="benPie" class="w-full h-[260px]"></div>');
        }

        const options = {
            chart: { type: 'pie', height: 260, toolbar: { show: false }, animations: { enabled: true } },
            series,
            labels: ['Shareholder 1', 'Shareholder 2', 'Charity'],
            legend: { position: 'bottom' },
            dataLabels: { enabled: true, formatter: (val) => `${val.toFixed(1)}%` },
            colors: ['#F59E0B', '#8B5CF6', '#10B981'],
            stroke: { width: 0 },
            tooltip: {
                y: { formatter: (v) => 'AED ' + Number(v || 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
            }
        };

        window.__benPie = new ApexCharts(document.querySelector('#benPie'), options);
        window.__benPie.render();
    });
}

function benAttachApi(entryId) {
  return {
    list:  api(`beneficiaries/${entryId}/attachments`),
    store: api(`beneficiaries/${entryId}/attachments`),
    del:   (id) => api(`beneficiaries/attachments/${id}`),
    pdf:   api(`beneficiaries/${entryId}/attachments/download-all`),
  };
}

// ----- Open modal / lock scroll -----
function openBenAttachModal(entryId) {
    __benAttachEntryId = entryId;
    const urls = benAttachApi(entryId);

    $('#benAttachForm [name="entry_id"]').val(entryId);
    $('#benAttachDownloadAll').attr('href', urls.pdf);
    $('#benAttachMeta').text(`Entry #${entryId}`);

    $('#benAttachModal').removeClass('hidden').addClass('flex');
    $('#benAttFiles').val('');        // reset file input
    $('#benAttChosen').text('No file chosen');

    const closed = benIsClosed();
    $('#benAttachForm :input').prop('disabled', closed);
    $('#benAttachForm').toggleClass('opacity-50 pointer-events-none', closed);

    document.documentElement.classList.add('overflow-y-hidden');  // lock scroll
    benFetchAttachments(entryId);
}

function closeBenAttachModal() {
    __benAttachEntryId = null;
    $('#benAttachModal').addClass('hidden').removeClass('flex');
    $('#benAttachList').empty();
    document.documentElement.classList.remove('overflow-y-hidden'); // unlock scroll
}

// ----- List + Open link -----
function benFetchAttachments(entryId) {
  const { list } = benAttachApi(entryId);
  
  $('#benAttachList').html('<div class="py-6 text-center text-gray-500 text-sm">Loading…</div>');
  $.getJSON(list, { _t: Date.now() })    
   .done(res => {
    const atts = res?.attachments || [];
    if (!atts.length) {
      $('#benAttachList').html('<div class="py-6 text-center text-gray-500 text-sm">No attachments yet.</div>');
      return;
    }
    const fmtSize = (n) => {
      n = Number(n) || 0;
      if (n < 1024) return `${n} B`;
      if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
      return `${(n/1024/1024).toFixed(1)} MB`;
    };

    const rows = atts.map(a => {
      const type = (a.type || 'other');
      const openUrl  = a.url || (a.path ? `/storage/${a.path}` : ''); // prefer public storage
      return `
        <div class="flex items-center gap-3 py-3">
          <span class="inline-flex text-xs px-2 py-0.5 rounded-full ${pillClass(type)}">
            ${type[0].toUpperCase() + type.slice(1)}
          </span>
          <div class="flex-1 min-w-0">
            <div class="truncate text-sm text-slate-800">${escapeHtml(a.original_name || 'file')}</div>
            <div class="text-xs text-slate-500">${fmtSize(a.size)}${a.mime ? ' • ' + escapeHtml(a.mime) : ''}</div>
          </div>
          ${openUrl ? `<a href="${openUrl}" target="_blank" rel="noopener" class="text-indigo-600 hover:underline text-sm">Open</a>` : ''}
          ${benIsClosed() ? '' : `<button class="ben-att-del text-red-600 hover:bg-red-50 rounded px-2 py-1 text-sm" data-id="${a.id}"><i class="bi bi-trash"></i></button>`}
        </div>
      `;
    }).join('');
    $('#benAttachList').html(rows);
  }).fail(() => {
    $('#benAttachList').html('<div class="py-6 text-center text-red-600 text-sm">Failed to load attachments.</div>');
  });
}

function pillClass(t) {
    switch ((t || 'other').toLowerCase()) {
        case 'invoice': return 'bg-blue-100 text-blue-800';
        case 'receipt': return 'bg-green-100 text-green-800';
        case 'note': return 'bg-orange-100 text-orange-800';
        default: return 'bg-slate-100 text-slate-700';
    }
}

function escapeHtml(s) { return String(s || '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c])); }

// ---- Customer sheet tab rendering (inline or dropdown) ----

function getCustomerSheetsFromDOM() {
    // We assume each customer sheet section has id="sheet-customer-<slug>"
    const arr = [];
    $('[id^="sheet-customer-"]').each(function () {
        const fullId = this.id;             // "sheet-customer-XYZ"
        const sheet = fullId.slice('sheet-'.length); // "customer-XYZ"  <-- matches data-sheet needed
        let label = sheet.replace(/^customer-/, '').replace(/[-_]+/g, ' ').trim();
        if (label) label = label.toUpperCase();
        else label = 'CUSTOMER';
        arr.push({ sheet, label });
    });
    return arr;
}

function renderCustomerTabs() {
    const $wrap = $('#customerTabsContainer');
    if (!$wrap.length) return;

    const items = getCustomerSheetsFromDOM();
    $wrap.empty();

    if (items.length === 0) return;

    if (items.length <= 4) {
        // Inline buttons
        items.forEach(({ sheet, label }) => {
            $wrap.append(
                `<button class="sheet-tab px-4 py-2 text-sm font-medium hover:bg-gray-100"
                 data-sheet="${sheet}">${label}</button>`
            );
        });
        return;
    }

    // Dropdown (opens upwards)
    const activeSheet = localStorage.getItem('activeSheet');
    const selected = items.find(x => x.sheet === activeSheet);
    const btnLabel = selected ? selected.label : 'Customer Sheets';

    $wrap.html(`
    <div class="relative">
      <button id="custDropBtn" type="button"
        class="px-4 py-2 text-sm font-medium hover:bg-gray-100"
        aria-haspopup="true" aria-expanded="false">
        ${btnLabel}
        <i class="bi bi-caret-up-fill ml-1"></i>
      </button>

      <div id="custDropMenu"
           class="hidden absolute bottom-full mb-2 left-0 right-0
                  bg-white border shadow-lg rounded-md max-h-56 overflow-auto z-50">
        ${items.map(x => `
          <button class="sheet-tab block w-full text-left px-4 py-2 hover:bg-gray-50"
                  data-sheet="${x.sheet}">
            ${x.label}
          </button>
        `).join('')}
      </div>
    </div>
  `);
}

function fetchAndRenderSummary() { return paintSummaryFromServer(); }

$(function () {
    const $root = $('#summary-root');
    const onSummaryPage = $root.length > 0;

    if (onSummaryPage) {
        // First real paint from server totals (no zeros first)
        fetchAndRenderSummary();

        // “Refresh” button
        $(document).off('click', '#refreshSummaryBtn').on('click', '#refreshSummaryBtn', function () {
            fetchAndRenderSummary();
        });
    }
});

$(function () {
    if (isCyclePage && window.cycle.status === 'closed') {
        // mark known write controls
        $('[data-write], .submit-investment-btn, .invest-save-changes-btn, .update-invest-btn, .delete-investment-btn, #saveMurabahaDateBtn, #attachmentUploadForm button[type=submit], #attachmentUploadForm input[type=file]')
            .attr('disabled', true)
            .attr('aria-disabled', 'true')
            .addClass('opacity-50 pointer-events-none');

        // last-line defense: block any stray clicks
        $(document).on('click', '[data-write], .submit-investment-btn, .invest-save-changes-btn, .update-invest-btn, .delete-investment-btn, #saveMurabahaDateBtn', function (e) {
            e.preventDefault();
            alert('This set is closed. Reopen or create a new set to make changes.');
        });
    }
});

function filterByCycle(rows) {
    if (!window.cycle || !window.cycle.id) return rows;
    const cid = Number(window.cycle.id);
    return (rows || []).filter(r => Number(r.cycle_id) === cid);
}

function activeCid() {
    return Number(window._activeCycleId || $('meta[name="active-cycle"]').attr('content') || 0) || 0;
}

function cycleKey(k) { return `${k}:c${activeCid()}`; }

function resetBeneficiaryKpisToZero() {
    $('#benTotalProfit').text('AED 0.00');
    $('#benCharityKpi').text('AED 0.00');
    $('#benSH1Balance').text('AED 0.00');
    $('#benSH2Balance').text('AED 0.00');
    $('#benSH1InlineBalance').text('AED 0.00');
    $('#benSH2InlineBalance').text('AED 0.00');
}

$(document)
    .off('cycle:changed.beneficiaries')
    .on('cycle:changed.beneficiaries', function () {
        // clear cycle-scoped runtime state
        window._benData = null;

        // destroy pie if it exists
        if (window.__benPie) { try { window.__benPie.destroy(); } catch { } window.__benPie = null; }
        $('#benPie').remove();

        // clear visible numbers so you don't see previous set’s values
        $('#benSH1EntriesTotal, #benSH2EntriesTotal, #benSH1CharityTotal, #benSH2CharityTotal').text('AED 0.00');
        $('#benSH1Balance, #benSH2Balance, #benSH1InlineBalance, #benSH2InlineBalance, #benCharityKpi, #benTotalProfit').text('AED 0.00');

        // reload everything for the NEW active set
        $.when(loadBeneficiaries(), computeAndRenderProfit()).done(function () {
            benRenderAllocTable();
            benFirstPaintDone = true;
        });
    });

// ---- one-time legacy migration (from "ben:{id}:{k}" -> "c{id}:ben:{k}")
function migrateBenKeysOnce() {
    try {
        const did = localStorage.getItem('__ben_migrated__');
        if (did === '1') return;

        const id = String(window.activeCycleId || '0');
        const legacy = (k) => `ben:${id}:${k}`;
        const canon = (k) => `c${id}:ben:${k}`;

        ['localTotal', 'sqTotal', 'usTotal'].forEach((k) => {
            const lv = localStorage.getItem(legacy(k));
            if (lv !== null && localStorage.getItem(canon(k)) === null) {
                localStorage.setItem(canon(k), lv);
                localStorage.removeItem(legacy(k));
            }
        });

        localStorage.setItem('__ben_migrated__', '1');
    } catch { /* ignore */ }
}

// Resolve when window.activeCycleId is set OR when cycle:changed fires
function whenCycleReady(timeoutMs = 4000) {
    const d = $.Deferred();

    // Fast path
    if (Number(window.activeCycleId) || Number(window._activeCycleId)) {
        d.resolve();
        return d.promise();
    }

    // Event path
    let done = false;
    const onReady = () => {
        if (done) return;
        done = true;
        $(document).off('cycle:changed.whenReady', onReady);
        d.resolve();
    };
    $(document).on('cycle:changed.whenReady', onReady);

    // Safety timeout
    setTimeout(() => {
        if (!done) {
            done = true;
            $(document).off('cycle:changed.whenReady', onReady);
            d.resolve(); // don’t block forever; best effort
        }
    }, timeoutMs);

    return d.promise();
}

// --- Set helpers ---
function getActiveSetId() {
    if (Number(window.activeSetId) > 0) return Number(window.activeSetId);

    const root = document.getElementById('summary-root');
    if (root && root.dataset && Number(root.dataset.setId) > 0) {
        return Number(root.dataset.setId);
    }

    try {
        const v = localStorage.getItem('activeSetId');
        if (v && Number(v) > 0) return Number(v);
    } catch { }
    return 0;
}

function gtsTotalsUrl() {
  const base = 'gts-materials/total'; // no leading slash
  const setId = (typeof getActiveSetId === 'function' ? getActiveSetId() : 0) || 0;

  const qs = [];
  if (setId > 0) qs.push('set_id=' + encodeURIComponent(setId));

  const path = qs.length ? `${base}?${qs.join('&')}` : base;

  // Prefer api(); fall back gracefully if not defined
  if (typeof window.api === 'function') return window.api(path);
  if (typeof window.investmentUrl === 'function') return window.investmentUrl(path);
  return '/' + path; // last-resort fallback
}

function paintInvestmentCardOnce(total) {
    const n = Number(total) || 0;
    $('#investmentTotalAmount').text(
        'AED ' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
}

// ---- Investment card live-sync with shared GTS totals (bind once) ----
(function bindInvestmentTotalsListener() {
    if (window.__invTotalsHooked) return;          // avoid double-binding
    window.__invTotalsHooked = true;

    document.addEventListener('gts:totals-changed', (ev) => {
        // Only repaint if the Investment sheet is currently visible
        if (!$('#sheet-gts-investment').is(':visible')) return;

        const t = (ev && ev.detail) ? ev.detail : (window.sheetTotals || {});
        paintInvestmentCardOnce(Number(t.investment) || 0);
    });
})();

(function () {
    function isClosed() {
        return !!window.__SET_IS_CLOSED ||
            (window.cycle && window.cycle.status === 'closed') ||
            document.documentElement.classList.contains('is-cycle-closed');
    }

    function hardFixTables(root) {
        if (!isClosed()) return;

        (root || document).querySelectorAll('table').forEach(table => {
            // Remove Tailwind's fixed layout so columns can stretch
            table.classList.remove('table-fixed');
            table.style.tableLayout = 'auto';

            const thead = table.tHead || table.querySelector('thead');
            if (!thead) return;

            // Last header row is what browsers use for column count
            const headerRow = thead.querySelector('tr:last-child');
            if (!headerRow) return;

            let ths = Array.from(headerRow.querySelectorAll('th'));
            if (!ths.length) return;

            // Try to locate the Action column; if not found, DO NOTHING (never guess)
            let actionIdx = ths.findIndex(th =>
                /action/i.test((th.textContent || '').trim()) ||
                th.matches('.action, .action-col, [data-col="action"]')
            );
            if (actionIdx === -1) {
                // We couldn't positively identify the Action column—leave the table alone.
                return;
            }

            // Remove the Action header cell from *every* header row so counts line up
            thead.querySelectorAll('tr').forEach(tr => {
                const cells = tr.children;
                if (cells[actionIdx]) tr.removeChild(cells[actionIdx]);
            });

            // Remove matching <col> if there’s a colgroup
            const cg = table.querySelector('colgroup');
            if (cg && cg.children[actionIdx]) cg.removeChild(cg.children[actionIdx]);

            // Remove the Action cell from every body/footer row
            table.querySelectorAll('tbody tr, tfoot tr').forEach(tr => {
                const cells = tr.children;
                if (cells[actionIdx]) tr.removeChild(cells[actionIdx]);
            });

            // New visible header count
            const newHeadCount = (table.tHead || table.querySelector('thead'))
                .querySelectorAll('tr:last-child th').length;

            // Clamp over-large colspans to the new width
            table.querySelectorAll('tbody td[colspan], tfoot td[colspan], tbody th[colspan], tfoot th[colspan]')
                .forEach(cell => {
                    let span = parseInt(cell.getAttribute('colspan') || '1', 10);
                    if (!Number.isFinite(span) || span < 1) span = 1;
                    if (span > newHeadCount) cell.setAttribute('colspan', String(newHeadCount));
                });

            // If any row still visually overflows (rare), drop trailing cells until it fits
            const fitRow = (tr) => {
                let visual = 0;
                const cells = Array.from(tr.children);
                for (const td of cells) {
                    const s = parseInt(td.getAttribute('colspan') || '1', 10);
                    visual += (Number.isFinite(s) && s > 0) ? s : 1;
                }
                while (visual > newHeadCount && tr.lastElementChild) {
                    const last = tr.lastElementChild;
                    const s = parseInt(last.getAttribute('colspan') || '1', 10);
                    tr.removeChild(last);
                    visual -= (Number.isFinite(s) && s > 0) ? s : 1;
                }
            };
            table.querySelectorAll('tbody tr, tfoot tr').forEach(fitRow);
        });
    }

    function squashRightGutter(root) {
        (root || document).querySelectorAll('table').forEach(table => {
            // ensure fluid layout
            table.classList.remove('table-fixed');
            table.style.tableLayout = 'auto';
            table.style.borderCollapse = 'collapse';
            table.style.borderSpacing = '0';
            table.style.width = '100%';

            // clear any fixed widths that keep a sliver on right
            table.querySelectorAll('colgroup col, thead th, tbody td, tfoot td').forEach(el => {
                el.style.width = '';
                el.removeAttribute('width');
            });

            const thead = table.tHead || table.querySelector('thead');
            const headerRow = thead && thead.querySelector('tr:last-child');
            if (!headerRow) return;

            const visibleThs = Array.from(headerRow.querySelectorAll('th')).filter(th => th.offsetParent !== null);
            if (!visibleThs.length) return;

            const lastTh = visibleThs[visibleThs.length - 1];
            const wrapper = table.parentElement || table;

            // if wrapper is wider than table, pad the last visible column to eat the gap
            const gap = (wrapper.clientWidth || wrapper.offsetWidth) - table.offsetWidth;
            if (gap > 0) {
                const pr = parseFloat(getComputedStyle(lastTh).paddingRight) || 0;
                lastTh.style.paddingRight = (pr + gap) + 'px';

                const lastIndex = Array.from(headerRow.children).indexOf(lastTh);
                table.querySelectorAll('tbody tr').forEach(tr => {
                    const cell = tr.children[lastIndex];
                    if (cell) {
                        const cpr = parseFloat(getComputedStyle(cell).paddingRight) || 0;
                        cell.style.paddingRight = (cpr + gap) + 'px';
                    }
                });
            }
        });
    }

    function applyClosedLock(root) {
        if (!isClosed()) return;
        document.documentElement.classList.add('is-cycle-closed');
        hardFixTables(root);          // removes Action col + clamps colspans
        squashRightGutter(root);      // removes the tiny right-side gap
    }

    // initial + future DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyClosedLock(document));
    } else {
        applyClosedLock(document);
    }

    const mo = new MutationObserver(muts => {
        if (!isClosed()) return;
        for (const m of muts) {
            m.addedNodes && m.addedNodes.forEach(n => {
                if (n.nodeType === 1) applyClosedLock(n);
            });
        }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('sheet:rendered', () => applyClosedLock(document));
})();
