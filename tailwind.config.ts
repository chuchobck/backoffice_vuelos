import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Todos los colores provienen de variables CSS definidas en src/index.css.
 * `colors` se REEMPLAZA (no se extiende): es imposible usar un color fuera de los tokens.
 */
const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** Espaciado: múltiplos de 4 px más 44 px (objetivo táctil WCAG 2.5.8). */
const spacing: Record<string, string> = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
  48: '12rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
};

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      background: token('background'),
      surface: token('surface'),
      foreground: token('foreground'),
      muted: token('muted'),
      input: token('input'),
      border: token('border'),
      primary: {
        DEFAULT: token('primary'),
        hover: token('primary-hover'),
        foreground: token('primary-foreground'),
        tint: token('primary-tint'),
      },
      sidebar: {
        DEFAULT: token('sidebar'),
        foreground: token('sidebar-foreground'),
        muted: token('sidebar-muted'),
        active: token('sidebar-active'),
        border: token('sidebar-border'),
      },
      success: { DEFAULT: token('success'), foreground: token('success-foreground'), tint: token('success-tint') },
      error: { DEFAULT: token('error'), foreground: token('error-foreground'), tint: token('error-tint') },
      warning: { DEFAULT: token('warning'), tint: token('warning-tint') },
      focus: token('focus'),
      overlay: token('overlay'),
    },
    spacing,
    borderRadius: { none: '0', sm: '4px', DEFAULT: 'var(--radius)', md: 'var(--radius)', lg: 'var(--radius)', full: '9999px' },
    fontFamily: {
      sans: ['system-ui', '-apple-system', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
    },
    /** Nunca menos de 14 px en tablas densas; base 16 px. */
    fontSize: {
      xs: ['0.875rem', { lineHeight: '1.4' }],
      sm: ['0.9375rem', { lineHeight: '1.5' }],
      base: ['1rem', { lineHeight: '1.5' }],
      lg: ['1.125rem', { lineHeight: '1.5' }],
      xl: ['1.25rem', { lineHeight: '1.4' }],
      '2xl': ['1.5rem', { lineHeight: '1.3' }],
      '3xl': ['1.875rem', { lineHeight: '1.25' }],
    },
    extend: {
      maxWidth: { content: '80rem', prose: '45rem' },
      minHeight: { touch: '2.75rem' },
      minWidth: { touch: '2.75rem' },
      boxShadow: {
        card: '0 1px 2px rgb(var(--color-shadow) / 0.08), 0 4px 12px rgb(var(--color-shadow) / 0.06)',
        raised: '0 16px 48px rgb(var(--color-shadow) / 0.2)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { 'fade-in': 'fade-in 160ms ease-out', 'slide-up': 'slide-up 200ms ease-out' },
    },
  },
  plugins: [animate],
} satisfies Config;
