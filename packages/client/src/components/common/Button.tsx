import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "secondary" | "accent" | "outline";
	size?: "sm" | "md" | "lg";
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * Button - Reusable button component
 *
 * This component provides consistent button styling across the application.
 * It supports multiple variants and sizes while maintaining accessibility
 * and proper TypeScript support.
 *
 * Features:
 * - Multiple variants (primary, secondary, accent, outline)
 * - Multiple sizes (sm, md, lg)
 * - Clean styling using theme variables
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
	// Base button classes
	const baseClasses = "btn";

	// Variant-specific classes
	const variantClasses: Record<string, string> = {
		primary: "btn-primary",
		secondary: "btn-secondary",
		accent: "btn-accent",
		outline: "btn-outline",
	};

	// Size-specific classes
	const sizeClasses: Record<string, string> = {
		sm: "btn-sm",
		md: "", // Default size
		lg: "btn-lg",
	};

	// Combine all classes
	const buttonClasses =
		`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();

	return (
		<button className={buttonClasses} style={style} {...props}>
			{children}
		</button>
	);
};

export default Button;
