// 1) Global flag other code can respect
window.__DISABLE_BEN_CACHE__ = true;

// Build URL and inject cycle_id + cache-buster.
// IMPORTANT: If input was absolute, keep it absolute.
window.withCycle = function (url) {
  try {
    const s = String(url || '');
    const wasAbsolute = /^https?:\/\//i.test(s);
    const u = new URL(s, location.origin); // resolves relative against current origin

    // add/refresh params
    const cid = String(window.activeCycleId || (window.cycle && window.cycle.id) || '');
    if (cid && !u.searchParams.has('cycle_id')) u.searchParams.set('cycle_id', cid);
    u.searchParams.set('_t', Date.now());

    // keep absolute if input was absolute; else return clean relative
    return wasAbsolute ? u.toString() : (u.pathname + u.search + u.hash);
  } catch (e) {
    const sep = (String(url || '').indexOf('?') >= 0) ? '&' : '?';
    const cid = encodeURIComponent(String(window.activeCycleId || ''));
    return `${url}${sep}${cid ? `cycle_id=${cid}&` : ''}_t=${Date.now()}`;
  }
};

// 2) Make all getters return null (no cached seed values)
(function () {
  const nullFn = () => null;
  ['getLocalSalesCached', 'getSqCached', 'getUsCached', 'getGtsTotalsFromStorage']
    .forEach(fn => { if (typeof window[fn] === 'function') window[fn] = nullFn; });

  // 3) Make all setters no-op (prevent writing future stale values)
  const noop = () => { };
  ['setLocalSalesCached', 'setSqCached', 'setUsCached', 'setGtsTotalsToStorage']
    .forEach(fn => { if (typeof window[fn] === 'function') window[fn] = noop; });

  // 4) As an extra guard, short-circuit localStorage for ben/gts totals keys
  try {
    const _get = localStorage.getItem.bind(localStorage);
    const _set = localStorage.setItem.bind(localStorage);

    // helpers to detect our keys
    const isBenTotalsKey = (k) =>
      // new format: c{ID}:ben:{localTotal|sqTotal|usTotal}
      /^c\d+:ben:(localTotal|sqTotal|usTotal)$/.test(k) ||
      // old format: ben:{x|0|ID}:{localTotal|sqTotal|usTotal}
      /^ben:(?:x|0|\d+):(?:localTotal|sqTotal|usTotal)$/.test(k) ||
      // fallback: anything like *:ben:* and ends with the 3 fields
      (k.includes(':ben:') && /(localTotal|sqTotal|usTotal)$/.test(k));

    const isGtsTotalsKey = (k) => (k === 'gts:totals' || k === 'gtsTotals');

    localStorage.getItem = (k) => {
      if (!k) return _get(k);
      if (isBenTotalsKey(k) || isGtsTotalsKey(k)) return null;
      return _get(k);
    };

    localStorage.setItem = (k, v) => {
      if (!k) return _set(k, v);
      if (isBenTotalsKey(k) || isGtsTotalsKey(k)) return; // block writes
      return _set(k, v);
    };
  } catch { }
})();

// --- detect the cycle id from URL / DOM ---
(function () {
  // a) /c/<id>/... route (your "Open screen" links use this)
  const pathMatch = location.pathname.match(/\/c\/(\d+)(?:\/|$)/);
  const idFromPath = pathMatch ? parseInt(pathMatch[1], 10) : null;

  // b) <body data-cycle-id="..."> or any element with id="summary-root" data-cycle-id="..."
  const idFromBody = (function () {
    const b = document.body;
    if (b && b.dataset && b.dataset.cycleId) return parseInt(b.dataset.cycleId, 10);
    const s = document.getElementById('summary-root');
    if (s && s.dataset && s.dataset.cycleId) return parseInt(s.dataset.cycleId, 10);
    return null;
  })();

  // c) <meta name="cycle-id" content="...">
  const idFromMeta = (function () {
    const m = document.querySelector('meta[name="cycle-id"]');
    return m ? parseInt(m.content, 10) : null;
  })();

  // choose first non-null source
  const detected = idFromPath ?? idFromBody ?? idFromMeta ?? null;

  // set the global
  if (detected && !Number.isNaN(detected)) {
    window.activeCycleId = detected;
    try { localStorage.setItem('activeCycleId', String(detected)); } catch { }
  } else {
    // fallback (last known from localStorage or hard default)
    try {
      const saved = localStorage.getItem('activeCycleId');
      if (saved && !window.activeCycleId) window.activeCycleId = parseInt(saved, 10);
    } catch { }
  }
})();

