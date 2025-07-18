import { useCallback } from "react";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

/**
 * Props interface for the useNavigationWarning hook
 */
interface UseNavigationWarningProps {
	/** Whether there are unsaved changes */
	hasUnsavedChanges: boolean;
	/** Function to clear changes */
	clearChanges: () => void;
	/** Function to refresh data */
	handleRefresh: () => void;
}

/**
 * Hook that manages navigation warnings for unsaved changes
 *
 * This hook provides a clean interface for handling navigation
 * warnings and refresh operations with unsaved changes protection.
 */
export const useNavigationWarning = ({
	hasUnsavedChanges,
	clearChanges,
	handleRefresh,
}: UseNavigationWarningProps) => {
	// Memoize the onConfirmNavigation callback to prevent infinite re-renders
	const onConfirmNavigation = useCallback(() => {
		// Clear pending changes and refresh data
		clearChanges();
		handleRefresh();
	}, [clearChanges, handleRefresh]);

	const { confirmRefresh } = useUnsavedChangesWarning({
		hasUnsavedChanges,
		onConfirmNavigation,
	});

	// Wrapper for refresh that checks for unsaved changes
	const handleRefreshWithWarning = useCallback(() => {
		if (confirmRefresh()) {
			handleRefresh();
		}
	}, [confirmRefresh, handleRefresh]);

	return {
		handleRefreshWithWarning,
	};
};
