# E2E Test Suite Ready: Subscription Tracker

## Test Runner
- Primary Command: `docker compose exec -T laravel.test php artisan test --filter=SubscriptionTest` (or `wsl -d Ubuntu -e bash -c "cd /home/guilhherme/projetos/meu-app-react && ./vendor/bin/sail artisan test --filter=SubscriptionTest"`)
- Full Application Suite: `docker compose exec -T laravel.test php artisan test`
- Code Formatter: `docker compose exec -T laravel.test ./vendor/bin/pint --format agent`
- Frontend Build: `docker compose exec -T laravel.test npm run build`
- Expected: 100% tests pass with exit code 0.

## Coverage Summary
| Tier | Count | Description |
|------|------:|-------------|
| 1. Feature Coverage | 12 | Basic creation, retrieval, isolated CRUD mutations |
| 2. Boundary & Corner | 14 | Anti-IDOR 403 checks, Anti-XSS tag stripping, negative/zero prices, unsupported currencies, dueSoon boundaries (0, 7, 8, -1 days) |
| 3. Cross-Feature Combinations | 8 | Proportional yearly/monthly calculations, repeating decimal rounding, paused subscription exclusion from totals, multi-currency segregation |
| 4. Real-World Application Scenarios | 9 | Full user lifecycle, Dashboard Inertia props hydration, empty state rendering, status toggles |
| **Total Test Methods** | **43** | (33 in `SubscriptionTest.php` + 10 in `SubscriptionAdversarialStressTest.php`) |
| **Total Assertions** | **418** | Across subscription test suites |
| **Entire Application Test Suite** | **88 passed** | **865 assertions, 0 failures** |

## Feature Checklist
| Feature | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Status |
|---------|:------:|:------:|:------:|:------:|:------:|
| Anti-IDOR Authorization Policy | ✓ | ✓ | ✓ | ✓ | PASS |
| Anti-XSS Request Sanitization | ✓ | ✓ | ✓ | ✓ | PASS |
| Strict Request Validation | ✓ | ✓ | ✓ | ✓ | PASS |
| Safe Resource Serialization | ✓ | ✓ | ✓ | ✓ | PASS |
| Model Scopes (active, dueSoon) | ✓ | ✓ | ✓ | ✓ | PASS |
| Price Normalization Accessors | ✓ | ✓ | ✓ | ✓ | PASS |
| Dashboard Financial Metrics | ✓ | ✓ | ✓ | ✓ | PASS |
| Route Throttling (60,1) | ✓ | ✓ | ✓ | ✓ | PASS |
| React UI & Responsive Layout | ✓ | ✓ | ✓ | ✓ | PASS |
