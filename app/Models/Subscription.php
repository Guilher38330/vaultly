<?php

namespace App\Models;

use Carbon\Carbon;
use Database\Factories\SubscriptionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'name',
    'price',
    'currency',
    'billing_cycle',
    'category',
    'next_billing_date',
    'status',
    'notes',
])]
class Subscription extends Model
{
    /** @use HasFactory<SubscriptionFactory> */
    use HasFactory;

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'monthly_equivalent_price',
        'yearly_equivalent_price',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'next_billing_date' => 'date',
        ];
    }

    /**
     * Get the user that owns the subscription.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope a query to only include active subscriptions.
     *
     * @param  Builder<Subscription>  $query
     * @return Builder<Subscription>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope a query to only include subscriptions due soon.
     *
     * @param  Builder<Subscription>  $query
     * @return Builder<Subscription>
     */
    public function scopeDueSoon(Builder $query, int $days = 7): Builder
    {
        return $query->whereBetween('next_billing_date', [
            Carbon::today()->toDateString(),
            Carbon::today()->addDays($days)->toDateString(),
        ]);
    }

    /**
     * Get the monthly equivalent price for this subscription.
     */
    public function getMonthlyEquivalentPriceAttribute(): float
    {
        $price = (float) $this->price;

        if ($this->billing_cycle === 'yearly') {
            return round($price / 12, 2);
        }

        return $price;
    }

    /**
     * Get the yearly equivalent price for this subscription.
     */
    public function getYearlyEquivalentPriceAttribute(): float
    {
        $price = (float) $this->price;

        if ($this->billing_cycle === 'monthly') {
            return round($price * 12, 2);
        }

        return $price;
    }
}
