<?php

namespace App\Http\Controllers\ARCalc;

use App\Http\Controllers\Controller;
use App\Models\ProductEntry;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use App\Support\ToolActivity;

class ProductEntryController extends Controller
{
    public function view()
    {
        // Tailwind blade will bootstrap the app; data loads via JS
        return view('arcalc.index');
    }

    // GET /admin/arcalc/entries?search=&brand=&customer=
    public function index(Request $request)
    {
        $filters = [
            'search'   => $request->get('search', ''),
            'brand'    => $request->get('brand', ''),
            'customer' => $request->get('customer', ''),
        ];

        $cacheKey = 'entries:v2:' . md5(json_encode($filters));

        // Get filtered rows (ASC so new rows are last)
        $rows = Cache::remember($cacheKey, 60, function () use ($request) {
            $q = ProductEntry::query()->select([
                'id',
                'customer_name',
                'brand_name',
                'asin',
                'brief_description',
                'goods_cost',
                'sell_price',
                'min_sell_price',
                'profit',
                'target_buy_price',
                'units_sold',
                'description',
                'net_proceeds',
                'amazon_fees',
                'tariff',
                'fulfillment',
                'amazon_storage_charges',
                'shipping_cost',
                'labeling_charges',
                'origin_purchase',
                'low_inventory_fee',
                'tariff_percentage',
                'actual_cost',
                'product_link',
                'image_url',
                'local_image_path',
                'created_at',
            ]);

            if ($s = trim($request->get('search', ''))) {
                $q->where(function ($w) use ($s) {
                    $w->where('brand_name', 'like', "%$s%")
                        ->orWhere('customer_name', 'like', "%$s%")
                        ->orWhere('asin', 'like', "%$s%")
                        ->orWhere('brief_description', 'like', "%$s%");
                });
            }
            if ($b = $request->get('brand'))    $q->where('brand_name', $b);
            if ($c = $request->get('customer')) $q->where('customer_name', $c);

            $rows = $q->orderBy('id', 'asc')->get();

            // Build lightweight image_src and strip base64
            return $rows->map(function ($row) {
                $base = $row->local_image_path ?: $row->image_url;
                if ($base && Str::startsWith($base, 'storage/')) {
                    $row->image_src = asset($base);
                } elseif ($base && Str::startsWith($base, 'data:image/')) {
                    $row->image_src = asset('images/placeholder.png');
                    $row->image_url = null;
                } else {
                    $row->image_src = $base;
                }
                return $row;
            });
        });

        // Counts
        $filteredCount = $rows->count();
        $grandTotal = Cache::remember('entries:v2:grand_total', 60, fn() => ProductEntry::count());

        return response()->json([
            'data'        => $rows,
            'total'       => $filteredCount, // after filters
            'grand_total' => $grandTotal,    // all rows
        ], 200, ['Cache-Control' => 'public, max-age=30']);
    }

