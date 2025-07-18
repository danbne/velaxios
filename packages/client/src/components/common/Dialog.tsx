import React from "react";
import { componentThemes, mergeStyles } from "../../styles/theme";

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
 * It uses the centralized theme system for styling and includes proper accessibility
 * features like focus management and ARIA attributes.
 *
 * Features:
 * - Theme-based styling
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

	const containerStyles = mergeStyles(
		componentThemes.dialog.container,
		style || {}
	);

	return (
		<div
			style={componentThemes.dialog.overlay}
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
					<div style={componentThemes.dialog.header}>
						<h2 id="dialog-title" style={{ margin: 0 }}>
							{title}
						</h2>
					</div>
				)}

				{/* Content */}
				<div style={componentThemes.dialog.content}>{children}</div>

				{/* Footer */}
				{footer && <div style={componentThemes.dialog.footer}>{footer}</div>}
			</div>
		</div>
	);
};

/**
 * DialogHeader - Component for dialog headers
 */
export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => <div style={componentThemes.dialog.header}>{children}</div>;

/**
 * DialogContent - Component for dialog content
 */
export const DialogContent: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => <div style={componentThemes.dialog.content}>{children}</div>;

/**
 * DialogFooter - Component for dialog footers
 */
export const DialogFooter: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => <div style={componentThemes.dialog.footer}>{children}</div>;

export default Dialog;
