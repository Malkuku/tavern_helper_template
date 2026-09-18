export const ScenarioIconPaths: Record<string, string> = {
  'broken-mirror': `
    <path fill="none" stroke="currentColor" stroke-width="3" d="M16 8 H48 V56 H16 Z"/>
    <path fill="currentColor" d="M16 8 L30 20 L25 35 L40 30 L48 56 L48 8 Z" opacity="0.3"/>
    <path fill="none" stroke="currentColor" stroke-width="1" d="M20 12 L35 28 L28 40 L44 36"/>
  `,
  cup: `
    <path fill="currentColor" d="M18 8 C18 8, 16 32, 32 32 C48 32, 46 8, 46 8 H18 Z" opacity="0.8"/>
    <path fill="none" stroke="currentColor" stroke-width="3" d="M32 32 V 52 M20 52 H44"/>
    <ellipse cx="32" cy="12" rx="12" ry="3" fill="rgba(255,0,0,0.3)"/>
  `,
  lamp: `
    <path fill="none" stroke="currentColor" stroke-width="3" d="M22 16 L18 48 L46 48 L42 16 Z"/>
    <path fill="none" stroke="currentColor" stroke-width="3" d="M22 16 L32 6 L42 16"/>
    <circle cx="32" cy="32" r="6" fill="currentColor" opacity="0.8"/>
    <line x1="32" y1="6" x2="32" y2="2" stroke="currentColor" stroke-width="3"/>
  `,
  moth: `
    <path fill="none" stroke="currentColor" stroke-width="2" d="M32 32 L32 2 M32 32 L60 18 M32 32 L54 56 M32 32 L10 56 M32 32 L4 18"/>
    <path fill="none" stroke="currentColor" stroke-width="1.5" d="M26 12 Q32 16 38 12 M48 24 Q42 32 46 42 M20 48 Q32 40 44 48 M12 30 Q20 32 26 12" opacity="0.6"/>
    <circle cx="32" cy="32" r="4" fill="currentColor"/>
  `,
  winter: `
    <rect x="18" y="14" width="28" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="3"/>
    <path fill="none" stroke="currentColor" stroke-width="3" d="M18 24 H46 M28 14 V10 C28 8 36 8 36 10 V14"/>
    <rect x="22" y="32" width="8" height="10" fill="currentColor" opacity="0.5"/>
    <rect x="34" y="32" width="8" height="10" fill="currentColor" opacity="0.5"/>
  `,
  forge: `<path fill="currentColor" opacity=".22" d="M12 2c5 5 8 8 8 13a8 8 0 01-16 0c0-3 1-6 4-9 0 3 1 5 3 6-1-4 0-7 1-10z"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M12 2c5 5 8 8 8 13a8 8 0 01-16 0c0-3 1-6 4-9 0 3 1 5 3 6-1-4 0-7 1-10zM12 11c2 2 3 4 3 6a3 3 0 01-6 0c0-2 1-4 3-6z"/><path stroke="currentColor" d="M3 21h18M6 23h12"/>`,
  edge: `<path fill="currentColor" opacity=".18" d="M4 18L16.8 3.2 21 7.4 6.2 20H4z"/><path fill="none" stroke="currentColor" stroke-width="1.35" d="M4 18L16.8 3.2 21 7.4 6.2 20H4v-2zM14.8 5.5l3.9 3.9M4 13l7 7M8 15l2 2"/><circle cx="17.8" cy="6.3" r="1.2" fill="currentColor"/>`,
  heart: `<path fill="currentColor" opacity=".2" d="M12 21C7 17 3 13 3 8.5 3 5.5 5 3 8 3c1.7 0 3.1.8 4 2 1-1.2 2.4-2 4.1-2C19 3 21 5.5 21 8.5 21 13 17 17 12 21z"/><path fill="none" stroke="currentColor" stroke-width="1.35" d="M12 21C7 17 3 13 3 8.5 3 5.5 5 3 8 3c1.7 0 3.1.8 4 2 1-1.2 2.4-2 4.1-2C19 3 21 5.5 21 8.5 21 13 17 17 12 21zM5 11h4l2-4 2 8 2-4h4"/><circle cx="12" cy="5" r="1" fill="currentColor"/>`,
  knock: `<circle cx="12" cy="12" r="9" fill="currentColor" opacity=".12"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.3"/><path fill="none" stroke="currentColor" stroke-width="1.2" d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/><circle cx="12" cy="11" r="2.4" fill="none" stroke="currentColor"/><path fill="currentColor" d="M10.8 13h2.4l1 5h-4.4z"/>`,
};

export const DefaultScenarioIconPath = `
  <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="3"/>
  <path d="M22 32 H42 M32 22 V42" stroke="currentColor" stroke-width="3"/>
`;
