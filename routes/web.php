<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ARCalc\ProductEntryController;
use App\Http\Controllers\Investment\BeneficiaryController;
use App\Http\Controllers\Investment\CustomerLoanLedgerController;
use App\Http\Controllers\Investment\CustomerSheetAttachmentController;
use App\Http\Controllers\Investment\CustomerSheetController;
use App\Http\Controllers\Investment\GtsInvestmentController;
use App\Http\Controllers\Investment\GtsMaterialController;
use App\Http\Controllers\Investment\InvestmentController;
use App\Http\Controllers\Investment\LocalSalesController;
use App\Http\Controllers\Investment\USClientController;
use App\Http\Controllers\Investment\SQClientController;
use App\Http\Controllers\Investment\SummaryController;
use App\Http\Controllers\Investment\CycleController;
use App\Http\Controllers\Investment\MaterialsTotalsSnapshotController;
use App\Http\Controllers\Investment\BeneficiaryAttachmentController;
use App\Http\Middleware\BindCycleFromRoute;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use App\Models\Investment\CustomerSheet;
use App\Http\Controllers\AccountController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\LeadsController;
use App\Http\Controllers\NewsletterController;
use App\Http\Controllers\DocumentHubController;
use App\Http\Controllers\ProfitLossController;
use App\Http\Controllers\ProfitLossSheetsController;
use App\Http\Controllers\FedexTrackerController;
use App\Http\Controllers\MetalEntryController;

// Public view
Route::get('/', fn () => view('gts'))->name('home');

// Admin Dashboard Route (protected)
// Route::middleware(['auth', 'admin'])
//     ->get('/admin-dashboard', fn () => view('admin.dashboard'))
//     ->name('admin.dashboard');

// Route::middleware(['auth','admin'])
//     ->get('/admin-dashboard', DashboardController::class)
//     ->name('admin.dashboard');

// Public admin login page (NO auth middleware)
Route::get('/admin/login', function () {
    return redirect('/?login=1#loginTab');
})->name('admin.login');
    
// Protected ARCalc Routes
Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('/revenue-calculator', [ProductEntryController::class, 'view']
        )->name('calculator.index');
    Route::get('/get-all-entries', [ProductEntryController::class, 'index'])->name('entries.index');           // list (paginated)
    Route::post('/handle-data', [ProductEntryController::class, 'store'])->name('entries.store');         // create
    Route::post('/update-entry/{id}', [ProductEntryController::class, 'update'])->name('entries.update');  // _method=PUT
    Route::post('/delete-entry/{id}', [ProductEntryController::class, 'destroy'])->name('entries.destroy'); // _method=DELETE
});

Route::post('/account/password', [AccountController::class, 'updatePassword'])
    ->middleware('auth')
    ->name('account.password');

Route::middleware(['auth','admin'])
    ->get('/admin/revenue-calculator', function () {
        return redirect()->route('calculator.index');
    })->name('calculator.admin');

// Auth routes
require __DIR__ . '/auth.php';

Route::get('/amazon-services', function () {
    return view('amazon-services');
})->name('amazon.services');

// Route::get('/modern-admin-login', function () {
//     return view('auth.modern-admin-login');
// })->name('modern.login');

Route::get('/route-list-dump', function () {
    \Artisan::call('route:list');
    return '<pre>' . \Artisan::output() . '</pre>';
});

Route::post('/contact', [ContactController::class, 'store'])
    ->name('contact.submit')
    ->middleware('throttle:3,1'); // at most 3 per minute
    
Route::post('/newsletter/subscribe', [NewsletterController::class, 'store'])
    ->name('newsletter.subscribe');

Route::middleware(['auth', 'admin'])
    ->get('/admin/leads', [LeadsController::class, 'index'])
    ->name('leads.index');

