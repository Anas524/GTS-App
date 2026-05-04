(function () {

    // ---------- shared helpers ----------
    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
    function csrf() {
        return document.querySelector('meta[name="csrf-token"]')?.content;
    }

    function withBookId(tmplUrl, bookId) {
        return String(tmplUrl || '').replace(/\/0(\/|$)/, '/' + String(bookId) + '$1');
    }

    function tmpl(urlTmpl, key, val) {
        return String(urlTmpl || '').replaceAll(String(key), String(val));
    }

    function setMonthLocked(isClosed) {
        $('#plBookClosedBar').toggleClass('hidden', !isClosed);

        $('.plDesc, .plAmt, .plRmk')
            .prop('disabled', isClosed)
            .toggleClass('opacity-60 cursor-not-allowed', isClosed);

        $('#plAddCashOutRow, #plAddCashInRow').toggleClass('hidden', isClosed);
        $('.plDel').toggleClass('hidden', isClosed);

        $('#plSaveAllOut, #plSaveAllIn').addClass('hidden');

        if (isClosed) $('.plRow').removeClass('is-dirty');
    }

    // ---------- PAGE SWITCH ----------
    $(function () {
        if (document.getElementById('plMonthRoot')) {
            initMonthPage();     // month view logic
            return;
        }
        if (document.getElementById('plRoot')) {
            initDashboard();     // dashboard logic
            return;
        }
    });

    function num(v) {
        if (typeof v === 'number') return v;
        return parseFloat(String(v ?? '0').replace(/[^\d.-]/g, '')) || 0;
    }

    function fmtAED(v) {
        const n = num(v);
        return 'AED ' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ================= DASHBOARD =================
    function initDashboard() {
        const root = document.getElementById('plRoot');
        if (!root) return;

        const monthViewTmpl = root.dataset.monthViewUrlTmpl;

        function renderMonths(months) {
            const wrap = document.getElementById('plMonthTabs');
            if (!wrap) return;

            wrap.innerHTML = '';

            months.forEach(m => {
                const btn = document.createElement('button');
                btn.type = 'button';

                // label: use m.label, or fallback from month_date
                const label = m.label || (m.month_date ? String(m.month_date).slice(0, 7) : 'Month');

                btn.textContent = label;

                btn.className =
                    'inline-flex items-center justify-center px-4 py-1.5 rounded-full border border-slate-200 ' +
                    'bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap';

                btn.addEventListener('click', () => {
                    const root = document.getElementById('plRoot');
                    if (!root) return;

                    const monthId = m.id; // make sure months JSON contains `id`
                    if (!monthId) return;

                    // build URL from template
                    const href = tmpl(root.dataset.monthViewUrlTmpl, '__MONTH_ID__', monthId);

                    window.location.href = href;
                });

                wrap.appendChild(btn);
            });
        }

        function setBookLocked(isClosed) {
            $('#plBookClosedBar').toggleClass('hidden', !isClosed);

            // Lock dashboard UI if closed
            $('#plCreateBtn').prop('disabled', isClosed).toggleClass('opacity-60 cursor-not-allowed', isClosed);
            $('#plGenerate').prop('disabled', isClosed);

            $('#plGridWrap, #plMonthsWrap').toggleClass('opacity-70', isClosed);
        }

        function getRoot() { return document.getElementById('plRoot'); }

        function urls() {
            const r = getRoot();
            return {
                bookId: r?.dataset.bookId || '',
                storeBook: r?.dataset.storeBookUrl,
                bookDataTmpl: r?.dataset.bookDataUrlTmpl,
                addMonthsTmpl: r?.dataset.addMonthsUrlTmpl,
                closeBookTmpl: r?.dataset.closeBookUrlTmpl,
                reopenBookTmpl: r?.dataset.reopenBookUrlTmpl,
            };
        }

        function openPLModal() { $('#plModal').removeClass('hidden').addClass('flex'); }
        function closePLModal() { $('#plModal').addClass('hidden').removeClass('flex'); }

        function updateDashboardHeader(book, overallProfit) {
            // Title
            $('#plLabel').text(book?.title || 'Profit & Loss');

            // Value + color (single source)
            setProfitLossValue('#plOverall', overallProfit);
        }

        let __grossChart = null;

        function renderGrossProfitChart(monthSummaries) {
            if (!monthSummaries || !monthSummaries.length) return;

            $('#plGrossChartWrap').removeClass('hidden');

            const labels = monthSummaries.map(m => m.label);
            const monthProfit = monthSummaries.map(m => Number(m.gross_month || 0));     // bars
            const runningProfit = monthSummaries.map(m => Number(m.gross_running || 0)); // mountain line

            const canvas = document.getElementById('plGrossProfitChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');

            if (__grossChart) {
                __grossChart.destroy();
                __grossChart = null;
            }

            // gradients
            const barGrad = ctx.createLinearGradient(0, 0, 0, 260);
            barGrad.addColorStop(0, 'rgba(59,130,246,0.85)');
            barGrad.addColorStop(1, 'rgba(59,130,246,0.25)');

            const areaGrad = ctx.createLinearGradient(0, 0, 0, 260);
            areaGrad.addColorStop(0, 'rgba(16,185,129,0.28)');
            areaGrad.addColorStop(1, 'rgba(16,185,129,0.02)');

            // arrow direction based on last 2 points
            const last = runningProfit[runningProfit.length - 1] || 0;
            const prev = runningProfit[runningProfit.length - 2] ?? last;
            const isUp = last >= prev;

            __grossChart = new Chart(ctx, {
                data: {
                    labels,
                    datasets: [
                        // Bars: month profit
                        {
                            type: 'bar',
                            label: 'Gross Profit (This Month)',
                            data: monthProfit,
                            backgroundColor: barGrad,
                            borderRadius: 10,
                            borderSkipped: false,
                            maxBarThickness: 42,
                            order: 2,
                        },

                        // Line: running profit (mountain)
                        {
                            type: 'line',
                            label: 'Running Gross Profit',
                            data: runningProfit,

                            // Line changes color per segment depending on negative/positive
                            segment: {
                                borderColor: (ctx) => {
                                    const y0 = ctx.p0.parsed.y;
                                    const y1 = ctx.p1.parsed.y;
                                    return (y0 < 0 && y1 < 0) ? 'rgba(239,68,68,1)' : 'rgba(16,185,129,1)';
                                }
                            },

                            // (Keep your fill as green for now)
                            backgroundColor: areaGrad,
                            fill: true,

                            tension: 0.35,

                            pointRadius: (ctx) => (ctx.dataIndex === runningProfit.length - 1 ? 6 : 3),
                            pointHoverRadius: 7,

                            pointStyle: (ctx) => (ctx.dataIndex === runningProfit.length - 1 ? 'triangle' : 'circle'),
                            pointRotation: (ctx) => (ctx.dataIndex === runningProfit.length - 1 ? (isUp ? 0 : 180) : 0),

                            // Points also change color if value is negative
                            pointBackgroundColor: (ctx) => {
                                const val = ctx.parsed.y || 0;
                                const isLastPoint = ctx.dataIndex === runningProfit.length - 1;

                                if (isLastPoint) {
                                    return (val < 0) ? 'rgba(239,68,68,1)' : 'rgba(16,185,129,1)';
                                }
                                return (val < 0) ? 'rgba(239,68,68,0.9)' : 'rgba(16,185,129,0.9)';
                            },

                            borderWidth: 3,
                            order: 1,
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true }
                        },
                        tooltip: {
                            padding: 12,
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${fmtAED(ctx.raw)}`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            ticks: {
                                font: { size: 11 },
                                callback: (v) => 'AED ' + Number(v).toLocaleString()
                            }
                        }
                    }
                }
            });
        }

        // OPEN Add Months modal (Dashboard)
        $(document).on('click', '#plCreateBtn', function () {
            const U = urls();
            if (!U.bookId) return alert('Book id missing.');
            openPLModal();
        });

        function loadBook(bookId) {
            const U = urls();
            const url = withBookId(U.bookDataTmpl, bookId);

            return $.getJSON(url).done(res => {
                // header
                const book = res.book || {};
                const from = (book.from_month || '').slice(0, 7);
                const to = (book.to_month || '').slice(0, 7);

                // keep your custom range title
                if (from && to) {
                    book.title = `Profit & Loss (${from} - ${to})`;
                }

                updateDashboardHeader(book, res.overallProfit);

                setBookLocked(!!book.is_closed);

                // months
                const months = res.months || [];
                $('#plMonthsWrap').removeClass('hidden');

                renderMonths(months);

                // call once (NOT inside loop)
                renderExcelDashboard(res);

                renderGrossProfitChart(res.monthSummaries || []);

                function renderExcelDashboard(res) {
                    const months = res.monthSummaries || [];
                    if (!months.length) return;

                    $('#plGridWrap').removeClass('hidden');

                    const colW = 170;
                    const ROW_H = 34; // fixed height for every row (left + right)

                    // ---------- helpers ----------
                    function leftRow(html, extra = '', bg = '') {
                        return `
                            <div class="border-b px-3 flex items-center ${bg}" style="height:${ROW_H}px;">
                            <div class="w-full ${extra}">${html}</div>
                            </div>
                        `;
                    }

                    function rightBlankRow(extraRowClass = '') {
                        return `
                            <div class="grid ${extraRowClass}" style="grid-template-columns: repeat(${months.length}, ${colW}px);">
                                ${months.map(() => `
                                <div class="border-r border-b" style="height:${ROW_H}px;"></div>
                                `).join('')}
                            </div>
                        `;
                    }

                    function rightValueRow(values, extraCellClass = '', extraRowClass = '') {
                        return `
                            <div class="grid ${extraRowClass}" style="grid-template-columns: repeat(${months.length}, ${colW}px);">
                            ${values.map(v => `
                                <div class="border-r border-b px-3 flex items-center justify-end text-sm ${extraCellClass}"
                                    style="height:${ROW_H}px;">
                                ${fmtAED(v)}
                                </div>
                            `).join('')}
                            </div>
                        `;
                    }

                    function spacerRow() {
                        return `
                            <div class="grid" style="grid-template-columns: repeat(${months.length}, ${colW}px);">
                            ${months.map(() => `<div class="border-r border-b bg-white" style="height:${ROW_H}px;"></div>`).join('')}
                            </div>
                        `;
                    }

                    // ---------- LEFT PANEL ----------
                    const $left = $('#plGridWrap .w-\\[320px\\]');
                    $left.html('');

                    // header (must match month header height)
                    $left.append(`
                        <div class="border-b px-3 flex items-center font-semibold text-sm" style="height:${ROW_H}px;">
                        Months
                        </div>
                    `);

                    // ROW PLAN (must match right exactly)
                    // 1) GROSS PROFIT title row (right = blank)
                    $left.append(leftRow('<span class="text-xs font-semibold text-amber-900">GROSS PROFIT</span>', '', 'bg-amber-100'));
                    // 2) gross profit values row label area (left blank)
                    $left.append(leftRow('', '', 'bg-white'));

                    // 3) REVENUE title row (right = blank)
                    $left.append(leftRow('<span class="text-xs font-semibold text-emerald-800">REVENUE</span>', ''));
                    // 4-7) revenue items
                    $left.append(leftRow('Revenue Stream from Global Trade Services', 'text-sm text-gray-700'));
                    $left.append(leftRow('Revenue Stream from Buy Luxury', 'text-sm text-gray-700'));
                    $left.append(leftRow('Revenue Stream from Trado Global', 'text-sm text-gray-700'));
                    $left.append(leftRow('Revenue Stream from all others', 'text-sm text-gray-700'));
                    // 8) total revenue
                    $left.append(leftRow('Total Revenue', 'text-sm font-semibold text-emerald-900', 'bg-emerald-100'));

                    // 9) EXPENSES title row (right = blank)
                    $left.append(leftRow('<span class="text-xs font-semibold text-rose-800">EXPENSES</span>', ''));
                    // 10-13) expense items
                    $left.append(leftRow('PURCHASES', 'text-sm text-gray-700'));
                    $left.append(leftRow('Salaries', 'text-sm text-gray-700'));
                    $left.append(leftRow('Rent per month', 'text-sm text-gray-700'));
                    $left.append(leftRow('Miscellaneous Expenses/ PETTY CASH', 'text-sm text-gray-700'));
                    // 14) total expense
                    $left.append(leftRow('TOTAL EXPENSE', 'text-sm font-semibold text-rose-900', 'bg-rose-100'));

                    // ---------- RIGHT PANEL ----------
                    const $right = $('#plRightMonths').empty();

                    // Month header row (inline Open button)
                    $right.append(`
                    <div class="grid" style="grid-template-columns: repeat(${months.length}, ${colW}px);">
                        ${months.map(m => `
                        <div class="border-b border-r px-3 flex items-center justify-between bg-gray-50"
                            style="height:${ROW_H}px;">
                            <div class="pl-month-label font-semibold text-sm">${escapeHtml(m.label)}</div>
                            <button
                            class="px-3 py-1.5 rounded bg-blue-600 text-white text-xs hover:bg-blue-700 shrink-0"
                            onclick="window.location.href='/pl/book/${bookId}/month-view/${m.id}'">
                            Open
                            </button>
                        </div>
                        `).join('')}
                    </div>
                    `);

                    // 1) gross profit values
                    $right.append(rightValueRow(months.map(m => m.gross_running), 'bg-amber-100 font-semibold text-amber-900', 'bg-amber-100'));
                    // 2) gross profit title row (blank on right)
                    $right.append(rightBlankRow('bg-amber-50'));

                    // 3) revenue title row (blank on right)
                    $right.append(rightBlankRow('bg-emerald-50'));
                    // 4-7) revenue values
                    $right.append(rightValueRow(months.map(m => m.rev_gts)));
                    $right.append(rightValueRow(months.map(m => m.rev_buy)));
                    $right.append(rightValueRow(months.map(m => m.rev_trado)));
                    $right.append(rightValueRow(months.map(m => m.rev_other)));
                    // 8) total revenue
                    $right.append(rightValueRow(months.map(m => m.total_revenue), 'bg-emerald-100 font-semibold text-emerald-900', 'bg-emerald-100'));

                    // 9) expenses title row (blank on right)
                    $right.append(rightBlankRow('bg-rose-50'));
                    // 10-13) expense values
                    $right.append(rightValueRow(months.map(m => m.purchases)));
                    $right.append(rightValueRow(months.map(m => m.salaries)));
                    $right.append(rightValueRow(months.map(m => m.rent)));
                    $right.append(rightValueRow(months.map(m => m.misc)));
                    // 14) total expense
                    $right.append(rightValueRow(months.map(m => m.total_expense), 'bg-rose-100 font-semibold text-rose-900', 'bg-rose-100'));
                }
            });
        }

        $(document).on('click', '#plClose, #plCancel', closePLModal);

        $(document).on('click', '#plGenerate', function () {
            const from = $('#plFrom').val();
            const to = $('#plTo').val();
            const name = $('#plName').val();

            if (!from || !to) return alert('Please select From and To.');
            if (!name) return alert('Please enter Book Name.');

            // detect context
            const indexRoot = document.getElementById('plIndexRoot');
            const dashboardRoot = document.getElementById('plRoot');

            // ---------------- INDEX PAGE → ALWAYS CREATE NEW BOOK ----------------
            if (indexRoot) {
                const U = indexUrls(); // use plIndexRoot urls

                $.ajax({
                    url: U.storeBook,
                    method: 'POST',
                    data: { name, from, to },
                    headers: { 'X-CSRF-TOKEN': csrf() },
                })
                    .done(res => {
                        if (res.book_id) {
                            window.location.href =
                                tmpl(U.dashboardUrlTmpl, '0', res.book_id);
                        }
                    })
                    .fail(xhr => {
                        alert(xhr.responseJSON?.message || 'Failed to create book.');
                    });

                return; // stop here
            }

            // ---------------- DASHBOARD → ADD MONTHS ONLY ----------------
            if (dashboardRoot) {
                const bookId = dashboardRoot.dataset.bookId;
                const U = dashboardUrls();

                $.ajax({
                    url: tmpl(U.addMonthsUrlTmpl, '0', bookId),
                    method: 'POST',
                    data: { from, to },
                    headers: { 'X-CSRF-TOKEN': csrf() },
                })
                    .done(() => {
                        closePLModal();
                        loadBook(bookId);
                    })
                    .fail(xhr => {
                        alert(xhr.responseJSON?.message || 'Failed to add months.');
                    });
            }
        });

        // Boot: if book exists load it
        $(function () {
            const U = urls();
            if (!U.bookId) return;

            loadBook(U.bookId)
                .fail(() => console.log('No P&L book loaded'));
        });

    }

    // ================= MONTH PAGE =================
    function initMonthPage() {
        const root = document.getElementById('plMonthRoot');
        if (!root) return;

        const U = {
            monthId: root.dataset.monthId,
            monthDataUrl: root.dataset.monthDataUrl,
            lineUpdateTmpl: root.dataset.lineUpdateUrlTmpl,
            lineDeleteTmpl: root.dataset.lineDeleteUrlTmpl,
            lineCreateUrl: root.dataset.lineCreateUrl,
        };

        // ---------------- REQUIRED STRUCTURE (matches your Excel) ----------------
        const REQUIRED_CASH_OUT = [
            { code: 'A', label: 'PURCHASES' },
            { code: 'B', label: 'Salaries' },
            { code: 'C', label: 'Rent per month' },
            { code: 'D', label: 'Miscellaneous Expenses/ PETTY CASH' },
        ];

        const CASH_IN_GROUPS = [
            {
                code: 'A',
                title: 'GLOBAL TRADE SERVICES',
                rows: ['Packing & Labor charges', 'DGD', 'SHIPPING PROFIT'],
            },
            {
                code: 'B',
                title: 'BUY LUXURY GLOBAL',
                rows: ['Packing & Labor charges', 'LABELING CHARGES', 'SHIPPING PROFIT'],
            },
            {
                code: 'C',
                title: 'TRADO GLOBAL',
                rows: ['Packing & Labor charges', 'LABELING CHARGES', 'SHIPPING PROFIT'],
            },
            {
                code: 'D',
                title: 'OTHERS',
                rows: ['SHIPPING PROFIT'],
            },
        ];

        function bookIsClosed() {
            return String(root.dataset.bookClosed || '0') === '1';
        }

        function defaultCashInRemark(groupCode, rowName) {
            // A - GLOBAL TRADE SERVICES
            if (groupCode === 'A' && rowName === 'DGD') {
                return 'GLOBAL TRADE SERVICES LLC IS DIRECTLY PAYING DGD';
            }
            if (groupCode === 'A' && rowName === 'SHIPPING PROFIT') {
                return [
                    '1. Shipping profit is going to Global Trade Services',
                    '2. We have 2.5AED per kg extra to Global Trade services which is reflected here'
                ].join('\n');
            }

            // Shared text for BUY LUXURY + TRADO (Packing & Labor)
            const packingLaborShared = [
                '1. SHIPPING CHARGES ALREADY PAID TO GLOBAL TRADE SERVICES.',
                '2. LABOR & BOX CHARGES ALREADY PAID TO GLOBAL TRADE SERVICES. HERE WE ARE ONLY ADDING LABELING CHARGES'
            ].join('\n');

            // B - BUY LUXURY GLOBAL
            if (groupCode === 'B' && rowName === 'Packing & Labor charges') return packingLaborShared;
            if (groupCode === 'B' && rowName === 'LABELING CHARGES') {
                return 'GLOBAL TRADE SERVICES LLC IS DIRECTLY PAYING DGD';
            }
            if (groupCode === 'B' && rowName === 'SHIPPING PROFIT') {
                return '1. SHIPPING PROFIT ALREADY ADJUSTED IN GLOBAL TRADE SERVICES';
            }

            // C - TRADO GLOBAL
            if (groupCode === 'C' && rowName === 'Packing & Labor charges') return packingLaborShared;
            if (groupCode === 'C' && rowName === 'LABELING CHARGES') {
                return 'GLOBAL TRADE SERVICES LLC IS DIRECTLY PAYING DGD';
            }
            if (groupCode === 'C' && rowName === 'SHIPPING PROFIT') {
                return '1. SHIPPING PROFIT ALREADY ADJUSTED IN GLOBAL TRADE SERVICES';
            }

            return ''; // default
        }

        function cashInGroupTitle(code) {
            switch (String(code || '').trim()) {
                case 'A': return 'GLOBAL TRADE SERVICES';
                case 'B': return 'BUY LUXURY GLOBAL';
                case 'C': return 'TRADO GLOBAL';
                case 'D': return 'OTHERS';
                default: return 'OTHERS';
            }
        }

        function openCashInModal() {
            $('#plCashInModal').removeClass('hidden').addClass('flex');
        }

        function closeCashInModal() {
            $('#plCashInModal').addClass('hidden').removeClass('flex');

            $('#plCashInGroup').val('D');
            $('#plCashInDesc').val('');
            $('#plCashInAmt').val('0');
            $('#plCashInRemarks').val('');
        }

        async function ensureDefaultCashInRemarks(linesMap, monthLabel) {
            const tasks = [];

            CASH_IN_GROUPS.forEach(g => {
                g.rows.forEach(r => {
                    const key = mkKey(['IN', g.code, g.title, r, monthLabel]);
                    const line = linesMap[key];
                    if (!line || !line.id) return;

                    const currentRemarks = String(line.remarks || '').trim();
                    const amt = Number(line.amount || 0);

                    // only backfill when it's still untouched
                    if (currentRemarks === '' && amt === 0) {
                        const def = defaultCashInRemark(g.code, r);
                        if (!def) return;

                        tasks.push(apiUpdateLine(line.id, {
                            amount: 0,
                            remarks: def
                        }));
                    }
                });
            });

            if (!tasks.length) return;
            await Promise.allSettled(tasks);
        }

        // Our DB “label key” format to keep grouping without DB changes
        // expense mandatory:   OUT|A|PURCHASES
        // cash in rows:        IN|A|GLOBAL TRADE SERVICES|Packing & Labor charges
        // subtotal rows:       IN_SUB|A|GLOBAL TRADE SERVICES
        // cash out extra rows: OUT_EXTRA|<random>
        function mkKey(parts) { return parts.join('|'); }

        // Build fast lookup from API lines
        function indexLines(lines) {
            const map = {};
            (lines || []).forEach(l => { map[l.label] = l; });
            return map;
        }

        // ---------------- AJAX helpers ----------------
        function apiCreateLine(payload) {
            return $.ajax({
                url: U.lineCreateUrl,
                method: 'POST',
                data: payload,
                headers: { 'X-CSRF-TOKEN': csrf() }
            });
        }

        function apiUpdateLine(lineId, payload) {
            const url = U.lineUpdateTmpl.replace('LINE_ID', lineId);
            return $.ajax({
                url,
                method: 'PUT',
                data: payload,
                headers: { 'X-CSRF-TOKEN': csrf() }
            });
        }

        function apiDeleteLine(lineId) {
            const url = U.lineDeleteTmpl.replace('LINE_ID', lineId);
            return $.ajax({
                url,
                method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': csrf() }
            });
        }

        // ---------------- UI row rendering ----------------
        function rowHtml(opts) {
            // opts: { sno, line, description, amount, remarks, lockedDesc, sectionTag,
            //         fixedRow, lockAmount, hideRemarks, hideDelete, hideSno }

            const lineId = opts.line?.id || '';
            const label = opts.line?.label || opts.labelKey;

            const showSno = !opts.hideSno;
            const showRemarks = !opts.hideRemarks;
            const showDelete = !opts.hideDelete;

            const amtReadOnly = opts.lockAmount ? 'readonly' : '';
            const amtBg = opts.lockAmount ? 'bg-gray-100' : '';

            return `
        <tr class="plRow ${opts.fixedRow ? 'bg-gray-50' : ''}"
            data-line-id="${escapeHtml(lineId)}"
            data-label="${escapeHtml(label)}"
            data-section-tag="${escapeHtml(opts.sectionTag || '')}">
            
            <td class="p-2 border text-sm">${showSno ? escapeHtml(opts.sno) : ''}</td>

            <td class="p-2 border text-sm">
                ${opts.lockedDesc
                    ? `<div class="font-medium">${escapeHtml(opts.description)}</div>`
                    : `<input class="plDesc w-full px-2 py-1 border rounded text-sm" value="${escapeHtml(opts.description || '')}" />`
                }
            </td>

            <td class="p-2 border text-sm">
                <div class="flex items-center w-full">
                    <span class="px-2 py-1 border border-r-0 rounded-l bg-gray-50 text-[11px] text-gray-600 select-none">
                    AED
                    </span>

                    <input class="plAmt w-full px-2 py-1 border rounded-r text-right ${amtBg}"
                    ${amtReadOnly}
                    value="${Number(opts.amount || 0).toFixed(2)}" />
                </div>
            </td>

            <td class="p-2 border text-sm">
                ${showRemarks
                    ? `<textarea class="plRmk w-full px-2 py-1 border rounded text-sm" rows="2">${escapeHtml(opts.remarks || '')}</textarea>`
                    : ''
                }
            </td>

            <td class="p-2 border text-center">
                <div class="flex items-center justify-center gap-2">
                ${showDelete ? `
                <button class="plDel inline-flex items-center justify-center w-9 h-9 rounded bg-red-600 text-white text-xs shadow"
                        title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/>
                    <path d="M8 6V4h8v2"/>
                    <path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6"/>
                    <path d="M14 11v6"/>
                </svg>
                </button>` : ``}
                </div>
            </td>
        </tr>
        `;
        }

        function sectionHeaderRow(title, tone) {
            const bg = tone === 'rose' ? 'bg-rose-50' : 'bg-emerald-50';
            const tx = tone === 'rose' ? 'text-rose-800' : 'text-emerald-800';
            return `
                <tr>
                    <td class="p-2 border ${bg} ${tx} text-xs font-semibold" colspan="5">
                    ${escapeHtml(title)}
                    </td>
                </tr>
            `;
        }

        function subtotalRow(label, value, tone, groupTitle = '') {
            const bg = tone === 'rose' ? 'bg-rose-50' : 'bg-emerald-50';
            const tx = tone === 'rose' ? 'text-rose-800' : 'text-emerald-800';

            return `
                <tr class="${bg} plSubtotalRow" data-group-title="${escapeHtml(groupTitle)}">
                    <td class="p-2 border ${tx} text-xs font-semibold" colspan="2">
                        ${escapeHtml(label)}
                    </td>
                    <td class="p-2 border ${tx} text-sm font-semibold text-center plSubtotalValue">${fmtAED(value)}</td>
                    <td class="p-2 border" colspan="2"></td>
                </tr>
            `;
        }

        // ---------------- Ensure required lines exist in DB ----------------
        // IMPORTANT: this avoids “loading forever / empty” when book already created but lines missing.
        async function ensureRequiredLines(linesMap, monthLabel) {
            const creates = [];

            // Cash Out fixed A-D must always exist
            REQUIRED_CASH_OUT.forEach(x => {
                const key = mkKey(['OUT', x.code, x.label, monthLabel]);
                if (!linesMap[key]) {
                    creates.push(apiCreateLine({
                        month_id: U.monthId,
                        section: 'expense',
                        label: key,
                        amount: 0,
                        remarks: ''
                    }));
                }
            });

            // Cash In defaults should be created only on first empty load
            const hasAnyCashInRows = Object.keys(linesMap).some(k => k.startsWith('IN|'));
            if (!hasAnyCashInRows) {
                CASH_IN_GROUPS.forEach(g => {
                    g.rows.forEach((r) => {
                        const key = mkKey(['IN', g.code, g.title, r, monthLabel]);
                        const defaultRemark = defaultCashInRemark(g.code, r);

                        creates.push(apiCreateLine({
                            month_id: U.monthId,
                            section: 'revenue',
                            label: key,
                            amount: 0,
                            remarks: defaultRemark
                        }));
                    });
                });
            }

            if (!creates.length) return;
            await Promise.allSettled(creates);
        }

        // ---------------- Render full page ----------------
        function parseMonthLabel(raw) {
            // backend might return "Dec 2024" or "Oct 2025"
            return (raw || '').trim() || '—';
        }

        function computeTotals(linesMap, monthLabel) {
            // Cash Out = all OUT mandatory + any OUT_EXTRA
            let cashOut = 0;
            Object.values(linesMap).forEach(l => {
                if (typeof l.label !== 'string') return;
                const amt = Number(l.amount || 0);
                if (l.label.startsWith('OUT|') && l.label.endsWith('|' + monthLabel)) cashOut += amt;
                if (l.label.startsWith('OUT_EXTRA|') && l.label.endsWith('|' + monthLabel)) cashOut += amt;
            });

            // Cash In = all IN rows
            let cashIn = 0;
            Object.values(linesMap).forEach(l => {
                if (typeof l.label !== 'string') return;
                const amt = Number(l.amount || 0);
                if (l.label.startsWith('IN|') && l.label.endsWith('|' + monthLabel)) cashIn += amt;
            });

            return { cashIn, cashOut, profit: cashIn - cashOut };
        }

        function extractDescFromRemarks(remarks) {
            const m = String(remarks || '').match(/^DESC:(.*)$/m);
            return m ? m[1].trim() : '';
        }

        function setPurchasesRow(monthLabel, purchasesSum) {
            const aKey = mkKey(['OUT', 'A', 'PURCHASES', monthLabel]);

            const $aRow = $('#plCashOutBody tr.plRow').filter(function () {
                return String($(this).data('label') || '') === aKey;
            }).first();

            if ($aRow.length) {
                $aRow.find('.plAmt')
                    .val(Number(purchasesSum || 0).toFixed(2))
                    .prop('readonly', true)
                    .addClass('bg-gray-100');
            }
        }

        function render(res) {
            const monthLabel = parseMonthLabel(res?.month?.label);
            window.__plMonthLabel = monthLabel;
            $('#plSheetSub').text(`Month: ${monthLabel}`);
            $('#plSheetTitle').text(`P&L Month Sheet – ${monthLabel}`);

            $('#cashOutTitle').text(`CASH OUT ${monthLabel.toUpperCase()}`);
            $('#cashInTitle').text(`CASH IN ${monthLabel.toUpperCase()}`);
            $('#plCashOutTotalLabel').text(`TOTAL CASH OUT ${monthLabel.toUpperCase()}`);
            $('#plCashInTotalLabel').text(`TOTAL CASH IN ${monthLabel.toUpperCase()}`);

            const linesMap = indexLines(res.lines || []);

            // Totals
            const totals = computeTotals(linesMap, monthLabel);
            $('#plCashInTotal').text(fmtAED(totals.cashIn));
            // $('#plCashOutTotal').text(fmtAED(totals.cashOut));
            // $('#plMonthProfit').text(fmtAED(totals.profit));

            // ---------------- CASH OUT BODY ----------------
            const $out = $('#plCashOutBody').empty();

            // 1) EXTRA rows FIRST (user added)
            let sno = 1;

            const extraRows = Object.values(linesMap).filter(l =>
                typeof l.label === 'string' &&
                l.label.startsWith('OUT_EXTRA|') &&
                l.label.endsWith('|' + monthLabel)
            );

            // sort FIRST (before rendering)
            extraRows.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

            // compute PURCHASES = sum of extra rows (like Excel)
            let purchasesSum = 0;

            extraRows.forEach(l => {
                const desc = extractDescFromRemarks(l.remarks) || 'New Expense';
                const amt = Number(l.amount || 0);
                purchasesSum += amt;

                $out.append(rowHtml({
                    sno: sno++,
                    line: l,
                    labelKey: l.label,
                    description: desc,
                    amount: amt,
                    remarks: (l.remarks || '').replace(/^DESC:.*\n?/m, ''), // hide DESC from textarea
                    lockedDesc: false,
                    sectionTag: 'out',
                }));
            });

            // 2) Divider row (optional, looks clean)
            $out.append(`
                <tr>
                    <td class="p-2 border bg-gray-50 text-xs font-semibold text-gray-600" colspan="5">
                    FIXED ITEMS (A–D)
                    </td>
                </tr>
            `);

            // 3) Mandatory A–D rows LAST (NO S.no, NO remarks, NO delete)
            REQUIRED_CASH_OUT.forEach(x => {
                const key = mkKey(['OUT', x.code, x.label, monthLabel]);
                const l = linesMap[key];

                const isPurchases = x.code === 'A';
                const value = isPurchases ? purchasesSum : Number(l?.amount || 0);

                $out.append(rowHtml({
                    sno: '',                         // no sno
                    line: l,
                    labelKey: key,
                    description: `${x.code} - ${x.label} - ${monthLabel}`,
                    amount: value,
                    remarks: l?.remarks || '',
                    lockedDesc: true,                // fixed text
                    sectionTag: 'out-fixed',
                    fixedRow: true,
                    lockAmount: isPurchases,         // A is readonly
                    hideRemarks: false,              // no textarea
                    hideDelete: true,                // no delete
                    hideSno: true                    // blank sno
                }));
            });

            setPurchasesRow(monthLabel, purchasesSum);

            // FORCE-SET A – PURCHASES value (UI safety)
            const aKey = mkKey(['OUT', 'A', 'PURCHASES', monthLabel]);

            $out.find('tr.plRow').each(function () {
                const $tr = $(this);
                if ($tr.data('label') === aKey) {
                    $tr.find('.plAmt')
                        .val(Number(purchasesSum || 0).toFixed(2))
                        .prop('readonly', true)
                        .addClass('bg-gray-100');
                }
            });

            // 4) Totals must be A+B+C+D (not including extras separately)
            const salaries = Number(linesMap[mkKey(['OUT', 'B', 'Salaries', monthLabel])]?.amount || 0);
            const rent = Number(linesMap[mkKey(['OUT', 'C', 'Rent per month', monthLabel])]?.amount || 0);
            const misc = Number(linesMap[mkKey(['OUT', 'D', 'Miscellaneous Expenses/ PETTY CASH', monthLabel])]?.amount || 0);

            const fixedCashOut = purchasesSum + salaries + rent + misc;

            // Update totals UI
            $('#plCashOutTotal').text(fmtAED(fixedCashOut));
            $('#plMonthProfit').text(fmtAED(totals.cashIn - fixedCashOut));

            // ---------------- CASH IN BODY ----------------
            const $in = $('#plCashInBody').empty();

            const cashInRows = Object.values(linesMap).filter(l =>
                typeof l.label === 'string' &&
                l.label.startsWith('IN|') &&
                l.label.endsWith('|' + monthLabel)
            );

            const cashInGrouped = {};

            cashInRows.forEach(l => {
                const parts = String(l.label || '').split('|');
                if (parts.length < 5) return;

                const code = parts[1] || '';
                const groupTitle = parts[2] || '';
                const desc = parts.slice(3, -1).join('|') || '';
                const groupKey = `${code}|${groupTitle}`;

                if (!cashInGrouped[groupKey]) {
                    cashInGrouped[groupKey] = {
                        code,
                        title: groupTitle,
                        rows: []
                    };
                }

                cashInGrouped[groupKey].rows.push({
                    line: l,
                    desc
                });
            });

            const groupOrder = ['A', 'B', 'C', 'D'];

            const groupedList = Object.values(cashInGrouped).sort((a, b) => {
                const ai = groupOrder.indexOf(a.code);
                const bi = groupOrder.indexOf(b.code);
                if (ai !== bi) return ai - bi;
                return String(a.title).localeCompare(String(b.title));
            });

            groupedList.forEach(group => {
                $in.append(sectionHeaderRow(`${group.code} - ${group.title}`, 'emerald'));

                let groupSum = 0;

                group.rows.sort((a, b) => {
                    const aTime = String(a.line.created_at || '');
                    const bTime = String(b.line.created_at || '');
                    return aTime.localeCompare(bTime);
                });

                group.rows.forEach((item, idx) => {
                    const l = item.line;
                    const amt = Number(l?.amount || 0);
                    groupSum += amt;

                    const remarksClean = String(l?.remarks || '').replace(/^DESC:.*\n?/m, '');
                    const descFromRemarks = extractDescFromRemarks(l?.remarks);
                    const finalDesc = descFromRemarks || item.desc || 'Cash In Row';

                    $in.append(rowHtml({
                        sno: (idx + 1),
                        line: l,
                        labelKey: l.label,
                        description: finalDesc,
                        amount: amt,
                        remarks: remarksClean,
                        lockedDesc: false,
                        sectionTag: 'in',
                        hideDelete: false
                    }));
                });

                $in.append(subtotalRow(`SUB-TOTAL ${group.title}`, groupSum, 'emerald', group.title));
            });

            // Snapshot originals & hide Save initially
            $('.plRow').each(function () {
                const $tr = $(this);
                const o = {
                    desc: $tr.find('.plDesc').val() ?? '',
                    amt: $tr.find('.plAmt').val() ?? '0',
                    rmk: $tr.find('.plRmk').val() ?? '',
                };
                $tr.data('orig', o);
                $tr.find('.plSave').addClass('hidden');
            });

            liveRecalcCashOut();
            liveRecalcCashIn();
        }

        // ---------------- Change detection (show Save only when changed) ----------------
        function rowChanged($tr) {
            const o = $tr.data('orig') || {};
            const desc = $tr.find('.plDesc').val() ?? '';
            const amt = $tr.find('.plAmt').val() ?? '0';
            const rmk = $tr.find('.plRmk').val() ?? '';
            return (String(desc) !== String(o.desc)) || (String(amt) !== String(o.amt)) || (String(rmk) !== String(o.rmk));
        }

        function getFixedAmt(code, labelText, monthLabel) {
            const key = mkKey(['OUT', code, labelText, monthLabel]);

            const $row = $('#plCashOutBody tr.plRow').filter(function () {
                return String($(this).data('label') || '') === key;
            }).first();

            if (!$row.length) return 0;
            return Number($row.find('.plAmt').val() || 0);
        }

        function liveRecalcCashOut() {
            const monthLabel = window.__plMonthLabel || '';

            // Sum extra rows amounts directly from DOM (current typing)
            let purchasesSum = 0;
            $('#plCashOutBody tr.plRow').each(function () {
                const $tr = $(this);
                const label = String($tr.data('label') || '');
                if (label.startsWith('OUT_EXTRA|') && label.endsWith('|' + monthLabel)) {
                    purchasesSum += Number($tr.find('.plAmt').val() || 0);
                }
            });

            setPurchasesRow(monthLabel, purchasesSum);

            // 2) B/C/D from DOM
            const b = getFixedAmt('B', 'Salaries', monthLabel);
            const c = getFixedAmt('C', 'Rent per month', monthLabel);
            const d = getFixedAmt('D', 'Miscellaneous Expenses/ PETTY CASH', monthLabel);

            const cashOutFixed = purchasesSum + b + c + d;

            $('#plCashOutTotal').text(fmtAED(cashOutFixed));

            // Cash-in live (optional — if you want live too)
            let cashIn = 0;
            $('#plCashInBody tr.plRow').each(function () {
                const $tr = $(this);
                const label = String($tr.data('label') || '');
                if (label.startsWith('IN|') && label.endsWith('|' + monthLabel)) {
                    cashIn += Number($tr.find('.plAmt').val() || 0);
                }
            });

            $('#plCashInTotal').text(fmtAED(cashIn));
            $('#plMonthProfit').text(fmtAED(cashIn - cashOutFixed));
        }

        function liveRecalcCashIn() {
            const monthLabel = window.__plMonthLabel || '';
            let cashInTotal = 0;

            const grouped = {};

            $('#plCashInBody tr.plRow').each(function () {
                const $tr = $(this);
                const label = String($tr.data('label') || '');

                if (!label.startsWith('IN|') || !label.endsWith('|' + monthLabel)) return;

                const parts = label.split('|');
                if (parts.length < 5) return;

                const code = parts[1] || '';
                const groupTitle = parts[2] || '';
                const groupKey = `${code}|${groupTitle}`;

                if (!grouped[groupKey]) {
                    grouped[groupKey] = {
                        code,
                        title: groupTitle,
                        sum: 0
                    };
                }

                grouped[groupKey].sum += Number($tr.find('.plAmt').val() || 0);
            });

            // update subtotal rows using data-group-title
            $('#plCashInBody tr.plSubtotalRow').each(function () {
                const $tr = $(this);
                const groupTitle = String($tr.data('group-title') || '');

                const match = Object.values(grouped).find(g => g.title === groupTitle);
                const groupSum = match ? match.sum : 0;

                $tr.find('.plSubtotalValue').text(fmtAED(groupSum));
            });

            Object.values(grouped).forEach(g => {
                cashInTotal += g.sum;
            });

            $('#plCashInTotal').text(fmtAED(cashInTotal));

            const cashOut = Number(
                $('#plCashOutTotal').text().replace(/[^\d.-]/g, '')
            ) || 0;

            $('#plMonthProfit').text(fmtAED(cashInTotal - cashOut));
        }

        $(document).on('input change', '.plDesc, .plAmt, .plRmk', function () {
            const $tr = $(this).closest('.plRow');

            if (rowChanged($tr)) $tr.addClass('is-dirty');
            else $tr.removeClass('is-dirty');

            const tag = String($tr.data('section-tag') || '');

            if (tag.startsWith('in')) {
                $('#plSaveAllIn').toggleClass('hidden',
                    $('.plRow.is-dirty').filter((_, el) =>
                        String($(el).data('section-tag') || '').startsWith('in')
                    ).length === 0
                );

                liveRecalcCashIn();   // cash in live
            } else {
                $('#plSaveAllOut').toggleClass('hidden',
                    $('.plRow.is-dirty').filter((_, el) => {
                        const t = String($(el).data('section-tag') || '');
                        return t.startsWith('out');
                    }).length === 0
                );

                liveRecalcCashOut();  // cash out live
            }
        });

        function saveDirtyRowsByTag(prefix) {
            const $rows = $('.plRow.is-dirty').filter((_, el) => String($(el).data('section-tag') || '').startsWith(prefix));

            if (!$rows.length) return Promise.resolve();

            const requests = [];

            $rows.each(function () {
                const $tr = $(this);
                const lineId = $tr.data('line-id');
                if (!lineId) return;

                let remarks = $tr.find('.plRmk').val() || '';
                const $desc = $tr.find('.plDesc');

                if ($desc.length) {
                    const desc = ($desc.val() || '').trim();
                    remarks = `DESC:${desc}\n` + remarks.replace(/^DESC:.*\n?/m, '');
                }

                requests.push(apiUpdateLine(lineId, {
                    amount: Number($tr.find('.plAmt').val() || 0),
                    remarks
                }));
            });

            return Promise.all(requests);
        }

        $(document).on('click', '#plSaveAllOut', async function () {
            if (bookIsClosed()) return;

            const $btn = $(this);
            if ($btn.data('loading') === 1) return;

            // keep any draft values safe even if boot() re-renders
            const draftOut = captureDraft('out');

            setBtnLoading($btn, true, 'Saving Cash Out...');

            try {
                await saveDirtyRowsByTag('out');
                await boot();
                restoreDraft(draftOut, 'out'); // will re-mark dirty if still changed

                // now we just saved, so remove dirty flags for OUT rows
                $('.plRow').filter((_, el) => String($(el).data('section-tag') || '').startsWith('out'))
                    .removeClass('is-dirty');

                $('#plSaveAllOut').addClass('hidden');
            } catch (e) {
                console.error(e);
                alert('Failed to save Cash Out.');
                restoreDraft(draftOut, 'out');
            } finally {
                setBtnLoading($btn, false);
            }
        });

        $(document).on('click', '#plSaveAllIn', async function () {
            if (bookIsClosed()) return;

            const $btn = $(this);
            if ($btn.data('loading') === 1) return;

            const draftIn = captureDraft('in');

            setBtnLoading($btn, true, 'Saving Cash In...');

            try {
                await saveDirtyRowsByTag('in');
                await boot();
                restoreDraft(draftIn, 'in');

                $('.plRow').filter((_, el) => String($(el).data('section-tag') || '').startsWith('in'))
                    .removeClass('is-dirty');

                $('#plSaveAllIn').addClass('hidden');
            } catch (e) {
                console.error(e);
                alert('Failed to save Cash In.');
                restoreDraft(draftIn, 'in');
            } finally {
                setBtnLoading($btn, false);
            }
        });

        // ---------------- DELETE ----------------
        $(document).on('click', '.plDel', function () {
            if (bookIsClosed()) return;

            const $tr = $(this).closest('.plRow');
            const lineId = $tr.data('line-id');
            const label = String($tr.data('label') || '');

            // keep Cash Out fixed A-D protected
            if (label.startsWith('OUT|')) {
                return alert('This fixed Cash Out row cannot be deleted.');
            }

            if (!lineId) return;

            if (!confirm('Delete this row?')) return;

            apiDeleteLine(lineId)
                .done(() => boot())
                .fail((xhr) => {
                    console.error(xhr?.responseText || xhr);
                    alert('Failed to delete row.');
                });
        });

        // ---------------- ADD CASH OUT EXTRA ROW ----------------
        $(document).on('click', '#plAddCashOutRow', function () {
            if (bookIsClosed()) return;

            const $btn = $(this);

            // prevent double click / double rendering
            if ($btn.data('loading') === 1) return;

            // snapshot current typed values BEFORE boot() re-renders
            const draftOut = captureDraft('out');

            const monthLabel = window.__plMonthLabel || '';
            if (!U.lineCreateUrl) return alert('Create URL missing in plMonthRoot data attributes.');

            const key = mkKey(['OUT_EXTRA', 'EXTRA_' + Date.now(), monthLabel]);

            // set loading UI
            $btn.data('loading', 1)
                .prop('disabled', true)
                .addClass('opacity-60 cursor-not-allowed')
                .removeClass('hover:bg-black');

            const oldHtml = $btn.html();
            $btn.html(`
                <span class="inline-flex items-center gap-2">
                <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path>
                </svg>
                Adding...
                </span>
            `);

            apiCreateLine({
                month_id: U.monthId,
                section: 'expense',
                label: key,
                amount: 0,
                remarks: 'DESC:New Expense\n',
                sort_order: 9999
            })
                .done(async () => {
                    await boot();                      // re-render from DB
                    restoreDraft(draftOut, 'out');     // restore drafts after render
                })
                .fail((xhr) => {
                    console.error(xhr?.responseText || xhr);
                    alert('Failed to add row.');
                    restoreDraft(draftOut, 'out');     // restore anyway (safe)
                })
                .always(() => {
                    // restore button
                    $btn.data('loading', 0)
                        .prop('disabled', false)
                        .removeClass('opacity-60 cursor-not-allowed')
                        .addClass('hover:bg-black')
                        .html(oldHtml);
                });
        });

        $(document).on('click', '#plAddCashInRow', function () {
            if (bookIsClosed()) return;
            openCashInModal();
        });

        $(document).on('click', '#plCashInModalClose, #plCashInCancel', function () {
            closeCashInModal();
        });

        $(document).on('click', '#plCashInCreate', function () {
            if (bookIsClosed()) return;

            const $btn = $(this);
            if ($btn.data('loading') === 1) return;

            const draftIn = captureDraft('in');
            const monthLabel = window.__plMonthLabel || '';

            if (!U.lineCreateUrl) {
                return alert('Create URL missing in plMonthRoot data attributes.');
            }

            const groupCode = String($('#plCashInGroup').val() || 'D').trim();
            const groupTitle = cashInGroupTitle(groupCode);
            const desc = String($('#plCashInDesc').val() || '').trim();
            const amount = Number($('#plCashInAmt').val() || 0);
            const remarks = String($('#plCashInRemarks').val() || '').trim();

            if (!desc) {
                return alert('Please enter description.');
            }

            const labelKey = mkKey(['IN', groupCode, groupTitle, desc, monthLabel]);
            const finalRemarks = `DESC:${desc}\n${remarks}`;

            $btn.data('loading', 1)
                .prop('disabled', true)
                .addClass('opacity-60 cursor-not-allowed')
                .removeClass('hover:bg-black');

            const oldHtml = $btn.html();
            $btn.html(`
                <span class="inline-flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path>
                    </svg>
                    Creating...
                </span>
            `);

            apiCreateLine({
                month_id: U.monthId,
                section: 'revenue',
                label: labelKey,
                amount: amount,
                remarks: finalRemarks,
                code: 'dyn_in_' + Date.now()
            })
                .done(async () => {
                    closeCashInModal();
                    await boot();
                    restoreDraft(draftIn, 'in');
                })
                .fail((xhr) => {
                    console.error(xhr?.responseText || xhr);
                    alert(xhr?.responseJSON?.message || 'Failed to create Cash In row.');
                    restoreDraft(draftIn, 'in');
                })
                .always(() => {
                    $btn.data('loading', 0)
                        .prop('disabled', false)
                        .removeClass('opacity-60 cursor-not-allowed')
                        .addClass('hover:bg-black')
                        .html(oldHtml);
                });
        });

        // ---------------- BOOT ----------------
        async function boot() {
            if (!U.monthDataUrl) return;

            const res = await $.getJSON(U.monthDataUrl);

            // Ensure required lines exist (if old months missing lines)
            const monthLabel = parseMonthLabel(res?.month?.label);
            const linesMap = indexLines(res.lines || []);
            await ensureRequiredLines(linesMap, monthLabel);

            await ensureDefaultCashInRemarks(linesMap, monthLabel);

            // reload again after creating missing lines
            const res2 = await $.getJSON(U.monthDataUrl);
            render(res2);

            setMonthLocked(bookIsClosed());
        }

        $(function () {
            boot().catch(err => {
                console.error(err);
                alert('Failed to load month data.');
            });
        });

        function captureDraft(prefix) {
            const draft = {};
            $('.plRow').each(function () {
                const $tr = $(this);
                const tag = String($tr.data('section-tag') || '');
                if (!tag.startsWith(prefix)) return;

                const lineId = String($tr.data('line-id') || '');
                if (!lineId) return;

                draft[lineId] = {
                    desc: $tr.find('.plDesc').val() ?? '',
                    amt: $tr.find('.plAmt').val() ?? '',
                    rmk: $tr.find('.plRmk').val() ?? '',
                };
            });
            return draft;
        }

        function restoreDraft(draft, prefix) {
            if (!draft) return;

            Object.keys(draft).forEach(lineId => {
                const $tr = $(`.plRow[data-line-id="${lineId}"]`);
                if (!$tr.length) return;

                const tag = String($tr.data('section-tag') || '');
                if (!tag.startsWith(prefix)) return;

                const d = draft[lineId];
                if ($tr.find('.plDesc').length) $tr.find('.plDesc').val(d.desc);
                if ($tr.find('.plAmt').length) $tr.find('.plAmt').val(d.amt);
                if ($tr.find('.plRmk').length) $tr.find('.plRmk').val(d.rmk);

                $tr.addClass('is-dirty');
            });

            if (prefix === 'out') {
                $('#plSaveAllOut').removeClass('hidden');
                liveRecalcCashOut();
            } else {
                $('#plSaveAllIn').removeClass('hidden');
                liveRecalcCashIn();
            }
        }

        function setBtnLoading($btn, isLoading, text) {
            const oldHtml = $btn.data('oldHtml') || $btn.html();
            if (!$btn.data('oldHtml')) $btn.data('oldHtml', oldHtml);

            if (isLoading) {
                $btn.data('loading', 1)
                    .prop('disabled', true)
                    .addClass('opacity-60 cursor-not-allowed')
                    .removeClass('hover:bg-green-700');

                $btn.html(`
                    <span class="inline-flex items-center gap-2">
                        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="4" stroke-linecap="round"></path>
                        </svg>
                        ${text || 'Saving...'}
                    </span>
                `);
            } else {
                $btn.data('loading', 0)
                    .prop('disabled', false)
                    .removeClass('opacity-60 cursor-not-allowed')
                    .addClass('hover:bg-green-700')
                    .html(oldHtml);
            }
        }
    }

    function applyProfitLossColor($el, value) {
        $el.removeClass('text-green-600 text-red-600 text-gray-700 text-gray-800 text-gray-900 text-black');

        if (value > 0) $el.addClass('text-green-600');     // PROFIT
        else if (value < 0) $el.addClass('text-red-600');  // LOSS
        else $el.addClass('text-gray-700');                // ZERO
    }

    function setProfitLossValue(selector, value) {
        const $el = $(selector);
        if (!$el.length) return;

        const v = num(value);
        $el.text(fmtAED(v));
        applyProfitLossColor($el, v);
    }

    function enableDragScroll(el) {
        if (!el) return;

        let isDown = false;
        let startX = 0, startY = 0, startLeft = 0, startTop = 0;

        el.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDown = true;
            el.classList.add('dragging');
            startX = e.pageX;
            startY = e.pageY;
            startLeft = el.scrollLeft;
            startTop = el.scrollTop;
            e.preventDefault();
        });

        window.addEventListener('mouseup', () => {
            isDown = false;
            el.classList.remove('dragging');
        });

        el.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            el.scrollLeft = startLeft - (e.pageX - startX);
            el.scrollTop = startTop - (e.pageY - startY);
        });

        el.addEventListener('dragstart', (e) => e.preventDefault());
    }

    $(function () {
        enableDragScroll(document.getElementById('plGridScroll'));
    });

    // ================= INDEX PAGE (Books grid) =================
    $(document).on('click', '.plIndexClose', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const root = document.getElementById('plIndexRoot');
        if (!root) return;

        const bookId = $(this).data('book-id');
        const url = tmpl(root.dataset.closeBookUrlTmpl, '__BOOK_ID__', bookId);

        if (!confirm('Close this book?')) return;

        $.ajax({
            url,
            method: 'PUT',
            headers: { 'X-CSRF-TOKEN': csrf() },
        })
            .done(() => location.reload())
            .fail(xhr => alert(xhr.responseJSON?.message || 'Failed to close book.'));
    });

    $(document).on('click', '.plIndexReopen', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const root = document.getElementById('plIndexRoot');
        if (!root) return;

        const bookId = $(this).data('book-id');
        const url = tmpl(root.dataset.reopenBookUrlTmpl, '__BOOK_ID__', bookId);

        if (!confirm('Reopen this book?')) return;

        $.ajax({
            url,
            method: 'PUT',
            headers: { 'X-CSRF-TOKEN': csrf() },
        })
            .done(() => location.reload())
            .fail(xhr => alert(xhr.responseJSON?.message || 'Failed to reopen book.'));
    });

    // ================= INDEX PAGE: Create & Open modal =================
    $(document).on('click', '#plIndexCreateBtn', function () {
        $('#plIndexModal').removeClass('hidden').addClass('flex');
    });

    $(document).on('click', '#plIndexModalClose, #plIndexCancel', function () {
        $('#plIndexModal').addClass('hidden').removeClass('flex');
    });

    $(document).off('click.pl', '#plIndexCreateGo').on('click.pl', '#plIndexCreateGo', function () {
        const root = document.getElementById('plIndexRoot');
        if (!root) return;

        const storeUrl = root.dataset.storeBookUrl;
        const dashTmpl = root.dataset.dashboardUrlTmpl;

        const title = ($('#plIndexName').val() || '').trim();
        const from = $('#plIndexFrom').val();
        const to = $('#plIndexTo').val();

        if (!from || !to) return alert('Please select From and To.');
        if (!title) return alert('Please enter Book Name.');

        const $btn = $(this);
        if ($btn.data('loading') === 1) return;

        $btn.data('loading', 1).prop('disabled', true).addClass('opacity-60');

        $.ajax({
            url: storeUrl,
            method: 'POST',
            data: { title, from, to },
            headers: { 'X-CSRF-TOKEN': csrf() }
        })
            .done(res => {
                const bookId = res.book_id || res.id || res.book?.id;

                console.log({
                    storeUrl,
                    dashTmpl,
                    bookId,
                    res
                });

                if (!bookId) {
                    console.error('No book_id returned:', res);
                    alert('Book created but book_id not returned. Check controller response.');
                    return;
                }

                const dashUrl = dashTmpl.replace('__BOOK_ID__', String(bookId));
                window.location.href = dashUrl;
            })
            .fail(xhr => {
                console.error(xhr);
                alert(xhr.responseJSON?.message || 'Failed to create book.');
            })
            .always(() => {
                $btn.data('loading', 0).prop('disabled', false).removeClass('opacity-60');
            });
    });

    // 3 dots menu toggle
    $(document).on('click', '.plKebabBtn', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const id = $(this).data('menu');
        if (!id) return;

        // close others
        $('.plKebabMenu').addClass('hidden');

        // toggle this one
        $('#' + id).toggleClass('hidden');
    });

    // click outside closes menu
    $(document).on('click', function () {
        $('.plKebabMenu').addClass('hidden');
    });

    // prevent closing when clicking inside menu
    $(document).on('click', '.plKebabMenu', function (e) {
        e.stopPropagation();
    });


    $(document).on('click', '.plIndexDelete', function (e) {
        e.preventDefault();
        e.stopPropagation();

        const root = document.getElementById('plIndexRoot');
        if (!root) return;

        const bookId = $(this).data('book-id');

        // use existing tmpl()
        const url = tmpl(
            root.dataset.deleteBookUrlTmpl,
            '__BOOK_ID__',
            bookId
        );

        $('.plKebabMenu').addClass('hidden');

        if (!confirm('Delete this book permanently? All months and entries will be removed.')) return;

        $.ajax({
            url,
            method: 'DELETE',
            headers: {
                'X-CSRF-TOKEN': csrf()
            }
        })
            .done(() => location.reload())
            .fail(xhr => {
                alert(xhr.responseJSON?.message || 'Failed to delete book');
            });
    });

})();
