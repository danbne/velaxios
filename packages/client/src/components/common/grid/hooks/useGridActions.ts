import { useCallback } from "react";
import type { GridApi } from "ag-grid-community";

/**
 * Props interface for the useGridActions hook
 */
interface UseGridActionsProps<T> {
	/** Function to add a new row */
	addNewRow: (data?: Partial<T>) => T;
	/** Function to update row data */
	setRowData: React.Dispatch<React.SetStateAction<T[]>>;
	/** Function to delete selected rows */
	deleteSelectedRows: (gridApi: GridApi) => void;
	/** Function to duplicate selected row */
	duplicateSelectedRow: (gridApi: GridApi) => void;
	/** Function to save changes */
	saveChanges: () => Promise<void>;
	/** Function to clear changes */
	clearChanges: () => void;
	/** Function to fetch fresh data */
	fetchData: () => Promise<T[]>;
	/** Function to show errors */
	showError: (error: unknown) => void;
	/** Function to set loading state */
	setIsLoading: (loading: boolean) => void;
	/** AG Grid API instance */
	gridApi?: GridApi;
}

/**
 * Hook that provides all grid action handlers
 *
 * This hook centralizes all grid actions and provides a clean interface
 * for the main component. It handles:
 * - Row operations (add, delete, duplicate)
 * - Data operations (save, refresh)
 * - Error handling and loading states
 */
export const useGridActions = <T>({
	addNewRow,
	setRowData,
	deleteSelectedRows,
	duplicateSelectedRow,
	saveChanges,
	clearChanges,
	fetchData,
	showError,
	setIsLoading,
	gridApi,
}: UseGridActionsProps<T>) => {
	/**
	 * Adds a new row to the grid
	 */
	const handleAddRow = useCallback(() => {
		const newRow = addNewRow({});
		setRowData((prev) => [...prev, newRow]);
	}, [addNewRow, setRowData]);

	/**
	 * Adds multiple rows to the grid
	 * Currently adds one row, but can be enhanced for multiple
	 */
	const handleAddMultipleRows = useCallback(() => {
		// For now, just add one row. Could be enhanced to add multiple
		const newRow = addNewRow({});
		setRowData((prev) => [...prev, newRow]);
	}, [addNewRow, setRowData]);

	/**
	 * Deletes the currently selected rows
	 */
	const handleDeleteRows = useCallback(() => {
		if (gridApi) {
			deleteSelectedRows(gridApi);
		}
	}, [deleteSelectedRows, gridApi]);

	/**
	 * Duplicates the currently selected row
	 */
	const handleDuplicateRow = useCallback(() => {
		if (gridApi) {
			duplicateSelectedRow(gridApi);
		}
	}, [duplicateSelectedRow, gridApi]);

	/**
	 * Refreshes the grid data from the server
	 */
	const handleRefresh = useCallback(async () => {
		setIsLoading(true);
		try {
			const freshData = await fetchData();
			setRowData(freshData);
			clearChanges();
		} catch (error) {
			showError(error);
		} finally {
			setIsLoading(false);
		}
	}, [fetchData, setRowData, clearChanges, showError, setIsLoading]);

	/**
	 * Saves all pending changes
	 */
	const handleSave = useCallback(async () => {
		await saveChanges();
	}, [saveChanges]);

	return {
		handleAddRow,
		handleAddMultipleRows,
		handleDeleteRows,
		handleDuplicateRow,
		handleRefresh,
		handleSave,
	};
};
