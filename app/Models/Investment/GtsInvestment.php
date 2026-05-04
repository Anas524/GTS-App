<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;
use App\Models\Cycle;
use App\Models\Concerns\BelongsToCycle;

class GtsInvestment extends Model
{
    use BelongsToCycle;
    
    protected $fillable = [
        'cycle_id',
        'date',
        'investor',
        'investment_amount',
        'investment_no',
        'mode_of_transaction',
        'murabaha',
        'repayment_terms',
        'loan_tenure',
        'repayment_date',
        'remarks',
        'status',
        'invoice',
        'receipt',
        'note',
        'payment_method',
        'murabaha_status',
        'murabaha_date',
        'is_finalized'
    ];

    protected $casts = [
        'date' => 'date',
        'repayment_date' => 'date',
        'investment_amount' => 'decimal:2',
        'murabaha'          => 'boolean', // if this is yes/no
    ];

    public function cycle()
    {
        return $this->belongsTo(Cycle::class, 'cycle_id');
    }

    public function scopeForCycle($query, $cycleId)
    {
        return $query->where('cycle_id', $cycleId);
    }
}
