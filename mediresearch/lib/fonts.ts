import { Inter } from 'next/font/google';

// Using Inter as a substitute for Manrope (similar geometric sans-serif)
export const manropeSemibold = Inter({
  subsets: ['latin'],
  weight: '600', // Semibold
  variable: '--font-manrope-semibold',
  display: 'swap',
});

// Using Inter for mono as well, but we'll add Google Fonts via CSS
export const dmSansMono = Inter({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-mono',
  display: 'swap',
});

// CSS utility classes
export const fontClasses = {
  // Manrope Semibold with -3% letter spacing
  manropeSemibold: `font-manrope-semibold font-semibold tracking-[-0.03em]`,
  
  // DM Sans Mono with uppercase
  dmSansMono: `font-dm-mono uppercase`,
  
  // Combined utility classes for easy use
  heading: `font-manrope-semibold font-semibold tracking-[-0.03em]`,
  mono: `font-dm-mono uppercase`,
};
