window.GTS = window.GTS || {};

GTS.api = (function () {

  function get(url) {
    return $.get(investmentUrl(url));
  }

  function post(url, data) {
    return $.post(investmentUrl(url), data);
  }

  function put(url, data) {
    return $.ajax({
      url: investmentUrl(url),
      type: 'PUT',
      data: data
    });
  }

  function del(url) {
    return $.ajax({
      url: investmentUrl(url),
      type: 'DELETE'
    });
  }

  return { get, post, put, del };

})();