<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SubscriptionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('name') && is_string($this->name)) {
            $merge['name'] = trim(strip_tags($this->name));
        }

        if ($this->has('category') && is_string($this->category)) {
            $merge['category'] = trim(strip_tags($this->category));
        }

        if ($this->has('notes') && is_string($this->notes)) {
            $merge['notes'] = trim(strip_tags($this->notes));
        }

        if (! $this->filled('currency')) {
            $merge['currency'] = 'BRL';
        }

        if (! $this->filled('status')) {
            $merge['status'] = 'active';
        }

        if ($merge !== []) {
            $this->merge($merge);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['required', 'string', Rule::in(['BRL', 'USD', 'EUR'])],
            'billing_cycle' => ['required', 'string', Rule::in(['monthly', 'yearly'])],
            'category' => ['required', 'string', 'max:100'],
            'next_billing_date' => ['required', 'date'],
            'status' => ['sometimes', 'string', Rule::in(['active', 'paused'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
