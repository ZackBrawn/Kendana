// utility for managing and applying global accent colors

export const ACCENT_COLORS = [
  { code: 'teal', color: '#0d9488', hover: '#0f766e', light: '#ccfbf1', name: 'Teal' },
  { code: 'blue', color: '#2563eb', hover: '#1d4ed8', light: '#dbeafe', name: 'Biru' },
  { code: 'indigo', color: '#4f46e5', hover: '#4338ca', light: '#e0e7ff', name: 'Indigo' },
  { code: 'pink', color: '#db2777', hover: '#be185d', light: '#fce7f3', name: 'Pink' },
  { code: 'cyan', color: '#0891b2', hover: '#0369a1', light: '#ecfeff', name: 'Cyan' },
  { code: 'rose', color: '#e11d48', hover: '#be123c', light: '#ffe4e6', name: 'Mawar' }
];

export const applyAccentColor = (colorName) => {
  const chosen = ACCENT_COLORS.find(c => c.code === colorName) || ACCENT_COLORS[2];
  document.documentElement.style.setProperty('--color-primary', chosen.color);
  document.documentElement.style.setProperty('--color-primary-hover', chosen.hover);
  document.documentElement.style.setProperty('--color-primary-light', chosen.light);
};

