<div class="form-section-wrapper">
  <div class="form-section">
    <form id="investmentForm">
      @csrf
      <div class="row mb-3">
        <div class="col-md-4">
          <label class="form-label">Date</label>
          <input type="date" class="form-control" id="date" name="date">
        </div>
        <div class="col-md-4">
          <label class="form-label">Supplier Name</label>
          <input type="text" class="form-control" id="supplier" placeholder="Enter Supplier Name" name="supplier_name">
        </div>
        <div class="col-md-4">
          <label class="form-label">Buyer</label>
          <input type="text" class="form-control" id="buyer" placeholder="Enter Buyer" name="buyer">
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-4">
          <label class="form-label">Invoice Number</label>
          <input type="text" class="form-control" id="invoice" placeholder="Enter Invoice Number" name="invoice_number" required>
        </div>
        <div class="col-md-4">
          <label class="form-label">Mode of Transaction</label>
          <input type="text" class="form-control" id="transaction" placeholder="Enter Mode of Transaction" name="transaction_mode">
        </div>
        <div class="col-md-4 d-flex align-items-end mt-3">
          <button type="button" class="btn btn-outline-secondary w-100" id="openMultiEntryModalBtn">
            + Add Multiple Entry
          </button>
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-4">
          <label class="form-label">Unit Price</label>
          <input type="number" step="any" class="form-control" id="unitPrice" placeholder="Enter Unit Price" name="unit_price">
        </div>
        <div class="col-md-4">
          <label class="form-label">VAT Percentage</label>
          <input type="number" step="any" class="form-control" id="vatPercentage" placeholder="Enter VAT %" name="vat_percentage">
        </div>
        <div class="col-md-4">
          <label class="form-label">Description</label>
          <input type="text" class="form-control" id="description" placeholder="Enter Description" name="description">
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-4">
          <label class="form-label">No of CTNS</label>
          <input type="number" step="any" class="form-control" id="ctns" placeholder="Enter No of CTNS" name="no_of_ctns">
        </div>
        <div class="col-md-4">
          <label class="form-label">Units/CTN</label>
          <input type="number" step="any" class="form-control" id="unitsPerCtn" placeholder="Enter Units/CTN" name="units_per_ctn">
        </div>
        <div class="col-md-4">
          <label class="form-label">Weight in KG</label>
          <input type="number" step="any" class="form-control" id="weight" placeholder="Enter Weight in KG" name="weight">
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-4">
          <label class="form-label">Shipping Rate Per Kg</label>
          <input type="number" step="any" class="form-control" id="shippingRatePerKg" placeholder="Enter Shipping Rate Per Kg" name="shipping_rate_per_kg">
        </div>
        <div class="col-md-4">
          <label class="form-label">Remarks</label>
          <input type="text" class="form-control" id="remarks" placeholder="Enter Remarks" name="remarks">
        </div>
        <div class="col-md-4 d-flex align-items-end mt-3 mb-3">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="addToInventory" name="add_to_inventory">
            <label class="form-check-label" for="addToInventory">
              Add to Inventory
            </label>
          </div>
        </div>
      </div>

      <div class="text-center">
        <button type="submit" id="submitBtn" class="btn btn-success form-control btn-style">Submit</button>
        <button type="button" id="saveChangesBtn" class="btn btn-success form-control btn-style" style="display: none;">Save Changes</button>
      </div>
    </form>
  </div>
</div>

<div class="summary-cards-wrapper">
  <div class="summary-cards">
    <div class="card">Total Material Excl. VAT: <span class="tot-value" id="totalMaterialAED">AED {{ number_format($totalMaterial, 2) }}</span></div>
    <div class="card">Total Material Incl. VAT: <span class="tot-value" id="totalMaterialInclVAT">AED {{ number_format($totalMaterialInclVAT, 2) }}</span></div>
    <div class="card">Total VAT Amount: <span class="tot-value" id="totalVAT">AED {{ number_format($totalVAT, 2) }}</span></div>
    <div class="card">Total Shipment: <span class="tot-value" id="totalShipmentAED">AED {{ number_format($totalShipment, 2) }}</span></div>
    <div class="card">Grand Total: <span class="tot-value" id="grandTotalAED">AED {{ number_format($grandTotal, 2) }}</span></div>
  </div>
</div>