// --- cycle-glue.js (load this FIRST) ---
window.activeCycleId = window.activeCycleId || (window.__DEFAULT_CYCLE_ID__ || 5);
window._activeCycle = window.activeCycleId;

if (typeof migrateBenKeysOnce === 'function') { migrateBenKeysOnce(); }

// Preferred URL resolver for LIVE (keeps your slugs consistent)
window.resolveSummaryUrl = function (slugOrUrl) {
  const s = String(slugOrUrl || '');
  const clean = s.replace(/^\//, ''); // allow passing "summary/... or /summary/..."
  if (typeof investmentUrl === 'function') return investmentUrl(clean);
  if (typeof api === 'function')           return api(clean);
  // fallback: leave as-is (relative or absolute)
  return s;
};

// jQuery: add cycle_id to EVERY same-origin request automatically
if (window.jQuery && !window.__cycleAjaxHooked) {
  window.__cycleAjaxHooked = true;

  $.ajaxPrefilter(function (options) {
    try {
      const raw = String(options.url || '');
      const isAbsolute = /^https?:\/\//i.test(raw);

      // Resolve via investmentUrl/api if possible (keeps slugs consistent)
      const resolved = (typeof window.resolveSummaryUrl === 'function')
        ? window.resolveSummaryUrl(raw)
        : raw;

      const urlObj = new URL(resolved, location.origin);
      const sameOrigin = (urlObj.origin === location.origin);

      if (!sameOrigin) {
        // Don’t mutate external calls
        options.url = resolved;
        return;
      }

      // If cycle_id already present, only refresh _t
      if (/(\?|&)cycle_id=/.test(urlObj.search)) {
        urlObj.searchParams.set('_t', Date.now());
        options.url = urlObj.toString().replace(location.origin, '');
        return;
      }

      // Otherwise, run through withCycle (which will also add _t)
      options.url = window.withCycle(urlObj.toString());
    } catch {
      // Fallback: best-effort
      options.url = window.withCycle(options.url || '');
    }
  });

  // Ensure non-GET bodies also carry cycle_id
  $(document).on('ajaxSend', function (_evt, _jqXHR, settings) {
    const method = (settings.type || settings.method || 'GET').toUpperCase();
    if (method === 'GET') return;

    const cid = String(window.activeCycleId);

    if (settings.data instanceof FormData) {
      if (!settings.data.has('cycle_id')) settings.data.append('cycle_id', cid);
      return;
    }
    if (typeof settings.data === 'string') {
      if (!/(\?|&)cycle_id=/.test(settings.data)) {
        settings.data = (settings.data ? settings.data + '&' : '') + 'cycle_id=' + encodeURIComponent(cid);
      }
      return;
    }
    if (settings.data && typeof settings.data === 'object' && !('cycle_id' in settings.data)) {
      settings.data.cycle_id = cid;
    }
  });
}

// Ensure migration runs on any future cycle changes before others react
$(document)
  .off('cycle:changed.migrateBen')   // idempotent bind
  .on('cycle:changed.migrateBen', function () {
    if (typeof migrateBenKeysOnce === 'function') { migrateBenKeysOnce(); }
  });

$(function () {
  if (window.activeCycleId) {
    // don’t navigate; just tell listeners the current set
    $(document).trigger('cycle:changed', { id: window.activeCycleId });
  }
});
