// ===== REQUEST UTILITIES (dedupe + tiny cache + concurrency) =====
(function () {
  if (window.__REQ_UTILS__) return;
  window.__REQ_UTILS__ = true;

  const inflight = new Map();
  const tinyCache = new Map();
  const TINY_TTL_MS = 8000;
  let active = 0;
  const queue = [];
  const MAX_CONCURRENT = 3;

  function runOrQueue(task) {
    return new Promise((resolve, reject) => {
      const wrapped = async () => {
        active++;
        try { resolve(await task()); } catch (e) { reject(e); }
        finally {
          active--;
          if (queue.length) queue.shift()();
        }
      };
      if (active < MAX_CONCURRENT) wrapped(); else queue.push(wrapped);
    });
  }

  function cacheGet(key) {
    const hit = tinyCache.get(key);
    if (!hit) return null;
    if (Date.now() - hit.ts > TINY_TTL_MS) { tinyCache.delete(key); return null; }
    return hit.data;
  }
  function cacheSet(key, data) { tinyCache.set(key, { ts: Date.now(), data }); }

  window.withCycle = function withCycle(url) {
    const u = new URL(url, location.origin);
    if (window.activeCycleId && !u.searchParams.has('cycle_id')) {
      u.searchParams.set('cycle_id', String(window.activeCycleId));
    }
    return u.pathname + u.search;
  };
  window.withForceBust = function withForceBust(url) {
    const u = new URL(withCycle(url), location.origin);
    u.searchParams.set('_t', String(Date.now()));
    return u.pathname + u.search;
  };

  window.safeGetJSON = function safeGetJSON(url, { force = false, key } = {}) {
    const k = key || url;
    if (!force) {
      const c = cacheGet(k);
      if (c) return Promise.resolve(c);
    }
    if (inflight.has(k)) return inflight.get(k);

    const p = runOrQueue(() => {
        // Use jqXHR so we can call .always()
        const jq = $.ajax({ url, method: 'GET', dataType: 'json', cache: true });
    
        // cache on success
        jq.then(function (data) { cacheSet(k, data); });
    
        // always clear inflight (success or error)
        jq.always(function () { inflight.delete(k); });
    
        return jq; // return jqXHR (then-able)
      });

    inflight.set(k, p);
    return p;
  };

  $.ajaxSetup({ cache: true });
  
  $.ajaxPrefilter(function (options, original) {
      const method = (options.method || options.type || 'GET').toUpperCase();
    
      if (method === 'GET') {
        try {
          const u = new URL(options.url, location.origin);
    
          // drop cache-buster unless explicitly forced
          const force = original && original.xForceBust === true;
          if (!force) u.searchParams.delete('_t');
    
          // collapse "/investment/investment/"
          u.pathname = u.pathname.replace(/\/investment\/(?:\/)?investment\//, '/investment/');
    
          // fix "/investment/https://..."
          if (/^\/investment\/https?:/i.test(u.pathname)) {
            const rest = u.pathname.replace(/^\/investment\//i, '');
            try {
              const abs = new URL(rest);
              options.url = abs.pathname + (abs.search || '');
              return;
            } catch (_) {}
          }
          options.url = u.pathname + u.search;
        } catch (_) {}
      }
    
      // scrub _t if it was passed via data
      if (original && original.data) {
        if (typeof original.data === 'string') {
          options.data = original.data.split('&').filter(kv => !/^_t=/.test(kv)).join('&');
        } else if (typeof original.data === 'object' && '_t' in original.data) {
          const copy = { ...original.data }; delete copy._t; options.data = copy;
        }
      }
    });
  
})();
