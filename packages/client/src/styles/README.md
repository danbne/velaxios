# Theme System

A centralized theme system for the Velaxios client application that provides consistent styling, improved maintainability, and better developer experience.

## 🎯 Overview

The theme system replaces inline styles and scattered CSS classes with a centralized, TypeScript-based approach that ensures consistency across all components.

## 🏗️ Architecture

### Core Files

- `theme.ts` - Main theme module with colors, typography, spacing, and component themes
- `theme.css` - CSS variables and utility classes (legacy support)
- `index.css` - Tailwind CSS integration

### Theme Structure

```typescript
// Color palette with semantic naming
colors: {
  primary: '#1caaa6',      // Teal
  secondary: '#15294e',     // Deep navy
  accent: '#04d9d2',        // Bright cyan
  // ... more colors
}

// Typography system
typography: {
  fontSize: { xs: '0.75rem', sm: '0.875rem', /* ... */ },
  fontWeight: { normal: '400', medium: '500', /* ... */ }
}

// Component-specific themes
componentThemes: {
  dialog: { /* dialog styles */ },
  errorDialog: { /* error dialog styles */ },
  button: { /* button styles */ }
}
```

## 🚀 Usage

### Basic Import

```typescript
import { colors, typography, componentThemes } from "../styles/theme";
```

### Using Theme Values

```typescript
// Direct color usage
const styles = {
	backgroundColor: colors.primary,
	color: colors.textLight,
	fontSize: typography.fontSize.lg,
	padding: spacing.md,
	borderRadius: borderRadius.lg,
};
```

### Component Themes

```typescript
// Using predefined component themes
const buttonStyles = componentThemes.button.primary;

// Merging multiple styles
const customButtonStyles = mergeStyles(
	componentThemes.button.base,
	componentThemes.button.primary,
	{ customProperty: "value" }
);
```

### Utility Functions

```typescript
// Create theme-based styles
const themeStyles = createThemeStyles(componentThemes.dialog);

// Merge multiple style objects
const combinedStyles = mergeStyles(style1, style2, style3);

// Responsive styles
const responsiveStyles = responsive("768px", { fontSize: "1.2rem" });
```

## 🎨 Available Themes

### Colors

| Name         | Value     | Usage                               |
| ------------ | --------- | ----------------------------------- |
| `primary`    | `#1caaa6` | Main brand color, buttons, headers  |
| `secondary`  | `#15294e` | Backgrounds, text on light surfaces |
| `accent`     | `#04d9d2` | Highlights, calls-to-action         |
| `background` | `#9dbcf5` | Page backgrounds                    |
| `highlight`  | `#5ebdba` | Hover states, secondary elements    |
| `textDark`   | `#1c1c1c` | Primary text color                  |
| `textLight`  | `#ffffff` | Text on dark backgrounds            |

### Typography

| Property     | Values                                       | Usage         |
| ------------ | -------------------------------------------- | ------------- |
| `fontSize`   | `xs`, `sm`, `base`, `lg`, `xl`, `2xl`, `3xl` | Text sizing   |
| `fontWeight` | `normal`, `medium`, `semibold`, `bold`       | Text weight   |
| `fontFamily` | `sans`, `mono`                               | Font families |

### Spacing

| Size | Value     | Usage               |
| ---- | --------- | ------------------- |
| `xs` | `0.25rem` | Minimal spacing     |
| `sm` | `0.5rem`  | Small spacing       |
| `md` | `1rem`    | Medium spacing      |
| `lg` | `1.5rem`  | Large spacing       |
| `xl` | `2rem`    | Extra large spacing |

## 🧩 Component Themes

### Dialog Theme

```typescript
componentThemes.dialog = {
	overlay: {
		/* Full-screen overlay */
	},
	container: {
		/* Dialog container */
	},
	header: {
		/* Dialog header */
	},
	content: {
		/* Dialog content */
	},
	footer: {
		/* Dialog footer */
	},
};
```

### Error Dialog Theme

```typescript
componentThemes.errorDialog = {
	container: {
		/* Error dialog container */
	},
	flashRed: {
		/* Flash animation styles */
	},
	detailsButton: {
		/* Details toggle button */
	},
	detailsContainer: {
		/* Details content area */
	},
	copyButton: {
		/* Copy details button */
	},
	closeButton: {
		/* Close button */
	},
};
```