    public function store(Request $request)
    {
        // 1) Validate
        $v = $request->validate([
            'customerName'          => 'nullable|string|max:255',
            'brandName'             => 'nullable|string|max:255',
            'asin'                  => 'nullable|string|max:255',
            'briefDescription'      => 'nullable|string',
            'shippingCost'          => 'nullable|numeric',
            'labelingCharges'       => 'nullable|numeric',
            'goodsCost'             => 'nullable|numeric',
            'fulfillment'           => 'nullable|numeric',
            'sellPrice'             => 'nullable|numeric',
            'amazonStorageCharges'  => 'nullable|numeric',
            'tariffPercentage'      => 'nullable|numeric',
            'originPurchase'        => 'nullable|string|max:255',
            'unitsSold'             => 'nullable|numeric',
            'lowInventoryFee'       => 'nullable|boolean',
            'description'           => 'nullable|string',
            'productLink'           => 'nullable|url',
            'image'                 => 'nullable|image|max:3072', // 3MB
        ]);

        // 2) Calculations (mirror your JS)
        $tariffPct  = (float)($v['tariffPercentage'] ?? 0);
        $sell       = (float)($v['sellPrice'] ?? 0);
        $goods      = (float)($v['goodsCost'] ?? 0);
        $ship       = (float)($v['shippingCost'] ?? 0);
        $label      = (float)($v['labelingCharges'] ?? 0);
        $fullf      = (float)($v['fulfillment'] ?? 0);
        $stor       = (float)($v['amazonStorageCharges'] ?? 0);
        $lowInv     = (!empty($v['lowInventoryFee']) ? 0.97 : 0); // same rule as before

        $amazonFee  = $sell * 0.18;
        $return     = $goods > 2 ? 0.5 : 0.2;
        $tariff     = $goods * $tariffPct / 100.0;

        $actualCost = $ship + $label + $goods + $fullf + $amazonFee + $stor + $return + $lowInv + $tariff;
        $profit     = $sell - $actualCost;
        $net        = $sell - ($amazonFee + $fullf);
        $minSell    = $sell - $profit;
        $targetBuy  = $sell - ($ship + $fullf + $amazonFee + $stor + $return + $lowInv + $tariff + $label) - 1;

        // 3) Image -> write directly under public_html/storage/media/arcalc
        $localPath = null;
        if ($request->hasFile('image')) {
            $localPath = $this->saveToPublicStorage($request->file('image'));
        }

        // 4) Create
        $row = ProductEntry::create([
            'customer_name'            => $v['customerName'] ?? '',
            'brand_name'               => $v['brandName'] ?? '',
            'asin'                     => $v['asin'] ?? '',
            'brief_description'        => $v['briefDescription'] ?? '',
            'shipping_cost'            => $ship,
            'labeling_charges'         => $label,
            'goods_cost'               => $goods,
            'fulfillment'              => $fullf,
            'sell_price'               => $sell,
            'amazon_storage_charges'   => $stor,
            'tariff_percentage'        => $tariffPct,
            'origin_purchase'          => $v['originPurchase'] ?? '',
            'units_sold'               => (float)($v['unitsSold'] ?? 0),
            'low_inventory_fee'        => $lowInv,
            'description'              => $v['description'] ?? '',
            'product_link'             => $v['productLink'] ?? '',

            // image fields
            'local_image_path'         => $localPath,   // use local path column
            'image_url'                => null,         // keep null; we’re not storing base64/remote now

            // computed
            'amazon_fees'              => $amazonFee,
            'tariff'                   => $tariff,
            'return_value'             => $return,
            'actual_cost'              => $actualCost,
            'net_proceeds'             => $net,
            'min_sell_price'           => $minSell,
            'profit'                   => $profit,
            'target_buy_price'         => $targetBuy,
        ]);

        // 5) Compute image_src for the frontend (full URL)
        $imageSrc = null;
        if ($row->local_image_path && str_starts_with($row->local_image_path, 'storage/')) {
            $imageSrc = asset($row->local_image_path);
        }
        $row->setAttribute('image_src', $row->local_image_path ? asset($row->local_image_path) : null);

        // 6) Clear list caches so GET /entries returns the fresh list
        Cache::flush();
        
        // >>> bump after a successful create
        ToolActivity::bump('calculator');

        // 7) Return the created row so the UI can append instantly (bottom + highlight)
        return response()->json(['ok' => true, 'row' => $row], 201);
    }

