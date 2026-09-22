<?php

namespace Database\Factories;

use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Subscription>
 */
class SubscriptionFactory extends Factory
{
    /**
     * The name of the factory's corresponding model.
     *
     * @var class-string<Subscription>
     */
    protected $model = Subscription::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $categories = [
            'Streaming',
            'Cloud & Hosting',
            'Productivity',
            'Design & Creative',
            'Developer Tools',
            'Gaming',
            'Music & Audio',
        ];

        return [
            'user_id' => User::factory(),
            'name' => fake()->randomElement([
                'Netflix',
                'Spotify',
                'GitHub Pro',
                'AWS',
                'Google Workspace',
                'ChatGPT Plus',
                'Adobe Creative Cloud',
                'Figma',
                'Notion',
                'YouTube Premium',
            ]),
            'price' => fake()->randomFloat(2, 9, 150),
            'currency' => fake()->randomElement(['BRL', 'USD', 'EUR']),
            'billing_cycle' => fake()->randomElement(['monthly', 'yearly']),
            'category' => fake()->randomElement($categories),
            'next_billing_date' => fake()->dateTimeBetween('+1 days', '+30 days')->format('Y-m-d'),
            'status' => 'active',
            'notes' => fake()->optional(0.7)->sentence(),
        ];
    }

    /**
     * Indicate that the subscription is active.
     */
    public function active(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
        ]);
    }

    /**
     * Indicate that the subscription is paused.
     */
    public function paused(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'paused',
        ]);
    }

    /**
     * Indicate that the subscription has a monthly billing cycle.
     */
    public function monthly(): static
    {
        return $this->state(fn (array $attributes) => [
            'billing_cycle' => 'monthly',
        ]);
    }

    /**
     * Indicate that the subscription has a yearly billing cycle.
     */
    public function yearly(): static
    {
        return $this->state(fn (array $attributes) => [
            'billing_cycle' => 'yearly',
        ]);
    }

    /**
     * Indicate that the subscription is due soon (within 7 days).
     */
    public function dueSoon(int $days = 3): static
    {
        return $this->state(fn (array $attributes) => [
            'next_billing_date' => Carbon::today()->addDays($days)->toDateString(),
        ]);
    }
}
