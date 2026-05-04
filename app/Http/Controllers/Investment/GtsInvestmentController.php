<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use App\Models\Investment\GtsInvestment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Dompdf\Dompdf;
use Dompdf\Options;
use setasign\Fpdi\Tcpdf\Fpdi;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Schema;
use App\Support\ActiveCycle;

class GtsInvestmentController extends Controller
{
    private function findInActiveCycleOrFail(Request $request, $id): GtsInvestment
    {
        $c = ActiveCycle::id($request);
        return GtsInvestment::where('id', $id)
            ->where('cycle_id', $c)
            ->firstOrFail();
    }
    
    public function index(Request $request)
    {
        $c = ActiveCycle::id($request);
        $investments = GtsInvestment::where('cycle_id', $c)
            ->orderBy('created_at', 'asc')
            ->get();
        return response()->json($investments);
    }

    public function store(Request $request)
    {
        try {
            $c = ActiveCycle::id($request);

            $investment = GtsInvestment::create([
                'cycle_id'           => $c,
                'date' => $request->date,
                'investor' => $request->investor,
                'investment_amount' => $request->investment_amount ?? 0,
                'investment_no' => $request->investment_no ?: null,
                'mode_of_transaction' => $request->mode_of_transaction ?: null,
                'murabaha' => $request->murabaha ?: null,
                'repayment_terms' => $request->repayment_terms ?: null,
                'loan_tenure' => $request->loan_tenure !== '' ? (int)$request->loan_tenure : null,
                'repayment_date' => $request->repayment_date ?: null,
                'remarks' => $request->remarks ?: null,
                'status' => 'saved',
                'payment_method' => $request->payment_method ?: null,
            ]);

            return response()->json($investment);
        } catch (\Throwable $e) {
            Log::error('Investment Save Error', ['message' => $e->getMessage()]);
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $investment = $this->findInActiveCycleOrFail($request, $id);
        $investment->update([
            'date' => $request->date,
            'investor' => $request->investor,
            'investment_amount' => $request->investment_amount,
            'investment_no' => $request->investment_no,
            'mode_of_transaction' => $request->mode_of_transaction,
            'murabaha' => $request->murabaha,
            'repayment_terms' => $request->repayment_terms,
            'loan_tenure' => $request->loan_tenure,
            'repayment_date' => $request->repayment_date,
            'remarks' => $request->remarks,
            'payment_method' => $request->payment_method,
        ]);

        return response()->json($investment);
    }

    public function finalize(Request $request, $id)
    {
        $investment = $this->findInActiveCycleOrFail($request, $id);
        $investment->is_finalized = true;
        $investment->save();

        return response()->json(['message' => 'Investment finalized successfully.']);
    }

    public function destroy(Request $request, $id)
    {
        $investment = $this->findInActiveCycleOrFail($request, $id);
        $investment->delete();
        return response()->json(['message' => 'Deleted']);
    }

    public function getTotalAmount(Request $request)
    {
        $c = ActiveCycle::id($request);

        // Pick the correct column name safely
        $col = Schema::hasColumn('gts_investments', 'investment_amount')
            ? 'investment_amount'
            : (Schema::hasColumn('gts_investments', 'amount') ? 'amount' : null);

        if (!$col) {
            return response()->json([
                'total' => 0,
                '_warn' => 'No amount column found on gts_investments (expected investment_amount or amount)',
            ]);
        }

        // If model uses BelongsToCycle:
        $total = GtsInvestment::where('cycle_id',$c)->sum($col);

        return response()->json(['total' => round((float) $total, 2)]);
    }

    public function uploadAttachments(Request $request, $id)
    {
        $investment = $this->findInActiveCycleOrFail($request, $id);

        // Delete old invoice if new one uploaded
        if ($request->hasFile('invoice')) {
            if ($investment->invoice && Storage::disk('public')->exists($investment->invoice)) {
                Storage::disk('public')->delete($investment->invoice);
            }
            $path = $request->file('invoice')->store('attachments/investment/invoice', 'public');
            $investment->invoice = $path;
        }

        // Delete old receipt if new one uploaded
        if ($request->hasFile('receipt')) {
            if ($investment->receipt && Storage::disk('public')->exists($investment->receipt)) {
                Storage::disk('public')->delete($investment->receipt);
            }
            $path = $request->file('receipt')->store('attachments/investment/receipt', 'public');
            $investment->receipt = $path;
        }

        // Delete old note if new one uploaded
        if ($request->hasFile('note')) {
            if ($investment->note && Storage::disk('public')->exists($investment->note)) {
                Storage::disk('public')->delete($investment->note);
            }
            $path = $request->file('note')->store('attachments/investment/note', 'public');
            $investment->note = $path;
        }

        $investment->save();

        return response()->json(['success' => true]);
    }

    public function getAttachments(Request $request, $id)
    {
        $investment = $this->findInActiveCycleOrFail($request, $id);
    
        $make = function (string $kind, ?string $path) use ($id) {
            if (!$path || !Storage::disk('public')->exists($path)) return null;
    
            // 10-minute signed URL; adjust if you like
            $url = URL::temporarySignedRoute(
                'investment.invest.file.show',
                now()->addMinutes(10),
                ['id' => $id, 'kind' => $kind]
            );
    
            return [
                'url'  => $url,
                'name' => basename($path),
            ];
        };
    
        return response()->json([
            'invoice' => $make('invoice', $inv->invoice),
            'receipt' => $make('receipt', $inv->receipt),
            'note'    => $make('note',    $inv->note),
        ]);
    }

    public function downloadAttachments(Request $request, $id)
    {
        $investment = $this->findInActiveCycleOrFail($request, $id);
    
        $html = '
            <meta charset="utf-8"/>
            <style>
                body { font-family: DejaVu Sans, sans-serif; }
                h2 { text-align: center; margin-bottom: 0px; }
                .attachment-block { page-break-inside: avoid; margin-bottom: 30px; }
                .attachment-block img {
                    max-width: 100%;
                    max-height: 800px;
                    display: block;
                    margin: 0 auto;
                    object-fit: contain;
                }
            </style>
            <h2>GTS Investment Attachments</h2>
        ';
    
        $embed = function (?string $path, string $title) {
            if (!$path || !Storage::disk('public')->exists($path)) return '';
            $full = Storage::disk('public')->path($path);
            $ext  = pathinfo($full, PATHINFO_EXTENSION) ?: 'png';
            $data = @file_get_contents($full);
            if ($data === false) return '';
            $base64 = 'data:image/'.$ext.';base64,'.base64_encode($data);
            return "
                <div class='attachment-block'>
                    <h3>{$title}</h3>
                    <img src='{$base64}' alt='{$title} Attachment'>
                </div>
            ";
        };
    
        $html .= $embed($investment->invoice, 'Invoice');
        $html .= $embed($investment->receipt, 'Receipt');
        $html .= $embed($investment->note,    'Delivery Note');
    
        // ---- Dompdf with explicit options (avoid "Cannot resolve public path") ----
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        // Set a safe chroot where your files live (no need for public_html)
        $options->setChroot(storage_path('app/public'));
    
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
    
        return response($dompdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="investment_attachments_'.$id.'.pdf"');
    }

    public function updateMurabaha(Request $request, $id)
    {
        $investment = $this->findInActiveCycleOrFail($request, $id);

        $investment->murabaha_status = $request->murabaha_status;
        $investment->murabaha_date = $request->murabaha_date;
        $investment->save();

        return response()->json(['success' => true]);
    }
    
    public function showFile($id, string $kind)
    {
        $inv = GtsInvestment::findOrFail($id);
    
        $field = match ($kind) {
            'invoice' => 'invoice',
            'receipt' => 'receipt',
            'note'    => 'note',
            default   => null,
        };
        if (!$field || !$inv->{$field}) abort(404);
    
        $path = $inv->{$field};
        if (!Storage::disk('public')->exists($path)) abort(404);
    
        return Storage::disk('public')->response($path); // inline view
    }
}
