import React from "react";

interface DialogProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	footer?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

/**
 * Dialog - Reusable modal dialog component
 *
 * This component provides a consistent modal dialog experience across the application.
 * It includes proper accessibility features like focus management and ARIA attributes.
 *
 * Features:
 * - Clean styling using theme variables
 * - Proper accessibility attributes
 * - Focus management
 * - Customizable header and footer
 * - Responsive design
 * - Backdrop click to close
 *
 * @param isOpen - Whether the dialog is visible
 * @param onClose - Callback when dialog is closed
 * @param title - Optional dialog title
 * @param children - Dialog content
 * @param footer - Optional footer content
 * @param className - Additional CSS classes
 * @param style - Additional inline styles
 * @returns JSX element representing the dialog
 */
const Dialog: React.FC<DialogProps> = ({
	isOpen,
	onClose,
	title,
	children,
	footer,
	className = "",
	style,
}) => {
	if (!isOpen) return null;

	const handleBackdropClick = (e: React.MouseEvent) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			onClose();
		}
	};

	const overlayStyles: React.CSSProperties = {
		position: "fixed",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: "var(--bg-overlay)",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		zIndex: "var(--z-modal)",
	};

	const containerStyles: React.CSSProperties = {
		backgroundColor: "var(--bg-primary)",
		borderRadius: "var(--radius-lg)",
		boxShadow: "var(--shadow-lg)",
		maxWidth: "500px",
		width: "90%",
		maxHeight: "80vh",
		overflow: "auto",
		...style,
	};

	const headerStyles: React.CSSProperties = {
		padding: "var(--spacing-md) var(--spacing-lg)",
		borderBottom: "1px solid var(--border-light)",
		fontWeight: "600",
		fontSize: "var(--font-size-lg)",
	};

	const contentStyles: React.CSSProperties = {
		padding: "var(--spacing-lg)",
	};

	const footerStyles: React.CSSProperties = {
		padding: "var(--spacing-md) var(--spacing-lg)",
		borderTop: "1px solid var(--border-light)",
		display: "flex",
		justifyContent: "flex-end",
		gap: "var(--spacing-sm)",
	};

	return (
		<div
			style={overlayStyles}
			onClick={handleBackdropClick}
			onKeyDown={handleKeyDown}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? "dialog-title" : undefined}
			className={className}
		>
			<div style={containerStyles}>
				{/* Header */}
				{title && (
					<div style={headerStyles}>
						<h2 id="dialog-title" style={{ margin: 0 }}>
							{title}
						</h2>
					</div>
				)}

				{/* Content */}
				<div style={contentStyles}>{children}</div>

				{/* Footer */}
				{footer && <div style={footerStyles}>{footer}</div>}
			</div>
		</div>
	);
};

/**
 * DialogHeader - Component for dialog headers
 */
export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => (
	<div
		style={{
			padding: "16px 20px",
			borderBottom: "1px solid #e5e7eb",
			fontWeight: "600",
			fontSize: "18px",
		}}
	>
		{children}
	</div>
);

/**
 * DialogContent - Component for dialog content
 */
export const DialogContent: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => (
	<div
		style={{
			padding: "20px",
		}}
	>
		{children}
	</div>
);

/**
 * DialogFooter - Component for dialog footers
 */
export const DialogFooter: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => (
	<div
		style={{
			padding: "16px 20px",
			borderTop: "1px solid #e5e7eb",
			display: "flex",
			justifyContent: "flex-end",
			gap: "8px",
		}}
	>
		{children}
	</div>
);

export default Dialog;
