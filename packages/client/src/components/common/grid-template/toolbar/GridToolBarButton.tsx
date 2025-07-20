import React from "react";
import * as HeroIcons from "@heroicons/react/24/outline"; // Import outline icons (or use /solid for filled icons)

type IconType = "PlusIcon" | "TrashIcon" | "CheckIcon" | "ArrowPathIcon";

// Define button variants with SVG styling
type ButtonVariant = "primary" | "secondary" | "danger";

interface VariantStyle {
	button: string;
	svg: {
		fill: string;
		stroke: string;
		strokeWidth: string;
	};
	svgHover?: {
		fill: string;
		stroke: string;
		strokeWidth: string;
	};
}

// Define props interface with generic type for icon
interface ButtonProps {
	variant?: ButtonVariant;
	icon: IconType; // Icon name from Heroicons
	onClick?: () => void;
	disabled?: boolean;
}

const GridToolBarButton: React.FC<ButtonProps> = ({
	icon,
	onClick,
	disabled = false,
}) => {
	// Dynamically select the Heroicon component
	const IconComponent = HeroIcons[icon];
	// Get aria-label based on icon type

	const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
		onClick?.();
	};

	return (
		<button
			onClick={disabled ? undefined : handleClick}
			disabled={disabled}
			className={disabled ? "grid-button-disabled" : "grid-button-enabled"}
			style={{ width: "24px", height: "24px", backgroundColor: "white" }}
		>
			<IconComponent width={16} height={16} />
		</button>
	);
};

export default GridToolBarButton;
