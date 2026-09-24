/**
 * Comprehensive Mock Fixtures for E2E Tests
 * 
 * Multi-currency, multi-cycle, mixed-status dataset representing real-world user portfolios.
 */

export const MOCK_SUBSCRIPTIONS = [
  {
    id: 1,
    name: 'Netflix Premium',
    price: 55.90,
    currency: 'BRL',
    billing_cycle: 'monthly',
    category: 'Streaming',
    next_billing_date: '2026-09-25',
    status: 'active',
    monthly_equivalent_price: 55.90,
    yearly_equivalent_price: 670.80,
    is_due_soon: true,
    days_until_due: 2
  },
  {
    id: 2,
    name: 'Spotify Family',
    price: 34.90,
    currency: 'BRL',
    billing_cycle: 'monthly',
    category: 'Música',
    next_billing_date: '2026-10-05',
    status: 'active',
    monthly_equivalent_price: 34.90,
    yearly_equivalent_price: 418.80,
    is_due_soon: false,
    days_until_due: 12
  },
  {
    id: 3,
    name: 'Amazon Prime',
    price: 19.90,
    currency: 'BRL',
    billing_cycle: 'monthly',
    category: 'Streaming',
    next_billing_date: '2026-10-14',
    status: 'paused',
    monthly_equivalent_price: 19.90,
    yearly_equivalent_price: 238.80,
    is_due_soon: false,
    days_until_due: 21
  },
  {
    id: 4,
    name: 'GitHub Copilot Pro',
    price: 10.00,
    currency: 'USD',
    billing_cycle: 'monthly',
    category: 'Trabalho',
    next_billing_date: '2026-09-29',
    status: 'active',
    monthly_equivalent_price: 10.00,
    yearly_equivalent_price: 120.00,
    is_due_soon: true,
    days_until_due: 6
  },
  {
    id: 5,
    name: 'ChatGPT Plus',
    price: 20.00,
    currency: 'USD',
    billing_cycle: 'monthly',
    category: 'Trabalho',
    next_billing_date: '2026-10-18',
    status: 'active',
    monthly_equivalent_price: 20.00,
    yearly_equivalent_price: 240.00,
    is_due_soon: false,
    days_until_due: 25
  },
  {
    id: 6,
    name: 'JetBrains All Products',
    price: 299.00,
    currency: 'USD',
    billing_cycle: 'yearly',
    category: 'Trabalho',
    next_billing_date: '2026-11-15',
    status: 'active',
    monthly_equivalent_price: 24.92,
    yearly_equivalent_price: 299.00,
    is_due_soon: false,
    days_until_due: 53
  },
  {
    id: 7,
    name: 'Hetzner Cloud VPS',
    price: 14.50,
    currency: 'EUR',
    billing_cycle: 'monthly',
    category: 'Cloud',
    next_billing_date: '2026-10-01',
    status: 'active',
    monthly_equivalent_price: 14.50,
    yearly_equivalent_price: 174.00,
    is_due_soon: false,
    days_until_due: 8
  },
  {
    id: 8,
    name: 'PlayStation Plus Deluxe',
    price: 389.90,
    currency: 'BRL',
    billing_cycle: 'yearly',
    category: 'Jogos',
    next_billing_date: '2026-12-20',
    status: 'active',
    monthly_equivalent_price: 32.49,
    yearly_equivalent_price: 389.90,
    is_due_soon: false,
    days_until_due: 88
  },
  {
    id: 9,
    name: 'Xbox Game Pass Ultimate',
    price: 59.99,
    currency: 'BRL',
    billing_cycle: 'monthly',
    category: 'Jogos',
    next_billing_date: '2026-10-02',
    status: 'paused',
    monthly_equivalent_price: 59.99,
    yearly_equivalent_price: 719.88,
    is_due_soon: false,
    days_until_due: 9
  }
];
