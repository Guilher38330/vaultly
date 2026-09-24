import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import CategoryBadge from '@/Components/CategoryBadge';
import SubscriptionModal from '@/Components/SubscriptionModal';
import DeleteSubscriptionModal from '@/Components/DeleteSubscriptionModal';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    CalendarIcon,
    CurrencyDollarIcon,
    SearchIcon,
    BellAlertIcon,
    XMarkIcon,
    SparkleIcon,
    TagIcon,
} from '@/Components/Icons';
import { notifySubscriptionMutation, notifyMutationError } from '@/Utils/toastNotifications';
import FinancialAnalyticsSection from '@/Components/Charts/FinancialAnalyticsSection';

function ChevronUpIcon({ className = 'w-4 h-4', ...props }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            {...props}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
    );
}

function ChevronUpDownIcon({ className = 'w-4 h-4', ...props }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.75"
            {...props}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9"
            />
        </svg>
    );
}

function TableHeaderButton({
    field,
    label,
    activeSortField,
    sortOrder,
    onSort,
    shouldReduceMotion,
}) {
    const isActive = activeSortField === field;
    return (
        <button
            type="button"
            onClick={() => onSort(field)}
            className="group inline-flex items-center gap-1.5 font-semibold text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            aria-label={`Ordenar por ${label} (${isActive ? (sortOrder === 'asc' ? 'crescente' : 'decrescente') : 'inativo'})`}
        >
            <span>{label}</span>
            {isActive ? (
                <motion.span
                    initial={false}
                    animate={{ rotate: sortOrder === 'asc' ? 0 : 180 }}
                    transition={
                        shouldReduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 500, damping: 28 }
                    }
                    className="inline-flex text-emerald-600 dark:text-emerald-400"
                >
                    <ChevronUpIcon className="h-3.5 w-3.5 stroke-[2.5]" />
                </motion.span>
            ) : (
                <span className="inline-flex text-zinc-400 opacity-0 transition-opacity group-hover:opacity-70 dark:text-zinc-500">
                    <ChevronUpDownIcon className="h-3.5 w-3.5 stroke-[1.75]" />
                </span>
            )}
        </button>
    );
}

function formatCurrency(amount, currency = 'BRL') {
    const num = Number(amount) || 0;
    try {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency || 'BRL',
        }).format(num);
    } catch {
        return `${currency} ${num.toFixed(2)}`;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
}

function getDaysUntilDueBadge(days) {
    if (days < 0) {
        return (
            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                Vencida há {Math.abs(days)}d
            </span>
        );
    }
    if (days === 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Vence hoje!
            </span>
        );
    }
    if (days === 1) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Amanhã
            </span>
        );
    }
    if (days <= 7) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                Em {days} dias
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
            Em {days} dias
        </span>
    );
}

