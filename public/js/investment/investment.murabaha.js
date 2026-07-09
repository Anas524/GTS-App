function isTempId(id) {
  return String(id).length > 10;
}

$("#saveMurabahaDateBtn").on("click", function () {
  if (!ensureOpenOrToast()) return;

  const investmentId = $("#murabahaDateModal").data("investment-id");

  // 🚨 block unsaved rows
  if (!investmentId || isTempId(investmentId)) {
    alert("Please save the row first before setting Murabaha date.");
    return;
  }

  let rawDate = $("#murabahaDateInput").val();

  if (!rawDate) {
    alert("Please select a date.");
    return;
  }

  const selectedDate = new Date(rawDate).toISOString().split('T')[0];

  $.ajax({
    url: invMurabahaUrl(investmentId),
    method: 'POST',
    data: {
      murabaha_status: "yes",
      murabaha_date: selectedDate,
      _token: $('meta[name="csrf-token"]').attr("content")
    },
    success: function () {
      $("#murabahaDateModal").fadeOut();

      $(`.murabaha-date-display[data-id="${investmentId}"]`).text(selectedDate);
      $(`tr[data-id="${investmentId}"]`)
        .find('.murabaha-date-hidden')
        .val(selectedDate);
    },
    error: function () {
      alert("Failed to save Murabaha date.");
    }
  });
});