// Investment Sheet Routes
Route::middleware(['auth', 'admin', 'bump.investment'])
    ->prefix('investment')
    ->as('investment.')
    ->group(function () {
        Route::get('/', function () {
            // Go to Dashboard (cycles index), not directly into a set
            return redirect()->route('investment.cycles.index');
        })->name('index');
        
        Route::get('/legacy', [InvestmentController::class, 'index'])->name('legacy.index');
        
        // Materials
        Route::get('/gts-materials', [GtsMaterialController::class, 'index']);
        Route::post('/gts-materials', [GtsMaterialController::class, 'store']);
        Route::put('/gts-materials/{id}', [GtsMaterialController::class, 'update']);
        Route::delete('/gts-materials/{id}', [GtsMaterialController::class, 'destroy']);
        Route::delete('/gts-materials/items/{id}', [GtsMaterialController::class, 'deleteItem']);
        
        Route::post('/gts-materials/upload-attachments/{id}', [GtsMaterialController::class, 'uploadAttachments']);
        Route::get('/gts-materials/get-attachments/{id}', [GtsMaterialController::class, 'getAttachments']);
        Route::get('/gts-materials/download-pdf/{id}', [GtsMaterialController::class, 'downloadAttachments']);
        Route::post('/gts-materials/{id}/delete-attachment', [GtsMaterialController::class, 'deleteAttachment']);
        
        // -------- Investments API (LIST/CRUD) --------
        Route::prefix('investments')->name('investments.')->group(function () {
            Route::get('/', [GtsInvestmentController::class, 'index'])->name('index');
            Route::post('/', [GtsInvestmentController::class, 'store'])->name('store');
            Route::put('{id}', [GtsInvestmentController::class, 'update'])->name('update');
            Route::post('{id}/finalize', [GtsInvestmentController::class, 'finalize'])->name('investments.finalize');
            Route::delete('{id}', [GtsInvestmentController::class, 'destroy']);
        
            // attachments for an investment
            Route::post('{id}/upload-attachments', [GtsInvestmentController::class, 'uploadAttachments']);
            Route::get('{id}/attachments', [GtsInvestmentController::class, 'getAttachments']);
            Route::get('{id}/attachments/download', [GtsInvestmentController::class, 'downloadAttachments']);
            
            // signed file view (allow opening without session if you want links to work in PDFs/emails)
            Route::get('file/{id}/{kind}', [GtsInvestmentController::class, 'showFile'])
                ->whereIn('kind', ['invoice','receipt','note'])
                ->middleware('signed')               // <-- important
                ->name('invest.file.show');
                
            Route::post('{id}/murabaha', [GtsInvestmentController::class, 'updateMurabaha']);
        });
        
        Route::get('/gts-investments/total', [GtsInvestmentController::class, 'getTotalAmount'])->name('investments.total');
        
        // ---- (Optional) Alias for legacy clients that still hit /gts-investments ----
        Route::get('/gts-investments', [GtsInvestmentController::class, 'index']); // returns same JSON list
        
        // US CLIENT PAYMENT SHEET ROUTES
        Route::get('/us-client/data', [USClientController::class, 'index']);
        Route::post('/us-client/save', [USClientController::class, 'store']);
        Route::put('/us-client/update/{id}', [USClientController::class, 'update']);
        Route::delete('/us-client/delete/{id}', [USClientController::class, 'destroy']);
        
        // SQ SHEET ROUTES
        Route::get('/sq-client/data', [SQClientController::class, 'index']);
        Route::post('/sq-client/save', [SQClientController::class, 'store']);
        Route::put('/sq-client/update/{id}', [SQClientController::class, 'update']);
        Route::delete('/sq-client/delete/{id}', [SQClientController::class, 'destroy']);
        
        // Local Sales ROUTES
        Route::get('/local-sales',            [LocalSalesController::class, 'index']);
        Route::post('/local-sales',            [LocalSalesController::class, 'store']);
        Route::put('/local-sales/{local}',    [LocalSalesController::class, 'update']);
        Route::delete('/local-sales/{local}',    [LocalSalesController::class, 'destroy']);
        Route::get('/local-sales/{local}/items', [LocalSalesController::class, 'items'])
            ->name('local-sales.items');
        
        Route::prefix('local-sales/{local}')->group(function () {
            Route::post('attachments',       [LocalSalesController::class, 'uploadAttachments']);
            Route::get('attachments',       [LocalSalesController::class, 'getAttachments']);
            Route::get('attachments/pdf',   [LocalSalesController::class, 'downloadAttachments']);
        });
        
        Route::get('local-sales/{local}/file/{kind}', [LocalSalesController::class, 'showFile'])
            ->whereIn('kind', ['invoice','receipt','note'])
            ->middleware('signed')              // allow viewing without session
            ->withoutMiddleware(['auth'])       // remove auth if parent group has it
            ->name('local.file.show');
        
        // Summary Sheet
        Route::get('/summary/cash-out', [SummaryController::class, 'getCashOut']);
        Route::get('/summary-data', [SummaryController::class, 'getSummaryData']);
        // Cash In Breakdown Route
        Route::get('/summary/cash-in-breakdown', [SummaryController::class, 'getCashInBreakdown']);
        Route::get('/summary/sq/total', [SummaryController::class, 'sqTotal']);
        Route::get('/summary/local-sales/total', [SummaryController::class, 'localSalesTotal']);
        
        // Create customer sheet
        Route::post('/customer/sheets/create', [CustomerSheetController::class, 'storeSheetName'])->name('customer.sheets.create');
        
        Route::get('/dashboard', function () {
            return redirect()->route('index');
        })->name('dashboard');
        
        Route::get('/customer/sheet/data/{sheet}', [CustomerSheetController::class, 'getSheetData']);
        
        Route::post('/customer/sheet/entry/store', [CustomerSheetController::class, 'storeEntry'])->name('customer.sheet.entry.store');
        
        // DEPRECATED – remove after confirming no traffic
        Route::post('/update-customer-sheet', function (Illuminate\Http\Request $request) {
            Log::warning('DEPRECATED /update-customer-sheet used', [
                'ip' => $request->ip(),
                'ua' => $request->userAgent(),
            ]);
            return app(\App\Http\Controllers\Investment\CustomerSheetController::class)->update($request);
        })->name('customer.update');
        
        Route::post('/sheet/create', [CustomerSheetController::class, 'create'])->name('sheet.create');
        Route::post('/sheet/entry', [CustomerSheetController::class, 'addEntry'])->name('sheet.addEntry');
        
        Route::middleware(BindCycleFromRoute::class)->group(function () {
            Route::post('/customer-sheet/store', [CustomerSheetController::class, 'store']);
            Route::get('/customer-sheet/load/{sheetId}', [CustomerSheetController::class, 'loadCustomerSheet']);
            // new
            Route::get('/customer-sheet/entry/{entryId}/items', [CustomerSheetController::class, 'entryItems']);
            
            Route::delete('/customer-sheet/delete-entry/{id}', [CustomerSheetController::class, 'deleteEntry']);
            
            Route::get('/customer-sheet/{sheetId}/entries', [CustomerSheetController::class, 'entries']);
            
            Route::post('/customer-sheet/entry/update', [CustomerSheetController::class, 'update'])
                ->name('customer.entry.update');
            
            Route::prefix('customer-sheet')->group(function () {
                // for loan ledger
                Route::get('{sheet}/loan-ledger', [CustomerLoanLedgerController::class, 'index'])->name('loan_ledger.index');
                Route::post('{sheet}/loan-ledger', [CustomerLoanLedgerController::class, 'store'])->name('loan_ledger.store');
                Route::put('loan-ledger/{id}', [CustomerLoanLedgerController::class, 'update'])->name('loan_ledger.update');
                Route::delete('loan-ledger/{id}', [CustomerLoanLedgerController::class, 'destroy'])->name('loan_ledger.destroy');
            
                // for customer attachment
                Route::get('{entry}/attachments/download-all', [CustomerSheetAttachmentController::class, 'downloadAll'])->name('customer.attach.downloadAll');
                Route::get('{entry}/attachments', [CustomerSheetAttachmentController::class, 'index'])->name('customer.attach.index');
                Route::post('{entry}/attachments', [CustomerSheetAttachmentController::class, 'store'])->name('customer.attach.store');
                Route::delete('attachments/{id}', [CustomerSheetAttachmentController::class, 'destroy'])->name('customer.attach.destroy');
                
                // new
                Route::post('attachments/counts', [CustomerSheetAttachmentController::class, 'counts'])
                    ->name('customer.attach.counts');
            });
            
            Route::get('/customer-sheet/section/{sheet}', [CustomerSheetController::class, 'section'])
            ->name('customer.sheet.section');
        });
        
        Route::get('/summary/customer-sheets/totals', [SummaryController::class, 'customerSheetTotals']);
        Route::get('/summary/customer-sheets/rows',   [SummaryController::class, 'customerSheetRows'])
            ->name('summary.customerSheets.rows');
        Route::get(
            '/summary/customer-sheets/loans',
            [SummaryController::class, 'customerSheetLoans']
        )->name('summary.customerSheets.loans');
        Route::get('/summary/us/total', [SummaryController::class, 'usClientTotal']);
        
        Route::prefix('beneficiaries')->group(function () {
            Route::get('/',            [BeneficiaryController::class, 'index']);    // optional: page route
            Route::get('/data',        [BeneficiaryController::class, 'data']);     // JSON for all 3
            Route::post('/',           [BeneficiaryController::class, 'store']);    // add one
            Route::delete('/{id}',     [BeneficiaryController::class, 'destroy']);  // delete one
            Route::put('/{id}',        [BeneficiaryController::class, 'update']);   // edit and update
            
            Route::get('{entry}/attachments/download-all', [BeneficiaryAttachmentController::class, 'downloadAll'])->name('beneficiaries.attach.downloadAll');
            Route::get('{entry}/attachments',           [BeneficiaryAttachmentController::class, 'index'])->name('beneficiaries.attach.index');
            Route::post('{entry}/attachments',          [BeneficiaryAttachmentController::class, 'store'])->name('beneficiaries.attach.store');
            Route::delete('attachments/{id}',           [BeneficiaryAttachmentController::class, 'destroy'])->name('beneficiaries.attach.destroy');
            Route::get('attachments/{id}', [BeneficiaryAttachmentController::class, 'show'])->name('beneficiaries.attachments.show');
        });
        
        Route::get('/gts-materials/total', [GtsMaterialController::class, 'totals'])
        ->name('gts.totals');  
        
        Route::get('/customer/attachments/{id}', [CustomerSheetAttachmentController::class, 'show'])
        ->name('customer.attachments.show'); 
        
        // stream one material attachment (no symlink needed)
        Route::get('/gts-materials/file/{id}/{kind}', [GtsMaterialController::class, 'showFile'])
            ->whereIn('kind', ['invoice', 'receipt', 'note'])
            ->name('material.file.show');
        // If using a group with prefix('investment')->name('investment.'):
        Route::get('/gts-materials/{id}/attachments', [GtsMaterialController::class, 'getAttachments'])
            ->name('material.attachments');
            
        // Cycle Manager (picker & actions)
        Route::prefix('cycles')->group(function () {
            Route::get('/',               [CycleController::class, 'index'])->name('cycles.index');
            Route::get('/kpis',           [CycleController::class, 'kpis'])->name('cycles.kpis');
            Route::get('/kpis-debug', [CycleController::class, 'kpisDebug']);
        
            Route::post('/',              [CycleController::class, 'store'])->name('cycles.store');
            Route::post('{cycle}/close',  [CycleController::class, 'close'])->name('cycles.close');
            Route::post('{cycle}/reopen', [CycleController::class, 'reopen'])->name('cycles.reopen');
            
            Route::delete('{cycle}', [CycleController::class, 'destroy'])->name('cycles.destroy');
        });
        
        Route::prefix('c/{cycle}')
            ->middleware(['bind.cycle'])
            ->group(function () {
                Route::get('/investments', [InvestmentController::class, 'index'])->name('cycles.investments.page');
                // If you later add a materials page:
                // Route::get('/materials', [MaterialPageController::class, 'show'])->name('cycles.materials.page');
            });
        
        Route::get('/c/{cycle}/materials/totals', [InvestmentController::class, 'totals'])
            ->name('cycles.materials.totals');
        
        Route::prefix('cycles/{cycle}')->group(function () {
            Route::post('/materials/totals/snapshot', [MaterialsTotalsSnapshotController::class, 'store'])
                ->name('cycles.materials.totals.snapshot');
        });
});

