<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class BeneficiaryEntry extends Model
{
    // Existing table name you already use
    protected $table = 'beneficiary_entries';

    protected $fillable = [
        'cycle_id', 'beneficiary', // 'shareholder1' | 'shareholder2'
        'date', 'type',            // 'cash' | 'bank_transfer' | 'adjustment'
        'amount', 'charity', 'remarks',
    ];

    protected $casts = [
        'date'   => 'date',
        'amount' => 'decimal:2',
        'charity'=> 'decimal:2',
    ];

    public function attachments()
    {
        return $this->hasMany(BeneficiaryAttachment::class, 'entry_id');
    }
}
