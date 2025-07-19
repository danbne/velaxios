import React from "react";
import Dialog from "../../Dialog";
import ErrorDetails from "./ErrorDetails";
import Button from "../../Button";

interface ErrorDialogProps {
	error: string | { message: string; details?: Record<string, unknown> } | null;
	showDialog: boolean;
	flashRed: boolean;
	onClose: () => void;
}

/**
 * ErrorDialog - Simplified error dialog component
 *
 * This component displays user-friendly error messages with optional details.
 * It includes accessibility features for better user experience.
 *
 * Features:
 * - Clean, consistent styling
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
		? {
				backgroundColor: "#fee2e2",
				border: "1px solid #fecaca",
				borderRadius: "8px",
				padding: "16px",
				margin: "8px 0",
				animation: "flashRed 0.5s ease-in-out",
		  }
		: {
				backgroundColor: "#fef3c7",
				border: "1px solid #fde68a",
				borderRadius: "8px",
				padding: "16px",
				margin: "8px 0",
		  };

	return (
		<Dialog isOpen={showDialog} onClose={onClose} style={containerStyles}>
			{/* Main error message */}
			<div style={{ color: "#991b1b", marginBottom: "12px" }}>
				{errorMessage}
			</div>

			{/* Error details section */}
			{errorDetails && <ErrorDetails details={errorDetails} />}

			{/* Close button */}
			<Button
				variant="secondary"
				size="sm"
				onClick={onClose}
				style={{
					marginTop: "12px",
					backgroundColor: "#6b7280",
					color: "white",
					border: "none",
					borderRadius: "4px",
					padding: "6px 12px",
					cursor: "pointer",
				}}
			>
				Close
			</Button>
		</Dialog>
	);
};

export default ErrorDialog;
