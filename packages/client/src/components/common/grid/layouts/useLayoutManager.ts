import { useState, useCallback } from "react";
import { useApiPut } from "../hooks/useApiClient";
import { API_ENDPOINTS } from "../../../../config/api";
import type { GridApi } from "ag-grid-community";
import type {
	UseLayoutManagerProps,
	LayoutWithData,
	LayoutSaveCallback,
} from "./types";

/**
 * Custom hook for managing grid layout functionality
 *
 * This hook encapsulates all layout-related operations including:
 * - Loading and saving layouts
 * - Handling layout changes
 * - Managing the current active layout
 * - Providing layout state to the grid
 * - Ensuring default layout exists
 *
 * The hook is designed to be general-purpose and not tied to any specific
 * project or domain, making it reusable across different grid implementations.
 *
 * @param gridId - Unique identifier for the grid instance
 * @param gridApi - AG Grid API instance for state manipulation
 * @returns Object containing layout management functions and state
 */
export const useLayoutManager = ({
	gridId,
	gridApi,
}: UseLayoutManagerProps) => {
	const typedGridApi = gridApi as GridApi | undefined;
	const [currentLayout, setCurrentLayout] = useState<LayoutWithData | null>(
		null
	);

	// Use the new API client hooks
	const loadLayoutMutation = useApiPut<LayoutWithData>({
		invalidateQueries: [`layouts-${gridId}`],
	});

	const saveLayoutMutation = useApiPut<boolean>({
		invalidateQueries: [`layouts-${gridId}`],
	});

	/**
	 * Loads a specific layout and applies it to the grid
	 *
	 * This function:
	 * - Fetches the layout data from the backend
	 * - Updates the current layout state
	 * - Applies the layout data to the grid using AG Grid's setState
	 * - Handles authentication and error scenarios
	 *
	 * @param layoutId - The ID of the layout to load
	 * @returns Promise resolving to the loaded layout data
	 */
	const loadLayout = useCallback(
		async (layoutId: string): Promise<LayoutWithData> => {
			try {
				const layout = await loadLayoutMutation.mutateAsync({
					endpoint: API_ENDPOINTS.GRID_LAYOUT(gridId, layoutId),
					data: {},
				});
				setCurrentLayout(layout);

				// Apply the layout data to the grid
				if (layout.layout_data && Object.keys(layout.layout_data).length > 0) {
					typedGridApi?.setState(layout.layout_data);
				}

				return layout;
			} catch (err: unknown) {
				console.error("Error loading layout:", err);
				throw err;
			}
		},
		[gridId, typedGridApi, loadLayoutMutation]
	);

	/**
	 * Saves the current grid state to a specific layout
	 *
	 * This function:
	 * - Captures the current grid state using AG Grid's getState
	 * - Filters out the actions column from the saved state
	 * - Updates the layout in the backend
	 * - Updates the current layout state if it matches
	 * - Handles authentication and error scenarios
	 *
	 * @param layoutId - The ID of the layout to save the current state to
	 * @returns Promise resolving to true if successful
	 */
	const saveLayout = useCallback(
		async (layoutId: string): Promise<boolean> => {
			if (!gridApi) return false;

			try {
				// Get current grid state
				const currentState = typedGridApi?.getState();

				// Filter out the actions column from the saved state
				const filteredState = { ...currentState } as {
					columnState?: Array<{ colId: string }>;
					columnVisibility?: { hiddenColIds?: string[] };
					columnPinned?: { leftColIds?: string[]; rightColIds?: string[] };
				};

				// Remove actions column from column state if it exists
				if (
					filteredState.columnState &&
					Array.isArray(filteredState.columnState)
				) {
					filteredState.columnState = filteredState.columnState.filter(
						(col: { colId: string }) => col.colId !== "actions"
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

				// Update the layout with current state
				await saveLayoutMutation.mutateAsync({
					endpoint: API_ENDPOINTS.GRID_LAYOUT(gridId, layoutId),
					data: {
						layoutData: filteredState,
					},
				});

				// Update current layout state
				if (currentLayout && currentLayout.layout_id === layoutId) {
					setCurrentLayout({
						...currentLayout,
						layout_data: filteredState,
					});
				}

				return true;
			} catch (err: unknown) {
				console.error("Error saving layout:", err);
				throw err;
			}
		},
		[gridId, typedGridApi, currentLayout, saveLayoutMutation]
	);

	/**
	 * Ensures the default layout exists and loads it
	 *
	 * This function:
	 * - Makes an API call to ensure the default layout exists
	 * - Sets the current layout state with the default layout info
	 * - Applies the layout data to the grid if it has data
	 * - Handles authentication and error scenarios
	 *
	 * @returns Promise resolving to the default layout data
	 */
	const ensureDefaultLayout = useCallback(async (): Promise<LayoutWithData> => {
		try {
			const layout = await loadLayoutMutation.mutateAsync({
				endpoint: API_ENDPOINTS.GRID_LAYOUT_DEFAULT(gridId),
				data: {},
			});
			setCurrentLayout(layout);

			// Apply the layout data to the grid if it has data
			if (layout.layout_data && Object.keys(layout.layout_data).length > 0) {
				typedGridApi?.setState(layout.layout_data);
			}

			return layout;
		} catch (err: unknown) {
			console.error("Error ensuring default layout:", err);
			throw err;
		}
	}, [gridId, gridApi, loadLayoutMutation]);

	/**
	 * Handles layout changes by applying the new layout state to the grid
	 *
	 * This function is called when a user selects a different layout from the sidebar.
	 * It takes the layout data and applies it to the current grid state using AG Grid's setState method.
	 *
	 * @param layoutData - The layout state object containing grid configuration
	 */
	const handleLayoutChange = useCallback(
		(layoutData: unknown) => {
			if (
				layoutData &&
				Object.keys(layoutData as Record<string, unknown>).length > 0
			) {
				typedGridApi?.setState(layoutData as Record<string, unknown>);
			}
		},
		[typedGridApi]
	);

	/**
	 * Saves the current grid state to the selected layout
	 *
	 * This function is called when a user clicks the "Save Layout" button.
	 * It captures the current grid state (column order, filters, sorting, etc.)
	 * and saves it to the database for the specified layout.
	 *
	 * @param params - Object containing the layout ID to save to
	 */
	const handleLayoutSave = useCallback(
		async (params: LayoutSaveCallback) => {
			try {
				await saveLayout(params.layoutId);
			} catch (error) {
				console.error("Error saving layout:", error);
			}
		},
		[saveLayout]
	);

	return {
		currentLayout,
		isLoading: loadLayoutMutation.isPending || saveLayoutMutation.isPending,
		loadLayout,
		saveLayout,
		ensureDefaultLayout,
		handleLayoutChange,
		handleLayoutSave,
	};
};
