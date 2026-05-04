<!-- RH Sheet Blade Section -->
<div class="rh-client-wrapper px-3 py-5" style="background-color: #f5faff; min-height: 100vh;">
    <div class="container" style="max-width: 720px;">
        <div class="card shadow-lg border-0 mb-4">
            <div class="card-body">
                <h4 class="card-title text-center mb-4 text-dark fw-bold"> Add RH Sheet Entry</h4>
                <form id="rhClientForm" enctype="multipart/form-data">
                    @csrf
                    <div class="row g-4">
                        <div class="col-md-4">
                            <label for="rhDate" class="form-label">Date</label>
                            <input type="date" class="form-control" id="rhDate" name="date" placeholder="Select date">
                        </div>
                        <div class="col-md-4">
                            <label for="supplierName" class="form-label">Supplier Name</label>
                            <input type="text" class="form-control" id="supplierName" name="supplier_name" placeholder="Enter supplier name">
                        </div>
                        <div class="col-md-4 d-flex align-items-end mt-3">
                            <button type="button" class="btn btn-outline-secondary w-100" id="openRHMultiEntryModalBtn">
                                + Add Multiple Entry
                            </button>
                        </div>
                        <div class="col-md-4">
                            <label for="rhDescription" class="form-label">Description</label>
                            <input type="text" class="form-control" id="rhDescription" name="description" placeholder="Enter description">
                        </div>
                        <div class="col-md-4">
                            <label for="rhUnitPrice" class="form-label">Unit Price</label>
                            <input type="number" step="any" class="form-control" id="rhUnitPrice" name="unit_price" placeholder="Enter unit price">
                        </div>
                        <div class="col-md-4">
                            <label for="rhNoOfCtns" class="form-label">No. of CTNS</label>
                            <input type="number" step="any" class="form-control" id="rhNoOfCtns" name="no_of_ctns" placeholder="Enter no. of CTNS">
                        </div>
                        <div class="col-md-4">
                            <label for="rhUnitsPerCtn" class="form-label">Units/CTN</label>
                            <input type="number" step="any" class="form-control" id="rhUnitsPerCtn" name="units_per_ctn" placeholder="Enter units per CTN">
                        </div>
                        <div class="col-md-4">
                            <label for="rhWeight" class="form-label">Weight in KG</label>
                            <input type="number" step="any" class="form-control" id="rhWeight" name="weight" placeholder="Enter weight in KG">
                        </div>
                        <div class="col-md-4">
                            <label for="rhShippingRate" class="form-label">Shipping Rate per KG</label>
                            <input type="number" step="any" class="form-control" id="rhShippingRate" name="shipping_rate_per_kg" placeholder="Enter rate per KG">
                        </div>
                    </div>
                    <div class="text-center mt-4">
                        <button type="submit" class="btn btn-dark px-4 py-2" id="rhSubmitBtn">Submit</button>
                        <button type="button" class="btn btn-dark px-4 py-2 d-none" id="rhSaveChangesBtn">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Summary Card -->
        <div class="bg-light shadow rounded-4 p-4 mb-4 border-start" style="border-left: 5px solid #be185d !important;">
            <h5 class="text-center text-dark fw-bold mb-4">Summary Overview</h5>
            <div class="row text-center">
                <div class="col-md-4 mb-2">
                    <div class="bg-white rounded-3 py-3 px-2 shadow-sm h-100">
                        <div class="text-muted small mb-1">Total Material</div>
                        <div id="rh-total-material" class="h5 text-dark mb-0">AED 0.00</div>
                    </div>
                </div>
                <div class="col-md-4 mb-2">
                    <div class="bg-white rounded-3 py-3 px-2 shadow-sm h-100">
                        <div class="text-muted small mb-1">Total Shipment</div>
                        <div id="rh-total-shipment" class="h5 text-dark mb-0">AED 0.00</div>
                    </div>
                </div>
                <div class="col-md-4 mb-2">
                    <div class="bg-white rounded-3 py-3 px-2 shadow-sm h-100">
                        <div class="text-muted small mb-1">Grand Total</div>
                        <div id="rh-grand-total" class="h5 text-dark fw-bold mb-0">AED 0.00</div>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- Table -->
    <div class="container-fluid px-4">
        <div class="card shadow-sm border-0 mb-5">
            <div class="card-body p-0">
                <div class="rh-table-wrapper drag-scroll">
                    <table id="rh-export-table" class="table table-striped table-hover rh-client-table">
                        <thead>
                            <tr>
                                <th>SR.NO</th>
                                <th>Date</th>
                                <th>Supplier Name</th>
                                <th>Description</th>
                                <th>No. of CTNS</th>
                                <th>Units/CTN</th>
                                <th>Unit Price</th>
                                <th>Total No. of Units</th>
                                <th>Weight in KG</th>
                                <th>Total Material</th>
                                <th>Invoice Total Material</th>
                                <th>Shipping Rate</th>
                                <th>DGD</th>
                                <th>Labeling Charges</th>
                                <th>Labour</th>
                                <th>Shipping Cost</th>
                                <th>Total</th>
                                <th>Cost/Unit AED</th>
                                <th>Cost/Unit USD</th>
                                <th>Action</th>
                            </tr>
                            <tr class="bg-light">
                                @for ($i = 0; $i < 20; $i++)
                                    <th>
                                    @if ($i == 1)
                                    <input type="text" id="rhDateFilterInput" class="form-control form-control-sm column-filter" placeholder="Date Range" readonly style="cursor: pointer;">
                                    @elseif (in_array($i, range(0, 17)))
                                    <input type="text" class="form-control form-control-sm column-filter" data-index="{{ $i }}" placeholder="Filter...">
                                    @endif
                                    </th>
                                    @endfor
                            </tr>
                        </thead>
                        <tbody id="rh-client-body">
                            <!-- Rows inserted via JS -->
                        </tbody>
                    </table>
                    <!-- RH Date Popup -->
                    <div id="rhDatePopupBox" class="card p-3 shadow" style="position: absolute; display: none; z-index: 1000; min-width: 220px;">
                        <label>From Date:</label>
                        <input type="date" id="rhFromDate" class="form-control mb-2" />
                        <label>To Date:</label>
                        <input type="date" id="rhToDate" class="form-control mb-3" />
                        <div class="d-grid gap-2">
                            <button id="applyRHDateFilter" class="btn btn-primary btn-sm">Apply</button>
                            <button id="clearRHDateFilter" class="btn btn-secondary btn-sm">Clear</button>
                            <button id="rhFilteredExcelBtn" class="btn btn-light d-none">
                                <img src="https://img.icons8.com/color/24/microsoft-excel-2019--v1.png" /> Export Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="rh-loan-ledger-wrapper my-5">
        <h3 class="text-center mb-4 fw-bold text-dark">💰 RH Loan Ledger</h3>

        <!-- Input Form -->
        <div class="card shadow-sm border-0 mb-4">
            <div class="card-body">
                <form id="rhLoanForm" method="POST" action="/rh-loan/save">
                    @csrf
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label for="rhLoanDate" class="form-label">Date</label>
                            <input type="date" class="form-control" id="rhLoanDate" name="date" required>
                        </div>
                        <div class="col-md-4">
                            <label for="rhLoanDescription" class="form-label">Description</label>
                            <input type="text" class="form-control" id="rhLoanDescription" name="description" placeholder="e.g., Paid by XYZ" required>
                        </div>
                        <div class="col-md-4">
                            <label for="rhLoanAmount" class="form-label">Amount (AED)</label>
                            <input type="number" step="0.01" class="form-control" id="rhLoanAmount" name="amount" placeholder="e.g., 2000.00" required>
                        </div>
                    </div>
                    <div class="text-center mt-4">
                        <button type="submit" id="rhLoanSubmitBtn" class="btn btn-success px-4 py-2">Add Entry</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="d-flex justify-content-center flex-wrap gap-3 mb-4">
            <div class="card border-0 shadow-sm p-3 text-center bg-light">
                <h6 class="text-muted mb-1">Total Paid Amount</h6>
                <h5 class="text-dark mb-0" id="rhLoanTotalPaid">AED 0.00</h5>
            </div>
            <div class="card border-0 shadow-sm p-3 text-center bg-light">
                <h6 class="text-muted mb-1">RH Total Amount</h6>
                <h5 class="text-dark mb-0" id="rhLoanTotalSheet">AED 0.00</h5>
            </div>
            <div class="card border-0 shadow-sm p-3 text-center bg-light">
                <h6 class="text-muted mb-1">Remaining Balance</h6>
                <h5 class="text-dark mb-0" id="rhLoanBalance">AED 0.00</h5>
            </div>
        </div>

        <!-- Loan Ledger Table -->
        <div class="table-container">
            <table class="table table-striped table-hover mb-0 rh-loan-table" id="rhLoanTable">
                <thead class="table-dark">
                    <tr>
                        <th>SR.NO</th>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount (AED)</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- JS will populate rows here -->
                </tbody>
            </table>
        </div>
    </div>

    <div class="modal fade" id="rhCopySubEntryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-info">
                <div class="modal-header">
                    <h5 class="modal-title">Copy Sub Entry</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <label for="rhCopySubSerialInput">Enter Sub-Serial Number:</label>
                    <input type="number" id="rhCopySubSerialInput" class="form-control" placeholder="e.g. 1">
                    <input type="hidden" id="rhCopyDate">
                    <input type="hidden" id="rhCopySupplier">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="confirmRHSubSerialCopyBtn">Copy Entry</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="rhEditSubEntryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-primary">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Sub Entry</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <label for="rhEditSubSerialInput">Enter Sub-Serial Number:</label>
                    <input type="number" id="rhEditSubSerialInput" class="form-control" placeholder="e.g. 1">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="confirmRHSubSerialEditBtn">Edit Entry</button>
                </div>
            </div>
        </div>
    </div>

    <!-- RH Delete Confirmation Modal -->
    <div class="modal fade" id="rhDeleteModal" tabindex="-1" aria-labelledby="rhDeleteModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title" id="rhDeleteModalLabel">Confirm Deletion</h5>
                    <button type="button" class="btn-close bg-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center">
                    <p id="rhDeleteMessage" class="mb-2">
                        Are you sure you want to delete this RH entry?
                    </p>

                    <input type="hidden" id="rhDeleteRowId">
                    <input type="hidden" id="rhDeleteDate">
                    <input type="hidden" id="rhDeleteSupplier">

                    <div id="rhSubSerialInputWrapper" style="display: none;" class="mt-3">
                        <input type="text" class="form-control" id="rhDeleteSubSerialInput" placeholder="e.g., 1 or all" autofocus tabindex="1">
                    </div>
                </div>
                <div class="modal-footer justify-content-center">
                    <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger px-4" id="confirmRHDeleteBtn">Delete</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="rhManualUnitsModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content text-center">
                <div class="modal-header">
                    <h5 class="modal-title">Enter Total No of Units</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>No of CTNS or Units/CTN is missing.<br>Enter Total No of Units manually to calculate Total Material.</p>
                    <input type="number" class="form-control mb-2" id="rhManualTotalUnitsInput" placeholder="Enter total no of units">
                    <input type="hidden" id="rhTotalUnitsHidden" name="total_units">
                </div>
                <div class="modal-footer justify-content-center">
                    <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button id="rhConfirmManualUnitsBtn" class="btn btn-primary">Confirm</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="rhMultiEntryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <form id="rh-multi-entry-form">
                    <div class="modal-header">
                        <h5 class="modal-title">Multiple Entry Rows</h5>
                    </div>
                    <div class="modal-body">
                        <div id="rh-multi-step-wrapper">
                            <div class="form-group mb-3">
                                <label for="rh-number-of-entries">How many entries do you want?</label>
                                <input type="number" class="form-control" id="rh-number-of-entries" min="1" required>
                            </div>
                            <button type="button" class="btn btn-primary" id="rh-start-entry-btn">Next</button>
                        </div>

                        <div id="rh-entry-fields-container" style="display:none;">
                            <div id="rh-entry-form-fields"></div>
                            <button type="button" class="btn btn-secondary mt-3" id="rh-prev-entry-btn">Previous</button>
                            <button type="button" class="btn btn-primary mt-3" id="rh-next-entry-btn">Next</button>
                            <button type="submit" class="btn btn-success d-none mt-3" id="rh-submit-multi-entry">Submit All</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
    
    <div class="modal fade" id="deleteLoanModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content text-center">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title">Confirm Delete</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete this entry?</p>
                    <input type="hidden" id="deleteLoanId">
                </div>
                <div class="modal-footer justify-content-center">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" id="confirmDeleteLoanBtn" class="btn btn-danger">Delete</button>
                </div>
            </div>
        </div>
    </div>

</div>