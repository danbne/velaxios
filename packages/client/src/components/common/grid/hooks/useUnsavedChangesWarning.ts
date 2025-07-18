import { useEffect, useCallback } from "react";

interface UseUnsavedChangesWarningProps {
	hasUnsavedChanges: boolean;
	onConfirmNavigation?: () => void;
}

/**
 * Hook to warn users about unsaved changes when navigating away or refreshing
 *
 * This hook:
 * - Shows a browser warning when trying to close/refresh the page
 * - Provides a custom confirmation dialog for grid refresh actions
 * - Prevents accidental data loss
 */
export const useUnsavedChangesWarning = ({
	hasUnsavedChanges,
	onConfirmNavigation,
}: UseUnsavedChangesWarningProps) => {
	// Handle browser navigation (close, refresh, back button)
	useEffect(() => {
		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			if (hasUnsavedChanges) {
				event.preventDefault();
				event.returnValue =
					"You have unsaved changes. Are you sure you want to leave?";
				return "You have unsaved changes. Are you sure you want to leave?";
			}
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [hasUnsavedChanges]);

	// Custom confirmation for grid refresh
	const confirmRefresh = useCallback(() => {
		if (hasUnsavedChanges) {
			const confirmed = window.confirm(
				"You have unsaved changes. Refreshing will lose all unsaved data. Are you sure you want to continue?"
			);
			if (confirmed && onConfirmNavigation) {
				onConfirmNavigation();
			}
			return confirmed;
		}
		return true; // No unsaved changes, allow refresh
	}, [hasUnsavedChanges, onConfirmNavigation]);

	return {
		confirmRefresh,
	};
};
