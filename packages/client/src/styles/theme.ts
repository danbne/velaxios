/**
 * Application Theme Module
 *
 * This module provides a centralized theme system with:
 * - Color palette constants
 * - Typography settings
 * - Spacing and sizing utilities
 * - Component-specific theme classes
 * - Utility functions for dynamic theming
 */

// ===== COLOR PALETTE =====
export const colors = {
	// Primary colors
	primary: "#1caaa6", // Teal
	secondary: "#15294e", // Deep navy
	accent: "#04d9d2", // Bright cyan
	background: "#9dbcf5", // Light blue
	highlight: "#5ebdba", // Muted teal

	// Text colors
	textDark: "#1c1c1c", // Dark gray
	textLight: "#ffffff", // White

	// Semantic colors
	success: "#28a745", // Green
	warning: "#ffc107", // Yellow
	error: "#dc3545", // Red
	info: "#17a2b8", // Blue

	// Neutral colors
	white: "#ffffff",
	black: "#000000",
	gray: {
		50: "#f9fafb",
		100: "#f3f4f6",
		200: "#e5e7eb",
		300: "#d1d5db",
		400: "#9ca3af",
		500: "#6b7280",
		600: "#4b5563",
		700: "#374151",
		800: "#1f2937",
		900: "#111827",
	},

	// Overlay colors
	overlay: "rgba(0, 0, 0, 0.15)",
	overlayDark: "rgba(0, 0, 0, 0.5)",
} as const;

// ===== TYPOGRAPHY =====
export const typography = {
	fontFamily: {
		sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
		mono: 'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace',
	},
	fontSize: {
		xs: "0.75rem", // 12px
		sm: "0.875rem", // 14px
		base: "1rem", // 16px
		lg: "1.125rem", // 18px
		xl: "1.25rem", // 20px
		"2xl": "1.5rem", // 24px
		"3xl": "1.875rem", // 30px
	},
	fontWeight: {
		normal: "400",
		medium: "500",
		semibold: "600",
		bold: "700",
	},
} as const;

// ===== SPACING =====
export const spacing = {
	xs: "0.25rem", // 4px
	sm: "0.5rem", // 8px
	md: "1rem", // 16px
	lg: "1.5rem", // 24px
	xl: "2rem", // 32px
	"2xl": "3rem", // 48px
} as const;

// ===== BORDER RADIUS =====
export const borderRadius = {
	none: "0",
	sm: "0.125rem", // 2px
	base: "0.25rem", // 4px
	md: "0.375rem", // 6px
	lg: "0.5rem", // 8px
	xl: "0.75rem", // 12px
	full: "9999px",
} as const;

// ===== SHADOWS =====
export const shadows = {
	sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
	base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
	md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
	lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
	xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
} as const;

// ===== TRANSITIONS =====
export const transitions = {
	fast: "0.15s ease",
	base: "0.2s ease",
	slow: "0.3s ease",
	verySlow: "0.8s cubic-bezier(.4,0,.2,1)",
} as const;

// ===== Z-INDEX =====
export const zIndex = {
	modal: 9999,
	overlay: 9998,
	tooltip: 9997,
	dropdown: 9996,
	header: 1000,
	sidebar: 999,
} as const;

// ===== COMPONENT THEMES =====
export const componentThemes = {
	// Dialog/Modal theme
	dialog: {
		overlay: {
			position: "fixed",
			top: 0,
			left: 0,
			width: "100vw",
			height: "100vh",
			background: colors.overlay,
			zIndex: zIndex.overlay,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
		},
		container: {
			background: colors.white,
			padding: spacing.lg,
			borderRadius: borderRadius.lg,
			boxShadow: shadows.lg,
			minWidth: "320px",
			maxWidth: "480px",
			fontSize: typography.fontSize.base,
		},
		header: {
			marginBottom: spacing.md,
			fontWeight: typography.fontWeight.semibold,
		},
		content: {
			marginBottom: spacing.lg,
		},
		footer: {
			textAlign: "right" as const,
			marginTop: spacing.md,
		},
	},

	// Error dialog specific theme
	errorDialog: {
		container: {
			background: colors.error,
			color: colors.textLight,
			border: `2px solid ${colors.warning}`,
			borderRadius: borderRadius.lg,
			boxShadow: shadows.lg,
			minWidth: "320px",
			maxWidth: "480px",
			fontSize: typography.fontSize.base,
			transition: `background ${transitions.verySlow}`,
		},
		flashRed: {
			background: "#ffb3b3",
		},
		detailsButton: {
			background: "none",
			border: "none",
			color: colors.textLight,
			textDecoration: "underline",
			cursor: "pointer",
			fontSize: typography.fontSize.sm,
			marginBottom: spacing.xs,
		},
		detailsContainer: {
			background: colors.white,
			color: colors.textDark,
			border: `1px solid ${colors.gray[200]}`,
			borderRadius: borderRadius.base,
			padding: spacing.sm,
			marginTop: spacing.xs,
			fontSize: typography.fontSize.xs,
			maxHeight: "200px",
			overflow: "auto",
			wordBreak: "break-all" as const,
		},
		copyButton: {
			marginTop: spacing.sm,
			background: colors.gray[100],
			border: `1px solid ${colors.gray[300]}`,
			borderRadius: borderRadius.base,
			padding: "2px 8px",
			cursor: "pointer",
			fontSize: typography.fontSize.xs,
		},
		closeButton: {
			background: colors.white,
			border: `1px solid ${colors.gray[300]}`,
			borderRadius: borderRadius.base,
			padding: "4px 12px",
			cursor: "pointer",
		},
	},

	// Button theme
	button: {
		base: {
			border: "none",
			borderRadius: borderRadius.base,
			cursor: "pointer",
			fontSize: typography.fontSize.base,
			fontWeight: typography.fontWeight.medium,
			padding: `${spacing.sm} ${spacing.md}`,
			transition: `all ${transitions.base}`,
		},
		primary: {
			background: colors.primary,
			color: colors.textLight,
			"&:hover": {
				background: colors.highlight,
			},
		},
		secondary: {
			background: colors.secondary,
			color: colors.textLight,
			"&:hover": {
				background: colors.gray[700],
			},
		},
		accent: {
			background: colors.accent,
			color: colors.secondary,
			"&:hover": {
				background: colors.primary,
				color: colors.textLight,
			},
		},
	},
} as const;

// ===== UTILITY FUNCTIONS =====

/**
 * Creates a CSS object with theme values
 */
export const createThemeStyles = (theme: Record<string, any>) => {
	return theme;
};

/**
 * Merges multiple style objects
 */
export const mergeStyles = (...styles: Record<string, any>[]) => {
	return Object.assign({}, ...styles);
};

/**
 * Creates responsive styles
 */
export const responsive = (breakpoint: string, styles: Record<string, any>) => {
	return {
		[`@media (min-width: ${breakpoint})`]: styles,
	};
};

/**
 * Theme export for easy importing
 */
export const theme = {
	colors,
	typography,
	spacing,
	borderRadius,
	shadows,
	transitions,
	zIndex,
	componentThemes,
	createThemeStyles,
	mergeStyles,
	responsive,
} as const;

export default theme;