<div class="card shadow-sm border-0 mb-5">
  <div class="card-body p-0">
    <div class="table-container">
      <table id="data-table" class="table table-hover investment-table">
        <thead>
          <tr>
            <th>SR.NO</th>
            <th>Date</th>
            <th>Supplier Name</th>
            <th>Description</th>
            <th>Total Material Incl. VAT</th>
            <th>Shipping Cost</th>
            <th>Action</th>
            <th>Attachments</th>
          </tr>
          <tr class="bg-light">
            @for ($i = 0; $i < 8; $i++)
              <th>
                @if ($i == 1)
                  <input type="text" id="dateFilterTrigger" class="form-control form-control-sm column-filter" data-index="1" placeholder="Select Date Range" readonly style="cursor: pointer;">
                @elseif ($i < 6)
                  <input type="text" class="form-control form-control-sm column-filter" data-index="{{ $i }}" placeholder="Filter...">
                @endif
              </th>
            @endfor
          </tr>
        </thead>
        <tbody>
        @foreach($investments as $index => $item)
        <tr class="main-row" data-id="{{ $item->id }}">
          <td>{{ $loop->iteration }}</td>
          <td>{{ \Carbon\Carbon::parse($item->date)->translatedFormat('l, d F Y') }}</td>
          <td>{{ $item->supplier_name }}</td>
          <td>{!! $item->description_combined !!}</td>
          @php
            $totalInclVAT = $item->total_material + ($item->total_material * $item->vat_percentage / 100);
          @endphp
          <td>AED {{ number_format($totalInclVAT, 2) }}</td>
          <td>AED {{ number_format($item->shipping_cost, 2) }}</td>
          <td>
            <button class="btn btn-sm btn-light toggle-details" data-bs-toggle="tooltip" title="Details Tab"><i class="bi bi-menu-button-wide-fill"></i></button>
            <button class="btn btn-sm btn-success edit-btn" data-bs-toggle="tooltip" title="Edit"><i class="bi bi-pencil-square"></i></button>
            <button class="btn btn-sm btn-danger delete-btn" data-bs-toggle="tooltip" title="Delete"><i class="bi bi-trash"></i></button>
            <button class="btn btn-sm btn-secondary copy-btn" data-bs-toggle="tooltip" title="Copy"><i class="bi bi-files"></i></button>
          </td>
          <td>
            @if(!empty($item->invoice_file))
              <span class="badge bg-success p-2 me-1">
                <i class="bi bi-check-circle-fill"></i>
              </span>
            @endif
            <button class="btn btn-sm btn-light upload-btn border" data-bs-toggle="tooltip" title="Upload">
              <i class="bi bi-upload"></i>
            </button>
            <button class="btn btn-sm btn-dark view-btn" data-bs-toggle="tooltip" title="View">
              <i class="bi bi-eye"></i>
            </button>
          </td>
        </tr>
        <tr class="details-row" data-id="{{ $item->id }}" style="display: none;">
          <td colspan="8" class="bg-light">
            <div class="details-tab p-3">
              <div class="row">
                <div class="col-md-4 mb-2"><strong>Buyer:</strong> {{ $item->buyer }}</div>
                <div class="col-md-4 mb-2"><strong>Invoice Number:</strong> {{ $item->invoice }}</div>
                <div class="col-md-4 mb-2"><strong>Mode of Transaction:</strong> {{ $item->transaction_mode }}</div>
                <div class="col-md-4 mb-2"><strong>No of CTNS:</strong> {!! $item->no_of_ctns_combined !!}</div>
                <div class="col-md-4 mb-2"><strong>Units per CTN:</strong> {!! $item->units_per_ctn_combined !!}</div>
                <div class="col-md-4 mb-2"><strong>Unit Price:</strong> AED {{ number_format($item->unit_price, 2) }}</div>
                <div class="col-md-4 mb-2"><strong>Total Units:</strong> {!! $item->total_units_combined !!}</div>
                <div class="col-md-4 mb-2"><strong>VAT %:</strong> {{ $item->vat_percentage }}%</div>
                <div class="col-md-4 mb-2"><strong>Total Material Excl. VAT:</strong> AED {{ number_format($item->total_material, 2) }}</div>
                <div class="col-md-4 mb-2"><strong>Invoice Total:</strong>
                  @if(count($item->sub_serials ?? []) > 1)
                  AED {{ number_format($item->invoice_total, 2) }}
                  @endif
                </div>
                <div class="col-md-4 mb-2"><strong>Weight (KG):</strong> {{ $item->weight }}</div>
                <div class="col-md-4 mb-2"><strong>Shipping Rate per KG:</strong> AED {{ number_format($item->shipping_rate_per_kg, 2) }}</div>
                <div class="col-md-4 mb-2"><strong>DGD:</strong> AED {{ number_format($item->dgd, 2) }}</div>
                <div class="col-md-4 mb-2"><strong>Labour:</strong> AED {{ number_format($item->labour, 2) }}</div>
                <div class="col-md-12 mb-2"><strong>Remarks:</strong> {!! $item->remarks_combined !!}</div>
              </div>
            </div>
          </td>
        </tr>
        @endforeach
      </tbody>
      </table>
      <!-- Date Range Popup -->
      <div id="datePopup" class="card p-3 shadow" style="position: absolute; display: none; z-index: 1000; min-width: 220px;">
        <label>From Date:</label>
        <input type="date" id="fromDate" class="form-control mb-2" />
        <label>To Date:</label>
        <input type="date" id="toDate" class="form-control mb-3" />
        <div class="d-grid gap-2">
          <button id="applyDateFilter" class="btn btn-primary btn-sm">Apply Filter</button>
          <button id="clearDateFilter" class="btn btn-secondary btn-sm">Clear Filter</button>
          <button id="filteredExcelBtn" class="btn btn-light d-none">
            <img src="https://img.icons8.com/color/24/microsoft-excel-2019--v1.png" />
            Export Filtered Excel
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

