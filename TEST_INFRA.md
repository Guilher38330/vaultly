# E2E Test Infra: Subscription Tracker

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.

## Feature Inventory & Test Mapping
| # | Feature | Source | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|--------|:-----------------:|:-------------------:|:----------------------:|:-------------------:|
| 1 | Subscriptions Database Schema & Indexes | ORIGINAL_REQUEST §2 | Basic creation, retrieval | Null notes, long notes | FK cascade deletion | Seed realistic dataset |
| 2 | Model Scopes (active, dueSoon) | ORIGINAL_REQUEST §2 | Query active/dueSoon | Day 7 vs Day 8 boundary, overdue | Active + DueSoon combined | User dashboard query |
| 3 | Model Price Accessors (monthly/yearly) | ORIGINAL_REQUEST §2 | Standard conversion | Decimal repeating (99.99/12) | Mixed cycles calculation | Annual summary view |
| 4 | Anti-IDOR Authorization Policy | ORIGINAL_REQUEST §3 | Own subscription CRUD | Cross-user edit/delete/toggle (403) | Guest redirection (302) | Multi-tenant isolation |
| 5 | Anti-XSS Sanitization & Input Rules | ORIGINAL_REQUEST §3 | Valid payload submit | `<script>` stripped, negative price | HTML in notes + long name | Form input validation |
| 6 | Safe Resource Serialization | ORIGINAL_REQUEST §3 | Whitelisted properties | No password/user internal leaks | Nested resource array | Inertia page hydration |
| 7 | Dashboard Index & Metrics Aggregation | ORIGINAL_REQUEST §3 | 200 OK + props shape | Paused excluded from totals | Currency separation (BRL/USD/EUR) | Full dashboard load |
| 8 | Status Quick-Toggle Action | ORIGINAL_REQUEST §3 | Active -> Paused -> Active | Toggle with IDOR check | Status toggle updates metrics | Live dashboard workflow |
| 9 | Mutation Route Throttling | ORIGINAL_REQUEST §3 | Normal requests pass | Exceed 60 requests/min (429) | Rapid toggle attempts | DDoS/Brute-force resilience |

## Test Architecture
- Test Runner: `docker compose exec -T laravel.test php artisan test --filter=SubscriptionTest`
- Environment: Sail container with MySQL `testing` database and `RefreshDatabase`.
- Primary test file: `tests/Feature/SubscriptionTest.php`.

## Coverage Thresholds
- Tier 1: ≥5 test cases per feature (happy-path isolation).
- Tier 2: ≥5 boundary and negative test cases (IDOR 403, XSS stripping, negative prices, invalid cycles/currencies).
- Tier 3: Cross-feature tests (calculations with paused exclusion, currency segregation).
- Tier 4: Real-world workflow scenarios (full user journey: register/login -> create subscriptions -> toggle status -> inspect dashboard metrics -> delete).
