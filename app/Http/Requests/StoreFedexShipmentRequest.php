<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFedexShipmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'shipment_id' => 'required|numeric',
            'origin' => 'nullable|string|max:10',
            'destination' => 'nullable|string|max:50',
            'ship_date' => 'nullable|date',
            'service' => 'nullable|string',
            'pcs' => 'nullable|integer',
            'weight' => 'nullable|numeric',
            'billed_weight' => 'nullable|numeric',
            'subtotal_amount' => 'nullable|numeric',
            'amount_per_kg' => 'nullable|numeric',
            'diff' => 'nullable|numeric',
            'shipping_status' => 'nullable|string',
            'signed_for_by' => 'nullable|string',
            'actual_delivery_at' => 'nullable|date',
            'paid_by_customer' => 'nullable|string',
            'payment_status' => 'nullable|string',
            'duties_taxes_bill_to' => 'nullable|string',
            'remarks' => 'nullable|string',
            'history' => 'nullable|array',
            'history.note' => 'nullable|string',
        ];
    }
}
