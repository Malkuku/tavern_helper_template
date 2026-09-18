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
  forge: `<path fill="currentColor" d="M17.66 11.2C17.43 10.9 17.15 10.64 16.89 10.38C16.22 9.78 15.46 9.35 14.82 8.72C13.33 7.26 13 4.85 13.95 3C13 3.23 12.17 3.75 11.46 4.32C8.92 6.4 7.9 9.07 9.06 12.16C9.15 12.38 9.1 12.61 8.94 12.82C8.78 13.03 8.5 13.13 8.28 13.08C7.05 12.83 6.13 12.03 5.5 10.95C5.06 13.8 5.94 16.5 7.95 18.5C9.7 20.24 12.05 21.1 14.5 20.96C17.16 20.81 19.58 19.29 20.88 16.95C21.64 15.6 21.8 14.1 21.3 12.65C20.8 11.2 19.5 10.2 18.1 9.6C18.1 10.2 17.9 10.7 17.66 11.2Z"/>`,
  edge: `<path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>`,
  heart: `<path fill="currentColor" d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z"/>`,
  knock: `<path fill="currentColor" d="M12,10C10.9,10 10,10.9 10,12C10,13.1 10.9,14 12,14C13.1,14 14,13.1 14,12C14,10.9 13.1,10 12,10M19,12C19,15.86 15.86,19 12,19C8.14,19 5,15.86 5,12C5,8.14 8.14,5 12,5C15.86,5 19,8.14 19,12M21,12C21,7.03 16.97,3 12,3C7.03,3 3,7.03 3,12C3,16.97 7.03,21 12,21C16.97,21 21,16.97 21,12Z"/>`,
};

export const DefaultScenarioIconPath = `
  <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="3"/>
  <path d="M22 32 H42 M32 22 V42" stroke="currentColor" stroke-width="3"/>
`;
