<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdversarialArchitectureReviewTest extends TestCase
{
    use RefreshDatabase;

    /**
     * ADVERSARIAL TEST 1: Anti-IDOR Mass Assignment & User Tampering
     * Verify that an attacker cannot spoof user_id in store or update payloads.
     */
    public function test_idor_mass_assignment_user_id_tampering_prevented(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        // 1. Attacker (User A) attempts to create a subscription assigned to User B
        $storePayload = [
            'user_id' => $userB->id,
            'name' => 'Spoofed Subscription',
            'price' => 49.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Cloud',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => 'Attempting to inject user_id',
        ];

        $responseStore = $this->actingAs($userA)->post('/subscriptions', $storePayload);
        $responseStore->assertSessionHasNoErrors();
        $responseStore->assertRedirect();

        $createdSub = Subscription::where('name', 'Spoofed Subscription')->first();
        $this->assertNotNull($createdSub);
        $this->assertSame($userA->id, $createdSub->user_id, 'Subscription must belong to authenticated user, not spoofed user_id.');
        $this->assertNotSame($userB->id, $createdSub->user_id);

        // 2. Attacker (User A) attempts to update their subscription to reassign to User B
        $updatePayload = [
            'user_id' => $userB->id,
            'name' => 'Reassigned Subscription',
            'price' => 59.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Cloud',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ];

        $responseUpdate = $this->actingAs($userA)->put("/subscriptions/{$createdSub->id}", $updatePayload);
        $responseUpdate->assertSessionHasNoErrors();
        $responseUpdate->assertRedirect();

        $freshSub = $createdSub->fresh();
        $this->assertSame('Reassigned Subscription', $freshSub->name);
        $this->assertSame($userA->id, $freshSub->user_id, 'user_id must remain User A despite payload injection.');
    }

    /**
     * ADVERSARIAL TEST 2: Anti-IDOR Cross-Tenant Access Control
     * Verify User B is completely forbidden (403) from updating, toggling, or deleting User A's subscription.
     */
    public function test_idor_cross_tenant_manipulation_strictly_forbidden(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $subA = Subscription::factory()->create([
            'user_id' => $userA->id,
            'name' => 'Confidential Service',
            'price' => 199.00,
            'currency' => 'BRL',
            'status' => 'active',
        ]);

        // Attempt update
        $resUpdate = $this->actingAs($userB)->put("/subscriptions/{$subA->id}", [
            'name' => 'Tampered By User B',
            'price' => 1.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Hacked',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);
        $resUpdate->assertForbidden();

        // Attempt toggle
        $resToggle = $this->actingAs($userB)->patch("/subscriptions/{$subA->id}/toggle-status");
        $resToggle->assertForbidden();

        // Attempt delete
        $resDelete = $this->actingAs($userB)->delete("/subscriptions/{$subA->id}");
        $resDelete->assertForbidden();

        // Confirm database integrity
        $fresh = $subA->fresh();
        $this->assertSame('Confidential Service', $fresh->name);
        $this->assertSame('active', $fresh->status);
        $this->assertSame($userA->id, $fresh->user_id);
    }

    /**
     * ADVERSARIAL TEST 3: Anti-XSS Deep Sanitization Across Diverse Attack Vectors
     * Verify all string fields strip tags and cannot inject malicious scripts.
     */
    public function test_xss_deep_sanitization_across_diverse_attack_vectors(): void
    {
        $user = User::factory()->create();

        // 1. Payload with embedded tags and valid content: tags must be stripped, valid content preserved
        $payload1 = [
            'name' => '<script>alert("XSS")</script>AWS Cloud Computing',
            'price' => 89.90,
            'currency' => 'USD',
            'billing_cycle' => 'monthly',
            'category' => '<a href="javascript:alert(\'hack\')">Hosting & Cloud</a>',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => '<svg/onload=alert(\'XSS\')><body onload=evil()>Server notes<iframe src="//evil.com"></iframe>',
        ];

        $response1 = $this->actingAs($user)->post('/subscriptions', $payload1);
        $response1->assertSessionHasNoErrors();
        $response1->assertRedirect();

        $saved1 = $user->subscriptions()->where('currency', 'USD')->first();
        $this->assertNotNull($saved1);

        $this->assertStringNotContainsString('<script', strtolower($saved1->name));
        $this->assertStringNotContainsString('</script>', strtolower($saved1->name));
        $this->assertStringNotContainsString('<a ', strtolower($saved1->category));
        $this->assertStringNotContainsString('</a>', strtolower($saved1->category));
        $this->assertStringNotContainsString('<svg', strtolower($saved1->notes));
        $this->assertStringNotContainsString('<body', strtolower($saved1->notes));
        $this->assertStringNotContainsString('<iframe', strtolower($saved1->notes));

        $this->assertSame('Hosting & Cloud', $saved1->category);
        $this->assertSame('Server notes', $saved1->notes);

        // 2. Pure tag payloads (e.g. <img src=x onerror=alert(1)>): strip_tags leaves empty string, triggering required rule
        $response2 = $this->actingAs($user)->postJson('/subscriptions', [
            'name' => '<img src="x" onerror="evil()">',
            'price' => 20.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Test',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);
        $response2->assertStatus(422);
        $response2->assertJsonValidationErrors(['name']);
    }

    /**
     * ADVERSARIAL TEST 4: Data Leak Prevention on Inertia Dashboard Wire
     * Verify SubscriptionResource does not leak internal user fields or foreign keys.
     */
    public function test_data_leak_prevention_on_inertia_dashboard_wire(): void
    {
        $user = User::factory()->create([
            'email' => 'victim@example.com',
        ]);

        Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Private VPN',
            'price' => 12.00,
            'currency' => 'USD',
            'billing_cycle' => 'monthly',
            'category' => 'Security',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(2)->toDateString(),
            'notes' => 'VPN plan',
        ]);

        $response = $this->actingAs($user)->get('/dashboard');
        $response->assertOk();

        $response->assertInertia(function (Assert $page) {
            $page->component('Dashboard')
                ->has('subscriptions', 1)
                ->has('subscriptions.0', function (Assert $item) {
                    $item->where('name', 'Private VPN')
                        ->where('price', fn ($val) => (float) $val === 12.0)
                        ->where('currency', 'USD')
                        ->missing('user_id')
                        ->missing('user')
                        ->missing('created_at')
                        ->missing('updated_at')
                        ->missing('password')
                        ->missing('remember_token')
                        ->missing('email')
                        ->missing('email_verified_at')
                        ->etc();
                })
                ->has('due_soon', 1)
                ->has('due_soon.0', function (Assert $item) {
                    $item->where('name', 'Private VPN')
                        ->missing('user_id')
                        ->missing('user')
                        ->missing('created_at')
                        ->missing('updated_at')
                        ->etc();
                })
                ->has('metrics', function (Assert $metrics) {
                    $metrics->where('active_count', 1)
                        ->where('paused_count', 0)
                        ->where('totals.USD', fn ($val) => (float) $val === 12.0)
                        ->where('totals.BRL', fn ($val) => (float) $val === 0.0)
                        ->where('totals.EUR', fn ($val) => (float) $val === 0.0)
                        ->etc();
                });
        });
    }

    /**
     * ADVERSARIAL TEST 5: Route Rate Limiting (Throttle 60,1)
     * Verify that mutation spam beyond 60 requests per minute is throttled with HTTP 429.
     */
    public function test_route_rate_limiting_throttles_excessive_mutations(): void
    {
        $user = User::factory()->create();

        $sub = Subscription::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);

        // Send 60 requests within limit
        for ($i = 0; $i < 60; $i++) {
            $response = $this->actingAs($user)->patch("/subscriptions/{$sub->id}/toggle-status");
            $this->assertTrue(
                in_array($response->getStatusCode(), [200, 302]),
                "Request {$i} unexpectedly failed with status {$response->getStatusCode()}"
            );
        }

        // The 61st request MUST receive HTTP 429 Too Many Requests
        $overflowResponse = $this->actingAs($user)->patch("/subscriptions/{$sub->id}/toggle-status");
        $overflowResponse->assertStatus(429);
    }

    /**
     * ADVERSARIAL TEST 6: Multi-Currency Accounting Accuracy & Paused Exclusion
     * Verify complex combinations of currencies and billing cycles.
     */
    public function test_multi_currency_accounting_accuracy_and_paused_exclusion(): void
    {
        $user = User::factory()->create();

        // Active BRL monthly: 60.00 -> monthly: 60.00, yearly: 720.00
        Subscription::factory()->create([
            'user_id' => $user->id,
            'price' => 60.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(3)->toDateString(),
        ]);

        // Active BRL yearly: 240.00 -> monthly: 20.00, yearly: 240.00
        Subscription::factory()->create([
            'user_id' => $user->id,
            'price' => 240.00,
            'currency' => 'BRL',
            'billing_cycle' => 'yearly',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(10)->toDateString(),
        ]);

        // Paused BRL monthly: 150.00 -> MUST BE EXCLUDED FROM TOTALS
        Subscription::factory()->create([
            'user_id' => $user->id,
            'price' => 150.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'status' => 'paused',
            'next_billing_date' => Carbon::today()->addDays(1)->toDateString(),
        ]);

        // Active USD monthly: 15.00 -> monthly: 15.00, yearly: 180.00
        Subscription::factory()->create([
            'user_id' => $user->id,
            'price' => 15.00,
            'currency' => 'USD',
            'billing_cycle' => 'monthly',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(5)->toDateString(),
        ]);

        // Paused USD yearly: 300.00 -> MUST BE EXCLUDED FROM TOTALS
        Subscription::factory()->create([
            'user_id' => $user->id,
            'price' => 300.00,
            'currency' => 'USD',
            'billing_cycle' => 'yearly',
            'status' => 'paused',
            'next_billing_date' => Carbon::today()->toDateString(),
        ]);

        // Active EUR yearly: 36.00 -> monthly: 3.00, yearly: 36.00
        Subscription::factory()->create([
            'user_id' => $user->id,
            'price' => 36.00,
            'currency' => 'EUR',
            'billing_cycle' => 'yearly',
            'status' => 'active',
            'next_billing_date' => Carbon::today()->addDays(2)->toDateString(),
        ]);

        $response = $this->actingAs($user)->get('/dashboard');
        $response->assertOk();

        $response->assertInertia(function (Assert $page) {
            $page->component('Dashboard')
                ->where('metrics.active_count', 4)
                ->where('metrics.paused_count', 2)
                ->where('metrics.due_soon_count', 3) // Active items within 7 days: BRL monthly (3d), USD monthly (5d), EUR yearly (2d)
                ->where('metrics.totals.BRL', fn ($val) => (float) $val === 80.0) // 60.00 + 20.00
                ->where('metrics.totals.USD', fn ($val) => (float) $val === 15.0) // 15.00
                ->where('metrics.totals.EUR', fn ($val) => (float) $val === 3.0)  // 3.00
                ->where('metrics.yearly_totals.BRL', fn ($val) => (float) $val === 960.0) // 720.00 + 240.00
                ->where('metrics.yearly_totals.USD', fn ($val) => (float) $val === 180.0) // 180.00
                ->where('metrics.yearly_totals.EUR', fn ($val) => (float) $val === 36.0); // 36.00
        });
    }
}
