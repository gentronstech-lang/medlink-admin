/**
 * Default currency — West African CFA (Franc CFA).
 * XOF is the ISO 4217 code; UI uses "CFA" unless the API sends another code.
 */
export const APP_CURRENCY_CODE = 'XOF';
export const APP_CURRENCY_DISPLAY = 'CFA';

export function formatAmount(amount) {
    const n = Number(amount);
    return Number.isFinite(n) ? n.toLocaleString() : '0';
}

/** UI label — project standard CFA (ignore legacy API currency codes). */
export function resolveCurrency(_currencyFromApi) {
    return APP_CURRENCY_DISPLAY;
}

/** "12,345 CFA" style (amount + space + code/label). */
export function formatMoney(amount, currencyFromApi) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return `— ${resolveCurrency(currencyFromApi)}`;
    return `${n.toLocaleString()} ${resolveCurrency(currencyFromApi)}`;
}
