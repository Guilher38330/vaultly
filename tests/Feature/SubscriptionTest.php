<?php

namespace Tests\Feature;

use App\Http\Requests\SubscriptionRequest;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    // =========================================================================
    // 1. Anti-IDOR & Authentication (Tenant Isolation)
    // =========================================================================

    /**
     * Unauthenticated guest accessing /dashboard gets redirected to /login (302).
     */
    public function test_unauthenticated_guest_accessing_dashboard_is_redirected_to_login(): void
    {
        $response = $this->get('/dashboard');

        $response->assertStatus(302);
        $response->assertRedirect('/login');
    }

    /**
     * Unauthenticated guest submitting store mutation gets redirected to /login (302).
     */
    public function test_unauthenticated_guest_submitting_store_mutation_is_redirected_to_login(): void
    {
        $payload = [
            'name' => 'Netflix',
            'price' => 55.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Streaming',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ];

        $response = $this->post('/subscriptions', $payload);

        $response->assertStatus(302);
        $response->assertRedirect('/login');
        $this->assertDatabaseCount('subscriptions', 0);
    }

    /**
     * Unauthenticated guest submitting update mutation gets redirected to /login (302).
     */
    public function test_unauthenticated_guest_submitting_update_mutation_is_redirected_to_login(): void
    {
        $user = User::factory()->create();
        $subscription = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Original Name',
        ]);

        $response = $this->put("/subscriptions/{$subscription->id}", [
            'name' => 'Hacked Name',
            'price' => 10.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Streaming',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertStatus(302);
        $response->assertRedirect('/login');
        $this->assertSame('Original Name', $subscription->fresh()->name);
    }

    /**
     * Unauthenticated guest submitting delete mutation gets redirected to /login (302).
     */
    public function test_unauthenticated_guest_submitting_delete_mutation_is_redirected_to_login(): void
    {
        $user = User::factory()->create();
        $subscription = Subscription::factory()->create(['user_id' => $user->id]);

        $response = $this->delete("/subscriptions/{$subscription->id}");

        $response->assertStatus(302);
        $response->assertRedirect('/login');
        $this->assertDatabaseHas('subscriptions', ['id' => $subscription->id]);
    }

    /**
     * Unauthenticated guest submitting toggle status mutation gets redirected to /login (302).
     */
    public function test_unauthenticated_guest_submitting_toggle_status_mutation_is_redirected_to_login(): void
    {
        $user = User::factory()->create();
        $subscription = Subscription::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);

        $response = $this->patch("/subscriptions/{$subscription->id}/toggle-status");

        $response->assertStatus(302);
        $response->assertRedirect('/login');
        $this->assertSame('active', $subscription->fresh()->status);
    }

    /**
     * User cannot update another user's subscription (403 Forbidden).
     */
    public function test_user_cannot_update_another_users_subscription(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();

        $subscription = Subscription::factory()->create([
            'user_id' => $owner->id,
            'name' => 'Owner Subscription',
            'price' => 99.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Cloud',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response = $this->actingAs($attacker)->put("/subscriptions/{$subscription->id}", [
            'name' => 'Attacker Hijacked Subscription',
            'price' => 1.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Cloud',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertForbidden();

        $fresh = $subscription->fresh();
        $this->assertSame('Owner Subscription', $fresh->name);
        $this->assertEquals(99.00, (float) $fresh->price);
        $this->assertSame($owner->id, $fresh->user_id);
    }

    /**
     * User cannot delete another user's subscription (403 Forbidden).
     */
    public function test_user_cannot_delete_another_users_subscription(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();

        $subscription = Subscription::factory()->create([
            'user_id' => $owner->id,
            'name' => 'Protected Subscription',
        ]);

        $response = $this->actingAs($attacker)->delete("/subscriptions/{$subscription->id}");

        $response->assertForbidden();
        $this->assertDatabaseHas('subscriptions', [
            'id' => $subscription->id,
            'user_id' => $owner->id,
        ]);
    }

    /**
     * User cannot toggle status of another user's subscription (403 Forbidden).
     */
    public function test_user_cannot_toggle_status_of_another_users_subscription(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();

        $subscription = Subscription::factory()->create([
            'user_id' => $owner->id,
            'status' => 'active',
        ]);

        $response = $this->actingAs($attacker)->patch("/subscriptions/{$subscription->id}/toggle-status");

        $response->assertForbidden();
        $this->assertSame('active', $subscription->fresh()->status);
    }

    /**
     * User dashboard strictly isolates subscriptions and does not leak other users' subscriptions.
     */
    public function test_dashboard_isolates_subscriptions_and_does_not_leak_other_users_data(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        Subscription::factory()->count(2)->create(['user_id' => $userA->id]);
        Subscription::factory()->count(3)->create(['user_id' => $userB->id]);

        $response = $this->actingAs($userA)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('subscriptions', 2)
            ->where('subscriptions.0.id', fn ($id) => in_array($id, $userA->subscriptions->pluck('id')->all()))
            ->where('subscriptions.1.id', fn ($id) => in_array($id, $userA->subscriptions->pluck('id')->all()))
        );
    }

    // =========================================================================
    // 2. Anti-XSS Sanitization & Strict Validation
    // =========================================================================

    /**
     * strip_tags removes <script> and HTML tags from name, category, and notes before storing in database.
     */
    public function test_anti_xss_strip_tags_removes_html_and_script_tags_from_name_and_notes(): void
    {
        $user = User::factory()->create();

        $payload = [
            'name' => '<script>alert("xss")</script>Spotify Premium',
            'price' => 34.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => '<span style="color:red">Music & Audio</span>',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => '<p>Family plan with <b>6 accounts</b></p><img src="x" onerror="steal()"/>',
        ];

        $response = $this->actingAs($user)->post('/subscriptions', $payload);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $subscription = $user->subscriptions()->latest()->first();
        $this->assertNotNull($subscription);

        // Verify HTML/scripts stripped completely
        $this->assertSame('alert("xss")Spotify Premium', $subscription->name);
        $this->assertSame('Music & Audio', $subscription->category);
        $this->assertSame('Family plan with 6 accounts', $subscription->notes);

        $this->assertStringNotContainsString('<script>', $subscription->name);
        $this->assertStringNotContainsString('<span', $subscription->category);
        $this->assertStringNotContainsString('<p>', $subscription->notes);
        $this->assertStringNotContainsString('<b>', $subscription->notes);
        $this->assertStringNotContainsString('<img', $subscription->notes);
    }

    /**
     * Validation rejects negative prices (price = -10.00) with HTTP 422 / session errors.
     */
    public function test_validation_rejects_negative_price(): void
    {
        $user = User::factory()->create();

        // 1. Web session validation error test
        $response = $this->actingAs($user)->post('/subscriptions', [
            'name' => 'Negative Price Service',
            'price' => -10.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Utilities',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertSessionHasErrors(['price']);

        // 2. JSON API validation error test (422)
        $responseJson = $this->actingAs($user)->postJson('/subscriptions', [
            'name' => 'Negative Price Service',
            'price' => -10.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Utilities',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $responseJson->assertStatus(422);
        $responseJson->assertJsonValidationErrors(['price']);
    }

    /**
     * Validation rejects zero price (price = 0.00) with HTTP 422 / session errors.
     */
    public function test_validation_rejects_zero_price(): void
    {
        $user = User::factory()->create();

        // 1. Web session validation error test
        $response = $this->actingAs($user)->post('/subscriptions', [
            'name' => 'Free Service Zero Price',
            'price' => 0.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Utilities',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertSessionHasErrors(['price']);

        // 2. JSON API validation error test (422)
        $responseJson = $this->actingAs($user)->postJson('/subscriptions', [
            'name' => 'Free Service Zero Price',
            'price' => 0.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Utilities',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $responseJson->assertStatus(422);
        $responseJson->assertJsonValidationErrors(['price']);
    }

    /**
     * Validation accepts minimum valid price boundary (0.01).
     */
    public function test_validation_accepts_minimum_valid_price_boundary(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/subscriptions', [
            'name' => 'One Cent Micro Subscription',
            'price' => 0.01,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Test',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();
        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'name' => 'One Cent Micro Subscription',
            'price' => 0.01,
        ]);
    }

    /**
     * Validation rejects unsupported currencies (GBP, JPY, BTC) with HTTP 422.
     */
    public function test_validation_rejects_unsupported_currencies(): void
    {
        $user = User::factory()->create();

        $unsupported = ['GBP', 'JPY', 'BTC', 'CAD', 'AUD', 'CHF', 'CNY'];

        foreach ($unsupported as $currency) {
            $response = $this->actingAs($user)->postJson('/subscriptions', [
                'name' => "Subscription in {$currency}",
                'price' => 20.00,
                'currency' => $currency,
                'billing_cycle' => 'monthly',
                'category' => 'Testing',
                'next_billing_date' => Carbon::tomorrow()->toDateString(),
            ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['currency']);
        }
    }

    /**
     * Validation accepts supported currencies (BRL, USD, EUR).
     */
    public function test_validation_accepts_supported_currencies(): void
    {
        $user = User::factory()->create();

        foreach (['BRL', 'USD', 'EUR'] as $currency) {
            $response = $this->actingAs($user)->post('/subscriptions', [
                'name' => "Subscription in {$currency}",
                'price' => 25.00,
                'currency' => $currency,
                'billing_cycle' => 'monthly',
                'category' => 'Testing',
                'next_billing_date' => Carbon::tomorrow()->toDateString(),
            ]);

            $response->assertSessionHasNoErrors();
            $this->assertDatabaseHas('subscriptions', [
                'user_id' => $user->id,
                'name' => "Subscription in {$currency}",
                'currency' => $currency,
            ]);
        }
    }

    /**
     * Validation rejects invalid billing cycles (weekly, biweekly, daily, quarterly) with HTTP 422.
     */
    public function test_validation_rejects_invalid_billing_cycles(): void
    {
        $user = User::factory()->create();

        $invalidCycles = ['weekly', 'biweekly', 'daily', 'quarterly', 'semiannual', 'custom'];

        foreach ($invalidCycles as $cycle) {
            $response = $this->actingAs($user)->postJson('/subscriptions', [
                'name' => "Cycle Test {$cycle}",
                'price' => 15.00,
                'currency' => 'BRL',
                'billing_cycle' => $cycle,
                'category' => 'Testing',
                'next_billing_date' => Carbon::tomorrow()->toDateString(),
            ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['billing_cycle']);
        }
    }

    /**
     * Validation accepts supported billing cycles (monthly, yearly).
     */
    public function test_validation_accepts_supported_billing_cycles(): void
    {
        $user = User::factory()->create();

        foreach (['monthly', 'yearly'] as $cycle) {
            $response = $this->actingAs($user)->post('/subscriptions', [
                'name' => "Cycle Valid {$cycle}",
                'price' => 15.00,
                'currency' => 'BRL',
                'billing_cycle' => $cycle,
                'category' => 'Testing',
                'next_billing_date' => Carbon::tomorrow()->toDateString(),
            ]);

            $response->assertSessionHasNoErrors();
            $this->assertDatabaseHas('subscriptions', [
                'user_id' => $user->id,
                'name' => "Cycle Valid {$cycle}",
                'billing_cycle' => $cycle,
            ]);
        }
    }

    /**
     * Validation requires required fields (name, price, currency, billing_cycle, category, next_billing_date).
     */
    public function test_validation_requires_all_mandatory_fields(): void
    {
        $user = User::factory()->create();

        // 1. Test via Form Request rules definition directly
        $rules = (new SubscriptionRequest)->rules();
        $validator = Validator::make([], $rules);

        $this->assertTrue($validator->fails());
        $this->assertTrue($validator->errors()->has('name'));
        $this->assertTrue($validator->errors()->has('price'));
        $this->assertTrue($validator->errors()->has('currency'));
        $this->assertTrue($validator->errors()->has('billing_cycle'));
        $this->assertTrue($validator->errors()->has('category'));
        $this->assertTrue($validator->errors()->has('next_billing_date'));

        // 2. Test via HTTP post endpoint
        $response = $this->actingAs($user)->postJson('/subscriptions', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors([
            'name',
            'price',
            'billing_cycle',
            'category',
            'next_billing_date',
        ]);
    }

    /**
     * Validation rejects invalid date formats.
     */
    public function test_validation_rejects_invalid_date_formats(): void
    {
        $user = User::factory()->create();

        $invalidDates = ['not-a-date', 'tomorrow', '2026-13-45', 'invalid'];

        foreach ($invalidDates as $date) {
            $response = $this->actingAs($user)->postJson('/subscriptions', [
                'name' => 'Date Test',
                'price' => 20.00,
                'currency' => 'BRL',
                'billing_cycle' => 'monthly',
                'category' => 'Testing',
                'next_billing_date' => $date,
            ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['next_billing_date']);
        }
    }

    /**
     * Validation enforces maximum string lengths (name <= 255, category <= 100, notes <= 1000).
     */
    public function test_validation_enforces_maximum_string_lengths(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/subscriptions', [
            'name' => str_repeat('A', 256),
            'price' => 20.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => str_repeat('C', 101),
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => str_repeat('N', 1001),
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['name', 'category', 'notes']);
    }

    // =========================================================================
    // 3. Business Logic & Scopes
    // =========================================================================

    /**
     * Proportional calculations: yearly subscription computes monthly_equivalent_price = round(price / 12, 2).
     */
    public function test_proportional_calculation_for_yearly_subscription_computes_monthly_equivalent(): void
    {
        $user = User::factory()->create();

        $subscription = Subscription::factory()->create([
            'user_id' => $user->id,
            'price' => 120.00,
            'billing_cycle' => 'yearly',
        ]);

        // monthly equivalent = round(120.00 / 12, 2) = 10.00
        $this->assertSame(10.00, $subscription->monthly_equivalent_price);
        // yearly equivalent for yearly cycle is the price itself
        $this->assertSame(120.00, $subscription->yearly_equivalent_price);
    }

    /**
     * Proportional calculations: yearly subscription with repeating decimal rounding.
     */
    public function test_proportional_calculation_for_yearly_subscription_with_repeating_decimals(): void
    {
        $user = User::factory()->create();

        // 99.99 / 12 = 8.3325 -> round to 2 decimals is 8.33
        $sub1 = Subscription::factory()->create([
            'user_id' => $user->id,
            'price' => 99.99,
            'billing_cycle' => 'yearly',
        ]);
        $this->assertSame(8.33, $sub1->monthly_equivalent_price);

        // 55.55 / 12 = 4.62916... -> round to 2 decimals is 4.63
        $sub2 = Subscription::factory()->create([
            'user_id' => $user->id,
            'price' => 55.55,
            'billing_cycle' => 'yearly',
        ]);
        $this->assertSame(4.63, $sub2->monthly_equivalent_price);
    }

    /**
     * Proportional calculations: monthly subscription computes yearly_equivalent_price = round(price * 12, 2).
     */
    public function test_proportional_calculation_for_monthly_subscription_computes_yearly_equivalent(): void
    {
        $user = User::factory()->create();

        $subscription = Subscription::factory()->create([
            'user_id' => $user->id,
            'price' => 29.90,
            'billing_cycle' => 'monthly',
        ]);

        // monthly equivalent for monthly cycle is the price itself
        $this->assertSame(29.90, $subscription->monthly_equivalent_price);
        // yearly equivalent = round(29.90 * 12, 2) = 358.80
        $this->assertSame(358.80, $subscription->yearly_equivalent_price);
    }

    /**
     * Paused subscriptions are strictly excluded from projected currency totals on Dashboard.
     */
    public function test_paused_subscriptions_are_strictly_excluded_from_dashboard_projected_totals(): void
    {
        $user = User::factory()->create();

        // Active subscriptions: BRL 100.00 monthly
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Active BRL Subscription',
            'price' => 100.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(2)->toDateString(),
        ]);

        // Paused subscription: BRL 500.00 monthly (MUST BE EXCLUDED)
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Paused BRL Subscription',
            'price' => 500.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'status' => 'paused',
            'next_billing_date' => Carbon::today()->toDateString(), // Even if due today!
        ]);

        // Paused subscription: USD 250.00 monthly (MUST BE EXCLUDED)
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Paused USD Subscription',
            'price' => 250.00,
            'currency' => 'USD',
            'billing_cycle' => 'monthly',
            'status' => 'paused',
            'next_billing_date' => Carbon::today()->addDays(1)->toDateString(),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('subscriptions', 3)
            ->where('metrics.active_count', 1)
            ->where('metrics.paused_count', 2)
            ->where('metrics.totals.BRL', fn ($val) => (float) $val === 100.0)
            ->where('metrics.totals.USD', fn ($val) => (float) $val === 0.0)
            ->where('metrics.totals.EUR', fn ($val) => (float) $val === 0.0)
            ->where('metrics.yearly_totals.BRL', fn ($val) => (float) $val === 1200.0)
            ->where('metrics.yearly_totals.USD', fn ($val) => (float) $val === 0.0)
            ->where('metrics.due_soon_count', 1) // Only active within 7 days
            ->has('due_soon', 1)
        );
    }

    /**
     * scopeDueSoon accurately includes bills due in 0 to 7 days.
     */
    public function test_scope_due_soon_accurately_includes_bills_due_within_zero_to_seven_days(): void
    {
        $user = User::factory()->create();

        // Due today (0 days) -> Included
        $dueToday = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Due Today',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->toDateString(),
        ]);

        // Due in 3 days -> Included
        $dueIn3Days = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Due in 3 Days',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(3)->toDateString(),
        ]);

        // Due in 7 days (exact threshold boundary) -> Included
        $dueIn7Days = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Due in 7 Days',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(7)->toDateString(),
        ]);

        $dueSoonIds = $user->subscriptions()->active()->dueSoon(7)->pluck('id')->all();

        $this->assertContains($dueToday->id, $dueSoonIds);
        $this->assertContains($dueIn3Days->id, $dueSoonIds);
        $this->assertContains($dueIn7Days->id, $dueSoonIds);
        $this->assertCount(3, $dueSoonIds);
    }

    /**
     * scopeDueSoon accurately excludes bills due in 8+ days or overdue.
     */
    public function test_scope_due_soon_excludes_bills_due_eight_plus_days_or_overdue(): void
    {
        $user = User::factory()->create();

        // Due yesterday (-1 days / overdue) -> Excluded
        $overdue = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Overdue Bill',
            'status' => 'active',
            'next_billing_date' => Carbon::yesterday()->toDateString(),
        ]);

        // Due 15 days ago -> Excluded
        $longOverdue = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Long Overdue Bill',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->subDays(15)->toDateString(),
        ]);

        // Due in 8 days (boundary + 1) -> Excluded
        $dueIn8Days = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Due in 8 Days',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(8)->toDateString(),
        ]);

        // Due in 30 days -> Excluded
        $dueIn30Days = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Due in 30 Days',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(30)->toDateString(),
        ]);

        $dueSoonIds = $user->subscriptions()->active()->dueSoon(7)->pluck('id')->all();

        $this->assertNotContains($overdue->id, $dueSoonIds);
        $this->assertNotContains($longOverdue->id, $dueSoonIds);
        $this->assertNotContains($dueIn8Days->id, $dueSoonIds);
        $this->assertNotContains($dueIn30Days->id, $dueSoonIds);
        $this->assertCount(0, $dueSoonIds);
    }

    /**
     * Multi-currency totals: verifies separate totals for BRL, USD, and EUR.
     */
    public function test_multi_currency_totals_aggregates_separately_for_brl_usd_and_eur(): void
    {
        $user = User::factory()->create();

        // BRL:
        // Monthly 50.00 -> monthly eq: 50.00, yearly eq: 600.00
        // Yearly 120.00 -> monthly eq: 10.00, yearly eq: 120.00
        // Total BRL monthly: 60.00, yearly: 720.00
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'BRL Monthly Plan',
            'price' => 50.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'status' => 'active',
        ]);
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'BRL Yearly Plan',
            'price' => 120.00,
            'currency' => 'BRL',
            'billing_cycle' => 'yearly',
            'status' => 'active',
        ]);

        // USD:
        // Monthly 25.00 -> monthly eq: 25.00, yearly eq: 300.00
        // Total USD monthly: 25.00, yearly: 300.00
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'USD Monthly Plan',
            'price' => 25.00,
            'currency' => 'USD',
            'billing_cycle' => 'monthly',
            'status' => 'active',
        ]);

        // EUR:
        // Yearly 12.00 -> monthly eq: 1.00, yearly eq: 12.00
        // Total EUR monthly: 1.00, yearly: 12.00
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'EUR Yearly Plan',
            'price' => 12.00,
            'currency' => 'EUR',
            'billing_cycle' => 'yearly',
            'status' => 'active',
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('metrics.totals.BRL', fn ($val) => (float) $val === 60.0)
            ->where('metrics.totals.USD', fn ($val) => (float) $val === 25.0)
            ->where('metrics.totals.EUR', fn ($val) => (float) $val === 1.0)
            ->where('metrics.yearly_totals.BRL', fn ($val) => (float) $val === 720.0)
            ->where('metrics.yearly_totals.USD', fn ($val) => (float) $val === 300.0)
            ->where('metrics.yearly_totals.EUR', fn ($val) => (float) $val === 12.0)
        );
    }

    // =========================================================================
    // 4. CRUD Actions & Flow & Inertia Rendering
    // =========================================================================

    /**
     * Authenticated user can create subscription via POST /subscriptions and it is saved under their user_id.
     */
    public function test_authenticated_user_can_create_subscription_and_it_is_saved_under_their_id(): void
    {
        $user = User::factory()->create();

        $payload = [
            'name' => 'GitHub Copilot',
            'price' => 10.00,
            'currency' => 'USD',
            'billing_cycle' => 'monthly',
            'category' => 'Developer Tools',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => 'AI Coding Assistant',
        ];

        $response = $this->actingAs($user)->post('/subscriptions', $payload);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');
        $response->assertRedirect();

        $this->assertDatabaseHas('subscriptions', [
            'user_id' => $user->id,
            'name' => 'GitHub Copilot',
            'price' => 10.00,
            'currency' => 'USD',
            'billing_cycle' => 'monthly',
            'category' => 'Developer Tools',
            'status' => 'active',
            'notes' => 'AI Coding Assistant',
        ]);
    }

    /**
     * Authenticated user can update their subscription via PUT /subscriptions/{id}.
     */
    public function test_authenticated_user_can_update_their_own_subscription(): void
    {
        $user = User::factory()->create();

        $subscription = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Old Plan',
            'price' => 19.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Entertainment',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => 'Old notes',
        ]);

        $updatePayload = [
            'name' => 'Upgraded Plan 4K',
            'price' => 45.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Entertainment',
            'next_billing_date' => Carbon::today()->addDays(15)->toDateString(),
            'notes' => 'Upgraded to 4K tier',
        ];

        $response = $this->actingAs($user)->put("/subscriptions/{$subscription->id}", $updatePayload);

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');
        $response->assertRedirect();

        $subscription->refresh();
        $this->assertSame('Upgraded Plan 4K', $subscription->name);
        $this->assertEquals(45.90, (float) $subscription->price);
        $this->assertSame('Upgraded to 4K tier', $subscription->notes);
    }

    /**
     * Authenticated user can toggle status between active and paused via PATCH /subscriptions/{id}/toggle-status.
     */
    public function test_authenticated_user_can_toggle_status_between_active_and_paused(): void
    {
        $user = User::factory()->create();

        $subscription = Subscription::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);

        // 1st toggle: active -> paused
        $response1 = $this->actingAs($user)->patch("/subscriptions/{$subscription->id}/toggle-status");
        $response1->assertSessionHasNoErrors();
        $response1->assertSessionHas('success');
        $response1->assertRedirect();

        $this->assertSame('paused', $subscription->fresh()->status);

        // 2nd toggle: paused -> active
        $response2 = $this->actingAs($user)->patch("/subscriptions/{$subscription->id}/toggle-status");
        $response2->assertSessionHasNoErrors();
        $response2->assertSessionHas('success');
        $response2->assertRedirect();

        $this->assertSame('active', $subscription->fresh()->status);
    }

    /**
     * Authenticated user can delete their subscription via DELETE /subscriptions/{id}.
     */
    public function test_authenticated_user_can_delete_their_own_subscription(): void
    {
        $user = User::factory()->create();

        $subscription = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'To Be Deleted',
        ]);

        $response = $this->actingAs($user)->delete("/subscriptions/{$subscription->id}");

        $response->assertSessionHasNoErrors();
        $response->assertSessionHas('success');
        $response->assertRedirect();

        $this->assertModelMissing($subscription);
    }

    /**
     * GET /dashboard renders Inertia component Dashboard with valid subscriptions, metrics, due_soon, and categories props.
     */
    public function test_dashboard_renders_inertia_component_with_expected_props_and_safe_resource_shape(): void
    {
        $user = User::factory()->create();

        // Create 2 active subscriptions and 1 paused subscription
        $sub1 = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Figma Pro',
            'price' => 15.00,
            'currency' => 'USD',
            'billing_cycle' => 'monthly',
            'category' => 'Design',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(2)->toDateString(),
            'notes' => 'Design tools',
        ]);

        $sub2 = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Notion Plus',
            'price' => 120.00,
            'currency' => 'USD',
            'billing_cycle' => 'yearly',
            'category' => 'Productivity',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(20)->toDateString(),
        ]);

        $sub3 = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Paused Streaming',
            'price' => 30.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Streaming',
            'status' => 'paused',
            'next_billing_date' => Carbon::today()->addDays(5)->toDateString(),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('subscriptions', 3)
            ->has('subscriptions.0', fn (Assert $item) => $item
                ->hasAll([
                    'id',
                    'name',
                    'price',
                    'currency',
                    'billing_cycle',
                    'category',
                    'next_billing_date',
                    'status',
                    'notes',
                    'monthly_equivalent_price',
                    'yearly_equivalent_price',
                    'is_due_soon',
                    'days_until_due',
                ])
                ->missing('user_id')
                ->missing('password')
                ->missing('email')
                ->etc()
            )
            ->has('metrics', fn (Assert $metrics) => $metrics
                ->has('totals')
                ->has('yearly_totals')
                ->where('active_count', 2)
                ->where('paused_count', 1)
                ->where('due_soon_count', 1)
                ->etc()
            )
            ->has('due_soon', 1)
            ->where('due_soon.0.id', $sub1->id)
            ->has('categories', 3)
            ->where('categories', fn ($cats) => $cats->contains('Design') && $cats->contains('Productivity') && $cats->contains('Streaming'))
        );
    }

    /**
     * Dashboard with zero subscriptions renders clean empty state and zeroed metrics.
     */
    public function test_dashboard_with_zero_subscriptions_renders_clean_empty_state_and_zeroed_metrics(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('subscriptions', 0)
            ->where('metrics.active_count', 0)
            ->where('metrics.paused_count', 0)
            ->where('metrics.due_soon_count', 0)
            ->where('metrics.totals.BRL', fn ($val) => (float) $val === 0.0)
            ->where('metrics.totals.USD', fn ($val) => (float) $val === 0.0)
            ->where('metrics.totals.EUR', fn ($val) => (float) $val === 0.0)
            ->has('due_soon', 0)
            ->has('categories', 0)
        );
    }
}
