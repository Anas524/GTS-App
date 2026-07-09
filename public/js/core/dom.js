window.GTS = window.GTS || {};

GTS.dom = (function () {

  function qs(sel) {
    return document.querySelector(sel);
  }

  function qsa(sel) {
    return document.querySelectorAll(sel);
  }

  function on(event, selector, handler) {
    $(document).on(event, selector, handler);
  }

  return { qs, qsa, on };

})();