### Button Theme

```typescript
componentThemes.button = {
	base: {
		/* Base button styles */
	},
	primary: {
		/* Primary button variant */
	},
	secondary: {
		/* Secondary button variant */
	},
	accent: {
		/* Accent button variant */
	},
};
```

## 🔧 Migration Guide

### From Inline Styles

**Before:**

```typescript
const styles = {
	position: "fixed",
	top: 0,
	left: 0,
	width: "100vw",
	height: "100vh",
	background: "rgba(0,0,0,0.15)",
	zIndex: 9999,
};
```

**After:**

```typescript
import { componentThemes } from "../styles/theme";

const styles = componentThemes.dialog.overlay;
```

### From Tailwind Classes

**Before:**

```typescript
<button className="bg-primary text-light hover:bg-highlight px-4 py-2 rounded">
	Click me
</button>
```

**After:**

```typescript
import { componentThemes } from "../styles/theme";

<button style={componentThemes.button.primary}>Click me</button>;
```

## 📋 Best Practices

### 1. Use Component Themes

Always use predefined component themes when available:

```typescript
// ✅ Good
const buttonStyles = componentThemes.button.primary;

// ❌ Avoid
const buttonStyles = {
	background: colors.primary,
	color: colors.textLight,
	// ... more properties
};
```

### 2. Merge Styles Properly

Use the `mergeStyles` utility for combining styles:

```typescript
// ✅ Good
const combinedStyles = mergeStyles(
	componentThemes.button.base,
	componentThemes.button.primary,
	customStyles
);

// ❌ Avoid
const combinedStyles = {
	...componentThemes.button.base,
	...componentThemes.button.primary,
	...customStyles,
};
```

### 3. Maintain Consistency

Use theme values instead of hardcoded values:

```typescript
// ✅ Good
const styles = {
	margin: spacing.md,
	color: colors.textDark,
	fontSize: typography.fontSize.base,
};

// ❌ Avoid
const styles = {
	margin: "16px",
	color: "#1c1c1c",
	fontSize: "1rem",
};
```

### 4. Extend, Don't Override

When customizing components, extend the base theme:

```typescript
// ✅ Good
const customDialogStyles = mergeStyles(componentThemes.dialog.container, {
	maxWidth: "600px",
});

// ❌ Avoid
const customDialogStyles = {
	maxWidth: "600px",
	// Missing other dialog properties
};
```

## 🔄 Migration Status

### ✅ Completed

- [x] ErrorDialog component refactored
- [x] Button component updated
- [x] Dialog component created
- [x] Theme system established
- [x] Common components index created

### 🔄 In Progress

- [ ] Update GridToolbarButton to use theme
- [ ] Update Layout components to use theme
- [ ] Update other grid components

### 📋 Planned

- [ ] Create more reusable components
- [ ] Add dark mode support
- [ ] Add theme customization utilities
- [ ] Create component documentation

## 🎯 Benefits

### 1. Consistency

- All components use the same color palette
- Typography is standardized across the app
- Spacing follows a consistent scale

### 2. Maintainability

- Changes to colors/typography happen in one place
- TypeScript provides compile-time safety
- Clear separation of concerns

### 3. Developer Experience

- IntelliSense support for theme values
- Easy to find and reuse styles
- Reduced cognitive load

### 4. Performance

- No runtime CSS-in-JS overhead
- Smaller bundle size
- Better caching

## 🔧 Development

### Adding New Colors

1. Add to `colors` object in `theme.ts`
2. Update CSS variables in `theme.css` if needed
3. Document the new color in this README

### Adding New Component Themes

1. Create theme object in `componentThemes`
2. Use existing theme values where possible
3. Add JSDoc comments for documentation
4. Update this README

### Testing Theme Changes

```bash
# Build to check for TypeScript errors
npm run build

# Check for unused imports
npm run lint
```

## 📚 Related Files

- `components/common/Button.tsx` - Button component using theme
- `components/common/Dialog.tsx` - Dialog component using theme
- `components/common/grid/components/ErrorDialog.tsx` - Refactored error dialog
- `components/common/grid/components/ErrorDetails.tsx` - Error details component
- `components/common/index.ts` - Common components exports