// Profit & Loss (Dashboard report)

Route::get('/pl', [ProfitLossSheetsController::class, 'index'])
    ->name('pl.index');

Route::get('/profit-loss', [ProfitLossController::class, 'index'])
    ->name('profitloss.index');

Route::get('/profit-loss/data', [ProfitLossController::class, 'data'])
    ->name('profitloss.data');

// -------------------- PROFIT & LOSS --------------------
Route::prefix('pl')->group(function () {
    Route::get('/book/{book}', [ProfitLossSheetsController::class, 'dashboard'])->name('pl.dashboard');

    Route::post('/books', [ProfitLossSheetsController::class, 'storeBook'])->name('pl.books.store');
    Route::get('/books/{book}', [ProfitLossSheetsController::class, 'bookData'])->name('pl.books.data');
    Route::post('/book/{book}/add-months', [ProfitLossSheetsController::class, 'addMonths'])->name('pl.books.addMonths');

    Route::get('/months/{month}', [ProfitLossSheetsController::class, 'monthData'])->name('pl.months.data');
    Route::post('/lines', [ProfitLossSheetsController::class, 'storeLine'])->name('pl.lines.store');
    Route::put('/lines/{line}', [ProfitLossSheetsController::class, 'updateLine'])->name('pl.lines.update');
    Route::delete('/lines/{line}', [ProfitLossSheetsController::class, 'destroyLine'])->name('pl.lines.destroy');

    Route::get('/book/{bookId}/month-view/{monthId}', [ProfitLossSheetsController::class, 'monthView'])->name('pl.month.view');
    Route::get('/book/{book}/month-sheet/{month}', [ProfitLossSheetsController::class, 'monthPage'])->name('pl.month.page');

    Route::put('/book/{book}/close', [ProfitLossSheetsController::class, 'closeBook'])->name('pl.books.close');
    Route::put('/book/{book}/reopen', [ProfitLossSheetsController::class, 'reopenBook'])->name('pl.books.reopen');

    Route::delete('/book/{book}', [ProfitLossSheetsController::class, 'destroyBook'])->name('pl.books.destroy');
});

