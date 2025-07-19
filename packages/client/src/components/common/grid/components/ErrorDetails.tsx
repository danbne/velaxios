import React, { useState } from "react";

interface ErrorDetailsProps {
	details: Record<string, unknown>;
}

/**
 * ErrorDetails - Sub-component for displaying error details
 *
 * This component handles the collapsible details section of error dialogs.
 * It provides:
 * - Toggle functionality to show/hide details
 * - Formatted JSON display of error details
 * - Copy to clipboard functionality
 * - Proper styling and accessibility
 *
 * @param details - The error details object to display
 * @returns JSX element representing the error details section
 */
const ErrorDetails: React.FC<ErrorDetailsProps> = ({ details }) => {
	const [isOpen, setIsOpen] = useState(false);

	const handleToggle = () => {
		setIsOpen(!isOpen);
	};

	const handleCopyDetails = async () => {
		try {
			await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
		} catch (error) {
			console.error("Failed to copy details:", error);
		}
	};

	const formattedDetails = JSON.stringify(details, null, 2);

	return (
		<div style={{ marginTop: "12px" }}>
			<button
				style={{
					backgroundColor: "transparent",
					border: "1px solid #d1d5db",
					borderRadius: "4px",
					padding: "4px 8px",
					fontSize: "0.875rem",
					cursor: "pointer",
					color: "#6b7280",
					marginBottom: "8px",
				}}
				onClick={handleToggle}
				aria-expanded={isOpen}
				aria-controls="error-details"
			>
				{isOpen ? "Hide details" : "Show details"}
			</button>

			{isOpen && (
				<div
					id="error-details"
					style={{
						backgroundColor: "#f9fafb",
						border: "1px solid #e5e7eb",
						borderRadius: "4px",
						padding: "12px",
						marginTop: "8px",
						fontSize: "0.875rem",
						fontFamily: "monospace",
					}}
					role="region"
					aria-label="Error details"
				>
					<pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
						{formattedDetails}
					</pre>
					<button
						style={{
							backgroundColor: "#6b7280",
							color: "white",
							border: "none",
							borderRadius: "4px",
							padding: "4px 8px",
							fontSize: "0.875rem",
							cursor: "pointer",
							marginTop: "8px",
						}}
						onClick={handleCopyDetails}
						title="Copy error details to clipboard"
					>
						Copy details
					</button>
				</div>
			)}
		</div>
	);
};

export default ErrorDetails;
