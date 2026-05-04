<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFedexInvoiceRequest extends FormRequest
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
        $invoiceId = $this->route('invoice')?->id ?? $this->route('invoice');
        // works for route model binding OR id

        return [
            'invoice_number' => [
                'required',
                'string',
                'max:255',
                'unique:fedex_invoices,invoice_number,' . $invoiceId
            ],
            'status' => ['nullable', 'string', 'max:50'],
            'invoice_date' => ['nullable', 'date'],
            'due_date' => ['nullable', 'date'],
            'due_date_text' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
            'payment_status' => ['nullable','in:Paid,Unpaid'],
            'payment_reference' => ['nullable', 'string', 'max:255'],
        ];
    }
}