Route::middleware(['auth', 'adminOrConsultant'])->prefix('admin')->group(function () {

    // Dashboard (both admin + consultant)
    Route::get('/dashboard', DashboardController::class)
        ->name('admin.dashboard');

    // Document Hub – shared read access (adminOrConsultant)
    Route::get('/document-hub', [DocumentHubController::class, 'index'])
        ->name('dh.index');

    Route::get('/document-hub/trash', [DocumentHubController::class, 'trashIndex'])
        ->name('dh.trash.index')
        ->middleware('admin');

    Route::get('/document-hub/records/{record}/download', [DocumentHubController::class, 'download'])
        ->name('dh.records.download');

    Route::get('/document-hub/records/{record}/attachments', [DocumentHubController::class, 'recordAttachments'])
        ->name('dh.records.attachments');

    Route::get('/document-hub/records/{record}/download-all', [DocumentHubController::class, 'downloadRecordAll'])
        ->name('dh.records.downloadAll');

    Route::get('/document-hub/attachments/{att}/download', [DocumentHubController::class, 'downloadAttachment'])
        ->name('dh.attachments.download');

    Route::patch('/document-hub/attachments/{attachment}/rename', [DocumentHubController::class, 'renameAttachment'])
        ->name('dh.attachments.rename')
        ->middleware('admin');

    Route::patch('/document-hub/trash/restore-selected', [DocumentHubController::class, 'restoreSelectedTrash'])
        ->name('dh.trash.restoreSelected')
        ->middleware('admin');

    Route::delete('/document-hub/trash/delete-selected', [DocumentHubController::class, 'forceDeleteSelectedTrash'])
        ->name('dh.trash.forceDeleteSelected')
        ->middleware('admin');

    Route::patch('/document-hub/attachments/{attachment}/trash', [DocumentHubController::class, 'trashAttachment'])
        ->name('dh.attachments.trash')
        ->middleware('admin');

    Route::patch('/document-hub/attachments/{attachment}/restore', [DocumentHubController::class, 'restoreAttachment'])
        ->name('dh.attachments.restore')
        ->middleware('admin');

    Route::patch('/document-hub/attachments/{attachment}/move', [DocumentHubController::class, 'moveAttachment'])
        ->name('dh.attachments.move')
        ->middleware('admin');

    Route::post('/document-hub/attachments/{attachment}/share-link', [DocumentHubController::class, 'generateAttachmentShareLink'])
        ->name('dh.attachments.share')
        ->middleware('adminOrConsultant');

    Route::patch('/document-hub/attachments/{attachment}/description', [DocumentHubController::class, 'updateAttachmentDescription'])
        ->name('dh.attachments.description')
        ->middleware('admin');

    Route::post('/document-hub/folders', [DocumentHubController::class, 'storeFolder'])
        ->name('dh.folders.store')
        ->middleware('admin');

    Route::patch('/document-hub/folders/{folder}/rename', [DocumentHubController::class, 'rename'])
        ->name('dh.folders.rename')
        ->middleware('admin');
        
    Route::patch('/document-hub/folders/{folder}/description', [DocumentHubController::class, 'updateFolderDescription'])
        ->name('dh.folders.description')
        ->middleware('admin');

    Route::patch('/document-hub/folders/{folder}/trash', [DocumentHubController::class, 'moveToTrash'])
        ->name('dh.folders.trash')
        ->middleware('admin');

    Route::delete('/document-hub/folders/{folder}/force-delete', [DocumentHubController::class, 'forceDeleteFolder'])
        ->name('dh.folders.forceDelete')
        ->middleware('admin');

    Route::delete('/document-hub/attachments/{attachment}/force-delete', [DocumentHubController::class, 'forceDeleteAttachment'])
        ->name('dh.attachments.forceDelete')
        ->middleware('admin');

    Route::patch('/document-hub/folders/{folder}/restore', [DocumentHubController::class, 'restore'])
        ->name('dh.folders.restore')
        ->middleware('admin');

    Route::delete('/document-hub/folders/{folder}', [DocumentHubController::class, 'destroy'])
        ->name('dh.folders.destroy')
        ->middleware('admin');

    Route::post('/document-hub/{folder}/records', [DocumentHubController::class, 'storeRecord'])
        ->name('dh.records.store');

    Route::post('/document-hub/records/{record}/upload', [DocumentHubController::class, 'uploadFile'])
        ->name('dh.records.upload');

    Route::delete('/document-hub/records/{record}', [DocumentHubController::class, 'destroyRecord'])
        ->name('dh.records.destroy')
        ->middleware('admin');

    Route::delete('/document-hub/attachments/{attachment}', [DocumentHubController::class, 'deleteAttachment'])
        ->name('dh.attachments.delete');

    Route::get('/document-hub/{folder}/subfolders', [DocumentHubController::class, 'subfolderIndex'])
        ->name('dh.subfolders.index');

    Route::get('/document-hub/{folder}/download-all', [DocumentHubController::class, 'downloadAll'])
        ->name('dh.folder.downloadAll');

    Route::get('/document-hub/{folder}', [DocumentHubController::class, 'show'])
        ->name('dh.show');

    Route::post('/document-hub/{folder}/quick-upload', [DocumentHubController::class, 'quickUploadToFolder'])
        ->name('dh.folder.quickUpload');
});