export default function Dashboard({
    subscriptions = [],
    metrics = {
        totals: { BRL: 0, USD: 0, EUR: 0 },
        yearly_totals: { BRL: 0, USD: 0, EUR: 0 },
        active_count: 0,
        paused_count: 0,
        due_soon_count: 0,
    },
    due_soon = [],
    categories = [],
}) {
    // Filters state
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [cycleFilter, setCycleFilter] = useState('all');

    // Sorting state
    const [sortField, setSortField] = useState('next_billing_date');
    const [sortOrder, setSortOrder] = useState('asc');

    // Reduced motion & variants
    const shouldReduceMotion = useReducedMotion();

    const containerVariants = useMemo(
        () => ({
            hidden: { opacity: shouldReduceMotion ? 1 : 0 },
            show: {
                opacity: 1,
                transition: shouldReduceMotion
                    ? { duration: 0 }
                    : {
                          staggerChildren: 0.08,
                          delayChildren: 0.05,
                      },
            },
        }),
        [shouldReduceMotion],
    );

    const cardVariants = useMemo(
        () => ({
            hidden: {
                opacity: shouldReduceMotion ? 1 : 0,
                y: shouldReduceMotion ? 0 : 20,
                scale: shouldReduceMotion ? 1 : 0.98,
            },
            show: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: shouldReduceMotion
                    ? { duration: 0 }
                    : {
                          type: 'spring',
                          stiffness: 300,
                          damping: 24,
                          mass: 0.8,
                      },
            },
        }),
        [shouldReduceMotion],
    );

    const cardHoverMotion = useMemo(
        () =>
            shouldReduceMotion
                ? undefined
                : {
                      y: -3,
                      transition: {
                          type: 'spring',
                          stiffness: 400,
                          damping: 25,
                      },
                  },
        [shouldReduceMotion],
    );

    // Modals state
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [deletingSubscription, setDeletingSubscription] = useState(null);

    // Quick toggle state
    const [togglingId, setTogglingId] = useState(null);

    // Active filters flag
    const isFiltered =
        search.trim() !== '' ||
        categoryFilter !== 'all' ||
        statusFilter !== 'all' ||
        cycleFilter !== 'all' ||
        sortField !== 'next_billing_date' ||
        sortOrder !== 'asc';

    const clearAllFilters = () => {
        setSearch('');
        setCategoryFilter('all');
        setStatusFilter('all');
        setCycleFilter('all');
        setSortField('next_billing_date');
        setSortOrder('asc');
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // Filtered & sorted subscriptions
    const filteredAndSortedSubscriptions = useMemo(() => {
        // 1. Filter phase
        const list = subscriptions.filter((sub) => {
            if (search.trim()) {
                const query = search.toLowerCase().trim();
                const nameMatch = sub.name?.toLowerCase().includes(query);
                const notesMatch = sub.notes?.toLowerCase().includes(query);
                const catMatch = sub.category?.toLowerCase().includes(query);
                if (!nameMatch && !notesMatch && !catMatch) {
                    return false;
                }
            }
            if (categoryFilter !== 'all' && sub.category !== categoryFilter) {
                return false;
            }
            if (statusFilter !== 'all' && sub.status !== statusFilter) {
                return false;
            }
            if (cycleFilter !== 'all' && sub.billing_cycle !== cycleFilter) {
                return false;
            }
            return true;
        });

        // 2. Sort phase
        return [...list].sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'next_billing_date':
                    if (!a.next_billing_date && !b.next_billing_date) comparison = 0;
                    else if (!a.next_billing_date) comparison = 1;
                    else if (!b.next_billing_date) comparison = -1;
                    else comparison = a.next_billing_date.localeCompare(b.next_billing_date);
                    break;
                case 'price': {
                    const priceA = Number(a.monthly_equivalent_price ?? a.price ?? 0);
                    const priceB = Number(b.monthly_equivalent_price ?? b.price ?? 0);
                    comparison = priceA - priceB;
                    break;
                }
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
                    break;
                case 'category':
                    comparison = (a.category || '').localeCompare(b.category || '', 'pt-BR', { sensitivity: 'base' });
                    break;
                case 'status':
                    comparison = (a.status || '').localeCompare(b.status || '');
                    break;
                default:
                    comparison = 0;
            }

            if (comparison !== 0) {
                return sortOrder === 'asc' ? comparison : -comparison;
            }

            const tie = (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
            return tie !== 0 ? tie : a.id - b.id;
        });
    }, [subscriptions, search, categoryFilter, statusFilter, cycleFilter, sortField, sortOrder]);

    // Action handlers
    const handleOpenCreate = () => {
        setEditingSubscription(null);
        setIsFormModalOpen(true);
    };

    const handleOpenEdit = (sub) => {
        setEditingSubscription(sub);
        setIsFormModalOpen(true);
    };

    const handleOpenDelete = (sub) => {
        setDeletingSubscription(sub);
        setIsDeleteModalOpen(true);
    };

    const handleToggleStatus = (sub) => {
        if (togglingId) return;
        const isPausing = sub.status === 'active';
        const targetStatus = isPausing ? 'paused' : 'active';
        const subName = sub.name;

        setTogglingId(sub.id);
        router.patch(
            route('subscriptions.toggle-status', sub.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    notifySubscriptionMutation('status_toggled', subName, targetStatus);
                },
                onError: () => {
                    notifyMutationError(
                        'Erro ao alterar status',
                        `Não foi possível alterar o status de "${subName}". Tente novamente.`
                    );
                },
                onFinish: () => setTogglingId(null),
            },
        );
    };

    // Ratio calculation
    const totalCount =
        (metrics.active_count || 0) + (metrics.paused_count || 0);
    const activePercent =
        totalCount > 0
            ? Math.round(((metrics.active_count || 0) / totalCount) * 100)
            : 0;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                            Rastreador de Assinaturas
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Gerencie seus gastos recorrentes, previsibilidade financeira e datas de faturas.
                        </p>
                    </div>

                    <PrimaryButton
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 self-start sm:self-auto"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>Nova Assinatura</span>
                    </PrimaryButton>
                </div>
            }
        >
            <Head title="Rastreador de Assinaturas" />

            <div className="py-8 sm:py-10">
                <motion.div
                    variants={containerVariants}
                    initial={shouldReduceMotion ? false : 'hidden'}
                    animate="show"
                    className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8"
                >
                    {/* Due Soon Alert Banner */}
                    {due_soon && due_soon.length > 0 && (
                        <motion.div
                            variants={cardVariants}
                            className="relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-5 shadow-sm dark:border-amber-500/30 dark:bg-zinc-900"
                        >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400">
                                        <BellAlertIcon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                            Atenção: {due_soon.length}{' '}
                                            {due_soon.length === 1
                                                ? 'fatura vencendo nos próximos 7 dias'
                                                : 'faturas vencendo nos próximos 7 dias'}
                                        </h3>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            Confira o saldo ou limite do seu cartão para evitar interrupções de serviço.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Due Soon Chips Grid */}
                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {due_soon.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-center justify-between rounded-xl border border-amber-200/80 bg-white/80 p-3 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/80"
                                    >
                                        <div className="min-w-0 pr-2">
                                            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                {item.name}
                                            </p>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                                                <span>{formatDate(item.next_billing_date)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                {formatCurrency(item.price, item.currency)}
                                            </p>
                                            <div className="mt-1">
                                                {getDaysUntilDueBadge(item.days_until_due)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                        {/* Card 1: Total BRL */}
                        <motion.div
                            variants={cardVariants}
                            whileHover={cardHoverMotion}
                            className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-colors hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/40"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Total Mensal Projetado
                                </span>
                                <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                                    <CurrencyDollarIcon className="h-5 w-5" />
                                </span>
                            </div>
                            <p className="mt-3 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                                {formatCurrency(metrics.totals?.BRL || 0, 'BRL')}
                            </p>
                            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                                <span>{metrics.active_count || 0} assinaturas ativas em BRL</span>
                                {metrics.yearly_totals?.BRL > 0 && (
                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                        ~{formatCurrency(metrics.yearly_totals.BRL, 'BRL')}/ano
                                    </span>
                                )}
                            </div>
                        </motion.div>

                        {/* Card 2: Foreign Currencies */}
                        <motion.div
                            variants={cardVariants}
                            whileHover={cardHoverMotion}
                            className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-colors hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/40"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Moedas Estrangeiras
                                </span>
                                <span className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400">
                                    <TagIcon className="h-5 w-5" />
                                </span>
                            </div>

                            <div className="mt-3 space-y-1">
                                {(metrics.totals?.USD > 0 || metrics.totals?.EUR > 0) ? (
                                    <div className="flex flex-wrap items-baseline gap-3">
                                        {metrics.totals?.USD > 0 && (
                                            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                                {formatCurrency(metrics.totals.USD, 'USD')}{' '}
                                                <span className="text-xs font-normal text-zinc-500">/mês</span>
                                            </span>
                                        )}
                                        {metrics.totals?.EUR > 0 && (
                                            <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                                {formatCurrency(metrics.totals.EUR, 'EUR')}{' '}
                                                <span className="text-xs font-normal text-zinc-500">/mês</span>
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                        $ 0,00 USD / € 0,00 EUR
                                    </p>
                                )}
                            </div>

                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Valores mensais calculados na moeda original
                            </p>
                        </motion.div>

                        {/* Card 3: Active vs Paused Ratio */}
                        <motion.div
                            variants={cardVariants}
                            whileHover={cardHoverMotion}
                            className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-colors hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-500/40"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Status das Assinaturas
                                </span>
                                <span className="rounded-xl bg-teal-100 p-2 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400">
                                    <SparkleIcon className="h-5 w-5" />
                                </span>
                            </div>

                            <p className="mt-3 text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                                {totalCount}{' '}
                                <span className="text-sm font-normal text-zinc-500">
                                    {totalCount === 1 ? 'cadastrada' : 'cadastradas'}
                                </span>
                            </p>

                            <div className="mt-3">
                                <div className="mb-1.5 flex justify-between text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        {metrics.active_count || 0} ativas ({activePercent}%)
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full bg-zinc-400" />
                                        {metrics.paused_count || 0} pausadas
                                    </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                    <div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                                        style={{ width: `${activePercent}%` }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Tier 3: Financial Analytics Section Container (Milestone 3 Mount Point) */}
                    <motion.div
                        variants={cardVariants}
                        id="financial-analytics-section"
                        className="w-full"
                    >
                        <FinancialAnalyticsSection
                            subscriptions={subscriptions}
                            categories={categories}
                            defaultCurrency="BRL"
                        />
                    </motion.div>

                    {/* Tier 4: Search & Multi-Filter Bar */}
                    <motion.div
                        variants={cardVariants}
                        className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                    >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            {/* Live Search Input */}
                            <div className="w-full lg:max-w-md">
                                <TextInput
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Buscar por serviço, categoria ou anotações..."
                                    icon={<SearchIcon className="h-4 w-4" />}
                                    className="w-full"
                                />
                            </div>

                            {/* Filters Controls */}
                            <div className="flex flex-wrap items-center gap-2.5">
                                {/* Category Filter */}
                                <div className="w-auto min-w-[140px]">
                                    <SelectInput
                                        size="sm"
                                        value={categoryFilter}
                                        onChange={(e) => setCategoryFilter(e.target.value)}
                                        className="text-xs font-medium"
                                    >
                                        <option value="all">Todas as Categorias</option>
                                        {categories.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </SelectInput>
                                </div>

                                {/* Status Filter */}
                                <div className="w-auto min-w-[125px]">
                                    <SelectInput
                                        size="sm"
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="text-xs font-medium"
                                    >
                                        <option value="all">Todos os Status</option>
                                        <option value="active">Ativas</option>
                                        <option value="paused">Pausadas</option>
                                    </SelectInput>
                                </div>

                                {/* Cycle Filter */}
                                <div className="w-auto min-w-[125px]">
                                    <SelectInput
                                        size="sm"
                                        value={cycleFilter}
                                        onChange={(e) => setCycleFilter(e.target.value)}
                                        className="text-xs font-medium"
                                    >
                                        <option value="all">Todos os Ciclos</option>
                                        <option value="monthly">Mensal</option>
                                        <option value="yearly">Anual</option>
                                    </SelectInput>
                                </div>

                                {/* Sort Filter (Mobile / Responsive) */}
                                <div className="w-auto min-w-[155px]">
                                    <SelectInput
                                        size="sm"
                                        value={`${sortField}:${sortOrder}`}
                                        onChange={(e) => {
                                            const [field, order] = e.target.value.split(':');
                                            setSortField(field);
                                            setSortOrder(order);
                                        }}
                                        className="text-xs font-medium"
                                        aria-label="Ordenar assinaturas"
                                    >
                                        <option value="next_billing_date:asc">Vencimento (Mais próximo)</option>
                                        <option value="next_billing_date:desc">Vencimento (Mais distante)</option>
                                        <option value="price:asc">Valor (Menor → Maior)</option>
                                        <option value="price:desc">Valor (Maior → Menor)</option>
                                        <option value="name:asc">Nome (A → Z)</option>
                                        <option value="name:desc">Nome (Z → A)</option>
                                        <option value="category:asc">Categoria (A → Z)</option>
                                        <option value="status:asc">Status (Ativas primeiro)</option>
                                        <option value="status:desc">Status (Pausadas primeiro)</option>
                                    </SelectInput>
                                </div>

                                {/* Clear Filters Button */}
                                {isFiltered && (
                                    <button
                                        type="button"
                                        onClick={clearAllFilters}
                                        className="inline-flex items-center gap-1 rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                    >
                                        <XMarkIcon className="h-3.5 w-3.5" />
                                        <span>Limpar Filtros</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Results Count */}
                        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                            <span>
                                Exibindo <strong>{filteredAndSortedSubscriptions.length}</strong> de{' '}
                                <strong>{subscriptions.length}</strong> assinaturas
                            </span>
                            {isFiltered && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                    Filtros aplicados
                                </span>
                            )}
                        </div>
                    </motion.div>

                    {/* Tier 5: Subscription Content Area */}
                    <motion.div variants={cardVariants} className="space-y-4">
                        {subscriptions.length === 0 ? (
                            /* Empty State: First-time User */
                            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                                    <SparkleIcon className="h-8 w-8" />
                                </div>
                                <h3 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                    Nenhuma assinatura cadastrada ainda.
                                </h3>
                                <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                                    Comece adicionando seus serviços recorrentes como Netflix, Spotify, planos de hospedagem ou internet!
                                </p>
                                <div className="mt-6">
                                    <PrimaryButton
                                        onClick={handleOpenCreate}
                                        className="inline-flex items-center gap-2"
                                    >
                                        <PlusIcon className="h-4 w-4" />
                                        <span>Adicionar Primeira Assinatura</span>
                                    </PrimaryButton>
                                </div>
                            </div>
                        ) : filteredAndSortedSubscriptions.length === 0 ? (
                            /* Empty State: Filtered */
                            <div className="rounded-2xl border border-zinc-200/80 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                    <SearchIcon className="h-6 w-6" />
                                </div>
                                <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-100">
                                    Nenhuma assinatura encontrada para os filtros selecionados.
                                </h3>
                                <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                                    Tente ajustar a busca ou redefinir os seletores de categoria, status e ciclo.
                                </p>
                                <div className="mt-5">
                                    <SecondaryButton onClick={clearAllFilters}>
                                        Limpar Filtros
                                    </SecondaryButton>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table */}
                                <div className="hidden overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:block">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-zinc-500 dark:text-zinc-400">
                                            <thead className="border-b border-zinc-200/80 bg-zinc-50/75 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                                                <tr>
                                                    <th scope="col" className="w-[26%] px-6 py-3.5">
                                                        <TableHeaderButton
                                                            field="name"
                                                            label="Serviço"
                                                            activeSortField={sortField}
                                                            sortOrder={sortOrder}
                                                            onSort={handleSort}
                                                            shouldReduceMotion={shouldReduceMotion}
                                                        />
                                                    </th>
                                                    <th scope="col" className="w-[14%] px-6 py-3.5">
                                                        <TableHeaderButton
                                                            field="category"
                                                            label="Categoria"
                                                            activeSortField={sortField}
                                                            sortOrder={sortOrder}
                                                            onSort={handleSort}
                                                            shouldReduceMotion={shouldReduceMotion}
                                                        />
                                                    </th>
                                                    <th scope="col" className="w-[12%] px-6 py-3.5">
                                                        Ciclo
                                                    </th>
                                                    <th scope="col" className="w-[16%] px-6 py-3.5">
                                                        <TableHeaderButton
                                                            field="next_billing_date"
                                                            label="Próxima Cobrança"
                                                            activeSortField={sortField}
                                                            sortOrder={sortOrder}
                                                            onSort={handleSort}
                                                            shouldReduceMotion={shouldReduceMotion}
                                                        />
                                                    </th>
                                                    <th scope="col" className="w-[14%] px-6 py-3.5">
                                                        <TableHeaderButton
                                                            field="price"
                                                            label="Valor"
                                                            activeSortField={sortField}
                                                            sortOrder={sortOrder}
                                                            onSort={handleSort}
                                                            shouldReduceMotion={shouldReduceMotion}
                                                        />
                                                    </th>
                                                    <th scope="col" className="w-[10%] px-6 py-3.5">
                                                        <TableHeaderButton
                                                            field="status"
                                                            label="Status"
                                                            activeSortField={sortField}
                                                            sortOrder={sortOrder}
                                                            onSort={handleSort}
                                                            shouldReduceMotion={shouldReduceMotion}
                                                        />
                                                    </th>
                                                    <th scope="col" className="w-[8%] px-6 py-3.5 text-right">
                                                        Ações
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
                                                <AnimatePresence initial={false}>
                                                    {filteredAndSortedSubscriptions.map((sub) => {
                                                        const isActive = sub.status === 'active';
                                                        const isToggling = togglingId === sub.id;

                                                        return (
                                                            <motion.tr
                                                                key={sub.id}
                                                                layout="position"
                                                                initial={{ opacity: 0, y: 8 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                                                                transition={
                                                                    shouldReduceMotion
                                                                        ? { duration: 0 }
                                                                        : {
                                                                              type: 'spring',
                                                                              stiffness: 350,
                                                                              damping: 30,
                                                                              mass: 0.8,
                                                                          }
                                                                }
                                                                className="transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40"
                                                            >
                                                                {/* Service Name & Notes */}
                                                                <td className="px-6 py-4">
                                                                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                                                                        {sub.name}
                                                                    </div>
                                                                    {sub.notes && (
                                                                        <p className="mt-0.5 max-w-xs truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                                            {sub.notes}
                                                                        </p>
                                                                    )}
                                                                </td>

                                                                {/* Category */}
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <CategoryBadge category={sub.category} />
                                                                </td>

                                                                {/* Billing Cycle */}
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                                        {sub.billing_cycle === 'yearly'
                                                                            ? 'Anual'
                                                                            : 'Mensal'}
                                                                    </span>
                                                                </td>

                                                                {/* Next Billing Date */}
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                                                            {formatDate(sub.next_billing_date)}
                                                                        </span>
                                                                        {isActive &&
                                                                            getDaysUntilDueBadge(sub.days_until_due)}
                                                                    </div>
                                                                </td>

                                                                {/* Price */}
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                                                        {formatCurrency(sub.price, sub.currency)}
                                                                        <span className="text-xs font-normal text-zinc-500">
                                                                            {' '}
                                                                            / {sub.billing_cycle === 'yearly' ? 'ano' : 'mês'}
                                                                        </span>
                                                                    </div>
                                                                    {sub.billing_cycle === 'yearly' && (
                                                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                            ~{formatCurrency(sub.monthly_equivalent_price, sub.currency)}/mês
                                                                        </p>
                                                                    )}
                                                                </td>

                                                                {/* Status Quick Toggle */}
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <button
                                                                        type="button"
                                                                        disabled={isToggling}
                                                                        onClick={() => handleToggleStatus(sub)}
                                                                        title={
                                                                            isActive
                                                                                ? 'Clique para pausar assinatura'
                                                                                : 'Clique para reativar assinatura'
                                                                        }
                                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                                                                            isActive
                                                                                ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70'
                                                                                : 'border border-zinc-300 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                                                                        }`}
                                                                    >
                                                                        <span
                                                                            className={`h-2 w-2 rounded-full ${
                                                                                isActive
                                                                                    ? 'bg-emerald-500 animate-pulse'
                                                                                    : 'bg-zinc-400'
                                                                            }`}
                                                                        />
                                                                        <span>{isActive ? 'Ativa' : 'Pausada'}</span>
                                                                    </button>
                                                                </td>

                                                                {/* Actions */}
                                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenEdit(sub)}
                                                                            title="Editar Assinatura"
                                                                            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-emerald-600 dark:hover:bg-zinc-800 dark:hover:text-emerald-400"
                                                                        >
                                                                            <PencilIcon className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleOpenDelete(sub)}
                                                                            title="Excluir Assinatura"
                                                                            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-rose-600 dark:hover:bg-zinc-800 dark:hover:text-rose-400"
                                                                        >
                                                                            <TrashIcon className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </motion.tr>
                                                        );
                                                    })}
                                                </AnimatePresence>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Mobile Cards Grid */}
                                <div className="space-y-3.5 md:hidden">
                                    <AnimatePresence mode="popLayout" initial={false}>
                                        {filteredAndSortedSubscriptions.map((sub) => {
                                            const isActive = sub.status === 'active';
                                            const isToggling = togglingId === sub.id;

                                            return (
                                                <motion.div
                                                    key={sub.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.96, y: 12 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    transition={
                                                        shouldReduceMotion
                                                            ? { duration: 0 }
                                                            : {
                                                                  type: 'spring',
                                                                  stiffness: 320,
                                                                  damping: 26,
                                                                  mass: 0.8,
                                                              }
                                                    }
                                                    className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition hover:border-emerald-300 dark:border-zinc-800 dark:bg-zinc-900"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100">
                                                                {sub.name}
                                                            </h4>
                                                            <div className="mt-1 flex items-center gap-2">
                                                                <CategoryBadge category={sub.category} />
                                                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                                                    {sub.billing_cycle === 'yearly'
                                                                        ? 'Anual'
                                                                        : 'Mensal'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            disabled={isToggling}
                                                            onClick={() => handleToggleStatus(sub)}
                                                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                                isActive
                                                                    ? 'border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                                    : 'border border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`h-2 w-2 rounded-full ${
                                                                    isActive
                                                                        ? 'bg-emerald-500 animate-pulse'
                                                                        : 'bg-zinc-400'
                                                                }`}
                                                            />
                                                            <span>{isActive ? 'Ativa' : 'Pausada'}</span>
                                                        </button>
                                                    </div>

                                                    {sub.notes && (
                                                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                            {sub.notes}
                                                        </p>
                                                    )}

                                                    <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                                                        <div>
                                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                Valor
                                                            </span>
                                                            <p className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                                                                {formatCurrency(sub.price, sub.currency)}
                                                                <span className="text-xs font-normal text-zinc-500">
                                                                    {' '}
                                                                    / {sub.billing_cycle === 'yearly' ? 'ano' : 'mês'}
                                                                </span>
                                                            </p>
                                                            {sub.billing_cycle === 'yearly' && (
                                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                    ~{formatCurrency(sub.monthly_equivalent_price, sub.currency)}/mês
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="text-right">
                                                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                Próxima Cobrança
                                                            </span>
                                                            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                                                                {formatDate(sub.next_billing_date)}
                                                            </p>
                                                            {isActive && (
                                                                <div className="mt-1">
                                                                    {getDaysUntilDueBadge(sub.days_until_due)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEdit(sub)}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                                        >
                                                            <PencilIcon className="h-3.5 w-3.5" />
                                                            <span>Editar</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDelete(sub)}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 shadow-xs hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/80"
                                                        >
                                                            <TrashIcon className="h-3.5 w-3.5" />
                                                            <span>Excluir</span>
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            </>
                        )}
                    </motion.div>
                </motion.div>
            </div>

            {/* Modals */}
            <SubscriptionModal
                show={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                subscription={editingSubscription}
                categories={categories}
            />

            <DeleteSubscriptionModal
                show={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                subscription={deletingSubscription}
            />
        </AuthenticatedLayout>
    );
}
