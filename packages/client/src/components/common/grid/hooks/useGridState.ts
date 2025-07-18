import { useState, useEffect, useCallback, useRef } from "react";
import type { GridApi, GridReadyEvent } from "ag-grid-enterprise";

/**
 * Grid state enum for tracking the complete lifecycle
 */
export type GridStateType = "loading" | "loaded" | "ready" | "error";

/**
 * Props interface for the useGridState hook
 *
 * @template T - The type of data objects managed by the grid
 */
interface UseGridStateProps<T> {
	/** Unique identifier for the grid instance, used for state persistence */
	gridId: string;
	/** Function to fetch data from the API or other data source */
	fetchData: () => Promise<T[]>;
}

/**
 * Hook for managing grid state and data loading
 *
 * This hook provides comprehensive state management for the grid including:
 * - Data loading and caching
 * - Grid API management
 * - Loading state management
 * - Grid state persistence and restoration
 * - Grid ready event handling
 *
 * The hook handles the complete lifecycle of grid data from initial
 * loading through state restoration and ongoing updates.
 *
 * @template T - The type of data objects managed by the grid
 * @param props - Configuration for grid state management
 * @returns Object containing grid state and management functions
 */
export const useGridState = <T>({
	gridId,
	fetchData,
}: UseGridStateProps<T>) => {
	// ===== CONSOLIDATED STATE MANAGEMENT =====
	/** Current row data array displayed in the grid */
	const [rowData, setRowData] = useState<T[]>([]);
	/** AG Grid API instance for grid operations */
	const [gridApi, setGridApi] = useState<GridApi | null>(null);
	/** Consolidated grid state tracking the complete lifecycle */
	const [gridState, setGridState] = useState<GridStateType>("loading");
	/** Saved grid state for restoration (currently not used) */
	const [savedState] = useState<any>(null);

	// Store the fetchData function in a ref to prevent infinite loops
	const fetchDataRef = useRef(fetchData);
	fetchDataRef.current = fetchData;

	// Data loading
	useEffect(() => {
		fetchDataRef
			.current()
			.then((data) => {
				setRowData(data);
				setGridState("loaded");
			})
			.catch((error) => {
				setGridState("error");
			});
	}, []); // Remove fetchData from dependencies to prevent infinite loops

	// Set up grid state when data is loaded
	useEffect(() => {
		if (gridState === "loaded") {
			// Show the grid immediately since we're not auto-loading state anymore
			setGridState("ready");
		}
	}, [gridState]);

	// Get current grid state (for manual saving)
	const getCurrentGridState = useCallback(() => {
		if (!gridApi) return null;

		try {
			const state = gridApi.getState();

			// Filter out the actions column from the saved state
			const filteredState = { ...state } as any;

			// Remove actions column from column state if it exists
			if (
				filteredState.columnState &&
				Array.isArray(filteredState.columnState)
			) {
				filteredState.columnState = filteredState.columnState.filter(
					(col: any) => col.colId !== "actions"
				);
			}

			// Remove actions column from column visibility if it exists
			if (
				filteredState.columnVisibility &&
				filteredState.columnVisibility.hiddenColIds
			) {
				filteredState.columnVisibility.hiddenColIds =
					filteredState.columnVisibility.hiddenColIds.filter(
						(colId: string) => colId !== "actions"
					);
			}

			// Remove actions column from pinned columns if it exists
			if (filteredState.columnPinned) {
				if (filteredState.columnPinned.leftColIds) {
					filteredState.columnPinned.leftColIds =
						filteredState.columnPinned.leftColIds.filter(
							(colId: string) => colId !== "actions"
						);
				}
				if (filteredState.columnPinned.rightColIds) {
					filteredState.columnPinned.rightColIds =
						filteredState.columnPinned.rightColIds.filter(
							(colId: string) => colId !== "actions"
						);
				}
			}

			return filteredState;
		} catch (error) {
			return null;
		}
	}, [gridApi]);

	// Grid ready event handler
	const onGridReady = useCallback((params: GridReadyEvent) => {
		setGridApi(params.api);
	}, []);

	// Force grid redraw when row data changes to ensure styling is updated
	useEffect(() => {
		if (gridApi && !gridApi.isDestroyed?.() && rowData && rowData.length > 0) {
			try {
				gridApi.redrawRows(); // Force class refresh on data change
			} catch (error) {
				// Ignore errors if grid is destroyed
			}
		}
	}, [rowData.length, gridApi]);

	// Check if grid should be shown - simplified to single state check
	const shouldShowGrid = gridState === "ready";

	// Computed loading state for backward compatibility
	const isLoading = gridState === "loading";

	return {
		rowData,
		setRowData,
		isLoading,
		setIsLoading: (loading: boolean) => {
			setGridState(loading ? "loading" : "ready");
		},
		gridApi,
		savedState,
		shouldShowGrid,
		onGridReady,
		getCurrentGridState,
		// Expose grid state for advanced use cases
		gridState,
		setGridState,
	};
};