Route::get('/careers', function () {
    return view('careers');
})->name('careers');

Route::prefix('tools/fedex')->group(function () {
  Route::get('/', [FedexTrackerController::class, 'index'])->name('fedex.index');

  // invoices
  Route::get('/invoices', [FedexTrackerController::class, 'listInvoices'])->name('fedex.invoices.list');
  Route::post('/invoices', [FedexTrackerController::class, 'storeInvoice'])->name('fedex.invoices.store');
  Route::put('/invoices/{invoice}', [FedexTrackerController::class, 'updateInvoice'])->name('fedex.invoices.update');
  Route::delete('/invoices/{invoice}', [FedexTrackerController::class, 'deleteInvoice'])->name('fedex.invoices.delete');

  // shipments (Step 3)
  Route::get('/invoices/{invoice}/shipments', [FedexTrackerController::class, 'listShipments'])->name('fedex.shipments.list');
  Route::post('/invoices/{invoice}/shipments', [FedexTrackerController::class, 'storeShipment'])->name('fedex.shipments.store');
  Route::put('/shipments/{shipment}', [FedexTrackerController::class, 'updateShipment'])->name('fedex.shipments.update');
  Route::delete('/shipments/{shipment}', [FedexTrackerController::class, 'deleteShipment'])->name('fedex.shipments.delete');

  Route::post('/invoices/{invoice}/shipments/import', [FedexTrackerController::class, 'import'])
    ->name('fedex.shipments.import');

  Route::post('/invoices/import', [FedexTrackerController::class, 'importInvoices'])
    ->name('fedex.invoices.import');
});

