<h1 align="center">
  <br>
  🔒 Vaultly
  <br>
</h1>

<p align="center">
  Rastreador de assinaturas e gastos recorrentes com painel financeiro multimoeda, alertas de vencimento e modo claro/escuro. Construído com Laravel 12, React 18 e Inertia v2. Seguro por design: Anti-IDOR, Anti-XSS e cobertura completa de testes.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Laravel-12-FF2D20?style=flat-square&logo=laravel&logoColor=white" alt="Laravel 12">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 18">
  <img src="https://img.shields.io/badge/Inertia.js-v2-9553E9?style=flat-square&logo=inertia&logoColor=white" alt="Inertia v2">
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/PHP-8.5-777BB4?style=flat-square&logo=php&logoColor=white" alt="PHP 8.5">
  <img src="https://img.shields.io/badge/license-MIT-10b981?style=flat-square" alt="MIT License">
</p>

---

## ✨ Funcionalidades

- **📊 Painel Financeiro Multimoeda** — Projeção de gastos mensais e anuais separados por BRL, USD e EUR.
- **📈 Gráficos Analíticos** — Visualização de distribuição por categoria (Rosca) e projeção de caixa futuro (Área) usando **Recharts**.
- **🔔 Notificações Inteligentes** — Sistema de toast elegante e moderno (via **Sonner**) para feedback instantâneo nas ações de CRUD.
- **✨ Animações Fluidas** — Transições de layout, entradas em cascata e modais com física de mola alimentados pelo **Framer Motion**.
- **🌌 Experiência 3D** — Showcase cósmico interativo nas telas de autenticação renderizado em WebGL com **React Three Fiber**.
- **⏸️ Pausar / Ativar** — Toggle rápido de status direto na listagem; assinaturas pausadas são excluídas dos totais projetados.
- **🏷️ Badges e Filtros** — Cores geradas automaticamente a partir da categoria, com pesquisa e filtro em tempo real.
- **📱 Componentes Acessíveis** — Selects customizados e comboboxes totalmente navegáveis via teclado usando **Headless UI**.
- **🌙 Modo Claro / Escuro** — Alternância suave com paleta esmeralda e persistência via `localStorage`.

---

## 🔒 Segurança (Secure by Design)

| Camada | Implementação |
|---|---|
| **Anti-IDOR** | `SubscriptionPolicy` garante que cada operação é escopada ao usuário autenticado (`$user->id === $subscription->user_id`) |
| **Anti-XSS** | `SubscriptionRequest` aplica `strip_tags()` e `trim()` em campos de texto antes da validação |
| **Data Leaks** | `SubscriptionResource` serializa apenas os campos whitelistados, impedindo vazamento de dados internos via Inertia |
| **Rate Limiting** | Rotas de mutação protegidas com `throttle:60,1` |
| **Mass Assignment** | `$fillable` explícito no modelo `Subscription` |

---

## 🧪 Testes Automatizados

```bash
# Executar a suíte de testes do rastreador
vendor/bin/sail artisan test --filter=SubscriptionTest
```

A suíte cobre **33 testes e 314 asserções**, incluindo:
- Isolamento de tenant (Anti-IDOR): tentativas de acesso cruzado retornam `403 Forbidden`
- Sanitização XSS: injeções de tags HTML são removidas automaticamente
- Limites de validação: preços negativos, moedas inválidas e campos obrigatórios
- Regras de negócio: cálculo proporcional anual↔mensal, exclusão de pausadas dos totais, escopo `due_soon`

---

## 🚀 Instalação

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução
- [WSL 2](https://docs.microsoft.com/pt-br/windows/wsl/install) (no Windows)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/vaultly.git
cd vaultly

# 2. Copie o arquivo de ambiente
cp .env.example .env

# 3. Instale as dependências PHP
docker run --rm -u "$(id -u):$(id -g)" \
    -v "$(pwd)":/var/www/html \
    -w /var/www/html \
    laravelsail/php85-composer:latest \
    composer install --ignore-platform-reqs

# 4. Suba os containers
./vendor/bin/sail up -d

# 5. Gere a chave da aplicação
./vendor/bin/sail artisan key:generate

# 6. Execute as migrations e seeders
./vendor/bin/sail artisan migrate --seed

# 7. Instale as dependências JS e compile os assets
./vendor/bin/sail npm install
./vendor/bin/sail npm run build
```

Acesse em: **http://localhost**

---

## 🛠️ Stack Técnica

| Camada | Tecnologia |
|---|---|
| Backend | Laravel 12 + PHP 8.5 |
| Frontend | React 18 + Inertia.js v2 |
| Estilização | Tailwind CSS v4 + Headless UI |
| Animações & UI | Framer Motion + Sonner |
| Gráficos & 3D | Recharts + React Three Fiber |
| Build | Vite 8 |
| Ambiente | Laravel Sail (Docker) |
| Testes | PHPUnit / Laravel Feature Tests |
| Formatação | Laravel Pint |

---

## 📁 Estrutura Relevante

```
app/
├── Http/
│   ├── Controllers/SubscriptionController.php
│   ├── Requests/SubscriptionRequest.php       # Validação + sanitização Anti-XSS
│   └── Resources/SubscriptionResource.php    # Whitelist Anti-Data Leak
├── Models/Subscription.php                    # Scopes, accessors e proteção Mass Assignment
└── Policies/SubscriptionPolicy.php           # Autorização Anti-IDOR

resources/js/ 
├── Components/
│   ├── Subscriptions/
│   │   ├── CategoryBadge.jsx                 # Badges com hash de cor determinístico
│   │   ├── SubscriptionModal.jsx             # Modal de criação e edição
│   │   └── DeleteSubscriptionModal.jsx
│   ├── CosmicShowcasePanel.jsx               # Painel animado das telas de auth
│   └── ThemeToggle.jsx
└── Pages/
    ├── Auth/                                  # Login, Register, ForgotPassword...
    └── Dashboard.jsx                          # Centro financeiro principal

tests/Feature/
├── SubscriptionTest.php                       # 33 testes, 314 asserções
└── SubscriptionAdversarialStressTest.php      # 10 testes de estresse
```

---

## 📄 Licença

Distribuído sob a licença [MIT](https://opensource.org/licenses/MIT).
