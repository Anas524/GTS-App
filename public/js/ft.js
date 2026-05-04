$(function () {

    const $root = $('#fedexRoot');

    const URLs = {
        invoices: $root.data('invoices-url'),
        storeInvoice: $root.data('store-invoice-url'),
        updateInvoiceTmpl: $root.data('update-invoice-url-tmpl'),
        deleteInvoiceTmpl: $root.data('delete-invoice-url-tmpl'),
        shipmentsUrlTmpl: $root.data('shipments-url-tmpl'),

        storeShipmentTmpl: $root.data('store-shipment-url-tmpl'),
        updateShipmentTmpl: $root.data('update-shipment-url-tmpl'),
        deleteShipmentTmpl: $root.data('delete-shipment-url-tmpl'),
        importShipmentsTmpl: $root.data('import-shipments-url-tmpl'),
        importInvoicesUrl: $root.data('import-invoices-url'),
    };

    // ---------- Modal (replaces alert/confirm) ----------
    function fxModal(opts = {}) {
        const o = {
            type: opts.type || 'info',     // info | success | warning | danger
            title: opts.title || 'Message',
            message: opts.message || '',
            sub: opts.sub || '',
            confirm: !!opts.confirm,       // true => show Cancel + OK
            okText: opts.okText || 'OK',
            cancelText: opts.cancelText || 'Cancel',
            error: opts.error || '',
        };

        const $m = $('#fxAppModal');
        const $title = $('#fxAppModalTitle');
        const $msg = $('#fxAppModalMsg');
        const $sub = $('#fxAppModalSub');
        const $ok = $('#fxAppModalOk');
        const $cancel = $('#fxAppModalCancel');
        const $closeX = $('#fxAppModalCloseX');
        const $iconWrap = $('#fxAppModalIcon');
        const $err = $('#fxAppModalErrBox');

        // icon + colors
        const map = {
            info: { cls: 'bg-slate-100 text-slate-700', icon: 'bi-info-circle' },
            success: { cls: 'bg-emerald-50 text-emerald-700', icon: 'bi-check-circle' },
            warning: { cls: 'bg-amber-50 text-amber-800', icon: 'bi-exclamation-triangle' },
            danger: { cls: 'bg-red-50 text-red-700', icon: 'bi-x-circle' },
        };
        const cfg = map[o.type] || map.info;

        $iconWrap.attr('class', `h-9 w-9 rounded-xl flex items-center justify-center ${cfg.cls}`);
        $iconWrap.html(`<i class="bi ${cfg.icon}"></i>`);

        $title.text(o.title);
        $msg.html(o.message);
        if (o.sub) $sub.removeClass('hidden').text(o.sub);
        else $sub.addClass('hidden').text('');

        if (o.error) $err.removeClass('hidden').text(o.error);
        else $err.addClass('hidden').text('');

        $ok.text(o.okText);
        $cancel.text(o.cancelText);

        if (o.confirm) $cancel.removeClass('hidden');
        else $cancel.addClass('hidden');

        $m.removeClass('hidden');

        return new Promise((resolve) => {
            function cleanup(val) {
                $m.addClass('hidden');
                $ok.off('click', onOk);
                $cancel.off('click', onCancel);
                $closeX.off('click', onCancel);
                $(document).off('keydown', onKey);
                resolve(val);
            }
            function onOk() { cleanup(true); }
            function onCancel() { cleanup(false); }
            function onKey(e) {
                if (e.key === 'Escape') onCancel();
                if (e.key === 'Enter') onOk();
            }

            $ok.on('click', onOk);
            $cancel.on('click', onCancel);
            $closeX.on('click', onCancel);
            $(document).on('keydown', onKey);
        });
    }

    function csrf() {
        return $('meta[name="csrf-token"]').attr('content');
    }

    // Set CSRF header for all AJAX
    $.ajaxSetup({
        headers: { 'X-CSRF-TOKEN': csrf() }
    });

    // ---------- anti-double-fire + loader ----------
    function setBtnLoading($btn, isLoading, opts = {}) {
        const icon = opts.icon || 'bi-arrow-repeat';
        const loadingText = opts.text || '';
        const disableClass = opts.disableClass || 'opacity-60 cursor-not-allowed';

        if (!$btn || !$btn.length) return;

        if (isLoading) {
            if ($btn.data('busy')) return false; // already busy

            $btn.data('busy', 1);

            // store original html only once
            if ($btn.data('origHtml') == null) $btn.data('origHtml', $btn.html());

            const spinner = `<i class="bi ${icon} inline-block animate-spin"></i>`;
            const content = loadingText
                ? `<span class="inline-flex items-center gap-2">${spinner}<span>${loadingText}</span></span>`
                : `<span class="inline-flex items-center justify-center">${spinner}</span>`;

            $btn.html(content);
            $btn.prop('disabled', true).addClass(disableClass);
            return true;
        } else {
            $btn.data('busy', 0);

            const orig = $btn.data('origHtml');
            if (orig != null) $btn.html(orig);

            $btn.prop('disabled', false).removeClass(disableClass);
            return true;
        }
    }

    // Wrap any async action safely
    function withBtnLock($btn, fnAsync, opts = {}) {
        if ($btn && $btn.length && $btn.data('busy')) return; // block double click

        setBtnLoading($btn, true, opts);

        // Ensure we always unlock
        return Promise.resolve()
            .then(fnAsync)
            .catch((e) => { throw e; })
            .finally(() => setBtnLoading($btn, false, opts));
    }

    // ---------- formatting ----------
    function fmtMoneyAED(v) {
        const n = Number(v || 0);
        // use non-breaking space between AED and value
        return 'AED\u00A0' + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function statusPill(status) {
        const s = String(status || '').toLowerCase();
        if (s === 'closed') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s === 'open') return 'bg-sky-50 text-sky-700 border-sky-200';
        return 'bg-amber-50 text-amber-800 border-amber-200'; // pending default
    }

    function payStatusPill(v) {
        const s = String(v || '').trim().toLowerCase();

        if (s === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (s === 'partial' || s === 'partially paid') return 'bg-amber-50 text-amber-800 border-amber-200';

        return 'bg-red-50 text-red-700 border-red-200'; // unpaid default
    }

    function toISODate(s) {
        if (!s) return '';
        s = String(s).trim();

        // if "2024-08-19T00:00:00.000000Z" or "2024-08-19 00:00:00"
        const isoPrefix = s.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoPrefix) return isoPrefix[1];

        // dd/mm/yyyy -> yyyy-mm-dd
        const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;

        return '';
    }

    function fmtLongDate(dateStr) {
        const iso = toISODate(dateStr);
        if (!iso) return '';
        const d = new Date(iso + 'T00:00:00');
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    }

    function esc(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function parseISODateOnly(v) {
        const iso = toISODate(v); // you already have toISODate()
        if (!iso) return null;
        const d = new Date(iso + 'T00:00:00');
        return isNaN(d.getTime()) ? null : d;
    }

    function daysDiffFromToday(dateObj) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const d = new Date(dateObj);
        d.setHours(0, 0, 0, 0);
        const ms = d - today;
        return Math.round(ms / (1000 * 60 * 60 * 24)); // + future, - past
    }

    function renderDueReminders() {
        const $wrap = $('#fxDueReminders');
        const $body = $('#fxDueRemindersBody');

        // choose your window (7 days near due)
        const NEAR_DAYS = 7;

        const list = getFilteredInvoices().filter(inv => String(inv.status || '').toLowerCase() !== 'closed');

        const reminders = list
            .map(inv => {
                if (String(inv.status || '').toLowerCase() === 'closed') return null; // auto-hide
                const d = parseISODateOnly(inv.due_date); // only real due_date
                if (!d) return null; // ignore due_date_text like "Due on receipt"
                const dd = daysDiffFromToday(d);

                // show ONLY upcoming dues within next 7 days (not overdue)
                if (dd >= 0 && dd <= NEAR_DAYS) {
                    return { inv, dd };
                }
                return null;
            })
            .filter(Boolean)
            .sort((a, b) => a.dd - b.dd); // overdue first, then soon

        if (!reminders.length) {
            $wrap.addClass('hidden');
            $body.empty();
            return;
        }

        $wrap.removeClass('hidden');
        $body.empty();

        reminders.slice(0, 8).forEach(({ inv, dd }) => {
            const dueText = fmtLongDate(inv.due_date);
            const daysText = `Due in ${dd} day${dd !== 1 ? 's' : ''}`;

            $body.append(`
                <button type="button"
                class="min-w-[260px] text-left p-3 rounded-xl border border-slate-200 bg-slate-50/60
                        hover:bg-slate-50 hover:border-slate-300 transition fxReminderPick"
                data-id="${inv.id}">
                
                <div class="font-semibold text-sm text-slate-900 truncate">
                    Invoice # ${esc(inv.invoice_number)}
                </div>

                <div class="text-xs text-slate-600 mt-1">
                    Due: <span class="font-medium">${esc(dueText)}</span>
                    <span class="mx-1">•</span>
                    Amount: <span class="font-semibold">${fmtMoneyAED(inv.amount_due)}</span>
                </div>

                <div class="mt-2 inline-flex items-center px-2 py-1 rounded-full text-[11px]
                            bg-amber-50 text-amber-800 border border-amber-200">
                    ${esc(daysText)}
                </div>
                </button>
            `);
        });

        if (reminders.length > 8) {
            $body.append(`<div class="text-xs text-slate-500 pt-1">Showing 8 of ${reminders.length} reminders.</div>`);
        }
    }

    // ---------- state ----------
    let invoicesCache = [];
    let sNoMap = {};              // invoiceId -> S.NO
    let activeInvoiceId = null;
    let shipmentsCache = [];
    let editingShipmentId = null;      // current row id being edited
    let editingOriginal = null;        // snapshot of original values for undo detection

    $('#fxAddShipmentBtn').addClass('hidden');
    $('#fxImportShipmentsBtn').addClass('hidden');

    function getSummarySno(invoiceId) {
        const filtered = getFilteredInvoices(); // same as table
        const idx = filtered.findIndex(x => String(x.id) === String(invoiceId));
        return idx >= 0 ? (idx + 1) : null;
    }

    // reuse same filter logic as table (so S.NO matches what user sees)
    function getFilteredInvoices() {
        const qRaw = ($('#fxSearch').val() || '').trim().toLowerCase();
        const st = ($('#fxFilterStatus').val() || '').trim().toLowerCase();

        return invoicesCache.filter(inv => {
            const payment = String(inv.payment_status || '').trim().toLowerCase(); // "paid" / "unpaid"
            const status = String(inv.status || '').trim().toLowerCase();

            // special case: user searches paid/unpaid
            let okSearch = true;
            if (qRaw) {
                if (qRaw === 'paid' || qRaw === 'unpaid') {
                    okSearch = payment === qRaw; // exact match (so paid won't match unpaid)
                } else {
                    const hay = [
                        inv.invoice_number,
                        inv.remarks,
                        inv.payment_reference
                        // remove inv.payment_status from hay so substring issue never happens
                    ].join(' ').toLowerCase();

                    okSearch = hay.includes(qRaw);
                }
            }

            const okStatus = !st || status === st;

            return okSearch && okStatus;
        });
    }

    // ---------- tabs ----------
    $('.fxTab').on('click', function () {
        const tab = $(this).data('tab');

        $('.fxTab')
            .removeClass('border-indigo-600 text-slate-900 font-semibold bg-gradient-to-b from-indigo-50 to-white')
            .addClass('border-transparent text-slate-500');

        $(this)
            .addClass('border-indigo-600 text-slate-900 font-semibold bg-gradient-to-b from-indigo-50 to-white')
            .removeClass('border-transparent text-slate-500');

        // section switch
        $('#fxTab-summary, #fxTab-tracker').addClass('hidden');
        $('#fxTab-' + tab).removeClass('hidden');

        if (tab === 'tracker' && !activeInvoiceId) {
            resetPaidUnpaidTotals();   // sets AED 0.00 / AED 0.00
        }
    });

    // ---------- modal ----------
    function openModal() { $('#fxInvoiceModal').removeClass('hidden'); }
    function closeModal() { $('#fxInvoiceModal').addClass('hidden'); }

    $('#fxOpenCreateInvoice').on('click', function () {
        const $btn = $(this);
        if ($btn.data('busy')) return;

        setBtnLoading($btn, true, { icon: 'bi-plus-lg' });
        resetInvoiceForm();
        $('#fxInvoiceModalTitle').text('New Invoice');
        openModal();

        // unlock instantly (after UI paint)
        setTimeout(() => setBtnLoading($btn, false, { icon: 'bi-plus-lg' }), 150);
    });

    $('#fxCloseInvoiceModal, #fxCancelInvoice').on('click', closeModal);

    function resetInvoiceForm() {
        $('#fxInvoiceId').val('');
        $('#fxInvoiceNumber').val('');
        $('#fxStatus').val('Pending');
        $('#fxInvoiceDate').val('');
        $('#fxDueDate').val('');
        $('#fxDueDateText').val('');
        $('#fxRemarks').val('');
        $('#fxPaymentStatus').val('Unpaid');
        $('#fxPaymentRef').val('');
        hideErr();
    }

    function hideErr() {
        $('#fxInvoiceFormErr').addClass('hidden').text('');
    }

    function showErr(msg) {
        $('#fxInvoiceFormErr').removeClass('hidden').text(msg);
    }

    function snapKey($el) {
        const cls = ($el.attr('class') || '').split(/\s+/);
        // ignore fxSInp, take the second fx class like fxShipmentId, fxOrigin...
        const key = cls.find(c => c.startsWith('fx') && c !== 'fxSInp');
        return key || '';
    }

    function snapshotRow($tr) {
        const snap = {};
        $tr.find('.fxSInp').each(function () {
            const $el = $(this);
            const key = snapKey($el);
            if (!key) return;
            snap[key] = $el.val();
        });
        return snap;
    }

    function rowEqualsSnapshot($tr, snap) {
        if (!snap) return true;
        let same = true;
        $tr.find('.fxSInp').each(function () {
            const $el = $(this);
            const key = snapKey($el);
            if (!key) return;
            if ((snap[key] ?? '') != ($el.val() ?? '')) same = false;
        });
        return same;
    }

    function restoreSnapshot($tr, snap) {
        if (!snap) return;
        $tr.find('.fxSInp').each(function () {
            const $el = $(this);
            const key = snapKey($el);
            if (!key) return;
            if (snap[key] != null) $el.val(snap[key]);
        });
    }

    function enterShipmentEditMode($tr) {
        const id = $tr.data('id');
        if (!id) return; // ignore draft or empty

        // if another row is editing, cancel it first
        if (editingShipmentId && String(editingShipmentId) !== String(id)) {
            const $old = $('#fxShipmentTbody tr[data-id="' + editingShipmentId + '"]');
            if ($old.length) exitShipmentEditMode($old, true); // restore old
        }

        editingShipmentId = id;
        editingOriginal = snapshotRow($tr);

        // enable inputs except amount/kg (manual locked rule you already use)
        $tr.find('.fxSInp').not('.fxPerKg')
            .prop('disabled', false)
            .removeClass('border-transparent bg-transparent')
            .addClass('border-slate-200 bg-white');

        // show top buttons (save hidden until dirty)
        $('#fxTopCancelShipBtn').removeClass('hidden');
        $('#fxTopSaveShipBtn').addClass('hidden');

        // row highlight
        $('#fxShipmentTbody tr').removeClass('ring-2 ring-indigo-200');
        $tr.addClass('ring-2 ring-indigo-200');
    }

    function exitShipmentEditMode($tr, restore = false) {
        if (restore) restoreSnapshot($tr, editingOriginal);

        $tr.find('.fxSInp').not('.fxPerKg')
            .prop('disabled', true)
            .removeClass('border-slate-200 bg-white')
            .addClass('border-transparent bg-transparent');

        $tr.removeClass('ring-2 ring-indigo-200');

        editingShipmentId = null;
        editingOriginal = null;

        $('#fxTopSaveShipBtn').addClass('hidden');
        $('#fxTopCancelShipBtn').addClass('hidden');
    }

    // ---------- load invoices ----------
    function loadInvoices() {
        return $.getJSON(URLs.invoices)
            .done(function (data) {
                invoicesCache = Array.isArray(data) ? data : [];

                // OLD first → NEW last
                invoicesCache.sort((a, b) => Number(a.id) - Number(b.id));

                // fixed S.NO based on invoice list order (doesn't change with search/filter)
                sNoMap = {};
                invoicesCache.forEach((inv, i) => { sNoMap[String(inv.id)] = i + 1; });

                renderInvoicesTable();
                renderInvoiceListForTracker();
                renderDueReminders();
                renderSummaryTotal();

                // if a tracker invoice already selected, refresh header amount/date + keep highlight
                if (activeInvoiceId) {
                    const inv = invoicesCache.find(x => String(x.id) === String(activeInvoiceId));
                    if (inv) renderTrackerHeader(inv);
                }
            })
            .fail(function () {
                $('#fxInvoiceTbody').html('<tr><td colspan="10" class="p-6 text-center text-slate-400">Failed to load invoices.</td></tr>');
            });
    }

    function renderSummaryTotal() {
        const filtered = getFilteredInvoices();

        let total = 0;
        filtered.forEach(inv => {
            total += Number(inv.amount_due || 0);
        });

        $('#fxSummaryTotal').text(fmtMoneyAED(total));
    }

    // ---------- filters ----------
    $('#fxSearch').on('input', function () {
        renderInvoicesTable();
        renderDueReminders();
    });
    $('#fxFilterStatus').on('change', function () {
        renderInvoicesTable();
        renderDueReminders();
    });

    function renderInvoicesTable() {
        const filtered = getFilteredInvoices();

        const $tbody = $('#fxInvoiceTbody');
        $tbody.empty();

        if (!filtered.length) {
            $tbody.html('<tr><td colspan="10" class="p-6 text-center text-slate-400">No invoices found.</td></tr>');
            return;
        }

        filtered.forEach((inv, idx) => {
            const sNo = sNoMap[String(inv.id)] || (idx + 1);
            const due = inv.due_date_text ? inv.due_date_text : fmtLongDate(inv.due_date);

            const pay = String(inv.payment_status || 'Unpaid');
            const payPill = payStatusPill(pay);

            $tbody.append(`
                <tr>
                <td class="p-3">${sNo}</td>
                <td class="p-3 font-medium">${esc(inv.invoice_number ?? '')}</td>
                <td class="p-3">${fmtLongDate(inv.invoice_date) || '—'}</td>
                <td class="p-3">${esc(due || '—')}</td>
                <td class="p-3 font-semibold text-slate-900">
                    <span class="inline-flex items-center whitespace-nowrap px-2 py-1 rounded-md bg-slate-50 border border-slate-200">
                        ${fmtMoneyAED(inv.amount_due)}
                    </span>
                </td>
                <td class="p-3">
                    <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${statusPill(inv.status)}">
                        ${esc(inv.status ?? '')}
                    </span>
                </td>
                <td class="p-3">${esc(inv.remarks ?? '')}</td>
                <td class="p-3">
                <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${payPill}">
                    ${esc(pay)}
                </span>
                </td>
                <td class="p-3">${esc(inv.payment_reference ?? '')}</td>
                <td class="p-3">
                    <div class="flex items-center gap-2">
                        <!-- EDIT -->
                        <button type="button"
                        class="fxEdit group relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                        data-id="${inv.id}">
                        <i class="bi bi-pencil-square text-slate-700"></i>
                        <span class="absolute -top-8 left-1/2 -translate-x-1/2
                                    hidden group-hover:block
                                    text-xs bg-slate-900 text-white px-2 py-1 rounded shadow-lg
                                    whitespace-nowrap break-normal inline-block z-50 pointer-events-none">
                        Edit
                        </span>
                        </button>

                        <!-- DELETE -->
                        <button type="button"
                        class="fxDel group relative p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                        data-id="${inv.id}">
                        <i class="bi bi-trash"></i>
                        <span class="absolute -top-8 left-1/2 -translate-x-1/2
                                    hidden group-hover:block
                                    text-xs bg-red-600 text-white px-2 py-1 rounded shadow-lg
                                    whitespace-nowrap break-normal inline-block z-50 pointer-events-none">
                        Delete
                        </span>
                        </button>
                    </div>
                </td>
                </tr>
            `);
        });

        renderDueReminders();
        renderSummaryTotal();
    }

    // ---------- edit/delete invoice ----------
    $('#fxInvoiceTbody').on('click', '.fxEdit', function () {
        const id = $(this).data('id');
        const inv = invoicesCache.find(x => String(x.id) === String(id));
        if (!inv) return;

        resetInvoiceForm();
        $('#fxInvoiceModalTitle').text('Edit Invoice');
        $('#fxInvoiceId').val(inv.id);
        $('#fxInvoiceNumber').val(inv.invoice_number ?? '');
        $('#fxStatus').val(inv.status ?? 'Pending');
        $('#fxInvoiceDate').val(toISODate(inv.invoice_date) || '');
        $('#fxDueDate').val(toISODate(inv.due_date) || '');
        $('#fxDueDateText').val(inv.due_date_text ?? '');
        $('#fxRemarks').val(inv.remarks ?? '');
        $('#fxPaymentStatus').val(inv.payment_status || 'Unpaid');
        $('#fxPaymentRef').val(inv.payment_reference ?? '');
        openModal();
    });

    $('#fxInvoiceTbody').on('click', '.fxDel', function () {
        const $btn = $(this);
        if ($btn.data('busy')) return;

        const id = $btn.data('id');
        const inv = invoicesCache.find(x => String(x.id) === String(id));
        if (!inv) return;

        fxModal({
            type: 'danger',
            title: 'Delete Invoice?',
            message: `Delete invoice <b>${esc(inv.invoice_number)}</b>? This will also delete its shipments.`,
            confirm: true,
            okText: 'Delete',
            cancelText: 'Cancel'
        }).then((yes) => {
            if (!yes) return;

            const url = URLs.deleteInvoiceTmpl.replace('__ID__', id);

            withBtnLock($btn, () => {
                return $.ajax({ url, method: 'DELETE', dataType: 'json' })
                    .done(() => {
                        // if deleted invoice is currently selected in tracker, reset tracker UI
                        if (String(activeInvoiceId) === String(id)) {
                            activeInvoiceId = null;

                            $('#fxAddShipmentBtn').addClass('hidden');
                            $('#fxImportShipmentsBtn').addClass('hidden');

                            $('#fxTrackerHeader').html('');
                            $('#fxShipmentPlaceholder').removeClass('hidden').text('No invoice selected.');
                            $('#fxShipmentTableWrap').addClass('hidden');

                            // also remove highlight from left invoice list (tracker)
                            $('#fxInvoiceList .fxPickInvoice').removeClass('bg-slate-50 ring-1 ring-slate-200');
                        }

                        // refresh invoice lists + table
                        loadInvoices();
                    })
                    .fail(() => fxModal({ type: 'danger', title: 'Delete Failed', message: 'Failed to delete invoice.' }));
            }, { icon: 'bi-trash' });
        });
    });

    // ---------- create/update invoice ----------
    $('#fxInvoiceForm').on('submit', function (e) {
        e.preventDefault();
        hideErr();

        const $saveBtn = $('#fxSaveInvoice');

        withBtnLock($saveBtn, () => {
            const id = $('#fxInvoiceId').val();
            const payload = {
                invoice_number: $('#fxInvoiceNumber').val(),
                status: $('#fxStatus').val(),
                invoice_date: $('#fxInvoiceDate').val() || null,
                due_date: $('#fxDueDate').val() || null,
                due_date_text: $('#fxDueDateText').val() || null,
                remarks: $('#fxRemarks').val(),
                payment_status: $('#fxPaymentStatus').val(),
                payment_reference: $('#fxPaymentRef').val(),
            };

            if (!payload.invoice_number) { showErr('Invoice Number is required.'); return Promise.reject(); }
            if (!payload.due_date && !payload.due_date_text) {
                showErr('Please set Due Date (date) or Due Date text (e.g., Due on receipt).');
                return Promise.reject();
            }

            const isEdit = !!id;
            const url = isEdit ? URLs.updateInvoiceTmpl.replace('__ID__', id) : URLs.storeInvoice;
            const method = isEdit ? 'PUT' : 'POST';

            return $.ajax({
                url,
                method,
                data: JSON.stringify(payload),
                contentType: 'application/json',
                dataType: 'json'
            }).done(function () {
                closeModal();
                loadInvoices();
            }).fail(function (xhr) {
                let msg = 'Failed to save invoice.';
                if (xhr.responseJSON?.message) msg = xhr.responseJSON.message;
                if (xhr.responseJSON?.errors) msg = Object.values(xhr.responseJSON.errors).flat().join(' | ');
                showErr(msg);
            });

        }, { icon: 'bi-arrow-repeat', text: 'Saving…' });
    });

    // ---------- tracker invoice list ----------
    function renderInvoiceListForTracker() {
        const $list = $('#fxInvoiceList');
        $list.empty();

        if (!invoicesCache.length) {
            $list.html('<div class="p-4 text-slate-400">No invoices.</div>');
            return;
        }

        [...invoicesCache].forEach(inv => {
            $list.append(`
        <button type="button"
          class="fxPickInvoice w-full text-left p-4 hover:bg-slate-50 ${String(activeInvoiceId) === String(inv.id) ? 'bg-indigo-50 ring-1 ring-indigo-200' : ''}"
          data-id="${inv.id}">
          <div class="flex items-center justify-between gap-2">
            <div class="font-semibold">${esc(inv.invoice_number)}</div>
            <div class="text-xs px-2 py-1 rounded-full border ${payStatusPill(inv.payment_status)}">
                ${esc(inv.payment_status || 'Unpaid')}
            </div>
          </div>
          <div class="text-xs text-slate-500 mt-1">
            Amount Due: <span class="font-semibold">${fmtMoneyAED(inv.amount_due)}</span>
          </div>
        </button>
      `);
        });
    }

    $('#fxInvoiceList').on('click', '.fxPickInvoice', function () {
        const $btn = $(this);
        if ($btn.data('busy')) return;

        const id = $btn.data('id');
        const inv = invoicesCache.find(x => String(x.id) === String(id));
        if (!inv) return;

        withBtnLock($btn, () => {
            activeInvoiceId = inv.id;

            $('#fxAddShipmentBtn').removeClass('hidden');
            $('#fxImportShipmentsBtn').removeClass('hidden');

            $('#fxInvoiceList .fxPickInvoice').removeClass('bg-indigo-50 ring-1 ring-indigo-200');
            $btn.addClass('bg-indigo-50 ring-1 ring-indigo-200');

            renderTrackerHeader(inv);
            setPaidByCustomerText('Select a shipment row');

            $('#fxShipmentPlaceholder').removeClass('hidden').text('Loading shipments…');
            $('#fxShipmentTableWrap').addClass('hidden');

            $('#fxAddShipmentBtn')
                .removeClass('hidden opacity-60 cursor-not-allowed')
                .prop('disabled', false);

            return loadShipments(inv.id);
        }, { icon: 'bi-arrow-repeat', text: 'Loading…' });
    });

    // ---------- init ----------
    loadInvoices();

    function num(v) {
        const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
        return Number.isFinite(n) ? n : 0;
    }

    function toDateTimeLocal(v) {
        if (!v) return '';
        // backend often returns "YYYY-MM-DD HH:mm:ss" or ISO
        const s = String(v).replace(' ', 'T');
        return s.length >= 16 ? s.slice(0, 16) : s;
    }

    function renderTrackerHeader(inv) {
        const due = inv.due_date_text ? inv.due_date_text : fmtLongDate(inv.due_date);
        const sNo = sNoMap[String(inv.id)] || '—';

        $('#fxTrackerHeader').html(`
            <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div>
                <div class="text-[11px] uppercase tracking-wide text-slate-500">S.NO</div>
                <div class="text-lg font-semibold text-slate-900">${sNo}</div>
                <div class="text-[11px] text-slate-400">Same as Summary</div>
            </div>
            <div>
                <div class="text-xs text-slate-500">Invoice Number</div>
                <div class="font-semibold">${esc(inv.invoice_number)}</div>
            </div>
            <div>
                <div class="text-xs text-slate-500">Invoice Date</div>
                <div class="font-semibold">${fmtLongDate(inv.invoice_date)}</div>
            </div>
            <div>
                <div class="text-xs text-slate-500">Due Date</div>
                <div class="font-semibold">${esc(due || '')}</div>
            </div>
            <div>
                <div class="text-xs text-slate-500">Amount Due</div>
                <div class="font-semibold" data-amt-due>${fmtMoneyAED(inv.amount_due)}</div>
            </div>
            <div>
                <div class="text-xs text-slate-500">Paid By Customer</div>
                <div id="fxPaidByCustomer" class="text-slate-400 italic">
                    Select a shipment row
                </div>
            </div>
            </div>
        `);
    }

    function setPaidByCustomerText(val) {
        const v = String(val || '').trim();
        $('#fxPaidByCustomer').text(v || '—');
    }

    function setPaidByCustomerFromRow($tr) {
        if (!$tr || !$tr.length) return;
        setPaidByCustomerText($tr.find('.fxPaidBy').val());
    }

    function renderPaidByCustomerCard() {
        const $el = $('#fxPaidByCustomer');
        if (!$el.length) return;

        // if a row is currently selected, don’t overwrite it
        if (editingShipmentId) return;

        if (!shipmentsCache.length) {
            $el.text('—');
            return;
        }

        // collect distinct values (Yes/No/Text)
        const vals = [...new Set(
            shipmentsCache
                .map(r => String(r.paid_by_customer || '').trim())
                .filter(v => v !== '')
        )];

        // If all rows same -> show that
        // If multiple -> show "Mixed" + counts
        if (!vals.length) {
            $el.text('—');
            return;
        }

        if (vals.length === 1) {
            $el.text(vals[0]);
            return;
        }

        // optional: show a clean summary
        const counts = {};
        shipmentsCache.forEach(r => {
            const v = String(r.paid_by_customer || '').trim() || '—';
            counts[v] = (counts[v] || 0) + 1;
        });

        const parts = Object.entries(counts).map(([k, c]) => `${k}: ${c}`);
        $el.text(`Mixed (${parts.join(', ')})`);
    }

    function renderPaidUnpaidTotals() {
        let paid = 0;
        let unpaid = 0;

        shipmentsCache.forEach(r => {
            const sub = num(r.subtotal_amount);
            const st = String(r.payment_status || '').trim().toLowerCase();

            if (st === 'paid') paid += sub;
            else if (st === 'unpaid') unpaid += sub;
        });

        $('#fxPaidTotal').text(fmtMoneyAED(paid));
        $('#fxUnpaidTotal').text(fmtMoneyAED(unpaid));
    }

    function resetPaidUnpaidTotals() {
        $('#fxPaidTotal').text(fmtMoneyAED(0));
        $('#fxUnpaidTotal').text(fmtMoneyAED(0));
    }

    function loadShipments(invoiceId) {
        const url = URLs.shipmentsUrlTmpl.replace('__ID__', invoiceId);

        $('#fxShipmentPlaceholder').removeClass('hidden').text('Loading shipments…');
        $('#fxShipmentTableWrap').addClass('hidden');
        $('#fxShipmentTbody').empty();
        $('#fxShipmentTotals').empty();

        return $.getJSON(url)
            .done(function (rows) {
                shipmentsCache = Array.isArray(rows) ? rows : [];

                $('#fxShipmentPlaceholder').addClass('hidden');
                $('#fxShipmentTableWrap').removeClass('hidden');

                renderShipmentsTable();
                renderShipmentTotals();
                renderPaidUnpaidTotals();

                // enable add button
                $('#fxAddShipmentBtn')
                    .prop('disabled', false)
                    .removeClass('opacity-60 cursor-not-allowed');
            })
            .fail(function () {
                $('#fxShipmentPlaceholder').removeClass('hidden').text('Failed to load shipments.');

                $('#fxAddShipmentBtn')
                    .prop('disabled', false)
                    .removeClass('opacity-60 cursor-not-allowed');
            });
    }

    function renderShipmentsTable() {
        const $tb = $('#fxShipmentTbody');
        $tb.empty();

        if (!shipmentsCache.length) {
            $tb.html(`<tr><td colspan="20" class="p-6 text-center text-slate-400">No shipments yet.</td></tr>`);
            return;
        }

        shipmentsCache.forEach(r => {
            $tb.append(shipmentRowHtml(r, false));
        });
    }

    function renderShipmentTotals() {
        let w = 0, bw = 0, sub = 0, diff = 0;

        shipmentsCache.forEach(r => {
            w += num(r.weight);
            bw += num(r.billed_weight);
            sub += num(r.subtotal_amount);
            diff += num(r.diff);
        });

        $('#fxShipmentTotals').html(`
      <tr>
        <td class="p-3" colspan="6">TOTAL</td>
        <td class="p-3">${w.toFixed(2)}</td>
        <td class="p-3">${bw.toFixed(2)}</td>
        <td class="p-3">${sub.toFixed(2)}</td>
        <td class="p-3"></td>
        <td class="p-3">${diff.toFixed(2)}</td>
        <td class="p-3" colspan="9"></td>
      </tr>
    `);
    }

    function getLastFieldValue(selector) {
        const $lastSaved = $('#fxShipmentTbody tr[data-draft="0"]').last();
        if ($lastSaved.length) {
            const v = $lastSaved.find(selector).val();
            if (v) return v;
        }
        const $lastAny = $('#fxShipmentTbody tr').last();
        return $lastAny.find(selector).val() || '';
    }

    $('#fxAddShipmentBtn').on('click', function () {
        const $btn = $(this);
        if ($btn.data('busy')) return;
        if (!activeInvoiceId) return;

        if ($('#fxShipmentTbody tr[data-draft="1"]').length) return;

        setBtnLoading($btn, true, { icon: 'bi-plus-lg' });

        const prevShipDate = getLastFieldValue('.fxShipDate');
        const prevDelivery = getLastFieldValue('.fxDelivery');

        const draft = {
            id: '',
            shipment_id: '',
            origin: 'DXB',
            destination: '',
            ship_date: prevShipDate || '',
            service: 'FedEx Intl Priority',
            pcs: '',
            weight: '',
            billed_weight: '',
            subtotal_amount: '',
            amount_per_kg: '',
            diff: '',
            shipping_status: 'Delivered',
            signed_for_by: '',
            actual_delivery_at: prevDelivery || '',
            paid_by_customer: '',
            payment_status: '',
            duties_taxes_bill_to: '',
            remarks: '',
            history: null
        };

        $('#fxShipmentPlaceholder').addClass('hidden');
        $('#fxShipmentTableWrap').removeClass('hidden');

        $('#fxShipmentTbody').append(shipmentRowHtml(draft, true));

        const $newRow = $('#fxShipmentTbody tr[data-draft="1"]').last();

        setTimeout(() => setBtnLoading($btn, false, { icon: 'bi-plus-lg' }), 150);
    });

    function payStatusClass(v) {
        return String(v).toLowerCase() === 'paid'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700';
    }

    function shipmentRowHtml(r, isDraft) {
        const rid = r.id ? String(r.id) : '';
        const dis = isDraft ? '' : 'disabled';
        const baseCls = isDraft ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200' : 'border-transparent bg-transparent';

        const perKgDis = isDraft ? '' : 'disabled';
        const perKgCls = isDraft ? 'border-amber-300 bg-amber-50 ring-1 ring-amber-200' : 'border-transparent bg-transparent';

        return `
            <tr data-id="${esc(rid)}" data-draft="${isDraft ? '1' : '0'}" class="${isDraft ? 'bg-amber-50/40' : ''}">
            <td class="p-2"><input ${dis} class="fxSInp fxShipmentId w-32 px-2 py-1 rounded border ${baseCls}" value="${esc(r.shipment_id || '')}"></td>
            <td class="p-2"><input ${dis} class="fxSInp fxOrigin w-16 px-2 py-1 rounded border ${baseCls}" value="${esc(r.origin || 'DXB')}"></td>
            <td class="p-2"><input ${dis} class="fxSInp fxDest w-40 px-2 py-1 rounded border ${baseCls}" value="${esc(r.destination || '')}"></td>
            <td class="p-2"><input ${dis} type="date" class="fxSInp fxShipDate w-36 px-2 py-1 rounded border ${baseCls}" value="${esc(toISODate(r.ship_date) || '')}"></td>

            <td class="p-2">
                <div class="relative min-w-[180px]">
                    <select ${dis} class="fxSInp fxService w-full appearance-none pr-8 px-2 py-1 rounded border ${baseCls}">
                    <option value="" ${!r.service ? 'selected' : ''}>—</option>
                    <option value="FedEx Intl Priority" ${String(r.service || '') === 'FedEx Intl Priority' ? 'selected' : ''}>FedEx Intl Priority</option>
                    <option value="Economy Service" ${String(r.service || '') === 'Economy Service' ? 'selected' : ''}>Economy Service</option>
                    </select>

                    <svg class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                    viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                        clip-rule="evenodd" />
                    </svg>
                </div>
            </td>

            <td class="p-2"><input ${dis} class="fxSInp fxPcs w-20 px-2 py-1 rounded border ${baseCls}" value="${esc(r.pcs ?? '')}"></td>
            <td class="p-2"><input ${dis} class="fxSInp fxWeight w-24 px-2 py-1 rounded border ${baseCls}" value="${esc(r.weight ?? '')}"></td>
            <td class="p-2"><input ${dis} class="fxSInp fxBilled w-28 px-2 py-1 rounded border ${baseCls}" value="${esc(r.billed_weight ?? '')}"></td>
            <td class="p-2"><input ${dis} class="fxSInp fxSubtotal w-28 px-2 py-1 rounded border ${baseCls}" value="${esc(r.subtotal_amount ?? '')}"></td>
            <td class="p-2">
            <input ${perKgDis}
                class="fxSInp fxPerKg w-24 px-2 py-1 rounded border ${perKgCls}"
                value="${esc(r.amount_per_kg ?? '')}">
            </td>
            <td class="p-2"><input ${dis} class="fxSInp fxDiff w-24 px-2 py-1 rounded border ${baseCls}" value="${esc(r.diff ?? '')}"></td>

            <td class="p-2">
                <select ${dis} class="fxSInp fxShipStatus w-28 px-2 py-1 rounded border ${baseCls}">
                <option ${String(r.shipping_status || '') === 'Delivered' ? 'selected' : ''}>Delivered</option>
                <option ${String(r.shipping_status || '') === 'Canceled' ? 'selected' : ''}>Canceled</option>
                </select>
            </td>

            <td class="p-2"><input ${dis} class="fxSInp fxSigned w-32 px-2 py-1 rounded border ${baseCls}" value="${esc(r.signed_for_by || '')}"></td>
            <td class="p-2"><input ${dis} type="datetime-local" class="fxSInp fxDelivery w-52 px-2 py-1 rounded border ${baseCls}" value="${esc(toDateTimeLocal(r.actual_delivery_at))}"></td>
            <td class="p-2"><input ${dis} class="fxSInp fxPaidBy w-40 px-2 py-1 rounded border ${baseCls}" value="${esc(r.paid_by_customer || '')}"></td>
            <td class="p-2">
            <select ${dis}
                class="fxSInp fxPayStatus w-36 px-2 py-1 rounded border ${baseCls} ${payStatusClass(r.payment_status)}">
                
                <option value="">—</option>
                <option value="Paid" ${String(r.payment_status).toLowerCase() === 'paid' ? 'selected' : ''}>
                Paid
                </option>
                <option value="Unpaid" ${String(r.payment_status).toLowerCase() === 'unpaid' ? 'selected' : ''}>
                Unpaid
                </option>
            </select>
            </td>
            <td class="p-2"><input ${dis} class="fxSInp fxBillTo w-44 px-2 py-1 rounded border ${baseCls}" value="${esc(r.duties_taxes_bill_to || '')}"></td>
            <td class="p-2"><textarea ${dis} rows="1" class="fxSInp fxRemarks w-56 px-2 py-1 rounded border ${baseCls}">${esc(r.remarks || '')}</textarea></td>
            <td class="p-2">
                <textarea ${dis} rows="1"
                    class="fxSInp fxHistory w-40 px-2 py-1 rounded border ${baseCls}"
                >${esc((r.history && typeof r.history === 'object' ? (r.history.note || '') : (r.history || '')) || '')}</textarea>
            </td>

            <td class="p-2">
                <div class="flex items-center gap-2">

                    ${isDraft ? `
                    <!-- SAVE (draft) -->
                    <button class="fxSaveShip group relative p-2 rounded-lg text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800">
                        <i class="bi bi-check-lg"></i>
                        <span class="absolute -top-8 left-1/2 -translate-x-1/2
                                    hidden group-hover:block
                                    text-xs bg-slate-900 text-white px-2 py-1 rounded">
                        Save
                        </span>
                    </button>

                    <!-- CANCEL (draft) -->
                    <button class="fxCancelShip group relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50">
                        <i class="bi bi-x-lg text-slate-600"></i>
                        <span class="absolute -top-8 left-1/2 -translate-x-1/2
                                    hidden group-hover:block
                                    text-xs bg-slate-900 text-white px-2 py-1 rounded">
                        Cancel
                        </span>
                    </button>
                    ` : `
                    <!-- DELETE -->
                    <button class="fxDelShip group relative p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                        <i class="bi bi-trash"></i>
                        <span class="absolute -top-8 right-0 hidden group-hover:block
                                    text-xs bg-red-600 text-white px-2 py-1 rounded whitespace-nowrap">
                        Delete
                        </span>
                    </button>
                    `}
                </div>
            </td>
            </tr>
        `;
    }

    function shipmentPayload($tr) {
        const billed = num($tr.find('.fxBilled').val());
        const subtotal = num($tr.find('.fxSubtotal').val());

        return {
            shipment_id: $tr.find('.fxShipmentId').val(),
            origin: $tr.find('.fxOrigin').val() || 'DXB',
            destination: $tr.find('.fxDest').val(),
            ship_date: $tr.find('.fxShipDate').val() || null,
            service: $tr.find('.fxService').val(),
            pcs: $tr.find('.fxPcs').val() || null,
            weight: num($tr.find('.fxWeight').val()),
            billed_weight: billed,
            subtotal_amount: subtotal,
            amount_per_kg: num($tr.find('.fxPerKg').val()),
            diff: +(num($tr.find('.fxDiff').val())).toFixed(2),
            shipping_status: $tr.find('.fxShipStatus').val(),
            signed_for_by: $tr.find('.fxSigned').val(),
            actual_delivery_at: $tr.find('.fxDelivery').val() || null,
            paid_by_customer: $tr.find('.fxPaidBy').val(),
            payment_status: $tr.find('.fxPayStatus').val(),
            duties_taxes_bill_to: $tr.find('.fxBillTo').val(),
            remarks: $tr.find('.fxRemarks').val(),
            history: { note: $tr.find('.fxHistory').val() || '' }
        };
    }

    $('#fxShipmentTbody').on('change', '.fxPayStatus', function () {
        const $sel = $(this);
        $sel.removeClass(
            'bg-emerald-50 border-emerald-200 text-emerald-700 bg-red-50 border-red-200 text-red-700'
        ).addClass(payStatusClass($sel.val()));
        recalcPaidUnpaidLive();
    });

    $('#fxShipmentTbody').on('click', '.fxSaveShip', function () {
        const $btn = $(this);
        if ($btn.data('busy')) return;

        const $tr = $btn.closest('tr');
        if (!activeInvoiceId) return;

        const payload = shipmentPayload($tr);
        if (!payload.shipment_id) {
            fxModal({ type: 'warning', title: 'Missing Shipment ID', message: 'Shipment ID is required.' });
            return;
        }

        const url = URLs.storeShipmentTmpl.replace('__ID__', activeInvoiceId);

        withBtnLock($btn, () => {
            return $.ajax({
                url, method: 'POST',
                data: JSON.stringify(payload),
                contentType: 'application/json',
                dataType: 'json'
            }).done(function () {
                loadShipments(activeInvoiceId);
                loadInvoices();
            }).fail(function (xhr) {
                fxModal({
                    type: 'danger',
                    title: 'Save Failed',
                    message: xhr.responseJSON?.message || 'Failed to save shipment.'
                });
            });
        }, { icon: 'bi-arrow-repeat' });
    });

    $('#fxShipmentTbody').on('click', '.fxCancelShip', function () {
        $(this).closest('tr').remove();
    });

    $('#fxShipmentTbody').on('click', '.fxDelShip', function () {
        const $btn = $(this);
        if ($btn.data('busy')) return;

        const id = $btn.closest('tr').data('id');
        if (!id) return;

        fxModal({
            type: 'danger',
            title: 'Delete Shipment?',
            message: 'Are you sure you want to delete this shipment?',
            confirm: true,
            okText: 'Delete',
            cancelText: 'Cancel'
        }).then((yes) => {
            if (!yes) return;

            const url = URLs.deleteShipmentTmpl.replace('__ID__', id);

            withBtnLock($btn, () => {
                return $.ajax({ url, method: 'DELETE', dataType: 'json' })
                    .done(function () {
                        loadShipments(activeInvoiceId);
                        loadInvoices();
                    })
                    .fail(() => fxModal({ type: 'danger', title: 'Delete Failed', message: 'Failed to delete shipment.' }));
            }, { icon: 'bi-trash' });
        });
    });

    function recalcRow($tr) {
        // Amount / KG is MANUAL now → do nothing here
        // (keep this function in case you add other row-calcs later)
    }

    function recalcTotalsLive() {
        let w = 0, bw = 0, sub = 0, diff = 0;

        $('#fxShipmentTbody tr').each(function () {
            const $tr = $(this);

            w += num($tr.find('.fxWeight').val());
            bw += num($tr.find('.fxBilled').val());
            sub += num($tr.find('.fxSubtotal').val());
            diff += num($tr.find('.fxDiff').val());
        });

        $('#fxShipmentTotals').html(`
            <tr>
            <td class="p-3" colspan="6">TOTAL</td>
            <td class="p-3">${w.toFixed(2)}</td>
            <td class="p-3">${bw.toFixed(2)}</td>
            <td class="p-3">${sub.toFixed(2)}</td>
            <td class="p-3"></td>
            <td class="p-3">${diff.toFixed(2)}</td>
            <td class="p-3" colspan="9"></td>
            </tr>
        `);

        // OPTIONAL: live update Amount Due in tracker header
        $('#fxTrackerHeader .fxLiveDue').remove(); // avoid duplicates
        $('#fxTrackerHeader').find('[data-amt-due]').text(fmtMoneyAED(sub)); // if you add data attr (below)
    }

    function recalcPaidUnpaidLive() {
        let paid = 0;
        let unpaid = 0;

        $('#fxShipmentTbody tr').each(function () {
            const $tr = $(this);
            const sub = num($tr.find('.fxSubtotal').val());
            const st = String($tr.find('.fxPayStatus').val() || '').trim().toLowerCase();

            if (st === 'paid') paid += sub;
            else if (st === 'unpaid') unpaid += sub;
        });

        $('#fxPaidTotal').text(fmtMoneyAED(paid));
        $('#fxUnpaidTotal').text(fmtMoneyAED(unpaid));
    }

    $('#fxShipmentTbody').on('input change', '.fxBilled, .fxSubtotal, .fxWeight, .fxDiff', function () {
        const $tr = $(this).closest('tr');
        recalcRow($tr);
        recalcTotalsLive();
        recalcPaidUnpaidLive();
    });

    function importShipments(rows) {
        const $btn = $('#fxImportShipmentsBtn');

        withBtnLock($btn, () => {
            return $.ajax({
                url: URLs.importShipmentsTmpl.replace('__ID__', activeInvoiceId),
                method: 'POST',
                data: JSON.stringify({ rows }),
                contentType: 'application/json',
                dataType: 'json'
            }).done((res) => {
                if (res?.message) fxModal({ type: 'success', title: 'Import Complete', message: res.message });
                loadShipments(activeInvoiceId);
                loadInvoices();
            }).fail((xhr) => {
                fxModal({ type: 'danger', title: 'Import Failed', message: xhr.responseJSON?.message || 'Import failed.' });
            });
        }, { icon: 'bi-arrow-repeat', text: 'Importing…' });
    }

    function normalizeKey(k) {
        return String(k || '')
            .trim()
            .toLowerCase()
            .replace(/[:.]/g, '')        // remove colon and dot
            .replace(/[^\w\s]/g, '')     // remove any other symbols
            .replace(/\s+/g, '_');       // spaces -> underscore
    }

    function excelSerialToISODateTime(serial) {
        serial = Number(serial);
        if (!Number.isFinite(serial) || serial <= 0) return null;

        const utcDays = Math.floor(serial - 25569);
        const utcValue = utcDays * 86400;
        const dateInfo = new Date(utcValue * 1000);

        const fractionalDay = serial - Math.floor(serial);
        const totalSeconds = Math.round(fractionalDay * 86400);

        const hh = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');

        const yyyy = dateInfo.getUTCFullYear();
        const mo = String(dateInfo.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(dateInfo.getUTCDate()).padStart(2, '0');

        return `${yyyy}-${mo}-${dd}T${hh}:${mm}`; // datetime-local format
    }

    function normalizeDateAny(v) {
        if (v == null || v === '') return null;

        const s = String(v).trim();

        // Excel serial (date or date+time)
        if (/^\d+(\.\d+)?$/.test(s)) {
            return excelSerialToISODateTime(parseFloat(s));
        }

        // dd/mm/yyyy hh:mm AM/PM  (e.g. 08/08/2024 10:49 AM)
        let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
        if (m) {
            let hh = parseInt(m[4], 10);
            const mm = m[5];
            const ap = m[6].toUpperCase();
            if (ap === 'PM' && hh < 12) hh += 12;
            if (ap === 'AM' && hh === 12) hh = 0;
            return `${m[3]}-${m[2]}-${m[1]} ${String(hh).padStart(2, '0')}:${mm}:00`;
        }

        // dd/mm/yyyy only
        m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;

        // yyyy-mm-dd (with optional time)
        const iso = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?$/);
        if (iso) {
            if (iso[2]) return `${iso[1]} ${iso[2]}:00`;
            return iso[1];
        }

        return null;
    }

    function normalizeDateTimeAny(v) {
        if (!v) return null;
        const s = String(v).trim();

        // Excel numeric datetime serial (can be decimal)
        if (/^\d+(\.\d+)?$/.test(s)) {
            return excelSerialToISODateTime(parseFloat(s));
        }

        // Supports: "8/8/24 at 10:57 AM"  OR  "08/08/2024 10:57 AM"
        const m = s.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*(?:at\s*)?(\d{1,2}):(\d{2})\s*(AM|PM)$/i
        );
        if (m) {
            const dd = String(m[1]).padStart(2, '0');
            const mm = String(m[2]).padStart(2, '0');

            let yyyy = m[3];
            if (yyyy.length === 2) yyyy = '20' + yyyy; // 24 -> 2024 (good for your use case)

            let hh = parseInt(m[4], 10);
            const min = m[5];
            const ap = m[6].toUpperCase();

            if (ap === 'PM' && hh < 12) hh += 12;
            if (ap === 'AM' && hh === 12) hh = 0;

            const HH = String(hh).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}T${HH}:${min}`;
        }

        // already ISO-ish: "2024-08-08 10:49:00" or "2024-08-08T10:49"
        const iso = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
        if (iso) return `${iso[1]}T${iso[2]}`;

        return null;
    }

    function normalizeActualDeliveryMDY(v) {
        if (v == null || v === '') return null;
        const s = String(v).trim();

        // Excel numeric datetime serial (can be decimal)
        if (/^\d+(\.\d+)?$/.test(s)) {
            return excelSerialToISODateTime(parseFloat(s));
        }

        // mm/dd/yy at hh:mm AM/PM   OR mm/dd/yyyy at hh:mm AM/PM
        const m = s.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s*(?:at\s*)?(\d{1,2}):(\d{2})\s*(AM|PM)$/i
        );
        if (m) {
            const mm = String(m[1]).padStart(2, '0'); // month first
            const dd = String(m[2]).padStart(2, '0'); // day second

            let yyyy = m[3];
            if (yyyy.length === 2) yyyy = '20' + yyyy;

            let hh = parseInt(m[4], 10);
            const min = m[5];
            const ap = m[6].toUpperCase();

            if (ap === 'PM' && hh < 12) hh += 12;
            if (ap === 'AM' && hh === 12) hh = 0;

            // guards
            const monthNum = parseInt(mm, 10);
            const dayNum = parseInt(dd, 10);
            if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;

            const HH = String(hh).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}T${HH}:${min}`;
        }

        // ISO-ish already
        const iso = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
        if (iso) return `${iso[1]}T${iso[2]}`;

        return null;
    }

    // map Excel headers → your DB fields
    function mapRow(row) {
        // row is like: { shipment_id: '...', billed_weight: '...' }
        return {
            shipment_id: row.shipment_id || row.awb || row.tracking_no || '',
            origin: row.origin || 'DXB',
            destination: row.destination || '',
            ship_date: normalizeDateAny(row.ship_date || row.date),
            service: row.service || 'FedEx Intl Priority',
            pcs: row.pcs || null,
            weight: row.weight || 0,
            billed_weight: row.billed_weight || row.billed || 0,
            subtotal_amount: row.subtotal_amount || row.subtotal || 0,
            amount_per_kg: row.amount_per_kg || row.amount_per_kg_aed || '', // MANUAL if provided
            diff: row.diff || 0,
            shipping_status: row.shipping_status || 'Delivered',
            signed_for_by: row.signed_for_by || row.signed_for || row.signed_by || '',
            actual_delivery_at: normalizeActualDeliveryMDY(row.actual_delivery_at || row.actual_delivery || row.delivery) || null,
            paid_by_customer: row.paid_by_customer || '',
            payment_status: row.payment_status || '',
            duties_taxes_bill_to: row.duties_taxes_bill_to || '',
            remarks: row.remarks || ''
        };
    }

    $('#fxImportShipmentsBtn').on('click', function () {
        if (!activeInvoiceId) {
            fxModal({ type: 'info', title: 'Select an Invoice', message: 'Please select an invoice first.' });
            return;
        }
        $('#fxImportFile').val('').click();
    });

    $('#fxImportFile').on('change', function (e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (evt) {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

            // normalize keys
            const normalized = raw.map(r => {
                const obj = {};
                Object.keys(r).forEach(k => obj[normalizeKey(k)] = r[k]);
                return obj;
            });

            const rows = normalized.map(mapRow).filter(r => r.shipment_id);

            if (!rows.length) return alert('No valid rows found. Ensure Shipment ID column exists.');

            // now send to backend
            importShipments(rows);
        };
        reader.readAsArrayBuffer(file);
    });

    (function enableDragScroll() {
        const el = document.getElementById('fxShipmentScroll');
        if (!el) return;

        let isDown = false;
        let startX = 0;
        let startScrollLeft = 0;

        // mouse
        el.addEventListener('mousedown', (e) => {
            // allow text inputs to work normally
            if (e.target.closest('input, textarea, select, button, a')) return;

            isDown = true;
            el.classList.add('dragging');
            el.style.cursor = 'grabbing';

            startX = e.pageX - el.offsetLeft;
            startScrollLeft = el.scrollLeft;
        });

        window.addEventListener('mouseup', () => {
            isDown = false;
            el.classList.remove('dragging');
            el.style.cursor = '';
        });

        el.addEventListener('mouseleave', () => {
            isDown = false;
            el.classList.remove('dragging');
            el.style.cursor = '';
        });

        el.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();

            const x = e.pageX - el.offsetLeft;
            const walk = (x - startX) * 1.2; // speed factor
            el.scrollLeft = startScrollLeft - walk;
        });

        // touch (mobile)
        let touchStartX = 0;
        let touchStartLeft = 0;

        el.addEventListener('touchstart', (e) => {
            if (e.target.closest('input, textarea, select, button, a')) return;

            touchStartX = e.touches[0].pageX;
            touchStartLeft = el.scrollLeft;
        }, { passive: true });

        el.addEventListener('touchmove', (e) => {
            if (e.target.closest('input, textarea, select, button, a')) return;

            const dx = e.touches[0].pageX - touchStartX;
            el.scrollLeft = touchStartLeft - dx;
        }, { passive: true });
    })();

    // custom dropdown (modern options list)
    $('#fxStatusBtn').on('click', function (e) {
        e.preventDefault();
        $('#fxStatusMenu').toggleClass('hidden');
    });

    // click option
    $(document).on('click', '.fxStatusOpt', function () {
        const val = $(this).data('value');
        const label = $(this).text().trim();

        $('#fxFilterStatus').val(val).trigger('change');
        $('#fxStatusLabel').text(label);

        $('#fxStatusMenu').addClass('hidden');
    });

    // close when clicking outside
    $(document).on('click', function (e) {
        if (!$(e.target).closest('#fxStatusDropdown').length) {
            $('#fxStatusMenu').addClass('hidden');
        }
    });

    $('#fxDueRemindersBody').on('click', '.fxReminderPick', function () {
        const id = $(this).data('id');

        // Switch to tracker tab
        $('.fxTab[data-tab="tracker"]').click();

        // Click invoice in tracker list
        setTimeout(() => {
            $('#fxInvoiceList .fxPickInvoice[data-id="' + id + '"]').click();
        }, 50);
    });

    $('#fxImportInvoicesBtn').on('click', function () {
        $('#fxImportInvoicesFile').val('').click();
    });

    $('#fxImportInvoicesFile').on('change', function (e) {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (evt) {
            const data = new Uint8Array(evt.target.result);
            const wb = XLSX.read(data, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

            const normalized = raw.map(r => {
                const obj = {};
                Object.keys(r).forEach(k => obj[normalizeKey(k)] = r[k]);
                return obj;
            });

            const rows = normalized.map(mapInvoiceRow).filter(r => r.invoice_number);

            if (!rows.length) {
                fxModal({ type: 'warning', title: 'No Rows', message: 'No valid rows found. Ensure Invoice Number column exists.' });
                return;
            }

            importInvoices(rows);
        };

        reader.readAsArrayBuffer(file);
    });

    function parseLongEnDateToISO(s) {
        if (!s) return null;
        s = String(s).trim();

        // already iso
        const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
        if (iso) return iso[1];

        // dd/mm/yyyy
        let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;

        // "Wednesday, 8 January 2025"
        // Browser can parse this reliably
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }

        return null;
    }

    function normalizeMoney(v) {
        const n = Number(String(v ?? '').replace(/AED/gi, '').replace(/,/g, '').replace(/[^0-9.\-]/g, ''));
        return Number.isFinite(n) ? n : 0;
    }

    function mapInvoiceRow(row) {
        const invoice_number = row.invoice_number || row.invoice || row.invoice_no || '';
        const invoice_date = parseLongEnDateToISO(row.invoice_date);

        const dueRaw = String(row.due_date ?? '').trim();
        const dueISO = parseLongEnDateToISO(dueRaw);

        // If it’s NOT a real date, treat as Due Date text
        const due_date = dueISO || null;
        const due_date_text = !dueISO && dueRaw ? dueRaw : (row.due_date_text || '');

        const rawPay = String(row.payment_status || '').toLowerCase();
        const payment_status = rawPay.includes('paid') ? 'Paid' : 'Unpaid';

        return {
            invoice_number,
            status: row.status || 'Pending',
            invoice_date,
            due_date,
            due_date_text,
            remarks: row.remarks || '',
            payment_status,
            payment_reference: row.payment_reference || '',
            amount_due: normalizeMoney(row.amount || row.amount_due),
            // for backend fallback
            due_date_raw: dueRaw,
        };
    }

    function importInvoices(rows) {
        const $btn = $('#fxImportInvoicesBtn');

        withBtnLock($btn, () => {
            return $.ajax({
                url: URLs.importInvoicesUrl,
                method: 'POST',
                data: JSON.stringify({ rows }),
                contentType: 'application/json',
                dataType: 'json'
            }).done((res) => {
                fxModal({ type: 'success', title: 'Import Complete', message: res?.message || 'Invoices imported.' });
                loadInvoices(); // refresh summary + due reminders + totals
            }).fail((xhr) => {
                fxModal({ type: 'danger', title: 'Import Failed', message: xhr.responseJSON?.message || 'Invoice import failed.' });
            });
        }, { icon: 'bi-arrow-repeat', text: 'Importing…' });
    }

    $('#fxShipmentTbody').on('click', 'tr[data-draft="0"]', function (e) {
        if ($(e.target).closest('input, textarea, select, button, a').length) return;

        const $tr = $(this);
        enterShipmentEditMode($tr);

        // update header from selected row
        setPaidByCustomerFromRow($tr);
    });

    $('#fxShipmentTbody').on('focus', 'tr[data-draft="0"] .fxSInp', function () {
        const $tr = $(this).closest('tr');
        if (String(editingShipmentId) !== String($tr.data('id'))) {
            enterShipmentEditMode($tr);
        }

        // update header from focused row
        setPaidByCustomerFromRow($tr);
    });

    $('#fxShipmentTbody').on('input change', '.fxPaidBy', function () {
        const $tr = $(this).closest('tr');

        // only if this is the row currently in edit mode
        if (editingShipmentId && String($tr.data('id')) === String(editingShipmentId)) {
            setPaidByCustomerFromRow($tr);
        }
    });

    $('#fxShipmentTbody').on('input change', 'tr[data-draft="0"] .fxSInp', function () {
        const $tr = $(this).closest('tr');
        if (!editingShipmentId) return;
        if (String($tr.data('id')) !== String(editingShipmentId)) return;

        const dirty = !rowEqualsSnapshot($tr, editingOriginal);
        $('#fxTopSaveShipBtn').toggleClass('hidden', !dirty);
    });

    $('#fxShipmentTbody').on(
        'input change',
        '.fxSubtotal, .fxPayStatus',
        function () {
            recalcPaidUnpaidLive();
        }
    );

    $('#fxTopCancelShipBtn').on('click', function () {
        if (!editingShipmentId) return;
        const $tr = $('#fxShipmentTbody tr[data-id="' + editingShipmentId + '"]');
        if ($tr.length) exitShipmentEditMode($tr, true);
    });

    $('#fxTopSaveShipBtn').on('click', function () {
        const $btn = $(this);
        if ($btn.data('busy')) return;
        if (!editingShipmentId) return;

        const $tr = $('#fxShipmentTbody tr[data-id="' + editingShipmentId + '"]');
        if (!$tr.length) return;

        const payload = shipmentPayload($tr);
        if (!payload.shipment_id) {
            fxModal({ type: 'warning', title: 'Missing Shipment ID', message: 'Shipment ID is required.' });
            return;
        }

        const url = URLs.updateShipmentTmpl.replace('__ID__', editingShipmentId);

        withBtnLock($btn, () => {
            return $.ajax({
                url,
                method: 'PUT',
                data: JSON.stringify(payload),
                contentType: 'application/json',
                dataType: 'json'
            }).done(function () {
                // refresh everything
                loadShipments(activeInvoiceId);
                loadInvoices();

                // exit edit mode after save
                // (loadShipments will rerender, so just clear top buttons)
                editingShipmentId = null;
                editingOriginal = null;
                $('#fxTopSaveShipBtn').addClass('hidden');
                $('#fxTopCancelShipBtn').addClass('hidden');
            }).fail(function (xhr) {
                fxModal({ type: 'danger', title: 'Update Failed', message: xhr.responseJSON?.message || 'Failed to update shipment.' });
            });
        }, { icon: 'bi-check-lg', text: 'Saving…' });
    });

});