Route::get('/metals', [MetalEntryController::class, 'index'])->name('metals.index');
Route::post('/metals', [MetalEntryController::class, 'store'])->name('metals.store');
Route::put('/metals/{metalEntry}', [MetalEntryController::class, 'update'])->name('metals.update');
Route::delete('/metals/{metalEntry}', [MetalEntryController::class, 'destroy'])->name('metals.destroy');

// Attachments (Metals Ledger)
Route::get('/metals/{metalEntry}/attachments', [MetalEntryController::class, 'attachmentsIndex'])
  ->name('metals.attachments.index');

Route::post('/metals/{metalEntry}/attachments', [MetalEntryController::class, 'attachmentsStore'])
  ->name('metals.attachments.store');

Route::delete('/metals/{metalEntry}/attachments', [MetalEntryController::class, 'attachmentsDestroy'])
  ->name('metals.attachments.destroy');

Route::get('/metals/{metalEntry}/attachments/download', [MetalEntryController::class, 'attachmentsDownload'])
  ->name('metals.attachments.download');

Route::get('/metals/{metalEntry}/attachments/download-all', [MetalEntryController::class, 'attachmentsDownloadAll'])
  ->name('metals.attachments.downloadAll');

Route::get('/metals/{metalEntry}/attachments/preview', [MetalEntryController::class, 'attachmentsPreview'])
  ->name('metals.attachments.preview');
  
