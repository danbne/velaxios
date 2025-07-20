# VELAXIOS THEME SYSTEM

## Overview

This document describes the rationalized theming system for the Velaxios application. All styling is now centralized in a single theme file that provides consistent design tokens across the entire application.

## File Structure

```
packages/client/src/
├── styles/
│   └── theme.css          # Single source of truth for all theming
├── index.css              # Basic CSS reset and legacy styles
└── main.tsx              # Imports theme.css globally
```

## Theme Variables

### Color Palette

#### Primary Colors

- `--primary: #1caaa6` - Teal (main brand color)
- `--primary-hover: #189a96` - Darker teal for hover states
- `--primary-light: #5ebdba` - Light teal for highlights

#### Secondary Colors

- `--secondary: #15294e` - Deep navy (backgrounds and text)
- `--secondary-light: #2a4a7a` - Lighter navy for hover states

#### Accent Colors

- `--accent: #04d9d2` - Bright cyan (calls-to-action)
- `--accent-hover: #03c4bd` - Darker cyan for hover

#### Background Colors

- `--bg-primary: #ffffff` - Main page background
- `--bg-secondary: #f8fafc` - Sidebar and secondary backgrounds
- `--bg-tertiary: #f1f5f9` - Grid and tertiary backgrounds
- `--bg-overlay: rgba(0, 0, 0, 0.5)` - Modal overlays

#### Text Colors

- `--text-primary: #1c1c1c` - Main text color
- `--text-secondary: #6b7280` - Secondary text
- `--text-muted: #9ca3af` - Muted text
- `--text-light: #ffffff` - Light text on dark backgrounds

#### Status Colors

- `--success: #10b981` - Green for success states
- `--success-light: #d1fae5` - Light green background
- `--warning: #f59e0b` - Orange for warnings
- `--warning-light: #fef3c7` - Light orange background
- `--error: #ef4444` - Red for errors
- `--error-light: #fee2e2` - Light red background
- `--info: #3b82f6` - Blue for info
- `--info-light: #dbeafe` - Light blue background

#### Border Colors

- `--border-light: #e5e7eb` - Light borders
- `--border-medium: #d1d5db` - Medium borders
- `--border-dark: #9ca3af` - Dark borders

### Typography

- `--font-family` - System font stack
- `--font-size-xs` to `--font-size-2xl` - Font size scale

### Spacing

- `--spacing-xs` to `--spacing-2xl` - Consistent spacing scale

### Border Radius

- `--radius-sm` to `--radius-xl` - Border radius scale

### Transitions

- `--transition-fast`, `--transition-normal`, `--transition-slow`

### Z-Index

- `--z-dropdown`, `--z-modal`, `--z-tooltip`, `--z-toast`

## Utility Classes

### Background Colors

```css
.bg-primary, .bg-secondary, .bg-accent
.bg-success, .bg-warning, .bg-error, .bg-info
.bg-primary-light, .bg-success-light, .bg-warning-light, .bg-error-light, .bg-info-light
.bg-page, .bg-sidebar, .bg-grid
```

### Text Colors

```css
.text-primary, .text-secondary, .text-accent
.text-success, .text-warning, .text-error, .text-info
.text-dark, .text-muted, .text-light
```

### Border Colors

```css
.border-light, .border-medium, .border-dark
.border-success, .border-warning, .border-error, .border-info
```

## Component Classes

### Button System

```css
.btn                    # Base button class
.btn-primary           # Primary button variant
.btn-secondary         # Secondary button variant
.btn-accent            # Accent button variant
.btn-outline           # Outline button variant
.btn-sm, .btn-lg       # Size variants
```

### Grid System

```css
.ag-row-new            # New rows (green)
.ag-row-dirty          # Modified rows (orange)
.ag-row-deleted        # Deleted rows (red)
.ag-row-failed         # Failed rows (red)
```

## Usage Guidelines

### 1. Always Use Theme Variables

Instead of hardcoded colors:

```css
/* ❌ Don't do this */
background-color: #1caaa6;

/* ✅ Do this */
background-color: var(--primary);
```

### 2. Use Utility Classes When Possible

```jsx
// ❌ Don't do this
<div style={{ backgroundColor: '#1caaa6' }}>

// ✅ Do this
<div className="bg-primary">
```

### 3. Use Component Classes for Complex Components

```jsx
// ✅ Use the button system
<button className="btn btn-primary btn-lg">Click me</button>
```

### 4. For Inline Styles, Use Theme Variables

```jsx
// ✅ Use theme variables in inline styles
<div style={{
  backgroundColor: 'var(--bg-secondary)',
  padding: 'var(--spacing-md)',
  borderRadius: 'var(--radius-md)'
}}>
```

## Migration Notes

### What Was Changed

1. **Consolidated Theme Files**: Removed duplicate `:root` blocks from multiple files
2. **Standardized Color Palette**: Created consistent color system with semantic naming
3. **Added Status Colors**: Proper success, warning, error, and info colors
4. **Improved Typography**: Standardized font sizes and family
5. **Added Spacing System**: Consistent spacing scale
6. **Enhanced Button System**: More variants and better organization
7. **Updated Grid Styles**: All AG Grid styles now use theme variables

### Removed Files

- `packages/client/src/components/common/grid/ag-grid-theme.css`
- `packages/client/src/components/common/grid-template/grid/GridTheme.css`

### Updated Components

- `Button.tsx` - Now uses theme classes instead of Tailwind
- `Dialog.tsx` - Uses theme variables for all styling
- `Login.tsx` - Updated to use theme variables
- `GridToolbarButton.tsx` - Uses theme variables for colors and spacing
- `BaseGrid.tsx` - Removed non-existent CSS import

## Benefits

1. **Consistency**: All components now use the same design tokens
2. **Maintainability**: Single source of truth for all styling
3. **Scalability**: Easy to add new colors or modify existing ones
4. **Performance**: Reduced CSS bundle size by removing duplicates
5. **Developer Experience**: Clear naming conventions and utility classes
6. **Accessibility**: Proper contrast ratios and semantic color usage

## Future Enhancements

1. **Dark Mode**: Add dark theme variables
2. **CSS Custom Properties**: Consider using CSS custom properties for dynamic theming
3. **Design Tokens**: Export theme as design tokens for design tools
4. **Component Library**: Build comprehensive component library using theme system
