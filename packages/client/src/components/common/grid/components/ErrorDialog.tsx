import React from "react";
import { componentThemes, mergeStyles } from "../../../../styles/theme";
import Dialog from "../../Dialog";
import ErrorDetails from "./ErrorDetails";
import Button from "../../Button";

interface ErrorDialogProps {
	error: string | { message: string; details?: Record<string, any> } | null;
	showDialog: boolean;
	flashRed: boolean;
	onClose: () => void;
}

/**
 * ErrorDialog - Simplified error dialog component
 *
 * This component displays user-friendly error messages with optional details.
 * It uses the centralized theme system and Dialog component for consistent styling
 * and includes accessibility features for better user experience.
 *
 * Features:
 * - Clean, consistent styling using theme system
 * - Collapsible error details via ErrorDetails component
 * - Proper accessibility attributes
 * - Flash red animation for critical errors
 * - Responsive design
 * - Reusable Dialog component
 *
 * @param error - Error message string or object with message and optional details
 * @param showDialog - Whether to display the dialog
 * @param flashRed - Whether to flash red background for critical errors
 * @param onClose - Callback function when dialog is closed
 * @returns JSX element representing the error dialog
 */
const ErrorDialog: React.FC<ErrorDialogProps> = ({
	error,
	showDialog,
	flashRed,
	onClose,
}) => {
	if (!showDialog || !error) return null;

	// Extract error message and details
	const errorMessage = typeof error === "string" ? error : error.message;
	const errorDetails = typeof error === "object" ? error.details : undefined;

	// Determine container styles based on flash state
	const containerStyles = flashRed
		? mergeStyles(
				componentThemes.errorDialog.container,
				componentThemes.errorDialog.flashRed
		  )
		: componentThemes.errorDialog.container;

	return (
		<Dialog isOpen={showDialog} onClose={onClose} style={containerStyles}>
			{/* Main error message */}
			<div style={{ color: componentThemes.errorDialog.container.color }}>
				{errorMessage}
			</div>

			{/* Error details section */}
			{errorDetails && <ErrorDetails details={errorDetails} />}

			{/* Close button */}
			<Button
				variant="secondary"
				size="sm"
				onClick={onClose}
				style={componentThemes.errorDialog.closeButton}
			>
				Close
			</Button>
		</Dialog>
	);
};

export default ErrorDialog;
