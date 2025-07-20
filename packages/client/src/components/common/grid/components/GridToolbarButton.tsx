import React from "react";

/**
 * Props interface for the GridToolbarButton component
 */
interface ToolbarButtonProps {
	/** Unicode icon or emoji to display on the button */
	icon: string;
	/** Tooltip text shown on hover */
	tooltip: string;
	/** Click handler function */
	onClick: () => void;
	/** Whether the button is disabled */
	disabled?: boolean;
	/** Whether this is the save button (affects styling) */
	isSaveButton?: boolean;
	/** Whether there are unsaved changes (for save button styling) */
	hasUnsavedChanges?: boolean;
}

/**
 * GridToolbarButton - Individual button component for grid toolbar
 *
 * This component renders a single toolbar button with:
 * - Unicode icon display
 * - Tooltip on hover
 * - Disabled state styling
 * - Special styling for save button with unsaved changes
 * - Consistent styling with the grid theme
 *
 * The button adapts its appearance based on its type and state,
 * providing clear visual feedback to users.
 *
 * @param props - Configuration for the button appearance and behavior
 * @returns JSX element representing a toolbar button
 */
const GridToolbarButton: React.FC<ToolbarButtonProps> = ({
	icon,
	tooltip,
	onClick,
	disabled = false,
	isSaveButton = false,
	hasUnsavedChanges = false,
}) => {
	// Determine button color based on type and state
	let buttonColor = "var(--text-primary)";
	if (disabled) {
		buttonColor = "var(--text-muted)";
	} else if (isSaveButton && hasUnsavedChanges) {
		buttonColor = "var(--info)"; // Blue for save button with changes
	}

	return (
		<button
			className="toolbar-button"
			onClick={onClick}
			disabled={disabled}
			title={tooltip}
			style={{
				background: "none",
				border: "none",
				padding: "var(--spacing-sm)",
				margin: "0 var(--spacing-xs)",
				cursor: disabled ? "not-allowed" : "pointer",
				borderRadius: "var(--radius-sm)",
				color: buttonColor,
				fontSize: "var(--font-size-base)",
				transition: "color var(--transition-normal)",
			}}
		>
			{icon}
		</button>
	);
};

export default GridToolbarButton;
