<?php

namespace App\Models\Investment;

use Illuminate\Database\Eloquent\Model;

class BeneficiaryAttachment extends Model
{
    protected $fillable = ['entry_id','type','original_name','path','mime','size'];

    public function entry()
    {
        return $this->belongsTo(BeneficiaryEntry::class, 'entry_id');
    }
}
