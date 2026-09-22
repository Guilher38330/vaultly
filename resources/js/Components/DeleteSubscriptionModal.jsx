import React, { useState } from 'react';
import Modal from '@/Components/Modal';
import DangerButton from '@/Components/DangerButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { TrashIcon, AlertIcon } from '@/Components/Icons';
import { router } from '@inertiajs/react';

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

export default function DeleteSubscriptionModal({
    show = false,
    onClose = () => {},
    subscription = null,
}) {
    const [processing, setProcessing] = useState(false);

    const handleDelete = () => {
        if (!subscription) return;

        setProcessing(true);
        router.delete(route('subscriptions.destroy', subscription.id), {
            preserveScroll: true,
            onSuccess: () => {
                setProcessing(false);
                onClose();
            },
            onError: () => {
                setProcessing(false);
            },
            onFinish: () => {
                setProcessing(false);
            },
        });
    };

    const handleClose = () => {
        if (!processing) {
            onClose();
        }
    };

    if (!subscription) return null;

    const formattedCost = formatCurrency(subscription.price, subscription.currency);
    const cycleLabel = subscription.billing_cycle === 'yearly' ? 'ano' : 'mês';

    return (
        <Modal show={show} onClose={handleClose} maxWidth="md">
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                        <TrashIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            Excluir Assinatura
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Esta ação não pode ser desfeita.
                        </p>
                    </div>
                </div>

                <div className="mt-5 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800/80 dark:bg-zinc-800/40">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        Tem certeza de que deseja remover a assinatura{' '}
                        <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {subscription.name}
                        </strong>
                        ?
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                        <span>Valor:</span>
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {formattedCost} / {cycleLabel}
                        </span>
                    </div>
                    {subscription.category && (
                        <div className="mt-1 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                            <span>Categoria:</span>
                            <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                {subscription.category}
                            </span>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton onClick={handleClose} disabled={processing}>
                        Cancelar
                    </SecondaryButton>

                    <DangerButton
                        onClick={handleDelete}
                        disabled={processing}
                        className="inline-flex items-center gap-2"
                    >
                        {processing ? (
                            <>
                                <svg
                                    className="-ms-1 h-3.5 w-3.5 animate-spin text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                <span>Excluindo...</span>
                            </>
                        ) : (
                            'Confirmar Exclusão'
                        )}
                    </DangerButton>
                </div>
            </div>
        </Modal>
    );
}
