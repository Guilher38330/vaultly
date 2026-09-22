<?php

namespace App\Http\Resources;

use App\Models\Subscription;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Subscription
 */
class SubscriptionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $today = Carbon::today();
        $nextBillingDate = $this->next_billing_date
            ? Carbon::parse($this->next_billing_date)->startOfDay()
            : null;

        $daysUntilDue = $nextBillingDate
            ? (int) $today->diffInDays($nextBillingDate, false)
            : 0;

        $isDueSoon = $this->status === 'active'
            && $nextBillingDate !== null
            && $daysUntilDue >= 0
            && $daysUntilDue <= 7;

        return [
            'id' => (int) $this->id,
            'name' => (string) $this->name,
            'price' => (float) $this->price,
            'currency' => (string) $this->currency,
            'billing_cycle' => (string) $this->billing_cycle,
            'category' => (string) $this->category,
            'next_billing_date' => $nextBillingDate ? $nextBillingDate->format('Y-m-d') : null,
            'status' => (string) $this->status,
            'notes' => $this->notes !== null ? (string) $this->notes : null,
            'monthly_equivalent_price' => (float) $this->monthly_equivalent_price,
            'yearly_equivalent_price' => (float) $this->yearly_equivalent_price,
            'is_due_soon' => $isDueSoon,
            'days_until_due' => $daysUntilDue,
        ];
    }
}
