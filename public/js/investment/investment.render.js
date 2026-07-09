function createInvestmentLayout(
  investmentId = Date.now(),
  investmentDate,
  investor,
  investmentAmount = 0,
  investmentNo = "",
  modeOfTransaction = "",
  murabaha = "",
  repaymentTerms = "",
  loanTenure = "",
  repaymentDate = "",
  remarks = "",
  status = "draft",
  murabahaStatus = 'no',
  murabahaDate = '',
  paymentMethod = ''
) {
  // Calculate serial number
  const serialNo = $("#investmentTableBody tr.investment-header").length + 1;

  // Format with commas
  const formattedAmount = `AED ${investmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const dateObj = new Date(investmentDate);
  const formattedDate = isNaN(dateObj)
    ? "Invalid Date"
    : dateObj.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const showActions = !isClosed();

  const actionButtons = showActions ? `
      <div class="action-buttons flex items-center justify-center gap-1">
          ${status === "draft" ? `
            <button type="button" class="submit-investment-btn px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
              Submit
            </button>` : ''}
    
          ${createInvestmentIconButton('investment-attachment-btn', 'bi-cloud-arrow-up-fill', 'Upload Attachments', 'bg-blue-500 hover:bg-blue-600 text-white', investmentId)}
          ${createInvestmentIconButton('btn-view-attachment', 'bi-paperclip', 'View Attachments', 'bg-gray-700 hover:bg-gray-800 text-white', investmentId)}
          ${createInvestmentIconButton('delete-investment-btn', 'bi-trash-fill', 'Delete Row', 'bg-red-500 hover:bg-red-600 text-white', investmentId)}
      </div>
    ` : '';

  const safeId = String(investmentId).replace(/[^a-zA-Z0-9_-]/g, '');

  const safePayment = paymentMethod || '—';

  const $headerRow = $(`
      <tr class="investment-header cursor-pointer hover:bg-gray-100 ${status === 'draft' ? 'is-draft' : ''}" data-id="${investmentId}">
        <td class="border p-2 text-center">${serialNo}</td>
        <td class="border p-2">${formattedDate}</td>
        <td class="border p-2">${investor}</td>
        <td class="border p-2">
          <span class="investment-amount-display">${formattedAmount}</span>
        </td>
        <td class="border p-2"><span class="payment-method-display">${escapeHtml(safePayment)}</span></td>
        ${showActions ? `<td class="border p-2 text-center action-col" data-col="action">${actionButtons}</td>` : ``}
      </tr>
    `);

  const $detailRow = $(`
    <tr class="investment-detail-row relative hidden ${status === 'draft' ? 'is-draft' : ''}" data-id="${investmentId}">
      <td colspan="${showActions ? 6 : 5}" class="p-4 bg-white">
        <form id="investmentDetailsForm-${investmentId}" data-id="${investmentId}">
          <div class="mt-3 text-right">
            ${status !== "draft" ? `
              <button type="button"
                class="invest-save-changes-btn hidden px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                Save Changes
              </button>` : ""}
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">Date</label>
              <input type="text" value="${escapeHtml(formattedDate)}" class="investment-date w-full bg-yellow-100 px-3 py-2 rounded" readonly />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Investor</label>
              <input type="text" value="${escapeHtml(investor)}" class="investment-investor w-full bg-yellow-100 px-3 py-2 rounded" readonly />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Investment Amount</label>
              <input type="number" min="0" placeholder="e.g., 10000" value="${escapeHtml(investmentAmount)}" class="investment-amount w-full bg-yellow-100 px-3 py-2 rounded editable-field" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Investment No.</label>
              <input type="text" placeholder="e.g., GTS-..." value="${escapeHtml(investmentNo)}" class="investment-no w-full bg-yellow-100 px-3 py-2 rounded editable-field" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Mode of Transaction</label>
              <select class="mode-of-transaction w-full bg-blue-100 px-3 py-2 rounded editable-field">
                <option ${modeOfTransaction === "Bank Deposit" ? "selected" : ""}>Bank Deposit</option>
                <option ${modeOfTransaction === "Cash" ? "selected" : ""}>Cash</option>
                <option ${modeOfTransaction === "Cheque" ? "selected" : ""}>Cheque</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Murabaha (Profit Sharing)</label>
              <input type="text" value="${escapeHtml(murabaha)}" class="murabaha-input w-full bg-yellow-100 px-3 py-2 rounded editable-field" />
            </div>

            <div class="mt-2">
              <label class="block text-sm font-medium mb-1">Murabaha Applicable?</label>
              <div class="flex items-center gap-4">
                <label class="flex items-center gap-2">
                  <input type="radio" name="murabaha_status_${safeId}" class="murabaha-radio" value="yes" ${murabahaStatus === 'yes' ? 'checked' : ''} />
                  <span>Yes</span>
                </label>
                <label class="flex items-center gap-2">
                  <input type="radio" name="murabaha_status_${safeId}" class="murabaha-radio" value="no" ${murabahaStatus === 'no' ? 'checked' : ''} />
                  <span>No</span>
                </label>

                <span class="murabaha-date-display text-sm text-blue-600 font-semibold" data-id="${investmentId}">
                  ${murabahaDate || ''}
                </span>
              </div>
            </div>
            <input type="hidden" name="murabaha_date_${investmentId}" class="murabaha-date-hidden" value="" />

            <div>
              <label class="block text-sm font-medium mb-1">Repayment Terms</label>
              <select class="repayment-terms w-full bg-blue-100 px-3 py-2 rounded editable-field">
                <option ${repaymentTerms === "Monthly" ? "selected" : ""}>Monthly</option>
                <option ${repaymentTerms === "Quarterly" ? "selected" : ""}>Quarterly</option>
                <option ${repaymentTerms === "Annually" ? "selected" : ""}>Annually</option>
                <option ${repaymentTerms === "Lump sum" ? "selected" : ""}>Lump sum</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Loan Tenure (Duration Months)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g., 12"
                value="${escapeHtml(loanTenure)}"
                class="loan-tenure w-full bg-yellow-100 px-3 py-2 rounded editable-field"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Repayment Date</label>
              <input type="date" value="${escapeHtml(repaymentDate)}" class="repayment-date w-full bg-yellow-100 px-3 py-2 rounded editable-field" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Payment Method</label>
              <select class="payment-method w-full bg-blue-100 px-3 py-2 rounded editable-field">
                <option value="" ${!paymentMethod ? 'selected' : ''}>Select…</option>
                <option value="Cash" ${paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option>
                <option value="Bank transfer" ${paymentMethod === 'Bank transfer' ? 'selected' : ''}>Bank transfer</option>
                <option value="Other" ${paymentMethod === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Remarks</label>
              <textarea class="remarks w-full bg-yellow-100 px-3 py-2 rounded editable-field">${remarks}</textarea>
            </div>
          </div>

          <input type="hidden" name="investment_id" value="${escapeHtml(investmentId)}" />

        </form>
      </td>
    </tr>
  `);

  $("#investmentTableBody").append($headerRow).append($detailRow);

  $detailRow.data('snapshot', buildInvestmentSnapshot($detailRow));
  toggleUpdateButtonForInvestment($detailRow);

  const $form = $detailRow.find(`#investmentDetailsForm-${investmentId}`);

  // Define a clean function to sanitize input values
  function clean(val) {
    return val === "null" || val == null ? "" : val.toString().trim();
  }

  // Store original data using sanitized values
  const originalData = {
    investor: clean(investor),
    investment_amount: parseFloat(investmentAmount) || 0,
    investment_no: clean(investmentNo),
    mode_of_transaction: clean(modeOfTransaction),
    murabaha: clean(murabaha),
    repayment_terms: clean(repaymentTerms),
    loan_tenure: parseInt(loanTenure) || 0,
    repayment_date: repaymentDate?.split("T")[0] || "",
    remarks: clean(remarks),
    payment_method: clean(paymentMethod),
  };

  $form.data("original", originalData);

  $detailRow.find(".investmentAmount").on("input", function () {
    const amount = parseFloat($(this).val()) || 0;
    const formatted = `AED ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const $header = $detailRow.prev(".investment-header");
    if ($header.length) {
      $header.find("td:nth-child(4)").html(`<span class="investment-amount-display">${formatted}</span>`);
    }

    window.fetchAndUpdateInvestmentTotal(); // your new method
  });


  $('html, body').animate({
    scrollTop: $headerRow.offset().top - 80
  }, 400);

  updateInvestmentSerialNumbers();
  window.fetchAndUpdateInvestmentTotal();
}

// Investment-only icon factory (doesn't clash with Materials)
function createInvestmentIconButton(btnClass, iconClass, tooltipText, bgClasses, id) {
  return `
    <div class="relative group inline-block investment-action-buttons">
      <button
        class="${btnClass} ${bgClasses} h-8 w-8 p-0 rounded text-sm flex items-center justify-center"
        data-id="${id}"
        type="button"
      >
        <i class="bi ${iconClass} text-[16px] leading-none"></i>
      </button>
      <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1
                  scale-0 group-hover:scale-100 transition duration-200
                  bg-black text-white text-xs px-2 py-1 rounded pointer-events-none z-10 whitespace-nowrap">
        ${tooltipText}
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function updateInvestmentSerialNumbers() {
  $("#investmentTableBody tr.investment-header").each(function (index) {
    $(this).find("td:first").text(index + 1);
  });
}

function renderPreview(previewSelector, fileUrl) {
  const preview = $(previewSelector);
  preview.empty();

  if (!fileUrl) {
    preview.text("Not uploaded");
    return;
  }

  const lowerUrl = fileUrl.toLowerCase();
  if (lowerUrl.endsWith('.pdf')) {
    preview.html(`<iframe src="${fileUrl}" class="w-full h-[400px] border rounded"></iframe>`);
  } else if (/\.(jpg|jpeg|png|webp)$/i.test(lowerUrl)) {
    preview.html(`<img src="${fileUrl}" class="max-w-full max-h-[400px] rounded border" alt="Attachment Preview" />`);
  } else {
    preview.html(`<a href="${fileUrl}" target="_blank" class="text-blue-600 underline">Open file</a>`);
  }
}

function getFileName(url) {
  if (!url) return '';
  try {
    const clean = url.split('?')[0];                 // strip query
    return decodeURIComponent(clean.split('/').pop());
  } catch { return url; }
}