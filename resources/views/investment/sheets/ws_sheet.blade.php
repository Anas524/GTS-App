<!-- BL Sheet Blade Section -->
<div class="bl-client-wrapper px-3 py-5" style="background-color: #f5faff; min-height: 100vh;">
    <div class="container" style="max-width: 720px;">
        <div class="card shadow-lg border-0 mb-4">
            <div class="card-body">
                <h4 class="card-title text-center mb-4 text-dark fw-bold"> Add WS Sheet Entry</h4>
                <form id="blClientForm" enctype="multipart/form-data">
                    @csrf
                    <div class="row g-4">
                        <div class="col-md-4">
                            <label for="blDate" class="form-label">Date</label>
                            <input type="date" class="form-control" id="blDate" name="date" placeholder="Select date">
                        </div>
                        <div class="col-md-4">
                            <label for="supplierName" class="form-label">Supplier Name</label>
                            <input type="text" class="form-control" id="supplierName" name="supplier_name" placeholder="Enter supplier name">
                        </div>
                        <div class="col-md-4 d-flex align-items-end mt-3">
                            <button type="button" class="btn btn-outline-secondary w-100" id="openBLMultiEntryModalBtn">
                                + Add Multiple Entry
                            </button>
                        </div>
                        <div class="col-md-4">
                            <label for="blDescription" class="form-label">Description</label>
                            <input type="text" class="form-control" id="blDescription" name="description" placeholder="Enter description">
                        </div>
                        <div class="col-md-4">
                            <label for="blUnitPrice" class="form-label">Unit Price</label>
                            <input type="number" step="any" class="form-control" id="blUnitPrice" name="unit_price" placeholder="Enter unit price">
                        </div>
                        <div class="col-md-4">
                            <label for="blNoOfCtns" class="form-label">No. of CTNS</label>
                            <input type="number" step="any" class="form-control" id="blNoOfCtns" name="no_of_ctns" placeholder="Enter no. of CTNS">
                        </div>
                        <div class="col-md-4">
                            <label for="blUnitsPerCtn" class="form-label">Units/CTN</label>
                            <input type="number" step="any" class="form-control" id="blUnitsPerCtn" name="units_per_ctn" placeholder="Enter units per CTN">
                        </div>
                        <div class="col-md-4">
                            <label for="blWeight" class="form-label">Weight in KG</label>
                            <input type="number" step="any" class="form-control" id="blWeight" name="weight" placeholder="Enter weight in KG">
                        </div>
                        <div class="col-md-4">
                            <label for="blShippingRate" class="form-label">Shipping Rate per KG</label>
                            <input type="number" step="any" class="form-control" id="blShippingRate" name="shipping_rate_per_kg" placeholder="Enter rate per KG">
                        </div>
                    </div>
                    <div class="text-center mt-4">
                        <button type="submit" class="btn btn-dark px-4 py-2" id="blSubmitBtn">Submit</button>
                        <button type="button" class="btn btn-dark px-4 py-2 d-none" id="blSaveChangesBtn">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>

        <!-- Summary Card -->
        <div class="bg-light shadow rounded-4 p-4 mb-4 border-start border-5 border-start" style="border-left: 5px solid #5eead4 !important;">
            <h5 class="text-center text-dark fw-bold mb-4">Summary Overview</h5>
            <div class="row text-center">
                <div class="col-md-4 mb-2">
                    <div class="bg-white rounded-3 py-3 px-2 shadow-sm h-100">
                        <div class="text-muted small mb-1">Total Material</div>
                        <div id="bl-total-material" class="h5 text-dark mb-0">AED 0.00</div>
                    </div>
                </div>
                <div class="col-md-4 mb-2">
                    <div class="bg-white rounded-3 py-3 px-2 shadow-sm h-100">
                        <div class="text-muted small mb-1">Total Shipment</div>
                        <div id="bl-total-shipment" class="h5 text-dark mb-0">AED 0.00</div>
                    </div>
                </div>
                <div class="col-md-4 mb-2">
                    <div class="bg-white rounded-3 py-3 px-2 shadow-sm h-100">
                        <div class="text-muted small mb-1">Grand Total</div>
                        <div id="bl-grand-total" class="h5 text-dark fw-bold mb-0">AED 0.00</div>
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- Table -->
    <div class="container-fluid px-4">
        <div class="card shadow-sm border-0 mb-5">
            <div class="card-body p-0">
                <div class="bl-table-wrapper drag-scroll">
                    <table id="bl-export-table" class="table table-striped table-hover bl-client-table">
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
                                    <input type="text" id="blDateFilterInput" class="form-control form-control-sm column-filter" placeholder="Date Range" readonly style="cursor: pointer;">
                                    @elseif (in_array($i, range(0, 17)))
                                    <input type="text" class="form-control form-control-sm column-filter" data-index="{{ $i }}" placeholder="Filter...">
                                    @endif
                                    </th>
                                    @endfor
                            </tr>
                        </thead>
                        <tbody id="bl-client-body">
                            <!-- Rows inserted via JS -->
                        </tbody>
                    </table>
                    <!-- BL Date Popup -->
                    <div id="blDatePopupBox" class="card p-3 shadow" style="position: absolute; display: none; z-index: 1000; min-width: 220px;">
                        <label>From Date:</label>
                        <input type="date" id="blFromDate" class="form-control mb-2" />
                        <label>To Date:</label>
                        <input type="date" id="blToDate" class="form-control mb-3" />
                        <div class="d-grid gap-2">
                            <button id="applyBLDateFilter" class="btn btn-primary btn-sm">Apply</button>
                            <button id="clearBLDateFilter" class="btn btn-secondary btn-sm">Clear</button>
                            <button id="blFilteredExcelBtn" class="btn btn-light d-none">
                                <img src="https://img.icons8.com/color/24/microsoft-excel-2019--v1.png" /> Export Excel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="blCopySubEntryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-info">
                <div class="modal-header">
                    <h5 class="modal-title">Copy Sub Entry</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <label for="blCopySubSerialInput">Enter Sub-Serial Number:</label>
                    <input type="number" id="blCopySubSerialInput" class="form-control" placeholder="e.g. 1">
                    <input type="hidden" id="blCopyDate">
                    <input type="hidden" id="blCopySupplier">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="confirmBLSubSerialCopyBtn">Copy Entry</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="blEditSubEntryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-primary">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Sub Entry</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <label for="blEditSubSerialInput">Enter Sub-Serial Number:</label>
                    <input type="number" id="blEditSubSerialInput" class="form-control" placeholder="e.g. 1">
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="confirmBLSubSerialEditBtn">Edit Entry</button>
                </div>
            </div>
        </div>
    </div>

    <!-- BL Delete Confirmation Modal -->
    <div class="modal fade" id="blDeleteModal" tabindex="-1" aria-labelledby="blDeleteModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow">
                <div class="modal-header bg-danger text-white">
                    <h5 class="modal-title" id="blDeleteModalLabel">Confirm Deletion</h5>
                    <button type="button" class="btn-close bg-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-center">
                    <p id="blDeleteMessage" class="mb-2">
                        Are you sure you want to delete this BL entry?
                    </p>

                    <input type="hidden" id="blDeleteRowId">
                    <input type="hidden" id="blDeleteDate">
                    <input type="hidden" id="blDeleteSupplier">

                    <div id="blSubSerialInputWrapper" style="display: none;" class="mt-3">
                        <input type="text" class="form-control" id="blDeleteSubSerialInput" placeholder="e.g., 1 or all" autofocus tabindex="1">
                    </div>
                </div>
                <div class="modal-footer justify-content-center">
                    <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-danger px-4" id="confirmBLDeleteBtn">Delete</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="blManualUnitsModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content text-center">
                <div class="modal-header">
                    <h5 class="modal-title">Enter Total No of Units</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>No of CTNS or Units/CTN is missing.<br>Enter Total No of Units manually to calculate Total Material.</p>
                    <input type="number" class="form-control mb-2" id="blManualTotalUnitsInput" placeholder="Enter total no of units">
                    <input type="hidden" id="blTotalUnitsHidden" name="total_units">
                </div>
                <div class="modal-footer justify-content-center">
                    <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button id="blConfirmManualUnitsBtn" class="btn btn-primary">Confirm</button>
                </div>
            </div>
        </div>
    </div>

    <div class="modal fade" id="blMultiEntryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered">
            <div class="modal-content">
                <form id="bl-multi-entry-form">
                    <div class="modal-header">
                        <h5 class="modal-title">Multiple Entry Rows</h5>
                    </div>
                    <div class="modal-body">
                        <div id="bl-multi-step-wrapper">
                            <div class="form-group mb-3">
                                <label for="bl-number-of-entries">How many entries do you want?</label>
                                <input type="number" class="form-control" id="bl-number-of-entries" min="1" required>
                            </div>
                            <button type="button" class="btn btn-primary" id="bl-start-entry-btn">Next</button>
                        </div>

                        <div id="bl-entry-fields-container" style="display:none;">
                            <div id="bl-entry-form-fields"></div>
                            <button type="button" class="btn btn-secondary mt-3" id="bl-prev-entry-btn">Previous</button>
                            <button type="button" class="btn btn-primary mt-3" id="bl-next-entry-btn">Next</button>
                            <button type="submit" class="btn btn-success d-none mt-3" id="bl-submit-multi-entry">Submit All</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

</div>