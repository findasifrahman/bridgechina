# BridgeChina Brand Guidelines

## Color Palette

### Primary (Teal)
- `teal-600`: Primary actions, links, highlights
- `teal-700`: Hover states, active states
- `teal-500`: Accent elements

### Accent (Amber)
- `amber-400`: Highlights, CTAs
- `amber-500`: Primary accent
- `amber-600`: Hover states

### Neutrals
- `slate-50`: Background base
- `slate-100`: Subtle backgrounds
- `slate-200`: Borders, dividers
- `slate-600`: Secondary text
- `slate-800`: Headings
- `slate-900`: Primary text

### Background
- Use `slate-50` as base with subtle gradient: `bg-gradient-to-br from-slate-50 to-slate-100`

## Typography

- **Font Family**: Inter (preferred), system-ui fallback
- **Headings**: `font-semibold` to `font-bold`, `tracking-tight`
- **Body**: `text-slate-700`, `leading-relaxed`

## Components

### Buttons
- **Primary**: `bg-teal-600 text-white hover:bg-teal-700`
- **Secondary**: `bg-white text-teal-600 border-2 border-teal-600 hover:bg-teal-50`
- **Accent**: `bg-amber-500 text-slate-900 hover:bg-amber-600`

### Cards
- `rounded-2xl` for all cards and modals
- `shadow-sm` or `shadow-md` for depth
- Hover: `hover:shadow-lg hover:-translate-y-1` (subtle lift)

### Status Chips
- `new`: slate
- `in_progress`: teal
- `confirmed/paid`: amber
- `done`: green
- `cancelled`: red

### Focus States
- Consistent: `focus:ring-2 focus:ring-teal-500 focus:ring-offset-2`

## Gradients

- **Hero**: `from-teal-600 via-teal-500 to-amber-400` (very subtle)
- **Section highlight**: `from-teal-50 to-amber-50`

## Spacing

- Use consistent spacing scale: 4, 8, 12, 16, 24, 32, 48, 64
- Section padding: `py-12` or `py-16`
- Container padding: `px-4 sm:px-6 lg:px-8`

## Animation

- Very subtle transitions: `transition-all duration-200`
- Hover lift: `hover:-translate-y-1`
- Fade-in on first paint (use Vue transitions)

## Usage Rules

1. **Never** introduce custom colors outside the palette
2. **Always** use shared components from `@bridgechina/ui`
3. **Consistent** spacing and typography across all pages
4. **Premium** feel: light, clean, spacious
5. **Responsive** first: mobile → tablet → desktop

