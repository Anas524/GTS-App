window.GTS = window.GTS || {};

GTS.utils = (function () {

  function toNumber(v) {
    return Number(String(v ?? '').replace(/[^\d.-]/g, '')) || 0;
  }

  function formatAED(n) {
    return 'AED ' + (Number(n) || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function debounce(fn, delay = 150) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  return {
    toNumber,
    formatAED,
    debounce
  };

})();