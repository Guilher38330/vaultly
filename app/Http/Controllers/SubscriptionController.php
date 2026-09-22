<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubscriptionRequest;
use App\Http\Resources\SubscriptionResource;
use App\Models\Subscription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    /**
     * Display a listing of subscriptions with metrics and due soon renewals.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        $subscriptions = $user->subscriptions()
            ->orderBy('next_billing_date')
            ->get();

        $totals = [
            'BRL' => 0.0,
            'USD' => 0.0,
            'EUR' => 0.0,
        ];

        $yearlyTotals = [
            'BRL' => 0.0,
            'USD' => 0.0,
            'EUR' => 0.0,
        ];

        foreach ($subscriptions as $subscription) {
            if ($subscription->status === 'active') {
                $currency = $subscription->currency;

                if (! array_key_exists($currency, $totals)) {
                    $totals[$currency] = 0.0;
                    $yearlyTotals[$currency] = 0.0;
                }

                $totals[$currency] = round($totals[$currency] + $subscription->monthly_equivalent_price, 2);
                $yearlyTotals[$currency] = round($yearlyTotals[$currency] + $subscription->yearly_equivalent_price, 2);
            }
        }

        $activeCount = $subscriptions->where('status', 'active')->count();
        $pausedCount = $subscriptions->where('status', 'paused')->count();

        $dueSoon = $user->subscriptions()
            ->active()
            ->dueSoon(7)
            ->orderBy('next_billing_date')
            ->get();

        $categories = $subscriptions->pluck('category')
            ->unique()
            ->filter()
            ->values()
            ->all();

        return Inertia::render('Dashboard', [
            'subscriptions' => SubscriptionResource::collection($subscriptions),
            'metrics' => [
                'totals' => $totals,
                'yearly_totals' => $yearlyTotals,
                'active_count' => $activeCount,
                'paused_count' => $pausedCount,
                'due_soon_count' => $dueSoon->count(),
            ],
            'due_soon' => SubscriptionResource::collection($dueSoon),
            'categories' => $categories,
        ]);
    }

    /**
     * Store a newly created subscription in storage.
     */
    public function store(SubscriptionRequest $request): RedirectResponse
    {
        $request->user()->subscriptions()->create($request->validated());

        return back()->with('success', 'Assinatura criada com sucesso.');
    }

    /**
     * Update the specified subscription in storage.
     */
    public function update(SubscriptionRequest $request, Subscription $subscription): RedirectResponse
    {
        Gate::authorize('update', $subscription);

        $subscription->update($request->validated());

        return back()->with('success', 'Assinatura atualizada com sucesso.');
    }

    /**
     * Remove the specified subscription from storage.
     */
    public function destroy(Request $request, Subscription $subscription): RedirectResponse
    {
        Gate::authorize('delete', $subscription);

        $subscription->delete();

        return back()->with('success', 'Assinatura excluída com sucesso.');
    }

    /**
     * Toggle the status of the specified subscription between active and paused.
     */
    public function toggleStatus(Request $request, Subscription $subscription): RedirectResponse
    {
        Gate::authorize('update', $subscription);

        $subscription->status = $subscription->status === 'active' ? 'paused' : 'active';
        $subscription->save();

        return back()->with('success', 'Status da assinatura alterado com sucesso.');
    }
}
