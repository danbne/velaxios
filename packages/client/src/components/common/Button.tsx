import React from "react";
import { componentThemes, mergeStyles } from "../../styles/theme";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "accent";
	size?: "sm" | "md" | "lg";
}

/**
 * Button - Reusable button component with theme integration
 *
 * This component provides consistent button styling across the application
 * using the centralized theme system. It supports multiple variants and sizes
 * while maintaining accessibility and proper TypeScript support.
 *
 * Features:
 * - Multiple variants (primary, secondary, accent)
 * - Multiple sizes (sm, md, lg)
 * - Theme-based styling
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
	// Get base button styles
	const baseStyles = componentThemes.button.base;

	// Get variant-specific styles
	const variantStyles =
		componentThemes.button[variant as keyof typeof componentThemes.button] ||
		{};

	// Get size-specific styles
	const sizeStyles = {
		sm: { padding: "4px 8px", fontSize: "0.875rem" },
		md: { padding: "8px 16px", fontSize: "1rem" },
		lg: { padding: "12px 24px", fontSize: "1.125rem" },
	}[size];

	// Merge all styles
	const buttonStyles = mergeStyles(
		baseStyles,
		variantStyles,
		sizeStyles,
		style || {}
	);

	return (
		<button className={className} style={buttonStyles} {...props}>
			{children}
		</button>
	);
};

export default Button;
