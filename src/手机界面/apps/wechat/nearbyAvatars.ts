const palettes = [
  ['#f6b7c3', '#493642'],
  ['#bad8f6', '#644536'],
  ['#d5c4f4', '#2f4050'],
  ['#f7d2a4', '#755044'],
  ['#bce9df', '#3c354f'],
  ['#f0c4d9', '#8a5847'],
  ['#c4dcaa', '#493642'],
  ['#f1d19a', '#644536'],
  ['#a9d3e8', '#2f4050'],
  ['#d7c2ac', '#755044'],
  ['#b9b5ed', '#3c354f'],
  ['#f2bcbc', '#8a5847'],
  ['#b8decb', '#493642'],
  ['#eac6e9', '#644536'],
  ['#b6d7e2', '#2f4050'],
  ['#f3d0b3', '#755044'],
  ['#c4d1a5', '#3c354f'],
  ['#e3b7c5', '#8a5847'],
  ['#a9d4d2', '#493642'],
  ['#edca9b', '#644536'],
  ['#c5b7e1', '#2f4050'],
  ['#f0bdad', '#755044'],
  ['#b4d9bc', '#3c354f'],
  ['#d9c0ed', '#8a5847'],
  ['#9bd6cf', '#215965'],
  ['#f7d797', '#8a4b42'],
  ['#c5d3ff', '#3b4e85'],
  ['#e6c1d8', '#6a365b'],
  ['#b9e3aa', '#365f4b'],
  ['#fac9ab', '#81553b'],
  ['#acd7f0', '#324d71'],
  ['#e5d0a8', '#695d3e'],
];
const motifs = [
  '<circle cx="36" cy="29" r="14"/><path d="M11 72c2-17 11-25 25-25s23 8 25 25"/>',
  '<path d="M36 8 58 28 50 60 22 60 14 28Z"/><circle cx="36" cy="35" r="11" fill="none" stroke="#fff" stroke-width="3"/>',
  '<path d="M36 7 42 25 61 25 46 37 52 57 36 45 20 57 26 37 11 25 30 25Z"/>',
  '<path d="M15 43c0-14 10-24 21-24s21 10 21 24-10 19-21 19S15 57 15 43Z"/><path d="M14 29 22 11 31 22M58 29 50 11 41 22"/>',
  '<circle cx="36" cy="36" r="22" fill="none" stroke="currentColor" stroke-width="7"/><path d="M36 18v36M18 36h36" stroke="#fff" stroke-width="5"/>',
  '<path d="M36 10c14 13 20 23 20 33 0 11-9 19-20 19s-20-8-20-19c0-10 6-20 20-33Z"/>',
];

export const nearbyAvatars = palettes.map(([background, hair], index) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><rect width="72" height="72" rx="18" fill="${background}"/><g fill="${hair}" color="${hair}">${motifs[index % motifs.length]}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
});