    public function update(Request $request, $id)
    {
        $product = ProductEntry::findOrFail($id);

        $v = $request->validate([
            'customerName'          => 'nullable|string|max:255',
            'brandName'             => 'nullable|string|max:255',
            'asin'                  => 'nullable|string|max:255',
            'briefDescription'      => 'nullable|string',
            'shippingCost'          => 'nullable|numeric',
            'labelingCharges'       => 'nullable|numeric',
            'goodsCost'             => 'nullable|numeric',
            'fulfillment'           => 'nullable|numeric',
            'sellPrice'             => 'nullable|numeric',
            'amazonStorageCharges'  => 'nullable|numeric',
            'tariffPercentage'      => 'nullable|numeric',
            'originPurchase'        => 'nullable|string|max:255',
            'unitsSold'             => 'nullable|numeric',
            'lowInventoryFee'       => 'nullable|boolean',
            'description'           => 'nullable|string',
            'productLink'           => 'nullable|url',
            'image'                 => 'nullable|image|max:3072',
            // if you want to be strict, you can uncomment this:
            // 'existing_image'     => 'nullable|string',
        ]);
        
        /* 2) Preserve existing image when no new file is uploaded */
        if (!$request->hasFile('image') && $request->filled('existing_image')) {
            $product->local_image_path = $request->input('existing_image');
        }

        /* 3) Handle new image upload (replace old local file if applicable) */
        if ($request->hasFile('image')) {
            // delete old public file if it lives under storage/media/arcalc
            if ($product->local_image_path && str_starts_with($product->local_image_path, 'storage/media/arcalc/')) {
                @unlink(public_path($product->local_image_path));
            }
        
            $product->local_image_path = $this->saveToPublicStorage($request->file('image'));
            $product->image_url = null;
        }

        /* 4) Recalculate fields (mirror store()) */
        $tariffPct  = (float)($v['tariffPercentage'] ?? $product->tariff_percentage ?? 0);
        $sell       = (float)($v['sellPrice'] ?? $product->sell_price ?? 0);
        $goods      = (float)($v['goodsCost'] ?? $product->goods_cost ?? 0);
        $ship       = (float)($v['shippingCost'] ?? $product->shipping_cost ?? 0);
        $label      = (float)($v['labelingCharges'] ?? $product->labeling_charges ?? 0);
        $fullf      = (float)($v['fulfillment'] ?? $product->fulfillment ?? 0);
        $stor       = (float)($v['amazonStorageCharges'] ?? $product->amazon_storage_charges ?? 0);
        $lowInv     = isset($v['lowInventoryFee']) ? ($v['lowInventoryFee'] ? 0.97 : 0) : ($product->low_inventory_fee ?? 0);

        $amazonFee  = $sell * 0.18;
        $return     = $goods > 2 ? 0.5 : 0.2;
        $tariff     = $goods * $tariffPct / 100.0;

        $actualCost = $ship + $label + $goods + $fullf + $amazonFee + $stor + $return + $lowInv + $tariff;
        $profit     = $sell - $actualCost;
        $net        = $sell - ($amazonFee + $fullf);
        $minSell    = $sell - $profit;
        $targetBuy  = $sell - ($ship + $fullf + $amazonFee + $stor + $return + $lowInv + $tariff + $label) - 1;
        
        /* 5) Persist */
        $product->fill([
            'customer_name'            => $v['customerName']          ?? $product->customer_name,
            'brand_name'               => $v['brandName']             ?? $product->brand_name,
            'asin'                     => $v['asin']                  ?? $product->asin,
            'brief_description'        => $v['briefDescription']      ?? $product->brief_description,
            'shipping_cost'            => $ship,
            'labeling_charges'         => $label,
            'goods_cost'               => $goods,
            'fulfillment'              => $fullf,
            'sell_price'               => $sell,
            'amazon_storage_charges'   => $stor,
            'origin_purchase'          => $v['originPurchase']        ?? $product->origin_purchase,
            'units_sold'               => (float)($v['unitsSold']     ?? $product->units_sold),
            'tariff_percentage'        => $tariffPct,
            'low_inventory_fee'        => $lowInv,
            'description'              => $v['description']           ?? $product->description,
            'product_link'             => $v['productLink']           ?? $product->product_link,

            'amazon_fees'              => $amazonFee,
            'tariff'                   => $tariff,
            'min_sell_price'           => $minSell,
            'profit'                   => $profit,
            'target_buy_price'         => $targetBuy,
            'net_proceeds'             => $net,
            'return_value'             => $return,
            'actual_cost'              => $actualCost,
        ])->save();

        /* 6) Prepare image_src for frontend and clear caches */
        $imageSrc = $product->local_image_path ? asset($product->local_image_path) : null;
        $product->setAttribute('image_src', $imageSrc);

        \Illuminate\Support\Facades\Cache::flush();
        
        // >>> bump after a successful update
        ToolActivity::bump('calculator');

        return response()->json(['message' => 'Updated', 'row' => $product]);
    }

    public function destroy(Request $request, int $id)
    {
        // If you use soft deletes, you can use withTrashed()->find($id) here.
        $row = ProductEntry::find($id);

        if (!$row) {
            // Treat as success so UI stays in sync even if the row is gone
            return response()->json(['ok' => true, 'already' => true]);
        }

        // (Optional) also unlink local image if you want to clean files
        // if ($row->local_image_path) {
        //     $path = public_path($row->local_image_path);
        //     if (is_file($path)) @unlink($path);
        // }

        $row->delete();         // or forceDelete() if no soft deletes
        Cache::flush();         // keep your cached list/count in sync
        
        // >>> bump after a successful delete
        ToolActivity::bump('calculator');

        return response()->json(['ok' => true]);
    }
    
    private function saveToPublicStorage(UploadedFile $file): string
    {
        // Always write under the real web root so the URL /storage/... works on live.
        // On cPanel this is /home/<user>/public_html
        $docRoot = rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/');
    
        // Fallback to public_path() if DOCUMENT_ROOT is not set (e.g., CLI)
        if ($docRoot === '') {
            $docRoot = rtrim(base_path('../public_html'), '/'); // best-effort fallback for shared hosting layouts
            if (!is_dir($docRoot)) {
                $docRoot = rtrim(public_path(), '/'); // last fallback
            }
        }
    
        $dir = $docRoot . '/storage/media/arcalc';
    
        // Ensure directory exists and is writable
        if (!is_dir($dir)) {
            if (!@mkdir($dir, 0755, true) && !is_dir($dir)) {
                throw new \RuntimeException("Cannot create directory: " . $dir);
            }
        }
        if (!is_writable($dir)) {
            @chmod($dir, 0755);
        }
    
        // Build a safe filename (keep original extension)
        $ext  = strtolower($file->getClientOriginalExtension() ?: 'jpg');
        $name = time() . '_' . \Illuminate\Support\Str::random(8) . '.' . $ext;
    
        // Move uploaded temp file -> public_html/storage/media/arcalc/<name>
        $file->move($dir, $name);
    
        $dest = $dir . DIRECTORY_SEPARATOR . $name;
        if (!file_exists($dest)) {
            throw new \RuntimeException("Upload move failed: " . $dest);
        }
    
        // Return the *web* path that your frontend requests
        return 'storage/media/arcalc/' . $name;
    }
}

