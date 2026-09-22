<?php

namespace Tests\Feature;

use App\Http\Requests\SubscriptionRequest;
use App\Http\Resources\SubscriptionResource;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubscriptionEmpiricalChallengeTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test Anti-XSS: HTML tags are stripped from name, category, and notes.
     */
    public function test_anti_xss_tags_are_stripped_from_input(): void
    {
        $user = User::factory()->create();

        $payload = [
            'name' => '<script>alert("xss")</script>Netflix',
            'category' => '<b onclick=evil()>bold</b>',
            'notes' => '<img src=x onerror=alert(1)>Important notes<a href="#">click</a>',
            'price' => 39.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'status' => 'active',
        ];

        // 1. Test directly through SubscriptionRequest prepareForValidation
        $request = SubscriptionRequest::create('/subscriptions', 'POST', $payload);
        $request->setUserResolver(fn () => $user);
        $request->setContainer(app());
        $request->validateResolved();

        $validated = $request->validated();
        $this->assertSame('alert("xss")Netflix', $validated['name']);
        $this->assertSame('bold', $validated['category']);
        $this->assertSame('Important notesclick', $validated['notes']);

        // 2. Test through actual HTTP POST request to endpoint
        $response = $this->actingAs($user)->post('/subscriptions', $payload);
        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $subscription = $user->subscriptions()->latest()->first();
        $this->assertNotNull($subscription);
        $this->assertSame('alert("xss")Netflix', $subscription->name);
        $this->assertSame('bold', $subscription->category);
        $this->assertSame('Important notesclick', $subscription->notes);
        $this->assertStringNotContainsString('<script>', $subscription->name);
        $this->assertStringNotContainsString('<b', $subscription->category);
        $this->assertStringNotContainsString('<img', $subscription->notes);
    }

    /**
     * Test validation rejects negative prices and zero prices.
     */
    public function test_validation_rejects_negative_and_zero_prices(): void
    {
        $user = User::factory()->create();

        // Test negative price
        $responseNegative = $this->actingAs($user)->postJson('/subscriptions', [
            'name' => 'Spotify',
            'price' => -10.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Music',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);
        $responseNegative->assertStatus(422);
        $responseNegative->assertJsonValidationErrors(['price']);

        // Test zero price
        $responseZero = $this->actingAs($user)->postJson('/subscriptions', [
            'name' => 'Spotify',
            'price' => 0.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Music',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);
        $responseZero->assertStatus(422);
        $responseZero->assertJsonValidationErrors(['price']);

        // Test valid minimum price (0.01)
        $responseValidMin = $this->actingAs($user)->post('/subscriptions', [
            'name' => 'Spotify Free Tier with 1 cent fee',
            'price' => 0.01,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Music',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);
        $responseValidMin->assertSessionHasNoErrors();
    }

    /**
     * Test validation rejects unsupported currencies like GBP and JPY.
     */
    public function test_validation_rejects_unsupported_currencies(): void
    {
        $user = User::factory()->create();

        $invalidCurrencies = ['GBP', 'JPY', 'CAD', 'AUD', 'BTC', 'INVALID'];

        foreach ($invalidCurrencies as $currency) {
            $response = $this->actingAs($user)->postJson('/subscriptions', [
                'name' => "Subscription in {$currency}",
                'price' => 15.00,
                'currency' => $currency,
                'billing_cycle' => 'monthly',
                'category' => 'Software',
                'next_billing_date' => Carbon::tomorrow()->toDateString(),
            ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['currency']);
        }

        // Supported currencies: BRL, USD, EUR
        foreach (['BRL', 'USD', 'EUR'] as $validCurrency) {
            $validResponse = $this->actingAs($user)->postJson('/subscriptions', [
                'name' => "Subscription in {$validCurrency}",
                'price' => 25.00,
                'currency' => $validCurrency,
                'billing_cycle' => 'monthly',
                'category' => 'Software',
                'next_billing_date' => Carbon::tomorrow()->toDateString(),
            ]);

            $validResponse->assertStatus(302);
        }
    }

    /**
     * Test SubscriptionResource output shape: whitelisted safe keys, no user_id or internal tokens.
     */
    public function test_subscription_resource_shape_and_leak_prevention(): void
    {
        $user = User::factory()->create();
        $subscription = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Prime Video',
            'price' => 19.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Streaming',
            'next_billing_date' => Carbon::today()->addDays(3)->toDateString(),
            'status' => 'active',
            'notes' => 'Annual discount considered',
        ]);

        $resource = SubscriptionResource::make($subscription)->resolve();

        // 1. Verify exact whitelisted keys
        $expectedKeys = [
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
        ];

        $actualKeys = array_keys($resource);
        sort($expectedKeys);
        sort($actualKeys);

        $this->assertSame($expectedKeys, $actualKeys, 'Resource output shape does not match expected whitelisted attributes.');

        // 2. Explicitly verify NO internal columns or sensitive attributes leak
        $forbiddenKeys = [
            'user_id',
            'user',
            'created_at',
            'updated_at',
            'remember_token',
            'password',
            'email',
            'two_factor_secret',
            'two_factor_recovery_codes',
        ];

        foreach ($forbiddenKeys as $forbiddenKey) {
            $this->assertArrayNotHasKey($forbiddenKey, $resource, "Resource leaks forbidden key: {$forbiddenKey}");
        }

        // 3. Verify types and due soon calculation
        $this->assertIsInt($resource['id']);
        $this->assertSame('Prime Video', $resource['name']);
        $this->assertSame(19.90, $resource['price']);
        $this->assertSame('BRL', $resource['currency']);
        $this->assertSame(19.90, $resource['monthly_equivalent_price']);
        $this->assertSame(238.80, $resource['yearly_equivalent_price']);
        $this->assertTrue($resource['is_due_soon']);
        $this->assertSame(3, $resource['days_until_due']);
    }

    /**
     * Test metrics calculation when user has multiple currencies (BRL, USD, EUR) and active vs paused items.
     * Paused items MUST be excluded from totals.
     */
    public function test_metrics_multi_currency_and_paused_items_exclusion(): void
    {
        $user = User::factory()->create();

        // Active BRL monthly: 50.00 (monthly: 50.00, yearly: 600.00)
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Active BRL Monthly',
            'price' => 50.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(5)->toDateString(),
        ]);

        // Active BRL yearly: 120.00 (monthly: 10.00, yearly: 120.00)
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Active BRL Yearly',
            'price' => 120.00,
            'currency' => 'BRL',
            'billing_cycle' => 'yearly',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(20)->toDateString(),
        ]);

        // Paused BRL monthly: 99.00 -> MUST BE EXCLUDED FROM TOTALS
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Paused BRL Monthly',
            'price' => 99.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'status' => 'paused',
            'next_billing_date' => Carbon::today()->addDays(2)->toDateString(),
        ]);

        // Active USD monthly: 20.00 (monthly: 20.00, yearly: 240.00)
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Active USD Monthly',
            'price' => 20.00,
            'currency' => 'USD',
            'billing_cycle' => 'monthly',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(4)->toDateString(),
        ]);

        // Paused USD yearly: 500.00 -> MUST BE EXCLUDED FROM TOTALS
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Paused USD Yearly',
            'price' => 500.00,
            'currency' => 'USD',
            'billing_cycle' => 'yearly',
            'status' => 'paused',
            'next_billing_date' => Carbon::today()->addDays(1)->toDateString(),
        ]);

        // Active EUR yearly: 60.00 (monthly: 5.00, yearly: 60.00)
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Active EUR Yearly',
            'price' => 60.00,
            'currency' => 'EUR',
            'billing_cycle' => 'yearly',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(15)->toDateString(),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');
        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('subscriptions', 6)
            ->where('metrics.active_count', 4)
            ->where('metrics.paused_count', 2)
            ->where('metrics.totals.BRL', fn ($val) => (float) $val === 60.0)
            ->where('metrics.totals.USD', fn ($val) => (float) $val === 20.0)
            ->where('metrics.totals.EUR', fn ($val) => (float) $val === 5.0)
            ->where('metrics.yearly_totals.BRL', fn ($val) => (float) $val === 720.0)
            ->where('metrics.yearly_totals.USD', fn ($val) => (float) $val === 240.0)
            ->where('metrics.yearly_totals.EUR', fn ($val) => (float) $val === 60.0)
            ->where('metrics.due_soon_count', 2) // Active items within 7 days: BRL monthly (5 days) + USD monthly (4 days)
            ->has('due_soon', 2)
        );
    }

    /**
     * Test Anti-IDOR: Users cannot view, update, delete or toggle subscriptions of other users.
     */
    public function test_anti_idor_cross_user_isolation(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $subA = Subscription::factory()->create([
            'user_id' => $userA->id,
            'name' => 'Secret Subscription of User A',
            'price' => 100.00,
            'currency' => 'BRL',
            'status' => 'active',
        ]);

        // User B tries to update User A's subscription
        $updateResponse = $this->actingAs($userB)->put("/subscriptions/{$subA->id}", [
            'name' => 'Hacked Subscription',
            'price' => 1.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Hacked',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);
        $updateResponse->assertForbidden();

        // User B tries to delete User A's subscription
        $deleteResponse = $this->actingAs($userB)->delete("/subscriptions/{$subA->id}");
        $deleteResponse->assertForbidden();

        // User B tries to toggle status of User A's subscription
        $toggleResponse = $this->actingAs($userB)->patch("/subscriptions/{$subA->id}/toggle-status");
        $toggleResponse->assertForbidden();

        // Ensure database remains untampered
        $subA->refresh();
        $this->assertSame('Secret Subscription of User A', $subA->name);
        $this->assertSame('active', $subA->status);
    }

    /**
     * Test status toggle action properly toggles active <-> paused.
     */
    public function test_toggle_status_action_successfully_toggles_state(): void
    {
        $user = User::factory()->create();
        $sub = Subscription::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);

        // 1st toggle: active -> paused
        $toggle1 = $this->actingAs($user)->patch("/subscriptions/{$sub->id}/toggle-status");
        $toggle1->assertRedirect();
        $sub->refresh();
        $this->assertSame('paused', $sub->status);

        // 2nd toggle: paused -> active
        $toggle2 = $this->actingAs($user)->patch("/subscriptions/{$sub->id}/toggle-status");
        $toggle2->assertRedirect();
        $sub->refresh();
        $this->assertSame('active', $sub->status);
    }

    /**
     * Adversarial Test: Diverse XSS payloads and attribute injection.
     */
    public function test_adversarial_xss_vectors_and_attribute_injection(): void
    {
        $user = User::factory()->create();

        $payload = [
            'name' => '<svg/onload=alert(\'XSS\')>Netflix Pro',
            'price' => 55.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => '<iframe src="javascript:alert(1)">Cinema</iframe>',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => '"><script>document.cookie</script>Confidential Notes',
        ];

        $response = $this->actingAs($user)->post('/subscriptions', $payload);
        $response->assertSessionHasNoErrors();

        $saved = $user->subscriptions()->latest()->first();
        $this->assertSame('Netflix Pro', $saved->name);
        $this->assertSame('Cinema', $saved->category);
        $this->assertSame('">document.cookieConfidential Notes', $saved->notes);
        $this->assertStringNotContainsString('<svg', $saved->name);
        $this->assertStringNotContainsString('<iframe', $saved->category);
        $this->assertStringNotContainsString('<script>', $saved->notes);
    }

    /**
     * Adversarial Test: Invalid billing cycles are rejected.
     */
    public function test_invalid_billing_cycles_are_rejected(): void
    {
        $user = User::factory()->create();

        $invalidCycles = ['daily', 'weekly', 'biweekly', 'quarterly', 'biennial', 'lifetime'];

        foreach ($invalidCycles as $cycle) {
            $response = $this->actingAs($user)->postJson('/subscriptions', [
                'name' => 'Cycle Test',
                'price' => 10.00,
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
     * Adversarial Test: Invalid date formats are rejected.
     */
    public function test_invalid_date_formats_are_rejected(): void
    {
        $user = User::factory()->create();

        $invalidDates = ['not-a-date', 'tomorrow', '2026/99/99', '2026-02-31', ''];

        foreach ($invalidDates as $date) {
            $response = $this->actingAs($user)->postJson('/subscriptions', [
                'name' => 'Date Test',
                'price' => 10.00,
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
     * Adversarial Test: User with 0 subscriptions gets zeroed metrics and clean arrays.
     */
    public function test_empty_subscriptions_returns_zeroed_metrics_and_empty_categories(): void
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
            ->where('metrics.yearly_totals.BRL', fn ($val) => (float) $val === 0.0)
            ->where('metrics.yearly_totals.USD', fn ($val) => (float) $val === 0.0)
            ->where('metrics.yearly_totals.EUR', fn ($val) => (float) $val === 0.0)
            ->has('due_soon', 0)
            ->has('categories', 0)
        );
    }

    /**
     * Adversarial Test: Paused subscriptions NEVER count towards totals or due_soon even if due today.
     */
    public function test_paused_subscriptions_never_appear_in_due_soon_or_totals(): void
    {
        $user = User::factory()->create();

        // Paused subscription whose next_billing_date is today
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Paused Due Today',
            'price' => 500.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'status' => 'paused',
            'next_billing_date' => Carbon::today()->toDateString(),
        ]);

        // Paused subscription whose next_billing_date is in 2 days
        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Paused Due in 2 Days',
            'price' => 300.00,
            'currency' => 'USD',
            'billing_cycle' => 'monthly',
            'status' => 'paused',
            'next_billing_date' => Carbon::today()->addDays(2)->toDateString(),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');
        $response->assertOk();

        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('subscriptions', 2)
            ->where('metrics.active_count', 0)
            ->where('metrics.paused_count', 2)
            ->where('metrics.due_soon_count', 0)
            ->where('metrics.totals.BRL', fn ($val) => (float) $val === 0.0)
            ->where('metrics.totals.USD', fn ($val) => (float) $val === 0.0)
            ->where('metrics.totals.EUR', fn ($val) => (float) $val === 0.0)
            ->has('due_soon', 0)
        );
    }

    /**
     * Adversarial Test: Due soon exact boundaries (-1 day past, 0 days today, 7 days threshold, 8 days future).
     */
    public function test_due_soon_exact_boundary_conditions(): void
    {
        $user = User::factory()->create();

        // 1. Past: -1 day (yesterday) -> NOT due soon
        $pastSub = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Past Due Date',
            'status' => 'active',
            'next_billing_date' => Carbon::yesterday()->toDateString(),
        ]);
        $resourcePast = SubscriptionResource::make($pastSub)->resolve();
        $this->assertFalse($resourcePast['is_due_soon']);
        $this->assertLessThan(0, $resourcePast['days_until_due']);

        // 2. Today: 0 days -> IS due soon
        $todaySub = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Today Due Date',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->toDateString(),
        ]);
        $resourceToday = SubscriptionResource::make($todaySub)->resolve();
        $this->assertTrue($resourceToday['is_due_soon']);
        $this->assertSame(0, $resourceToday['days_until_due']);

        // 3. Exactly 7 days: -> IS due soon
        $day7Sub = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => '7 Days Due Date',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(7)->toDateString(),
        ]);
        $resourceDay7 = SubscriptionResource::make($day7Sub)->resolve();
        $this->assertTrue($resourceDay7['is_due_soon']);
        $this->assertSame(7, $resourceDay7['days_until_due']);

        // 4. Exactly 8 days: -> NOT due soon
        $day8Sub = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => '8 Days Due Date',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(8)->toDateString(),
        ]);
        $resourceDay8 = SubscriptionResource::make($day8Sub)->resolve();
        $this->assertFalse($resourceDay8['is_due_soon']);
        $this->assertSame(8, $resourceDay8['days_until_due']);

        // Query scopeDueSoon(7) and verify exactly 2 items matched (today and day 7)
        $dueSoonSubs = $user->subscriptions()->active()->dueSoon(7)->pluck('id')->all();
        $this->assertContains($todaySub->id, $dueSoonSubs);
        $this->assertContains($day7Sub->id, $dueSoonSubs);
        $this->assertNotContains($pastSub->id, $dueSoonSubs);
        $this->assertNotContains($day8Sub->id, $dueSoonSubs);
    }

    /**
     * Adversarial Test: Test behavior with maximum allowed decimal(10,2) price.
     */
    public function test_max_supported_decimal_price_boundary(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/subscriptions', [
            'name' => 'Max Supported Price',
            'price' => 99999999.99,
            'currency' => 'BRL',
            'billing_cycle' => 'yearly',
            'category' => 'Enterprise',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);

        $response->assertStatus(302);
        $saved = $user->subscriptions()->where('name', 'Max Supported Price')->first();
        $this->assertNotNull($saved);
        $this->assertEquals(99999999.99, (float) $saved->price);
    }
}
