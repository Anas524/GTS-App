<?php

namespace App\Http\Controllers;

use App\Models\FedexInvoice;
use App\Models\FedexShipment;
use App\Http\Requests\StoreFedexInvoiceRequest;
use App\Http\Requests\StoreFedexShipmentRequest;
use Carbon\Carbon;
use Illuminate\Http\Request;

class FedexTrackerController extends Controller
{
    // =====================
    // PRIVATE HELPER METHOD
    // =====================
    private function recalcInvoiceTotals(int $invoiceId): void
    {
        $invoice = FedexInvoice::findOrFail($invoiceId);

        $sumSubtotal = $invoice->shipments()->sum('subtotal_amount');

        $invoice->update([
            'amount_due' => round($sumSubtotal, 2),
        ]);
    }

    // =====================
    // STORE INVOICE
    // =====================
    public function storeInvoice(StoreFedexInvoiceRequest $request)
    {
        $payload = $request->validated();

        $payload['payment_status'] = trim((string)($payload['payment_status'] ?? '')) !== ''
            ? $payload['payment_status']
            : 'Unpaid';

        $invoice = FedexInvoice::create($payload);
        return response()->json($invoice);
    }

    // =====================
    // STORE SHIPMENT
    // =====================
    public function storeShipment(
        StoreFedexShipmentRequest $request,
        FedexInvoice $invoice
    ) {
        $shipment = $invoice->shipments()->create($request->validated());

        // THIS IS WHERE SYNC HAPPENS
        $this->recalcInvoiceTotals($invoice->id);

        return $shipment;
    }

    // =====================
    // UPDATE SHIPMENT
    // =====================
    public function updateShipment(
        StoreFedexShipmentRequest $request,
        FedexShipment $shipment
    ) {
        $shipment->update($request->validated());

        // RESYNC AFTER UPDATE
        $this->recalcInvoiceTotals($shipment->fedex_invoice_id);

        return $shipment;
    }

    // =====================
    // DELETE SHIPMENT
    // =====================
    public function deleteShipment(FedexShipment $shipment)
    {
        $invoiceId = $shipment->fedex_invoice_id;

        $shipment->delete();

        // RESYNC AFTER DELETE
        $this->recalcInvoiceTotals($invoiceId);

        return response()->json(['success' => true]);
    }

    public function index()
    {
        return view('tools.fedex.index');
    }

    public function listInvoices()
    {
        return FedexInvoice::orderBy('id', 'desc')->get([
            'id',
            'invoice_number',
            'invoice_date',
            'due_date',
            'due_date_text',
            'amount_due',
            'status',
            'remarks',
            'payment_status',
            'payment_reference'
        ]);
    }

    // IMPORTANT: for update/delete, return JSON success so UI can refresh
    public function updateInvoice(StoreFedexInvoiceRequest $request, FedexInvoice $invoice)
    {
        $payload = $request->validated();

        if (array_key_exists('payment_status', $payload)) {
            $payload['payment_status'] = trim((string)$payload['payment_status']) !== ''
                ? $payload['payment_status']
                : 'Unpaid';
        }

        $invoice->update($payload);
        return response()->json($invoice->fresh());
    }

    public function deleteInvoice(FedexInvoice $invoice)
    {
        $invoice->delete();
        return response()->json(['success' => true]);
    }

    public function listShipments(FedexInvoice $invoice)
    {
        return $invoice->shipments()
            ->orderBy('id', 'asc')
            ->get();
    }

