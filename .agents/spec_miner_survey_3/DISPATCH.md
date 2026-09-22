## 2026-09-22T19:16:45Z

You are spec_miner_survey_3.
Your working directory: z:\home\guilhherme\projetos\meu-app-react\.agents\spec_miner_survey_3
Original user request: z:\home\guilhherme\projetos\meu-app-react\.agents\ORIGINAL_REQUEST.md

Your task is to mine all explicit and implicit specifications for the "Subscription Tracker" feature:
1. Read ORIGINAL_REQUEST.md carefully.
2. Read project rules and guidelines (AGENTS.md, Laravel Boost rules, Sail rules, Pint, Pest/PHPUnit, Inertia v2 conventions).
3. Enumerate every required feature, constraint, and verification requirement:
   - Data & Models (migration schema, indexes, fields, Subscription model, Mass Assignment protection, scopes active & dueSoon(7), accessors for monthly & yearly equivalent prices, User relationship, factory, seeder).
   - Security, Authorization & API (SubscriptionPolicy Anti-IDOR checks, SubscriptionRequest Anti-XSS strip_tags/trim and validation rules, SubscriptionResource safe serialization, SubscriptionController index/store/update/destroy/toggleStatus, route throttling 60,1).
   - Frontend (CategoryBadge deterministic hash, SubscriptionModal useForm + datalist + multi-currency, DeleteSubscriptionModal, Dashboard banner for due_soon 7 days, metric cards for currency totals + active/paused count, search & multi-filter, responsive table/touch-cards, toggle status action).
   - Test & Verification specifications (tests/Feature/SubscriptionTest.php covering Anti-IDOR, Anti-XSS, business logic calculations, dueSoon scope, Sail artisan test execution, Pint, npm run build).
4. Structure the output into a precise, verifiable specification checklist with acceptance criteria.
5. Write your report to:
   z:\home\guilhherme\projetos\meu-app-react\.agents\spec_miner_survey_3\handoff.md
6. Maintain progress.md in your working directory.
7. Send a message to your parent when complete.
