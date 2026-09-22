<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubscriptionAdversarialStressTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Challenge 1: Mass assignment tampering with user_id on store mutation.
     * An attacker attempts to set user_id to another user's ID during creation.
     */
    public function test_mass_assignment_user_id_tampering_on_store(): void
    {
        $victim = User::factory()->create();
        $attacker = User::factory()->create();

        $payload = [
            'user_id' => $victim->id, // Malicious injection attempt
            'name' => 'Injected Subscription',
            'price' => 49.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Security',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ];

        $response = $this->actingAs($attacker)->post('/subscriptions', $payload);
        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $subscription = Subscription::where('name', 'Injected Subscription')->first();
        $this->assertNotNull($subscription);
        // The subscription MUST belong to the authenticated attacker, NEVER to the victim
        $this->assertSame($attacker->id, $subscription->user_id);
        $this->assertNotSame($victim->id, $subscription->user_id);
    }

    /**
     * Challenge 2: Mass assignment tampering with user_id on update mutation.
     * An attacker attempts to transfer ownership of their subscription to another user or kidnap another user's ID.
     */
    public function test_mass_assignment_user_id_tampering_on_update(): void
    {
        $user = User::factory()->create();
        $otherUser = User::factory()->create();

        $subscription = Subscription::factory()->create([
            'user_id' => $user->id,
            'name' => 'Original Sub',
        ]);

        $payload = [
            'user_id' => $otherUser->id, // Attempting to alter ownership
            'name' => 'Updated Sub',
            'price' => 29.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Security',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ];

        $response = $this->actingAs($user)->put("/subscriptions/{$subscription->id}", $payload);
        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $subscription->refresh();
        $this->assertSame('Updated Sub', $subscription->name);
        $this->assertSame($user->id, $subscription->user_id);
        $this->assertNotSame($otherUser->id, $subscription->user_id);
    }

    /**
     * Challenge 3: SQL injection payloads in name, category, and notes.
     * Ensures all inputs are safely escaped and parameterized without DB exceptions.
     */
    public function test_sql_injection_payloads_in_text_fields(): void
    {
        $user = User::factory()->create();

        $payload = [
            'name' => "Netflix'; DROP TABLE subscriptions; --",
            'price' => 59.90,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => "' OR '1'='1",
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => "admin'-- /* test comment */ UNION SELECT * FROM users;",
        ];

        $response = $this->actingAs($user)->post('/subscriptions', $payload);
        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $saved = $user->subscriptions()->where('name', "Netflix'; DROP TABLE subscriptions; --")->first();
        $this->assertNotNull($saved);
        $this->assertSame("' OR '1'='1", $saved->category);
        $this->assertSame("admin'-- /* test comment */ UNION SELECT * FROM users;", $saved->notes);

        // Verify table still exists and query succeeds
        $this->assertDatabaseHas('subscriptions', ['id' => $saved->id]);
    }

    /**
     * Challenge 4: Status tampering rejected.
     * Verifies that invalid statuses like 'admin', 'deleted', 'banned', 'inactive' are rejected.
     */
    public function test_status_tampering_rejected(): void
    {
        $user = User::factory()->create();

        $invalidStatuses = ['admin', 'deleted', 'banned', 'inactive', 'pending', 'cancelled', '0', '1'];

        foreach ($invalidStatuses as $status) {
            $response = $this->actingAs($user)->postJson('/subscriptions', [
                'name' => 'Status Test',
                'price' => 10.00,
                'currency' => 'BRL',
                'billing_cycle' => 'monthly',
                'category' => 'Testing',
                'next_billing_date' => Carbon::tomorrow()->toDateString(),
                'status' => $status,
            ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['status']);
        }
    }

    /**
     * Challenge 5: Sub-cent and stringified zero/negative price validation.
     */
    public function test_sub_cent_and_string_prices(): void
    {
        $user = User::factory()->create();

        $invalidPrices = [0.009, 0.001, 0.0001, -0.001, '0.00', '-0.01', 'free', 'NaN', 'null'];

        foreach ($invalidPrices as $price) {
            $response = $this->actingAs($user)->postJson('/subscriptions', [
                'name' => 'Price Test',
                'price' => $price,
                'currency' => 'BRL',
                'billing_cycle' => 'monthly',
                'category' => 'Testing',
                'next_billing_date' => Carbon::tomorrow()->toDateString(),
            ]);

            $response->assertStatus(422);
            $response->assertJsonValidationErrors(['price']);
        }
    }

    /**
     * Challenge 6: Non-existent subscription ID returns 404.
     */
    public function test_non_existent_subscription_returns_404(): void
    {
        $user = User::factory()->create();

        $responsePut = $this->actingAs($user)->put('/subscriptions/999999', [
            'name' => 'Ghost',
            'price' => 10.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Testing',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
        ]);
        $responsePut->assertNotFound();

        $responseDelete = $this->actingAs($user)->delete('/subscriptions/999999');
        $responseDelete->assertNotFound();

        $responseToggle = $this->actingAs($user)->patch('/subscriptions/999999/toggle-status');
        $responseToggle->assertNotFound();
    }

    /**
     * Challenge 7: Large dataset precision and no floating point accumulation error.
     * Tests 30 subscriptions each with price 33.33 yearly (monthly eq: 2.78).
     * 30 * 2.78 = 83.40 monthly, 30 * 33.33 = 999.90 yearly.
     */
    public function test_large_dataset_precision_and_no_floating_point_drift(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 30; $i++) {
            Subscription::factory()->create([
                'user_id' => $user->id,
                'price' => 33.33,
                'currency' => 'USD',
                'billing_cycle' => 'yearly',
                'status' => 'active',
            ]);
        }

        $response = $this->actingAs($user)->get('/dashboard');
        $response->assertOk();

        // 33.33 / 12 = 2.7775 -> round(2.7775, 2) = 2.78
        // 30 * 2.78 = 83.40
        // 30 * 33.33 = 999.90
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('subscriptions', 30)
            ->where('metrics.active_count', 30)
            ->where('metrics.totals.USD', fn ($val) => (float) $val === 83.40)
            ->where('metrics.yearly_totals.USD', fn ($val) => (float) $val === 999.90)
        );
    }

    /**
     * Challenge 8: Notes length boundary (exactly 1000 characters passes, 1001 fails).
     */
    public function test_notes_length_boundary(): void
    {
        $user = User::factory()->create();

        // 1000 characters: valid
        $responseValid = $this->actingAs($user)->post('/subscriptions', [
            'name' => 'Max Notes Test',
            'price' => 10.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Testing',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => str_repeat('A', 1000),
        ]);
        $responseValid->assertSessionHasNoErrors();

        // 1001 characters: invalid
        $responseInvalid = $this->actingAs($user)->postJson('/subscriptions', [
            'name' => 'Over Max Notes Test',
            'price' => 10.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => 'Testing',
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => str_repeat('A', 1001),
        ]);
        $responseInvalid->assertStatus(422);
        $responseInvalid->assertJsonValidationErrors(['notes']);
    }

    /**
     * Challenge 9: Unicode, diacritics, and emoji preservation.
     */
    public function test_unicode_and_emoji_handling(): void
    {
        $user = User::factory()->create();

        $name = '🍿 Streaming Plus 🚀';
        $category = 'Entretenimento & Lazer';
        $notes = 'Cartão de crédito Nubank 💳 com 10% cashback (não esquecer!)';

        $response = $this->actingAs($user)->post('/subscriptions', [
            'name' => $name,
            'price' => 45.00,
            'currency' => 'BRL',
            'billing_cycle' => 'monthly',
            'category' => $category,
            'next_billing_date' => Carbon::tomorrow()->toDateString(),
            'notes' => $notes,
        ]);

        $response->assertSessionHasNoErrors();
        $sub = $user->subscriptions()->latest()->first();

        $this->assertSame($name, $sub->name);
        $this->assertSame($category, $sub->category);
        $this->assertSame($notes, $sub->notes);
    }

    /**
     * Challenge 10: Toggle status state machine cycles (active -> paused -> active -> paused).
     */
    public function test_toggle_status_state_machine_cycles(): void
    {
        $user = User::factory()->create();
        $sub = Subscription::factory()->create([
            'user_id' => $user->id,
            'status' => 'active',
        ]);

        // Cycle 1: active -> paused
        $this->actingAs($user)->patch("/subscriptions/{$sub->id}/toggle-status")->assertRedirect();
        $this->assertSame('paused', $sub->fresh()->status);

        // Cycle 2: paused -> active
        $this->actingAs($user)->patch("/subscriptions/{$sub->id}/toggle-status")->assertRedirect();
        $this->assertSame('active', $sub->fresh()->status);

        // Cycle 3: active -> paused
        $this->actingAs($user)->patch("/subscriptions/{$sub->id}/toggle-status")->assertRedirect();
        $this->assertSame('paused', $sub->fresh()->status);

        // Cycle 4: paused -> active
        $this->actingAs($user)->patch("/subscriptions/{$sub->id}/toggle-status")->assertRedirect();
        $this->assertSame('active', $sub->fresh()->status);
    }
}