    public function import(Request $request, FedexInvoice $invoice)
    {
        $rows = $request->input('rows', []);
        if (!is_array($rows) || !count($rows)) {
            return response()->json(['message' => 'No rows provided.'], 422);
        }

        // existing shipment ids for this invoice
        $existing = $invoice->shipments()
            ->pluck('shipment_id')
            ->map(fn($x) => trim((string)$x))
            ->filter()
            ->unique()
            ->toArray();

        $existingSet = array_flip($existing);

        $insert = [];
        $skipped = 0;

        foreach ($rows as $r) {
            $sid = trim((string)($r['shipment_id'] ?? ''));
            if ($sid === '') continue;

            // skip if already exists
            if (isset($existingSet[$sid])) {
                $skipped++;
                continue;
            }

            // FIX: normalize ship_date from Excel
            $shipDate = $r['ship_date'] ?? null;

            // If Excel serial number slipped through (e.g. 45509)
            if (is_numeric($shipDate)) {
                $shipDate = null;
            }

            $delivery = $r['actual_delivery_at'] ?? null;
            if ($delivery) {
                $delivery = str_replace('T', ' ', $delivery);
                if (preg_match('/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/', $delivery)) {
                    $delivery .= ':00';
                }
            }

            $insert[] = [
                'fedex_invoice_id' => $invoice->id,
                'shipment_id' => $r['shipment_id'],
                'origin' => $r['origin'] ?? 'DXB',
                'destination' => $r['destination'] ?? null,
                'ship_date' => $shipDate,
                'service' => $r['service'] ?? null,
                'pcs' => $r['pcs'] ?? null,
                'weight' => $r['weight'] ?? 0,
                'billed_weight' => $r['billed_weight'] ?? 0,
                'subtotal_amount' => $r['subtotal_amount'] ?? 0,
                'amount_per_kg' => $r['amount_per_kg'] ?? null,
                'diff' => $r['diff'] ?? 0,
                'shipping_status' => $r['shipping_status'] ?? 'Delivered',
                'signed_for_by' => $r['signed_for_by'] ?? null,
                'actual_delivery_at' => $delivery,
                'paid_by_customer' => $r['paid_by_customer'] ?? null,
                'payment_status' => $r['payment_status'] ?? null,
                'duties_taxes_bill_to' => $r['duties_taxes_bill_to'] ?? null,
                'remarks' => $r['remarks'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            // mark as existing so duplicates inside SAME file also skipped
            $existingSet[$sid] = true;
        }

        if (!count($insert) && $skipped > 0) {
            return response()->json([
                'ok' => false,
                'message' => "Already uploaded. ($skipped duplicate shipment IDs skipped)",
                'inserted' => 0,
                'skipped' => $skipped
            ], 200);
        }

        if (!count($insert)) {
            return response()->json(['message' => 'No valid shipment rows found.'], 422);
        }

        $insert = array_values(array_filter($insert, fn($r) => !in_array((string)$r['shipment_id'], $existing)));

        if (!count($insert)) {
            return response()->json(['message' => 'All rows already exist for this invoice.'], 422);
        }

        FedexShipment::insert($insert);

        $this->recalcInvoiceTotals($invoice->id);

        return response()->json([
            'ok' => true,
            'inserted' => count($insert),
            'skipped' => $skipped,
            'message' => $skipped ? "Imported with duplicates skipped ($skipped)." : "Imported successfully."
        ]);
    }

    public function importInvoices(Request $request)
    {
        $rows = $request->input('rows', []);
        if (!is_array($rows) || !count($rows)) {
            return response()->json(['message' => 'No rows provided.'], 422);
        }

        // existing invoice numbers (unique)
        $existing = FedexInvoice::query()
            ->pluck('invoice_number')
            ->map(fn($x) => trim((string)$x))
            ->filter()
            ->unique()
            ->toArray();

        $existingSet = array_flip($existing);

        $insert = [];
        $skipped = 0;

        foreach ($rows as $r) {
            $invNo = trim((string)($r['invoice_number'] ?? ''));
            if ($invNo === '') continue;

            // skip duplicates
            if (isset($existingSet[$invNo])) {
                $skipped++;
                continue;
            }

            $invoiceDate = $this->parseInvoiceDate($r['invoice_date'] ?? null);

            // Due Date OR Due Text
            $dueDate = $this->parseInvoiceDate($r['due_date'] ?? null);
            $dueText = trim((string)($r['due_date_text'] ?? ''));

            // If excel had due date column but it was text like "Due on receipt"
            if (!$dueDate && !$dueText) {
                $rawDue = trim((string)($r['due_date_raw'] ?? ''));
                if ($rawDue !== '' && !$this->looksLikeDate($rawDue)) {
                    $dueText = $rawDue;
                }
            }

            // Accept if either exists
            if (!$dueDate && $dueText === '') {
                // If your UI requires one of them, keep this check:
                // skip invalid row
                continue;
            }

            $amount = $this->numMoney($r['amount_due'] ?? ($r['amount'] ?? 0));

            $insert[] = [
                'invoice_number'     => $invNo,
                'status'             => $r['status'] ?? 'Pending',
                'invoice_date'       => $invoiceDate,
                'due_date'           => $dueDate,
                'due_date_text'      => $dueText ?: null,
                'remarks'            => $r['remarks'] ?? null,
                'payment_status' => (isset($r['payment_status']) && trim((string)$r['payment_status']) !== '')
                    ? trim((string)$r['payment_status'])
                    : 'Unpaid',
                'payment_reference'  => $r['payment_reference'] ?? null,
                'amount_due'         => $amount,
                'created_at'         => now(),
                'updated_at'         => now(),
            ];

            // mark existing (avoid duplicates inside same file too)
            $existingSet[$invNo] = true;
        }

        if (!count($insert) && $skipped > 0) {
            return response()->json([
                'ok' => false,
                'message' => "Already uploaded. ($skipped duplicate invoice numbers skipped)",
                'inserted' => 0,
                'skipped' => $skipped
            ], 200);
        }

        if (!count($insert)) {
            return response()->json(['message' => 'No valid invoice rows found.'], 422);
        }

        FedexInvoice::insert($insert);

        return response()->json([
            'ok' => true,
            'inserted' => count($insert),
            'skipped' => $skipped,
            'message' => $skipped ? "Imported with duplicates skipped ($skipped)." : "Imported successfully."
        ]);
    }

    /** money like "149,248.67 AED" or "AED 22,405.34" */
    private function numMoney($v): float
    {
        $s = (string)($v ?? '');
        $s = str_replace(['AED', 'aed', ','], '', $s);
        $s = preg_replace('/[^0-9.\-]/', '', $s);
        return (float)($s ?: 0);
    }

    /** Detect if string looks like a date */
    private function looksLikeDate(string $s): bool
    {
        $s = trim($s);
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s)
            || preg_match('/^\d{1,2}\/\d{1,2}\/(\d{2}|\d{4})/', $s)
            || preg_match('/^[A-Za-z]+,\s*\d{1,2}\s+[A-Za-z]+\s+\d{4}$/', $s);
    }

    /** Parse: "Wednesday, 8 January 2025" or "09/12/2024" or "2024-12-09" */
    private function parseInvoiceDate($v): ?string
    {
        if ($v == null || $v === '') return null;
        $s = trim((string)$v);

        // already ISO
        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $s, $m)) return $m[1];

        // dd/mm/yyyy
        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $s, $m)) {
            return "{$m[3]}-{$m[2]}-{$m[1]}";
        }

        // "Monday, 9 December 2024" / "Monday, 09 December 2024"
        foreach (['l, j F Y', 'l, d F Y', 'j F Y', 'd F Y'] as $fmt) {
            try {
                return Carbon::createFromFormat($fmt, $s, 'UTC')->format('Y-m-d');
            } catch (\Throwable $e) {
            }
        }

        // last attempt
        try {
            return Carbon::parse($s)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }
}