// SELL Attachments (per item)
Route::get('/metals/{metalEntry}/items/{idx}/sell-attachments', [MetalEntryController::class, 'sellAttachmentsIndex'])
  ->name('metals.sell.attachments.index');

Route::post('/metals/{metalEntry}/items/{idx}/sell-attachments', [MetalEntryController::class, 'sellAttachmentsStore'])
  ->name('metals.sell.attachments.store');

Route::delete('/metals/{metalEntry}/items/{idx}/sell-attachments', [MetalEntryController::class, 'sellAttachmentsDestroy'])
  ->name('metals.sell.attachments.destroy');

Route::get('/metals/{metalEntry}/items/{idx}/sell-attachments/preview', [MetalEntryController::class, 'sellAttachmentsPreview'])
  ->name('metals.sell.attachments.preview');

Route::get('/metals/{metalEntry}/items/{idx}/sell-attachments/download', [MetalEntryController::class, 'sellAttachmentsDownload'])
  ->name('metals.sell.attachments.download');

Route::get('/metals/{metalEntry}/items/{idx}/sell-attachments/download-all', [MetalEntryController::class, 'sellAttachmentsDownloadAll'])
  ->name('metals.sell.attachments.downloadAll');

Route::post('/metals/{metalEntry}/items/{idx}/image', [MetalEntryController::class, 'itemImageStore']);
Route::delete('/metals/{metalEntry}/items/{idx}/image', [MetalEntryController::class, 'itemImageDestroy']);
Route::get('/metals/{metalEntry}/items/{idx}/image', [MetalEntryController::class, 'itemImagePreview'])->name('metals.items.image.preview');
