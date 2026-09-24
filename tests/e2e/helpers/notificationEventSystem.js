/**
 * Notification Event System Spy & Theme Observer Harness
 * 
 * Verifies R2 (Sonner Toast Notifications):
 * - Toast event emissions for CRUD and status toggle mutations
 * - Theme synchronization via MutationObserver on html.dark
 * - Inertia session flash handling
 * - Queue depth, dismissal, and error handling
 */

export class NotificationEventSystem {
  constructor() {
    this.toasts = [];
    this.activeTheme = 'light';
    this.observerCallbacks = [];
    this.history = [];
  }

  /**
   * Resets all captured toasts and history.
   */
  reset() {
    this.toasts = [];
    this.history = [];
    this.activeTheme = 'light';
    this.observerCallbacks = [];
  }

  /**
   * Simulates setting the document theme.
   */
  setTheme(theme) {
    const prev = this.activeTheme;
    this.activeTheme = theme === 'dark' ? 'dark' : 'light';
    for (const cb of this.observerCallbacks) {
      cb(this.activeTheme, prev);
    }
  }

  /**
   * Registers a theme mutation callback.
   */
  onThemeChange(cb) {
    this.observerCallbacks.push(cb);
  }

  /**
   * Simulates toast emission (success, error, info, warning).
   */
  emitToast(type, message, options = {}) {
    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const toast = {
      id,
      type,
      message,
      description: options.description || '',
      theme: this.activeTheme,
      timestamp: Date.now(),
      dismissed: false,
      ...options
    };
    this.toasts.push(toast);
    this.history.push({ event: 'emit', toast });
    return id;
  }

  /**
   * Dismisses a toast by id.
   */
  dismiss(id) {
    const toast = this.toasts.find((t) => t.id === id);
    if (toast) {
      toast.dismissed = true;
      this.history.push({ event: 'dismiss', id });
      return true;
    }
    return false;
  }

  /**
   * Standard mutation notification handler per PROJECT.md interface contract.
   */
  notifySubscriptionMutation(action, subscriptionName, status = null) {
    const safeName = subscriptionName || 'Assinatura';
    switch (action) {
      case 'created':
        return this.emitToast('success', 'Assinatura cadastrada!', {
          description: `"${safeName}" foi adicionada com sucesso.`,
          action: 'created',
          target: safeName
        });
      case 'updated':
        return this.emitToast('success', 'Assinatura atualizada!', {
          description: `"${safeName}" teve seus dados salvos.`,
          action: 'updated',
          target: safeName
        });
      case 'deleted':
        return this.emitToast('success', 'Assinatura removida!', {
          description: `"${safeName}" foi excluída permanentemente.`,
          action: 'deleted',
          target: safeName
        });
      case 'status_toggled':
        if (status === 'paused') {
          return this.emitToast('info', 'Assinatura pausada', {
            description: `"${safeName}" foi pausada temporariamente.`,
            action: 'status_toggled',
            status: 'paused',
            target: safeName
          });
        } else {
          return this.emitToast('success', 'Assinatura reativada', {
            description: `"${safeName}" está ativa novamente.`,
            action: 'status_toggled',
            status: 'active',
            target: safeName
          });
        }
      case 'error':
        return this.emitToast('error', 'Erro na operação', {
          description: `Falha ao processar "${safeName}".`,
          action: 'error',
          target: safeName
        });
      default:
        return this.emitToast('info', 'Notificação', {
          description: `Ação ${action} executada em "${safeName}".`,
          action,
          target: safeName
        });
    }
  }

  /**
   * Simulates Inertia flash prop synchronization.
   */
  handleInertiaFlash(flash) {
    if (!flash) return;
    if (flash.success) {
      this.emitToast('success', flash.success, { source: 'flash' });
    }
    if (flash.error) {
      this.emitToast('error', flash.error, { source: 'flash' });
    }
  }

  getActiveToasts() {
    return this.toasts.filter((t) => !t.dismissed);
  }

  findToastByAction(action) {
    return this.toasts.find((t) => t.action === action);
  }

  findToastByMessage(substr) {
    return this.toasts.find((t) => t.message.includes(substr) || t.description.includes(substr));
  }
}