<a href="{{ url('/export/gts') }}" id="excelExportGTS" style="display: none;"></a>

<!-- Total Units Modal -->
<div class="modal fade" id="manualUnitsModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content text-center">
      <div class="modal-header">
        <h5 class="modal-title">Enter Total No of Units</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p>No of CTNS or Units/CTN is missing.<br>Enter Total No of Units manually to calculate Total Material.</p>

        <!-- Manual total units input -->
        <input type="number" class="form-control mb-2" id="manualTotalUnitsInput" placeholder="Enter total no of units">

        <!-- Hidden input to be submitted with form -->
        <input type="hidden" id="totalUnitsHidden" name="total_units">
      </div>
      <div class="modal-footer justify-content-center">
        <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button id="confirmManualUnitsBtn" class="btn btn-primary">Confirm</button>
      </div>
    </div>
  </div>
</div>

<!-- Multiple Entry Modal -->
<div class="modal fade" id="multiEntryModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content">
      <form id="multi-entry-form">
        <div class="modal-header">
          <h5 class="modal-title">Multiple Entry Rows</h5>
        </div>
        <div class="modal-body">
          <div id="multi-step-wrapper">
            <div class="form-group mb-3">
              <label for="number-of-entries">How many entries do you want?</label>
              <input type="number" class="form-control" id="number-of-entries" min="1" required>
            </div>
            <button type="button" class="btn btn-primary" id="start-entry-btn">Next</button>
          </div>

          <div id="entry-fields-container" style="display:none;">
            <div id="entry-form-fields"></div>
            <button type="button" class="btn btn-secondary mt-3" id="prev-entry-btn">Previous</button>
            <button type="button" class="btn btn-primary mt-3" id="next-entry-btn">Next</button>
            <button type="submit" class="btn btn-success d-none mt-3" id="submit-multi-entry">Submit All</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- Delete Sub-Serial Modals -->
<div class="modal fade" id="deleteConfirmModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content text-center">
      <div class="modal-header bg-danger text-white">
        <h5 class="modal-title">Confirm Delete</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <p id="deleteMessage" class="mb-2">Enter sub-serial number (e.g., <strong>1</strong>) or type <strong>all</strong> to delete all related entries.</p>
        <div id="subSerialInputWrapper" style="display: none;">
          <input type="text" id="deleteSubSerialInput" class="form-control" placeholder="e.g., 2 or all">
        </div>
      </div>
      <div class="modal-footer justify-content-center">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button type="button" id="confirmDeleteBtn" class="btn btn-danger">Delete</button>
      </div>
    </div>
  </div>
</div>

<!-- Edit Sub-Serial Modal -->
<div class="modal fade" id="editSubSerialModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content text-center">
      <div class="modal-header">
        <h5 class="modal-title">Select Sub-Serial</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="editModalInvoice">
        <input type="text" id="editSubSerialInput" class="form-control" placeholder="Enter Sub-Serial Number (e.g., 2)">
      </div>
      <div class="modal-footer justify-content-center">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        <button id="confirmEditSubSerialBtn" class="btn btn-success">Edit</button>
      </div>
    </div>
  </div>
</div>

<!-- Copy Sub-Serial Modal -->
<div class="modal fade" id="copySubSerialModal" tabindex="-1" aria-labelledby="copySubSerialModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Copy Sub-Entry</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <p id="copyModalInvoiceText" class="mb-2" style="font-weight: bold;"></p>
        <input type="hidden" id="copyModalInvoice">
        <input type="text" id="copySubSerialInput" class="form-control" placeholder="Enter sub-serial number to copy">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" id="confirmCopySubSerialBtn">Copy</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="attachmentModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <form id="attachmentForm" enctype="multipart/form-data">
        <div class="modal-header">
          <h5 class="modal-title">Upload Attachments</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <input type="hidden" id="attachRowId">

          <div class="md-3">
            <label for="attachInvoice" class="form-label">Invoice</label>
            <input type="file" name="invoice" id="attachInvoice" class="form-control" accept="image/*,application/pdf"></input>
          </div>
          <div class="md-3">
            <label for="attachReceipt" class="form-label">Bank Transfer Receipt</label>
            <input type="file" name="receipt" id="attachReceipt" class="form-control" accept="image/*,application/pdf"></input>
          </div>
          <div class="md-3">
            <label for="attachNote" class="form-label">Delivery Note</label>
            <input type="file" name="note" id="attachNote" class="form-control" accept="image/*,application/pdf"></input>
          </div>
        </div>
        <div class="modal-footer">
          <button type="submit" class="btn btn-primary">Save</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
        </div>
      </form>
    </div>
  </div>
</div>

<div class="modal fade" id="viewAttachmentModal" tabindex="-1">
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Attachment Viewer</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      <div class="modal-body">
        <div id="pdfContentForDownload" class="print-preview-area">
          <!-- Images injected dynamically here -->
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-dark" onclick="printAttachments()">Download PDF</button>
      </div>
    </div>
  </div>
</div>

<div id="pdfPreviewContainer" style="position: absolute; left: -9999px; top: 0;"></div>