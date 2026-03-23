import { useSettingsStore } from '../stores/useSettingsStore';
import { formatAmount } from '../utils/currencies';

/**
 * usePrivacy — Platform-wide privacy hook.
 *
 * Returns:
 *  - hidden: boolean — whether balances are masked
 *  - toggle: () => void — toggles the setting
 *  - mask: (amount, currency) => string — returns masked or formatted value
 *  - maskText: (text) => string — masks arbitrary text (e.g. "৳5,000" → "••••")
 */
export function usePrivacy() {
  const hidden = useSettingsStore((s) => s.hideBalances);
  const toggle = useSettingsStore((s) => s.toggleHideBalances);

  const mask = (amount, currency) => {
    if (hidden) return '••••';
    return formatAmount(amount, currency);
  };

  const maskText = (text) => {
    if (hidden) return '••••';
    return text;
  };

  return { hidden, toggle, mask, maskText };
}
