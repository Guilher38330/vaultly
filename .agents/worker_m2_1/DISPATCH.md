## 2026-09-22T19:36:30Z
You are worker_m2_1.
Your working directory: z:\home\guilhherme\projetos\meu-app-react\.agents\worker_m2_1
Original user request path: z:\home\guilhherme\projetos\meu-app-react\.agents\ORIGINAL_REQUEST.md
Project plan and contracts path: z:\home\guilhherme\projetos\meu-app-react\PROJECT.md
Backend survey findings path: z:\home\guilhherme\projetos\meu-app-react\.agents\explorer_survey_1\handoff.md
Spec miner findings path: z:\home\guilhherme\projetos\meu-app-react\.agents\spec_miner_survey_3\handoff.md
Milestone 1 handoff path: z:\home\guilhherme\projetos\meu-app-react\.agents\worker_m1_1\handoff.md

MANDATORY: Read ORIGINAL_REQUEST.md before doing any work.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope: Milestone 2 — Security, Authorization, FormRequest, Resource, Controller & Routes
You have exclusive write ownership over:
- app/Policies/SubscriptionPolicy.php
- app/Http/Requests/SubscriptionRequest.php
- app/Http/Resources/SubscriptionResource.php
- app/Http/Controllers/SubscriptionController.php
- routes/web.php
- app/Providers/AppServiceProvider.php

Requirements to implement:
1. `SubscriptionPolicy.php`:
   - Strict Tenant Isolation (Anti-IDOR):
     - `view(User $user, Subscription $subscription): bool => $user->id === $subscription->user_id;`
     - `update(User $user, Subscription $subscription): bool => $user->id === $subscription->user_id;`
     - `delete(User $user, Subscription $subscription): bool => $user->id === $subscription->user_id;`
   - Explicitly register `Gate::policy(Subscription::class, SubscriptionPolicy::class)` in `app/Providers/AppServiceProvider.php`.
2. `SubscriptionRequest.php`:
   - `prepareForValidation()`:
     - Apply `strip_tags()` and `trim()` to `name`, `category`, and `notes` to prevent XSS.
     - Fallback currency to 'BRL' if missing; fallback status to 'active' if missing.
   - `rules()`:
     - `name`: `['required', 'string', 'max:255']`
     - `price`: `['required', 'numeric', 'min:0.01']`
     - `currency`: `['required', 'string', Rule::in(['BRL', 'USD', 'EUR'])]`
     - `billing_cycle`: `['required', 'string', Rule::in(['monthly', 'yearly'])]`
     - `category`: `['required', 'string', 'max:100']`
     - `next_billing_date`: `['required', 'date']`
     - `status`: `['sometimes', 'string', Rule::in(['active', 'paused'])]`
     - `notes`: `['nullable', 'string', 'max:1000']`
3. `SubscriptionResource.php`:
   - Safe whitelisted serialization (Inertia Data Leak prevention):
     - `id`, `name`, `price` (float), `currency`, `billing_cycle`, `category`,
     - `next_billing_date` (formatted YYYY-MM-DD), `status`, `notes`,
     - `monthly_equivalent_price` (float), `yearly_equivalent_price` (float),
     - `is_due_soon` (bool: whether active and due within 7 days),
     - `days_until_due` (int: Carbon::today()->diffInDays(next_billing_date, false)).
4. `SubscriptionController.php`:
   - `index(Request $request)`:
     - User subscriptions: `$user->subscriptions()->orderBy('next_billing_date')->get()`.
     - Calculate projected monthly totals per currency (`BRL`, `USD`, `EUR`) for **active** subscriptions only (exclude paused!).
     - Active count and paused count.
     - Due soon subscriptions (< 7 days, active): `$user->subscriptions()->active()->dueSoon(7)->orderBy('next_billing_date')->get()`.
     - Categories: list of unique category strings used by this user.
     - Return `Inertia::render('Dashboard', [ 'subscriptions' => SubscriptionResource::collection($subscriptions), 'metrics' => [...], 'due_soon' => SubscriptionResource::collection($dueSoon), 'categories' => $categories ])`.
   - `store(SubscriptionRequest $request)`:
     - `$request->user()->subscriptions()->create($request->validated());`
     - Redirect back with success flash message.
   - `update(SubscriptionRequest $request, Subscription $subscription)`:
     - `Gate::authorize('update', $subscription);`
     - `$subscription->update($request->validated());`
     - Redirect back with success flash message.
   - `destroy(Request $request, Subscription $subscription)`:
     - `Gate::authorize('delete', $subscription);`
     - `$subscription->delete();`
     - Redirect back with success flash message.
   - `toggleStatus(Request $request, Subscription $subscription)`:
     - `Gate::authorize('update', $subscription);`
     - `$subscription->status = $subscription->status === 'active' ? 'paused' : 'active';`
     - `$subscription->save();`
     - Redirect back with success flash message.
5. `routes/web.php`:
   - Map `Route::get('/dashboard', [SubscriptionController::class, 'index'])->middleware(['auth', 'verified'])->name('dashboard');`
   - Group mutation routes with middleware `['auth', 'throttle:60,1']`:
     - `Route::post('/subscriptions', [SubscriptionController::class, 'store'])->name('subscriptions.store');`
     - `Route::put('/subscriptions/{subscription}', [SubscriptionController::class, 'update'])->name('subscriptions.update');`
     - `Route::delete('/subscriptions/{subscription}', [SubscriptionController::class, 'destroy'])->name('subscriptions.destroy');`
     - `Route::patch('/subscriptions/{subscription}/toggle-status', [SubscriptionController::class, 'toggleStatus'])->name('subscriptions.toggle-status');`

Verification:
- Run Pint: `docker compose exec -T laravel.test ./vendor/bin/pint --dirty --format agent`.
- Verify routes with `docker compose exec -T laravel.test php artisan route:list`.
- Verify policy authorization, XSS stripping in request, and metrics calculations via Tinker or Sail.
- Ensure all 25 existing tests still pass.
- Write handoff report to `z:\home\guilhherme\projetos\meu-app-react\.agents\worker_m2_1\handoff.md`.
- Send completion message to parent when done.
