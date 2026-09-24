import React, { useEffect } from 'react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import SelectInput from '@/Components/SelectInput';
import ComboboxInput from '@/Components/ComboboxInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { PlusIcon, PencilIcon, XMarkIcon } from '@/Components/Icons';
import { useForm } from '@inertiajs/react';
import { notifySubscriptionMutation, notifyMutationError } from '@/Utils/toastNotifications';

export default function SubscriptionModal({
    show = false,
    onClose = () => {},
    subscription = null,
    categories = [],
}) {
    const isEdit = Boolean(subscription);

    const {
        data,
        setData,
        post,
        put,
        processing,
        errors,
        reset,
        clearErrors,
    } = useForm({
        name: '',
        price: '',
        currency: 'BRL',
        billing_cycle: 'monthly',
        category: '',
        next_billing_date: '',
        status: 'active',
        notes: '',
    });

    useEffect(() => {
        if (!show) {
            return;
        }

        if (subscription) {
            setData({
                name: subscription.name || '',
                price: subscription.price !== undefined ? String(subscription.price) : '',
                currency: subscription.currency || 'BRL',
                billing_cycle: subscription.billing_cycle || 'monthly',
                category: subscription.category || '',
                next_billing_date: subscription.next_billing_date || '',
                status: subscription.status || 'active',
                notes: subscription.notes || '',
            });
        } else {
            reset();
            setData({
                name: '',
                price: '',
                currency: 'BRL',
                billing_cycle: 'monthly',
                category: '',
                next_billing_date: '',
                status: 'active',
                notes: '',
            });
        }
        clearErrors();
    }, [subscription, show]);

    const handleClose = () => {
        if (!processing) {
            clearErrors();
            reset();
            onClose();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const targetName = data.name;

        if (isEdit) {
            put(route('subscriptions.update', subscription.id), {
                preserveScroll: true,
                onSuccess: () => {
                    notifySubscriptionMutation('updated', targetName);
                    reset();
                    onClose();
                },
                onError: (formErrors) => {
                    const count = Object.keys(formErrors || {}).length;
                    notifyMutationError(
                        'Erro ao atualizar assinatura',
                        count > 1
                            ? `Por favor, revise os ${count} campos destacados.`
                            : 'Por favor, revise o campo destacado.'
                    );
                },
            });
        } else {
            post(route('subscriptions.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    notifySubscriptionMutation('created', targetName);
                    reset();
                    onClose();
                },
                onError: (formErrors) => {
                    const count = Object.keys(formErrors || {}).length;
                    notifyMutationError(
                        'Erro ao cadastrar assinatura',
                        count > 1
                            ? `Por favor, revise os ${count} campos destacados.`
                            : 'Por favor, revise o campo destacado.'
                    );
                },
            });
        }
    };

    return (
        <Modal show={show} onClose={handleClose} maxWidth="2xl">
            <form onSubmit={handleSubmit} className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-zinc-200/80 pb-4 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                            {isEdit ? (
                                <PencilIcon className="h-5 w-5" />
                            ) : (
                                <PlusIcon className="h-5 w-5" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                                {isEdit ? 'Editar Assinatura' : 'Nova Assinatura'}
                            </h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {isEdit
                                    ? 'Atualize as informações do seu serviço ou plano recorrente.'
                                    : 'Cadastre um novo serviço para monitorar cobranças e valores.'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={processing}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Form Fields */}
                <div className="mt-6 space-y-5">
                    {/* Name */}
                    <div>
                        <InputLabel htmlFor="name" value="Nome do Serviço *" />
                        <TextInput
                            id="name"
                            name="name"
                            value={data.name}
                            className="mt-1 block w-full"
                            hasError={Boolean(errors.name)}
                            placeholder="Ex: Netflix, Spotify, AWS, GitHub Copilot"
                            isFocused={show && !isEdit}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                        />
                        <InputError message={errors.name} className="mt-1.5" />
                    </div>

                    {/* Price, Currency, Billing Cycle */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                            <InputLabel htmlFor="price" value="Valor *" />
                            <TextInput
                                id="price"
                                name="price"
                                type="number"
                                step="0.01"
                                min="0.01"
                                value={data.price}
                                className="mt-1 block w-full"
                                hasError={Boolean(errors.price)}
                                placeholder="0.00"
                                onChange={(e) => setData('price', e.target.value)}
                                required
                            />
                            <InputError message={errors.price} className="mt-1.5" />
                        </div>

                        <div>
                            <InputLabel htmlFor="currency" value="Moeda *" />
                            <SelectInput
                                id="currency"
                                name="currency"
                                value={data.currency}
                                onChange={(e) => setData('currency', e.target.value)}
                                className="mt-1 block w-full"
                                hasError={Boolean(errors.currency)}
                                required
                            >
                                <option value="BRL">BRL (R$)</option>
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                            </SelectInput>
                            <InputError message={errors.currency} className="mt-1.5" />
                        </div>

                        <div>
                            <InputLabel htmlFor="billing_cycle" value="Ciclo *" />
                            <SelectInput
                                id="billing_cycle"
                                name="billing_cycle"
                                value={data.billing_cycle}
                                onChange={(e) => setData('billing_cycle', e.target.value)}
                                className="mt-1 block w-full"
                                hasError={Boolean(errors.billing_cycle)}
                                required
                            >
                                <option value="monthly">Mensal</option>
                                <option value="yearly">Anual</option>
                            </SelectInput>
                            <InputError message={errors.billing_cycle} className="mt-1.5" />
                        </div>
                    </div>

                    {/* Category with Datalist & Next Billing Date */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel htmlFor="category" value="Categoria *" />
                            <ComboboxInput
                                id="category"
                                name="category"
                                value={data.category}
                                options={categories || []}
                                className="mt-1"
                                hasError={Boolean(errors.category)}
                                placeholder="Ex: Streaming, Produtividade, Cloud"
                                onChange={(e) => setData('category', e.target.value)}
                                required
                            />
                            <InputError message={errors.category} className="mt-1.5" />
                        </div>

                        <div>
                            <InputLabel
                                htmlFor="next_billing_date"
                                value="Próxima Cobrança *"
                            />
                            <TextInput
                                id="next_billing_date"
                                name="next_billing_date"
                                type="date"
                                value={data.next_billing_date}
                                className="mt-1 block w-full"
                                hasError={Boolean(errors.next_billing_date)}
                                onChange={(e) =>
                                    setData('next_billing_date', e.target.value)
                                }
                                required
                            />
                            <InputError
                                message={errors.next_billing_date}
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <InputLabel value="Status da Assinatura *" />
                        <div className="mt-2 flex items-center gap-6">
                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="radio"
                                    name="status"
                                    value="active"
                                    checked={data.status === 'active'}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className="h-4 w-4 border-zinc-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900"
                                />
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Ativa
                                </span>
                            </label>

                            <label className="flex cursor-pointer items-center gap-2">
                                <input
                                    type="radio"
                                    name="status"
                                    value="paused"
                                    checked={data.status === 'paused'}
                                    onChange={(e) => setData('status', e.target.value)}
                                    className="h-4 w-4 border-zinc-300 text-amber-600 focus:ring-amber-500 dark:border-zinc-700 dark:bg-zinc-900"
                                />
                                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                    Pausada
                                </span>
                            </label>
                        </div>
                        <InputError message={errors.status} className="mt-1.5" />
                    </div>

                    {/* Notes */}
                    <div>
                        <InputLabel htmlFor="notes" value="Observações (Opcional)" />
                        <textarea
                            id="notes"
                            name="notes"
                            rows={3}
                            value={data.notes || ''}
                            onChange={(e) => setData('notes', e.target.value)}
                            placeholder="Informações adicionais como forma de pagamento, detalhes do plano..."
                            maxLength={1000}
                            className="mt-1 block w-full rounded-xl border border-zinc-300/90 bg-white/95 px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs placeholder:text-zinc-400 transition-all duration-200 hover:border-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:hover:border-zinc-600 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/20"
                        />
                        <InputError message={errors.notes} className="mt-1.5" />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex justify-end gap-3 border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
                    <SecondaryButton onClick={handleClose} disabled={processing}>
                        Cancelar
                    </SecondaryButton>

                    <PrimaryButton processing={processing}>
                        {isEdit ? 'Salvar Alterações' : 'Cadastrar Assinatura'}
                    </PrimaryButton>
                </div>
            </form>
        </Modal>
    );
}
