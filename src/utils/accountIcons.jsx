/**
 * Shared account icon renderer.
 * Converts emoji icon strings into consistent SVG icons across the app.
 */

const svgProps = (size = 22) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '1.6',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
});

const ICON_MAP = {
  '💵': (s) => (
    <svg {...svgProps(s)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  ),
  '🏦': (s) => (
    <svg {...svgProps(s)}>
      <path d="M3 21h18" />
      <path d="M4 21v-4" />
      <path d="M20 21v-4" />
      <path d="M8 21v-4" />
      <path d="M12 21v-4" />
      <path d="M16 21v-4" />
      <path d="M2 9L12 2l10 7v4H2V9z" />
    </svg>
  ),
  '📱': (s) => (
    <svg {...svgProps(s)}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  '💳': (s) => (
    <svg {...svgProps(s)}>
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  '💼': (s) => (
    <svg {...svgProps(s)}>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  '🪙': (s) => (
    <svg {...svgProps(s)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="12" y1="2" x2="12" y2="6" />
    </svg>
  ),
  '💰': (s) => (
    <svg {...svgProps(s)}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  '🏧': (s) => (
    <svg {...svgProps(s)}>
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <rect x="6" y="5" width="12" height="6" />
      <rect x="8" y="14" width="8" height="2" />
    </svg>
  ),
  '👛': (s) => (
    <svg {...svgProps(s)}>
      <path d="M4 8h16l1 12H3L4 8z" />
      <path d="M8 8V6a4 4 0 0 1 8 0v2" />
    </svg>
  ),
};

/**
 * Render an account icon as SVG.
 * Falls back to the raw emoji/string if no SVG mapping exists.
 *
 * @param {string} icon - The emoji string stored on the account (e.g. '💵')
 * @param {number} [size=22] - SVG icon size in px
 * @returns {JSX.Element}
 */
export function renderAccountIcon(icon, size = 22) {
  const renderer = ICON_MAP[icon];
  if (renderer) return renderer(size);
  return <span style={{ fontSize: size * 0.65 }}>{icon}</span>;
}

/**
 * Get SVG icon for an account object (with fallback by id/name).
 * Used by AccountDropdown and similar where a full account object is available.
 *
 * @param {Object} account - Account object with icon, id, name fields
 * @param {number} [size=20] - SVG icon size in px
 * @returns {JSX.Element}
 */
export function getAccountIcon(account, size = 20) {
  const ic = account?.icon;

  // Direct emoji match
  if (ic && ICON_MAP[ic]) return ICON_MAP[ic](size);

  // Fallback: infer from id/name
  const idStr = account?.id?.toLowerCase() || '';
  const nameStr = account?.name?.toLowerCase() || '';

  if (idStr.includes('bank') || nameStr.includes('bank')) return ICON_MAP['🏦'](size);
  if (idStr.includes('mobile') || nameStr.includes('mobile')) return ICON_MAP['📱'](size);
  if (idStr.includes('card') || nameStr.includes('card') || nameStr.includes('credit')) return ICON_MAP['💳'](size);
  if (idStr.includes('salary') || nameStr.includes('salary')) return ICON_MAP['💼'](size);

  return ICON_MAP['💵'](size);
}
