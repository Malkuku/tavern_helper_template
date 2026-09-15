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
};

export const DefaultScenarioIconPath = `
  <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="3"/>
  <path d="M22 32 H42 M32 22 V42" stroke="currentColor" stroke-width="3"/>
`;
