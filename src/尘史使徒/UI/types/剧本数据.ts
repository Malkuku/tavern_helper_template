export const ScenarioIconPaths: Record<string, string> = {
  'secret-moon': `
    <path fill="currentColor" opacity=".14" d="M43 8a24 24 0 102 44A20 20 0 0143 8z"/>
    <path fill="none" stroke="currentColor" stroke-width="2.4" d="M43 8a24 24 0 102 44A20 20 0 0143 8zM18 20l3 5 5 3-5 3-3 5-3-5-5-3 5-3z"/>
  `,
  hexagram: `
    <path fill="currentColor" opacity=".1" d="M32 7l22 38H10zM32 57L10 19h44z"/>
    <path fill="none" stroke="currentColor" stroke-width="2.4" d="M32 7l22 38H10zM32 57L10 19h44z"/><circle cx="32" cy="32" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
  `,
  worm: `
    <path fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" d="M10 45c5-20 13 10 20-10S43 14 53 27 48 52 34 49"/>
    <circle cx="13" cy="42" r="2" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M22 39l-5-6M31 34l-5-7M42 29l4-7M46 40l7 2"/>
  `,
  woodland: `
    <path fill="currentColor" opacity=".12" d="M32 5L17 27h8L12 47h16v10h8V47h16L39 27h8z"/>
    <path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" d="M32 5L17 27h8L12 47h16v10h8V47h16L39 27h8zM32 18v29M22 35l10 8 10-8"/>
  `,
  'bone-gate': `
    <path fill="none" stroke="currentColor" stroke-width="3" d="M14 56V25C14 12 22 6 32 6s18 6 18 19v31M23 56V27c0-7 4-11 9-11s9 4 9 11v29"/>
    <path fill="currentColor" d="M8 51h48v6H8zM18 12l-7-5M46 12l7-5M20 37l-8 5M44 37l8 5"/><circle cx="32" cy="30" r="4" fill="none" stroke="currentColor" stroke-width="2"/>
  `,
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
    <path fill="currentColor" opacity=".1" d="M32 3l5 9 10 5-10 5-5 10-5-10-10-5 10-5z"/>
    <path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M24 17h16l4 34H20l4-34zm2 0c0-5 2-9 6-12 4 3 6 7 6 12M17 51h30M25 57h14"/>
    <path fill="currentColor" opacity=".28" d="M24 22h16l2.8 25H21.2z"/>
    <path fill="currentColor" d="M32 42c-5 0-8-3.4-8-7.6 0-4.8 4.2-8.9 8-14.4 3.8 5.5 8 9.6 8 14.4 0 4.2-3 7.6-8 7.6z"/>
    <path fill="#0b0d0e" opacity=".72" d="M32 38c-2.1 0-3.5-1.5-3.5-3.4 0-2 1.5-4 3.5-6.8 2 2.8 3.5 4.8 3.5 6.8 0 1.9-1.4 3.4-3.5 3.4z"/>
    <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M11 28h6M47 28h6M14 15l5 3M50 15l-5 3M14 41l4-2M50 41l-4-2"/>
  `,
  moth: `
    <path fill="none" stroke="currentColor" stroke-width="2" d="M32 32 L32 2 M32 32 L60 18 M32 32 L54 56 M32 32 L10 56 M32 32 L4 18"/>
    <path fill="none" stroke="currentColor" stroke-width="1.5" d="M26 12 Q32 16 38 12 M48 24 Q42 32 46 42 M20 48 Q32 40 44 48 M12 30 Q20 32 26 12" opacity="0.6"/>
    <circle cx="32" cy="32" r="4" fill="currentColor"/>
  `,
  winter: `
    <path fill="currentColor" opacity=".09" d="M7 43l16-17 9 9 8-8 17 16v13H7z"/>
    <path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M5 51c10-5 18-4 27 0s17 5 27 0M8 43l15-17 9 9 8-8 16 16M42 45V34h9v14"/>
    <path fill="currentColor" d="M46 39h3v5h-3z"/>
    <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M10 51c9-2 14-1 19 2 5 3 10 5 20 3"/>
    <path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" d="M17 14v6M14 17h6M32 7v7M28.5 10.5h7M50 14v6M47 17h6"/>
    <circle cx="47.5" cy="41.5" r="6" fill="currentColor" opacity=".1"/>
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
