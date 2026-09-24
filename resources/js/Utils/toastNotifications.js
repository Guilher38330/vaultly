import { toast } from 'sonner';

/**
 * Timestamp of the most recent client-initiated toast notification.
 * Used to suppress redundant generic session flash messages.
 */
let lastClientToastTimestamp = 0;

/**
 * Checks whether a client-initiated toast occurred recently within the threshold.
 *
 * @param {number} thresholdMs
 * @returns {boolean}
 */
export function isRecentClientToast(thresholdMs = 1500) {
    return Date.now() - lastClientToastTimestamp < thresholdMs;
}

/**
 * Trigger styled toast notification for subscription actions.
 *
 * @param {'created' | 'updated' | 'deleted' | 'status_toggled'} action
 * @param {string} subscriptionName
 * @param {'active' | 'paused' | string} [status]
 * @returns {string | number} Toast identifier
 */
export function notifySubscriptionMutation(action, subscriptionName, status) {
    lastClientToastTimestamp = Date.now();
    const safeName = subscriptionName?.trim() || 'Assinatura';

    switch (action) {
        case 'created':
            return toast.success('Assinatura cadastrada!', {
                description: `"${safeName}" foi adicionada com sucesso ao seu rastreador.`,
                duration: 4000,
            });

        case 'updated':
            return toast.success('Assinatura atualizada!', {
                description: `As alterações em "${safeName}" foram salvas com sucesso.`,
                duration: 4000,
            });

        case 'deleted':
            return toast.success('Assinatura removida!', {
                description: `"${safeName}" foi removida permanentemente.`,
                duration: 4000,
            });

        case 'status_toggled':
            if (status === 'paused') {
                return toast.info('Assinatura pausada', {
                    description: `"${safeName}" foi pausada temporariamente.`,
                    duration: 4000,
                });
            } else {
                return toast.success('Assinatura reativada', {
                    description: `"${safeName}" está ativa novamente.`,
                    duration: 4000,
                });
            }

        default:
            return toast.success('Operação concluída com sucesso!', {
                description: `Ação realizada em "${safeName}".`,
                duration: 4000,
            });
    }
}

/**
 * Standardized error toast notification helper.
 *
 * @param {string} [title] Error title
 * @param {string} [description] Detailed error message
 * @returns {string | number}
 */
export function notifyMutationError(title = 'Ocorreu um erro', description = 'Tente novamente em instantes.') {
    return toast.error(title, {
        description,
        duration: 5000,
    });
}
