window.invStoreUrl = () => api('/investment/investments');
window.invUpdateUrl = (id) => api(`/investment/investments/${id}`);
window.invMurabahaUrl = (id) => api(`/investment/investments/${id}/murabaha`);
window.invAttachmentsUrl = (id) => api(`/investment/investments/${id}/attachments`);
window.invUploadAttachmentsUrl = (id) => api(`/investment/investments/${id}/upload-attachments`);
window.invAttachmentsDlUrl = (id) => api(`/investment/investments/${id}/attachments/download`);

window.loadGtsInvestments = function () {
  $.getJSON(api('/investment/investments'))
    .done(function (data) {
      $("#investmentTableBody").empty();

      const rows = Array.isArray(data) ? data :
        Array.isArray(data?.data) ? data.data :
        Array.isArray(data?.items) ? data.items : [];

      rows.forEach(item => {
        createInvestmentLayout(
          item.id,
          item.date,
          item.investor,
          item.investment_amount,
          item.investment_no,
          item.mode_of_transaction,
          item.murabaha,
          item.repayment_terms,
          item.loan_tenure,
          item.repayment_date,
          item.remarks,
          item.status,
          item.murabaha_status,
          item.murabaha_date,
          item.payment_method
        );
      });

      updateInvestmentSerialNumbers();
      window.fetchAndUpdateInvestmentTotal?.();
    });
};