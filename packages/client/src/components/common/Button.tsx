import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "accent";
	size?: "sm" | "md" | "lg";
}

/**
 * Button - Reusable button component
 *
 * This component provides consistent button styling across the application.
 * It supports multiple variants and sizes while maintaining accessibility
 * and proper TypeScript support.
 *
 * Features:
 * - Multiple variants (primary, secondary, accent)
 * - Multiple sizes (sm, md, lg)
 * - Clean styling
 * - Proper accessibility attributes
 * - TypeScript support with HTML button props
 *
 * @param variant - Button style variant
 * @param size - Button size
 * @param children - Button content
 * @param className - Additional CSS classes
 * @param props - All standard HTML button attributes
 * @returns JSX element representing the button
 */
const Button: React.FC<ButtonProps> = ({
	children,
	variant = "primary",
	size = "md",
	className = "",
	style,
	...props
}) => {
	// Base button styles
	const baseStyles: React.CSSProperties = {
		border: "none",
		borderRadius: "4px",
		cursor: "pointer",
		fontWeight: "500",
		transition: "all 0.2s",
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		textDecoration: "none",
		outline: "none",
	};

	// Variant-specific styles
	const variantStyles: Record<string, React.CSSProperties> = {
		primary: {
			backgroundColor: "#0078d4",
			color: "white",
			border: "1px solid #0078d4",
		},
		secondary: {
			backgroundColor: "#6b7280",
			color: "white",
			border: "1px solid #6b7280",
		},
		accent: {
			backgroundColor: "#10b981",
			color: "white",
			border: "1px solid #10b981",
		},
	};

	// Size-specific styles
	const sizeStyles: Record<string, React.CSSProperties> = {
		sm: { padding: "4px 8px", fontSize: "0.875rem" },
		md: { padding: "8px 16px", fontSize: "1rem" },
		lg: { padding: "12px 24px", fontSize: "1.125rem" },
	};

	// Merge all styles
	const buttonStyles: React.CSSProperties = {
		...baseStyles,
		...variantStyles[variant],
		...sizeStyles[size],
		...style,
	};

	return (
		<button className={className} style={buttonStyles} {...props}>
			{children}
		</button>
	);
};

export default Button;
