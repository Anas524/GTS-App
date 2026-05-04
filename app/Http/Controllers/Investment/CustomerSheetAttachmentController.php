<?php

namespace App\Http\Controllers\Investment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Investment\CustomerSheetEntry;
use App\Models\Investment\CustomerSheetAttachment;
use Illuminate\Support\Facades\Storage;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\DB;

class CustomerSheetAttachmentController extends Controller
{
    public function index(CustomerSheetEntry $entry)
    {
        $attachments = $entry->attachments()
            ->orderByDesc('id')
            ->get(['id', 'type', 'original_name', 'path', 'mime', 'size', 'created_at'])
            ->map(function ($a) {
                return [
                    'id'            => $a->id,
                    'type'          => $a->type,
                    'original_name' => $a->original_name,
                    'path'          => $a->path,
                    'mime'          => $a->mime,
                    'size'          => $a->size,
                    'created_at'    => $a->created_at,
                    // stream via controller (no /storage symlink needed)
                    'url'           => route('investment.customer.attachments.show', $a->id),
                ];
            });
    
        return response()->json(['attachments' => $attachments]);
    }

    public function store(Request $request, CustomerSheetEntry $entry)
    {
        $request->validate([
            'files.*' => 'required|file|max:20480', // 20MB
            'type'    => 'nullable|string|max:32'
        ]);

        $type = strtolower(trim((string) $request->input('type')));
        if (!in_array($type, ['invoice', 'receipt', 'note'], true)) {
            $type = 'other';
        }

        foreach ((array) $request->file('files', []) as $file) {
            $path = $file->store("attachments/customer/{$entry->id}", 'public');
            CustomerSheetAttachment::create([
                'entry_id'      => $entry->id,
                'type'          => $request->type,
                'original_name' => $file->getClientOriginalName(),
                'path'          => $path,
                'mime'          => $file->getMimeType(),
                'size'          => $file->getSize(),
            ]);
        }
        return response()->json(['ok' => true]);
    }

    public function destroy($id)
    {
        $a = CustomerSheetAttachment::findOrFail($id);
        if ($a->path && Storage::disk('public')->exists($a->path)) {
            Storage::disk('public')->delete($a->path);
        }
        $a->delete();
        return response()->json(['ok' => true]);
    }

    public function downloadAll(CustomerSheetEntry $entry)
    {
        // Only this entry’s files
        $atts = $entry->attachments()
            ->orderBy('id')
            ->get(['id', 'type', 'original_name', 'path']);
    
        $esc = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
    
        // Title (Supplier • Description • Date)
        $bits  = array_filter([$entry->supplier ?? null, $entry->description ?? null, $entry->date ?? null]);
        $title = $bits ? implode(' • ', $bits) : 'Customer Sheet Attachments';
    
        // ------- HTML (links only) -------
        $html = '
    <meta charset="utf-8"/>
    <style>
      body{font-family: DejaVu Sans, sans-serif; color:#222}
      h1{font-size:20px; text-align:center; margin:0 0 6px}
      h2{font-size:13px; text-align:center; margin:0 0 18px; color:#666}
      .row{page-break-inside:avoid; margin:18px 0; padding-bottom:12px; border-bottom:1px solid #eee}
      .meta{font-size:12px; color:#444; margin-bottom:8px}
      .pill{display:inline-block; padding:4px 8px; font-size:11px; color:#fff; border-radius:999px; margin-right:6px}
      .invoice{background:#2563eb} .receipt{background:#16a34a} .note{background:#f97316} .other{background:#64748b}
      .linkbox{background:#f8fafc; border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; font-size:12px}
      .linkbox a{color:#2563eb; text-decoration:none; word-break:break-all}
    </style>';
    
        $html .= '<h1>'.$esc($title).'</h1>';
        $html .= '<h2>Entry #'.$esc($entry->id).'</h2>';
    
        if ($atts->isEmpty()) {
            $html .= '<div class="meta">No attachments for this entry.</div>';
        } else {
            foreach ($atts as $a) {
                $type = strtolower($a->type ?? 'other');
                $pill = in_array($type, ['invoice', 'receipt', 'note']) ? $type : 'other';
    
                $html .= '<div class="row">';
                $html .=   '<div class="meta"><span class="pill '.$pill.'">'.ucfirst($esc($type)).'</span> '.$esc($a->original_name ?: 'file').'</div>';
    
                // Use streaming route (no public path, no symlink)
                if ($a->path && Storage::disk('public')->exists($a->path)) {
                    $url = route('investment.customer.attachments.show', ['id' => $a->id]);
                    $html .= '<div class="linkbox">File available at:<br><a href="'.$esc($url).'">'.$esc($url).'</a></div>';
                } else {
                    $html .= '<div class="linkbox">File missing on disk: '.$esc($a->path).'</div>';
                }
    
                $html .= '</div>';
            }
        }
    
        // -------- Dompdf (no Laravel facade) --------
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans'); // unicode-safe
        $options->set('isRemoteEnabled', true);      // allow http(s) links if needed
    
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();
    
        $filename = 'customer_attachments_'.$entry->id.'.pdf';
        return response($dompdf->output(), 200)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', 'attachment; filename="'.$filename.'"');
    }
    
    public function show($id)
    {
        $a = CustomerSheetAttachment::findOrFail($id);
    
        // Optional: policy/authorization check here
        // $this->authorize('view', $a);
    
        if (!$a->path || !Storage::disk('public')->exists($a->path)) {
            abort(404);
        }
    
        // Inline view (images/pdf open in browser)
        return Storage::disk('public')->response($a->path);
        // Or force download:
        // return Storage::disk('public')->download($a->path, $a->original_name ?: basename($a->path));
    }
    
    public function counts(Request $request)
    {
        // Expect: entry_ids[] = [1,2,3,...]
        $ids = collect($request->input('entry_ids', []))
            ->filter()->unique()->values();
    
        if ($ids->isEmpty()) {
            return response()->json(['counts' => []], 200);
        }
    
        $rows = DB::table('customer_sheet_attachments')
            ->select('entry_id', DB::raw('COUNT(*) as c'))
            ->whereIn('entry_id', $ids)
            ->groupBy('entry_id')
            ->pluck('c', 'entry_id');
    
        return response()->json(['counts' => $rows], 200);
    }
}
