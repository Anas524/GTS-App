// Build a snapshot of a detail row (for change detection)
function buildInvestmentSnapshot($detailRow) {
  const $f = $detailRow.find('form');
  const t = v => (v == null ? '' : String(v).trim());
  const n = v => (Number(String(v).replace(/[^\d.-]/g, '')) || 0);

  return {
    date: t($f.find('.investment-date').val()),
    investor: t($f.find('.investment-investor').val()),
    // NOTE: keep raw text so removing ".00" counts as a change
    amount_raw: t($f.find('.investment-amount').val()),
    inv_no: t($f.find('.investment-no').val()),
    mot: t($f.find('.mode-of-transaction').val()),
    murabaha: t($f.find('.murabaha-input').val()),
    repay_terms: t($f.find('.repayment-terms').val()),
    tenure: t($f.find('.loan-tenure').val()), // keep as text for strict diff
    repay_date: t($f.find('.repayment-date').val()),
    remarks: t($f.find('.remarks').val()),
    payment: t($f.find('.payment-method').val()),
    murabaha_status: $detailRow.find('input.murabaha-radio:checked').val() || 'no',
    murabaha_date: t($detailRow.find('.murabaha-date-hidden').val() || '')
  };
}

function isInvestmentChanged($detailRow) {
  const prev = $detailRow.data('snapshot') || {};
  const curr = buildInvestmentSnapshot($detailRow);
  try { return JSON.stringify(prev) !== JSON.stringify(curr); }
  catch { return true; }
}

// Ensure/update the update icon in the Action cell for this row
function toggleUpdateButtonForInvestment($detailRow) {
  const $headerRow = $detailRow.prev('.investment-header');
  const $cell = $headerRow.find('td:last');

  // Draft rows never show Update icon
  if ($headerRow.hasClass('is-draft') || $detailRow.hasClass('is-draft')) {
    $cell.find('.update-invest-btn').remove();
    return;
  }

  // Single wrapper in Action cell
  let $wrap = $cell.find('.action-buttons');
  if (!$wrap.length) {
    $wrap = $('<div class="action-buttons flex items-center justify-center gap-1"></div>');
    $wrap.append($cell.children().detach());
    $cell.empty().append($wrap);
  }

  const changed = isInvestmentChanged($detailRow);
  const $existing = $wrap.find('.update-invest-btn');

  if (changed) {
    if ($existing.length === 0) {
      $wrap.prepend(
        createInvestmentIconButton(
          'update-invest-btn',
          'bi-arrow-repeat',
          'Update Row',
          'bg-green-600 hover:bg-green-700 text-white',
          $headerRow.data('id') || ''
        )
      );
    } else if ($existing.length > 1) {
      // if somehow duplicated, keep the first and remove the rest
      $existing.slice(1).remove();
    }
  } else {
    $existing.remove();
  }
}