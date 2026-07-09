function initInvestmentUI() {

  if (window.investmentUIInitialized) return;
  window.investmentUIInitialized = true;

  // =========================
  // ADD ROW
  // =========================
  $("#addInvestmentRowBtn").on("click", function () {
    $("#modalInvestmentDate").val("");
    $("#modalInvestmentInvestor").val("");
    $("#investmentRowModal").removeClass("hidden").addClass("flex");
  });

  $("#investmentCancelBtn").on("click", function () {
    $("#investmentRowModal").addClass("hidden").removeClass("flex");
  });

  $("#investmentForm").on("submit", function (e) {
    e.preventDefault();

    const date = $("#modalInvestmentDate").val().trim();
    const investor = $("#modalInvestmentInvestor").val().trim();

    if (!date || !investor) {
      alert("Fill all fields");
      return;
    }

    createInvestmentLayout(Date.now(), date, investor);

    $("#investmentRowModal").addClass("hidden").removeClass("flex");
    this.reset();
  });

  // =========================
  // TOGGLE DETAIL
  // =========================
  $(document).on("click", ".investment-header", function (e) {
    if ($(e.target).closest("button").length) return;
    $(this).next(".investment-detail-row").toggleClass("hidden");
  });

  // =========================
  // LIVE AMOUNT UPDATE
  // =========================
  $(document).on("input", ".investment-amount", function () {
    const val = parseFloat($(this).val()) || 0;
    const $header = $(this).closest("tr").prev(".investment-header");

    $header.find("td").eq(3).text(
      `AED ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    );

    window.fetchAndUpdateInvestmentTotal();
  });

  // =========================
  // SUBMIT
  // =========================
  $(document).on("click", ".submit-investment-btn", function () {

    const $header = $(this).closest("tr");
    const $detail = $header.next(".investment-detail-row");
    const id = $detail.data("id");

    const $form = $detail.find("form");

    $.ajax({
      url: invStoreUrl(),
      method: "POST",
      data: {
        date: $form.find(".investment-date").val(),
        investor: $form.find(".investment-investor").val(),
        investment_amount: parseFloat($form.find(".investment-amount").val()) || 0,
      },
      success: function (res) {

        $header.attr("data-id", res.id);
        $detail.attr("data-id", res.id);

        $header.find(".submit-investment-btn").remove();

        $detail.data('snapshot', buildInvestmentSnapshot($detail));
        toggleUpdateButtonForInvestment($detail);

        window.fetchAndUpdateInvestmentTotal(true);
      }
    });

  });

  $(document).on("click", ".delete-investment-btn", function () {
    const $headerRow = $(this).closest("tr");
    const id = $headerRow.data("id");

    if (!confirm("Delete this investment?")) return;

    $.ajax({
      url: invUpdateUrl(id),
      method: "DELETE",
      success: function () {
        $headerRow.next().remove();
        $headerRow.remove();
        updateInvestmentSerialNumbers();
        window.fetchAndUpdateInvestmentTotal();
      }
    });
  });

  let currentMurabahaRowId = null;

  $(document).on('change', '.murabaha-radio', function () {
    const row = $(this).closest('tr');
    currentMurabahaRowId = row.data('id');

    if ($(this).val() === 'yes') {
      const existingDate = row.find('.murabaha-date-hidden').val();

      $('#murabahaDateModal').data('investment-id', currentMurabahaRowId);
      $('#murabahaDateInput').val(existingDate || '');

      $('#murabahaDateModal').fadeIn();
    } else {
      row.find('.murabaha-date-hidden').val('');
      row.find('.murabaha-date-display').text('');
    }
  });

  $(document)
    .off('click.investUpdate')
    .on('click.investUpdate', '.update-invest-btn', function () {

      if (!ensureOpenOrToast()) return;

      const $headerRow = $(this).closest('tr.investment-header');
      const $detailRow = $headerRow.next('.investment-detail-row');
      const id = $headerRow.data('id');

      if (!id) {
        alert("Missing ID");
        return;
      }

      const $f = $detailRow.find('form');

      const payload = {
        date: $f.find('.investment-date').val(),
        investor: $f.find('.investment-investor').val(),
        investment_amount: parseFloat($f.find('.investment-amount').val()) || 0,
        investment_no: $f.find('.investment-no').val(),
        mode_of_transaction: $f.find('.mode-of-transaction').val(),
        murabaha: $f.find('.murabaha-input').val(),
        repayment_terms: $f.find('.repayment-terms').val(),
        loan_tenure: parseInt($f.find('.loan-tenure').val()) || 0,
        repayment_date: $f.find('.repayment-date').val(),
        remarks: $f.find('.remarks').val(),
        payment_method: $f.find('.payment-method').val() || "",
        murabaha_status: $detailRow.find('input.murabaha-radio:checked').val() || 'no',
        murabaha_date: $detailRow.find('.murabaha-date-hidden').val() || ''
      };

      $.ajax({
        url: invUpdateUrl(id),
        method: 'PUT',
        headers: {
          'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
        },
        data: payload,
        success: function () {

          //  update header display
          const formattedAmt = `AED ${Number(payload.investment_amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`;

          $headerRow.find('.investment-amount-display').text(formattedAmt);
          $headerRow.find('.payment-method-display').text(payload.payment_method || '—');

          //  reset snapshot
          $detailRow.data('snapshot', buildInvestmentSnapshot($detailRow));

          //  remove update icon
          toggleUpdateButtonForInvestment($detailRow);

          //  update total
          window.fetchAndUpdateInvestmentTotal(true);

          //  visual feedback
          const $cell = $headerRow.find('td:last').addClass('bg-green-50');
          setTimeout(() => $cell.removeClass('bg-green-50'), 600);
        },
        error: function (xhr) {
          alert(xhr?.responseJSON?.message || 'Update failed.');
          console.error(xhr?.responseText || xhr);
        }
      });

    });

  $(document).on('input change', '.investment-detail-row :input', function () {
    toggleUpdateButtonForInvestment($(this).closest('.investment-detail-row'));
  });

  $(document).on("click", ".invest-save-changes-btn", function () {

    if (!ensureOpenOrToast()) return;

    const $form = $(this).closest("form");
    const $detailRow = $form.closest(".investment-detail-row");
    const $headerRow = $detailRow.prev(".investment-header");
    const id = $detailRow.data("id");

    if (!id) return;

    const payload = {
      date: $form.find(".investment-date").val(),
      investor: $form.find(".investment-investor").val(),
      investment_amount: parseFloat($form.find(".investment-amount").val()) || 0,
      investment_no: $form.find(".investment-no").val(),
      mode_of_transaction: $form.find(".mode-of-transaction").val(),
      murabaha: $form.find(".murabaha-input").val(),
      repayment_terms: $form.find(".repayment-terms").val(),
      loan_tenure: $form.find(".loan-tenure").val(),
      repayment_date: $form.find(".repayment-date").val(),
      remarks: $form.find(".remarks").val(),
      payment_method: $form.find(".payment-method").val() || "",
    };

    $.ajax({
      url: invUpdateUrl(id),
      method: "PUT",
      data: payload,
      success: function () {

        $headerRow.find("td:nth-child(3)").text(payload.investor);
        $headerRow.find(".investment-amount-display").text(
          `AED ${payload.investment_amount.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}`
        );

        $form.find(".invest-save-changes-btn").addClass("hidden");

        $detailRow.data('snapshot', buildInvestmentSnapshot($detailRow));
        toggleUpdateButtonForInvestment($detailRow);

        window.fetchAndUpdateInvestmentTotal(true);
      }
    });
  });

  // Show upload modal
  $(document).on("click", ".investment-attachment-btn", function () {
    const investmentId = $(this).data("id");

    // Set ID in modal
    $("#uploadAttachmentModal").data("investment-id", investmentId);

    // Clear file inputs and filenames
    $("#invoice, #receipt, #note").val('');
    $("#invoiceFileName, #receiptFileName, #noteFileName").val('');

    // Load existing file names
    $.get(invAttachmentsUrl(investmentId), function (res) {
      if (res.invoice) {
        $("#invoiceFileName").val(fileLabel(res.invoice));
      }
      if (res.receipt) {
        $("#receiptFileName").val(fileLabel(res.receipt));
      }
      if (res.note) {
        $("#noteFileName").val(fileLabel(res.note));
      }
    });

    // Show modal
    $("#uploadAttachmentModal").removeClass("hidden").addClass("flex").hide().fadeIn();
  });

}