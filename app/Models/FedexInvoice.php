<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FedexInvoice extends Model
{
    protected $fillable = [
        'invoice_number',
        'invoice_date',
        'due_date',
        'due_date_text',
        'amount_due',
        'status',
        'remarks',
        'payment_status',
        'payment_reference',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'due_date' => 'date',
        'amount_due' => 'decimal:2',
    ];

    public function shipments()
    {
        return $this->hasMany(FedexShipment::class, 'fedex_invoice_id');
    }
}
