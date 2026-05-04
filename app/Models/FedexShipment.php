<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FedexShipment extends Model
{
    protected $fillable = [
        'fedex_invoice_id',
        'shipment_id','origin','destination','ship_date','service','pcs',
        'weight','billed_weight','subtotal_amount','amount_per_kg','diff',
        'shipping_status','signed_for_by','actual_delivery_at',
        'paid_by_customer','payment_status','duties_taxes_bill_to',
        'remarks','history',
    ];

    protected $casts = [
        'ship_date' => 'date',
        'actual_delivery_at' => 'datetime',
        'history' => 'array',
    ];

    public function invoice() {
        return $this->belongsTo(FedexInvoice::class, 'fedex_invoice_id');
    }
}
