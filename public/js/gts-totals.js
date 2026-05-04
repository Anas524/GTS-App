// gts-totals.js — cycle-aware + backwards compatible

// one-time API map + helpers (safe if already defined)
window.INV_API = Object.assign({
  matTot: '/investment/gts-materials/total',
  invTot: '/investment/gts-investments/total',
  rows:   '/investment/summary/customer-sheets/rows',
  us:     '/investment/summary/us/total',
  sq:     '/investment/summary/sq/total',
  local:  '/investment/summary/local-sales/total'
}, window.INV_API || {});

// cycle-aware URL wrapper
window.withCycle = window.withCycle || function (url) {
  const cid = (window.activeCycleId || (window.cycle && window.cycle.id)) || '';
  if (!cid) return url;
  const u = new URL(url, location.origin);
  u.searchParams.set('cycle_id', cid);
  return u.pathname + u.search + u.hash;
};

// simple JSON getter
window.safeGetJSON = window.safeGetJSON || function (url) {
  return $.getJSON(url);
};

(function () {
    let __materialsReqId = 0; // increasing id for materials totals requests
    let __materialsLocked = false;
    window.__materialsLockedToServer = false;

    // ----------------- State -----------------
    const EPS = 0.005;
    window.sheetTotals = window.sheetTotals || { material: 0, shipping: 0, investment: 0, ts: Date.now() };
    let lastPaint = { material: null, shipping: null, investment: null };

    // paint priority: server (2) > dom (1) > mem (0)
    const ORIGIN_PRIO = { server: 2, dom: 1, mem: 0, none: -1 };
    let lastPaintMeta = { origin: 'none', seq: 0 };

    const __paintPrio = { server: 3, dom: 2, mem: 1, none: 0 };
    let __lastPaintMeta = { origin: 'none', reqId: 0 };

    function __shouldPaint(origin, reqId, force) {
        if (force) return true;
        const prev = __lastPaintMeta;
        if (__paintPrio[origin] < __paintPrio[prev.origin]) return false;
        if (__paintPrio[origin] === __paintPrio[prev.origin] && reqId < prev.reqId) return false;
        return true;
    }

    // ----------------- Helpers -----------------
    function getActiveCycleId() {
        if (typeof window.activeCycleId !== 'undefined') return Number(window.activeCycleId) || 0;
        if (window.cycle && window.cycle.id) return Number(window.cycle.id) || 0;
        try { const v = localStorage.getItem('activeCycleId'); if (v) return Number(v) || 0; } catch { }
        return 0;
    }
    function totalsKeyFor(cycleId) { return `gts:totals:cycle:${cycleId || 'none'}`; }
    function sameTotals(a, b) {
        return Math.abs((Number(a.material) || 0) - (Number(b.material) || 0)) < EPS &&
            Math.abs((Number(a.shipping) || 0) - (Number(b.shipping) || 0)) < EPS &&
            Math.abs((Number(a.investment) || 0) - (Number(b.investment) || 0)) < EPS;
    }
    function formatCurrency(n) {
        const v = Number(n) || 0;
        return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ----------------- Storage -----------------
    function setGtsTotalsToStorage(st) {
        const cid = getActiveCycleId();
        const payload = {
            material: Number(st.material) || 0,
            shipping: Number(st.shipping) || 0,
            investment: Number(st.investment) || 0,
            ts: Number(st.ts) || Date.now(),
            cycle_id: cid
        };
        try { localStorage.setItem(totalsKeyFor(cid), JSON.stringify(payload)); } catch { }
    }
    function getGtsTotalsFromStorage() {
        const cid = getActiveCycleId();
        try {
            const raw = localStorage.getItem(totalsKeyFor(cid));
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    }

    // ----------------- Painters -----------------
    function _paint(t) {
      const mat = Number(t?.material) || 0;
      const ship = Number(t?.shipping) || 0;
      const inv = Number(t?.investment) || 0;
      const fx = n => 'AED ' + formatCurrency(n);
    
      // 1) GTS Materials page widgets (keep existing)
      $('#gtsMaterialTotal').text(fx(mat));
      $('#gtsShippingTotal').text(fx(ship));
      $('#totalInvestmentAmount-material').text(fx(inv));
      $('#remainingAmount').text(fx((mat + ship) - inv));
    
      // 2) Summary Sheet KPI cards (these are the ones visible in summary.blade.php)
      if (typeof setKpiText === 'function') {
        setKpiText('#totalPurchaseMaterial', mat);
        setKpiText('#totalShippingCost', ship);
        setKpiText('#totalInvestmentAmount-investment', inv);
      } else {
        // fallback if setKpiText not present
        $('#totalPurchaseMaterial').text(fx(mat));
        $('#totalShippingCost').text(fx(ship));
        $('#totalInvestmentAmount-investment').text(fx(inv));
      }
    
      console.log('[GTS] materials totals payload:', t);
      console.table?.([t]);
      window.__lastMaterialsTotals = t;
    }

    // ----------------- Public API -----------------
    function applyTotals(t, opts = {}) {
        // default origin is DOM unless explicitly set
        const origin = opts.origin || 'dom';
        const reqId = typeof opts.reqId === 'number' ? opts.reqId : (__lastPaintMeta.reqId + 1);

        // If we already painted from the server, ignore later DOM/mem paints
        if (__materialsLocked && origin !== 'server' && !opts.allowAfterLock) return;

        if (!__shouldPaint(origin, reqId, opts.force)) return;

        const next = {
            material: Number(t.material) || 0,
            shipping: Number(t.shipping) || 0,
            investment: Number(t.investment) || 0,
            ts: Date.now(),
        };

        // If unchanged, still commit to memory/storage and broadcast once
        if (lastPaint.material !== null && sameTotals(lastPaint, next)) {
            __lastPaintMeta = { origin, reqId };

            // commit first so listeners see fresh snapshot
            window.sheetTotals = { ...next };
            setGtsTotalsToStorage(next);

            // broadcast even if values didn't change (Summary may be waiting)
            try { document.dispatchEvent(new CustomEvent('gts:totals-changed', { detail: next })); } catch { }

            return;
        }

        // paint the Materials page widgets
        _paint(next);

        // commit before broadcast (so listeners can also read window.sheetTotals)
        __lastPaintMeta = { origin, reqId };
        lastPaint = { ...next };
        window.sheetTotals = { ...next };
        setGtsTotalsToStorage(next);

        // broadcast to Summary / Investments
        try { document.dispatchEvent(new CustomEvent('gts:totals-changed', { detail: next })); } catch { }

        // Lock after the first authoritative server paint
        if (origin === 'server') {
            __materialsLocked = true;
            window.__materialsLockedToServer = true; // <- other files can respect this
        }
    }

    function postSnapshot(cycleId, totals) {
        const base = (typeof window.resolveSummaryUrl === 'function')
            ? window.resolveSummaryUrl(`cycles/${cycleId}/materials/totals/snapshot`)
            : `/cycles/${cycleId}/materials/totals/snapshot`;
    
        return $.ajax({
            url: (typeof window.withCycle === 'function') ? window.withCycle(base) : base,
            method: 'POST',
            data: {
                material: totals.material,
                shipping: totals.shipping,
                investment: totals.investment,
                ts: totals.ts
            },
            headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content }
        }).catch(err => console.warn('Snapshot POST failed', err));
    }

    function updateTotals(partial, opts = {}) {
        const prev = window.sheetTotals || {};
        const merged = {
            material: ('material' in partial) ? Number(partial.material) || 0 : Number(prev.material) || 0,
            shipping: ('shipping' in partial) ? Number(partial.shipping) || 0 : Number(prev.shipping) || 0,
            investment: ('investment' in partial) ? Number(partial.investment) || 0 : Number(prev.investment) || 0,
            ts: Date.now()
        };
        window.sheetTotals = merged;
        setGtsTotalsToStorage(merged);
        // default origin to 'dom' so it can't trump server unless explicitly asked
        applyTotals(merged, { origin: opts.origin || 'dom', reqId: opts.reqId, force: opts.force, allowAfterLock: opts.allowAfterLock });
    }

    function updateInvestmentTotals(investmentTotal) {
        updateTotals({ investment: Number(investmentTotal) || 0 });
    }
    function applyInvestmentTotal(total) { updateInvestmentTotals(total); }
    
    (function () {
      // If any old code tries to "paint totals from DOM", funnel it here.
      if (!window.paintMaterialsFromDom) {
        window.paintMaterialsFromDom = function (x) {
          // Don’t override the server once it painted
          if (window.__materialsLockedToServer) return;
          const material = Number(x && x.material) || 0;
          const shipping = Number(x && x.shipping) || 0;
          // origin 'dom' ensures server paint has higher priority
          window.updateTotals({ material, shipping }, { origin: 'dom' });
        };
      }
    
      // If you had older function names, alias them:
      window.paintMaterialHeaderFromServer = window.paintMaterialHeaderFromServer || function (t) {
        // treat it as authoritative
        window.applyTotals({
          material: Number(t && t.material) || 0,
          shipping: Number(t && t.shipping) || 0,
          investment: Number(t && t.investment) || (window.sheetTotals?.investment || 0)
        }, { origin: 'server' });
      };
    })();

    // ----------------- Fetchers -----------------
    function fetchInvestmentTotal() {
      // GET /investment/gts-investments/total?cycle_id=...
      return safeGetJSON(withCycle(window.INV_API.invTot))
        .then(function (res) {
          return Number((res && (res.investment ?? res.total)) || 0);
        })
        .catch(function () { return 0; });
    }

    function fetchMaterialTotals() {
      // GET /investment/gts-materials/total?cycle_id=...
      return safeGetJSON(withCycle(window.INV_API.matTot))
        .then(function (res) {
          return {
            material: Number(res && res.material || 0),
            shipping: Number(res && res.shipping || 0)
          };
        })
        .catch(function () {
          return { material: 0, shipping: 0 };
        });
    }

    function fetchAndUpdateInvestmentTotal() {
        return fetchInvestmentTotal().then(total => {
            updateTotals({ investment: total }, { origin: 'server' });
            return total;
        });
    }


    // server fetches
    function fetchAndUpdateMaterialTotals() {
        const reqId = ++__materialsReqId;
        return fetchMaterialTotals().then(({ material, shipping }) => {
            updateTotals({ material, shipping }, { origin: 'server', reqId });
            return { material, shipping };
        });
    }


    // ----------------- Orchestrators / Shims -----------------
    function refreshAllTotals() {
        const reqId = ++__materialsReqId;
        return Promise.all([fetchInvestmentTotal(), fetchMaterialTotals()])
            .then(([inv, ms]) => applyTotals(
                { material: ms.material, shipping: ms.shipping, investment: Number(inv) || 0 },
                { origin: 'server', reqId, force: true }
            ));
    }

    function clearTotalsCache() {
        try { localStorage.removeItem(totalsKeyFor(getActiveCycleId())); } catch { }
    }

    // ----------------- Events -----------------
    function onCycleChanged() {
        clearTotalsCache();
        refreshAllTotals();
    }
    document.addEventListener('cycle:changed', onCycleChanged);
    // legacy alias for old code paths that still dispatch set:changed
    document.addEventListener('set:changed', onCycleChanged);

    document.addEventListener('cycle:closed', () => { clearTotalsCache(); applyTotals({ material: 0, shipping: 0, investment: 0 }, { force: true }); });
    document.addEventListener('set:closed', () => { clearTotalsCache(); applyTotals({ material: 0, shipping: 0, investment: 0 }, { force: true }); });

    // ----------------- Expose to window (back-compat) -----------------
    window.applyTotals = applyTotals;
    window.updateTotals = updateTotals;
    window.updateInvestmentTotals = updateInvestmentTotals;
    window.applyInvestmentTotal = applyInvestmentTotal;

    window.fetchInvestmentTotal = fetchInvestmentTotal;
    window.fetchMaterialTotals = fetchMaterialTotals;
    window.fetchAndUpdateInvestmentTotal = fetchAndUpdateInvestmentTotal;
    window.fetchAndUpdateMaterialTotals = fetchAndUpdateMaterialTotals;

    window.getGtsTotalsFromStorage = getGtsTotalsFromStorage;
    window.setGtsTotalsToStorage = setGtsTotalsToStorage;

    // optional shims some projects used:
    window.paintTotals = applyTotals;
    window.updateTotalsUI = applyTotals;
    window.refreshAllTotals = refreshAllTotals;
    window.clearTotalsCache = clearTotalsCache;
})();

// Boot the Materials header once, and only on the Materials page
(function () {
  if (window.__GTS_MATERIALS_BOOTED__) return;
  window.__GTS_MATERIALS_BOOTED__ = true;

  $(function () {
    // only run on the materials page (those ids live there)
    const onMaterialsPage = $('#gtsMaterialTotal').length > 0;
    if (!onMaterialsPage) return;

    // clear placeholders if empty or obviously zero
    ['#gtsMaterialTotal','#gtsShippingTotal','#totalInvestmentAmount-material','#remainingAmount']
      .forEach(sel => {
        const $el = $(sel);
        const txt = ($el.text() || '').trim();
        if (!txt || /^AED\s*0(?:\.00)?$/.test(txt)) $el.text('AED 0.00');
      });

    // don't clobber an existing lock; just ensure the flag exists
    if (typeof window.__materialsLockedToServer === 'undefined') {
      window.__materialsLockedToServer = false;
    }

    // fetch authoritative totals (these will lock painting to server values)
    if (typeof window.fetchAndUpdateMaterialTotals === 'function') {
      window.fetchAndUpdateMaterialTotals();
    }
    if (typeof window.fetchAndUpdateInvestmentTotal === 'function') {
      window.fetchAndUpdateInvestmentTotal();
    }
  });
})();
