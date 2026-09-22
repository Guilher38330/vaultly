<?php

namespace Database\Seeders;

use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class SubscriptionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::where('email', 'test@example.com')->first()
            ?? User::first()
            ?? User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $subscriptions = [
            [
                'name' => 'Netflix',
                'price' => 55.90,
                'currency' => 'BRL',
                'billing_cycle' => 'monthly',
                'category' => 'Streaming',
                'next_billing_date' => Carbon::today()->addDays(2)->toDateString(),
                'status' => 'active',
                'notes' => 'Plano Premium 4K com 4 telas simultâneas',
            ],
            [
                'name' => 'Spotify',
                'price' => 34.90,
                'currency' => 'BRL',
                'billing_cycle' => 'monthly',
                'category' => 'Music & Audio',
                'next_billing_date' => Carbon::today()->addDays(5)->toDateString(),
                'status' => 'active',
                'notes' => 'Plano Família Premium',
            ],
            [
                'name' => 'AWS',
                'price' => 45.00,
                'currency' => 'USD',
                'billing_cycle' => 'monthly',
                'category' => 'Cloud & Hosting',
                'next_billing_date' => Carbon::today()->addDays(12)->toDateString(),
                'status' => 'active',
                'notes' => 'Servidor EC2, RDS PostgreSQL e S3 bucket',
            ],
            [
                'name' => 'GitHub',
                'price' => 100.00,
                'currency' => 'USD',
                'billing_cycle' => 'yearly',
                'category' => 'Developer Tools',
                'next_billing_date' => Carbon::today()->addDays(45)->toDateString(),
                'status' => 'active',
                'notes' => 'GitHub Copilot e GitHub Pro anual',
            ],
            [
                'name' => 'ChatGPT Plus',
                'price' => 20.00,
                'currency' => 'USD',
                'billing_cycle' => 'monthly',
                'category' => 'Productivity',
                'next_billing_date' => Carbon::today()->addDays(18)->toDateString(),
                'status' => 'active',
                'notes' => 'OpenAI ChatGPT Plus com GPT-4 e Canvas',
            ],
            [
                'name' => 'YouTube Premium',
                'price' => 41.90,
                'currency' => 'BRL',
                'billing_cycle' => 'monthly',
                'category' => 'Streaming',
                'next_billing_date' => Carbon::today()->addDays(22)->toDateString(),
                'status' => 'paused',
                'notes' => 'Assinatura pausada temporariamente pelo app',
            ],
            [
                'name' => 'Adobe CC',
                'price' => 275.00,
                'currency' => 'BRL',
                'billing_cycle' => 'monthly',
                'category' => 'Design & Creative',
                'next_billing_date' => Carbon::today()->addDays(8)->toDateString(),
                'status' => 'active',
                'notes' => 'Plano Photoshop, Illustrator e Premiere Pro',
            ],
        ];

        foreach ($subscriptions as $data) {
            $user->subscriptions()->updateOrCreate(
                ['name' => $data['name']],
                $data
            );
        }
    }
}
