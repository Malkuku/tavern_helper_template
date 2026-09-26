const palettes = [
  ['#f6b7c3', '#493642'], ['#bad8f6', '#644536'], ['#d5c4f4', '#2f4050'],
  ['#f7d2a4', '#755044'], ['#bce9df', '#3c354f'], ['#f0c4d9', '#8a5847'],
  ['#c4dcaa', '#493642'], ['#f1d19a', '#644536'], ['#a9d3e8', '#2f4050'],
  ['#d7c2ac', '#755044'], ['#b9b5ed', '#3c354f'], ['#f2bcbc', '#8a5847'],
  ['#b8decb', '#493642'], ['#eac6e9', '#644536'], ['#b6d7e2', '#2f4050'],
  ['#f3d0b3', '#755044'], ['#c4d1a5', '#3c354f'], ['#e3b7c5', '#8a5847'],
  ['#a9d4d2', '#493642'], ['#edca9b', '#644536'], ['#c5b7e1', '#2f4050'],
  ['#f0bdad', '#755044'], ['#b4d9bc', '#3c354f'], ['#d9c0ed', '#8a5847'],
];
const skins = ['#f7d6bd', '#e7b994', '#d8a276', '#f2c6a8'];
const hairstyles = [
  'M15 24Q20 7 36 9Q52 7 57 24l-5 10H20z',
  'M16 28Q12 10 34 10Q55 8 56 28L48 19Q36 26 20 20z',
  'M18 27Q16 11 35 9Q55 11 54 27l-9-9-20 4z',
  'M15 27Q19 7 36 10Q53 8 57 27l-8-5-8-8-20 11z',
];

export const nearbyAvatars = palettes.map(([background, hair], index) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72"><rect width="72" height="72" rx="18" fill="${background}"/><path d="M6 72Q7 54 24 52h24q17 2 18 20" fill="${hair}"/><path d="M18 30Q17 13 36 13Q55 13 54 30v10q-2 16-18 17Q20 56 18 40z" fill="${skins[index % skins.length]}"/><path d="${hairstyles[index % hairstyles.length]}" fill="${hair}"/><path d="M26 35h4m12 0h4" stroke="${hair}" stroke-width="2" stroke-linecap="round"/><path d="M32 45q4 3 8 0" fill="none" stroke="#9b6664" stroke-width="1.6" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
});
