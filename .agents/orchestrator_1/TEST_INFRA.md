# E2E Test Infra: Vaultly / AuraSpace Frontend Enhancements

## Test Philosophy
- Opaque-box, requirement-driven, derived strictly from `ORIGINAL_REQUEST.md` and user-facing acceptance criteria.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise Interaction Testing + Real-World Workload Testing.

## Feature Inventory & Test Matrix
| # | Feature Area | Requirement Source | Tier 1 (Coverage) | Tier 2 (Boundaries) | Tier 3 (Interactions) | Tier 4 (Scenarios) |
|---|--------------|--------------------|:-----------------:|:-------------------:|:---------------------:|:------------------:|
| 1 | R1A: Category Spending Donut Chart | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | R1B: Monthly Expenditure Projections | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | R2: Sonner Toast Notifications | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 4 | R3: Fluid Interface Animations | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |
| 5 | R4: Advanced 3D WebGL Experience | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |
| 6 | R5: Container Build & Quality | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Environment**: Docker Sail container (`docker compose exec -T laravel.test ...`)
- **Backend Quality & Regression Runner**:
  - `docker compose exec -T laravel.test php artisan test` (must maintain 100% pass rate: 87/87 tests)
  - `docker compose exec -T laravel.test ./vendor/bin/pint --test` (0 style violations)
- **Frontend Asset & Compilation Runner**:
  - `docker compose exec -T laravel.test npm run build` (zero errors, broken imports, or bundle failures)
- **E2E Feature Verification Runner**:
  - Node/Jest/Playwright or automated verification scripts testing mathematical correctness of projections, toast event emissions, animation class stability, and WebGL canvas mounting/teardown.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Expected Outcome |
|---|----------|--------------------|------------------|
| S1 | Multi-currency portfolio (BRL, USD, EUR) with mixed active and paused subscriptions | R1A, R1B, R5 | Donut and projections accurately segregate currencies; totals match active subscriptions; paused series displayed distinctly |
| S2 | Full subscription lifecycle (create, status toggle, edit, delete) | R2, R3, R5 | Responsive Sonner toasts trigger on every state mutation; spring modals open/close without layout jump |
| S3 | Interactive dashboard sorting & category filtering under high item count | R1, R3 | Filter/sort applies instantly; table rows and mobile cards reorder smoothly via FLIP animations without layout shifts |
| S4 | Light/Dark theme switching during active notifications and charting | R1, R2, R3 | Charts, tooltips, and Sonner toasts adapt seamlessly to dark/light theme shifts via MutationObserver |
| S5 | Guest navigation to/from Login & Register with 3D Cosmic Showcase | R4, R5 | R3F canvas initializes at 60fps with PBR planet and star particles; mouse interaction rotates smoothly; component tears down cleanly on unmount with zero WebGL context leaks |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥ 30 test cases (≥ 5 per feature area)
- **Tier 2 (Boundary & Corner)**: ≥ 30 test cases (empty subscriptions, 0 values, extreme horizons, special characters, rapid clicks)
- **Tier 3 (Cross-Feature Combinations)**: ≥ 10 pairwise interaction tests
- **Tier 4 (Real-World Application Scenarios)**: 5 comprehensive end-to-end scenarios
- **Total Minimum**: ≥ 75 test cases
