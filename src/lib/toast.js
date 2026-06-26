/**
 * Global toast bus — use with <Toaster /> mounted once in the app tree.
 * Top-right positioning is handled by the Toaster component.
 */

let idSeq = 0;
const listeners = new Set();

export function subscribeToasts(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function emit(action) {
    listeners.forEach((fn) => {
        try {
            fn(action);
        } catch {
            /* ignore subscriber errors */
        }
    });
}

/**
 * @param {string} message
 * @param {{ variant?: 'success' | 'error' | 'info', duration?: number }} [options]
 */
export function toast(message, options = {}) {
    const id = ++idSeq;
    const item = {
        id,
        message: String(message ?? ''),
        variant: options.variant ?? 'info',
        duration: options.duration ?? 4500,
    };
    emit({ type: 'add', toast: item });
    return id;
}

toast.success = (message, options = {}) =>
    toast(message, { ...options, variant: 'success' });

toast.error = (message, options = {}) =>
    toast(message, { ...options, variant: 'error' });

toast.info = (message, options = {}) =>
    toast(message, { ...options, variant: 'info' });
