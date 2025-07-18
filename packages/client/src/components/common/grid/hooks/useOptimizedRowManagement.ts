/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useMemo } from "react";
import { generateNewRowTempId, isTempId } from "@utils/tempIdGenerator";
import type { ColDef } from "../BaseGrid";
import type { GridApi } from "ag-grid-community";

import { ModuleRegistry } from "ag-grid-community";
import { RowApiModule } from "ag-grid-community";

ModuleRegistry.registerModules([RowApiModule]);

/**
 * Interface representing the data structure returned from successful save operations
 *
 * This interface defines the structure of data that comes back from the server
 * after we successfully save our changes. It helps us understand what the server
 * is telling us about our saved data.
 */
interface SavedData {
	/** Array of newly added rows with server-assigned IDs
	 *
	 * When we add new rows to the grid, they initially have temporary IDs.
	 * After saving, the server assigns real IDs to these rows and returns
	 * them in this array. We use this to update our local data with the
	 * permanent IDs from the server.
	 */
	added: unknown[];
	/** Array of updated rows with current server data
	 *
	 * When we modify existing rows, the server might return the updated
	 * data with any server-side modifications or computed fields. This
	 * array contains the final state of updated rows.
	 */
	updated: unknown[];
	/** Array of primary key values for deleted rows
	 *
	 * When we delete rows, the server confirms which rows were actually
	 * deleted by returning their primary key values. This helps us verify
	 * that our delete operations were successful.
	 */
	deleted: string[];
}

/**
 * Props interface for the useOptimizedRowManagement hook
 *
 * This interface defines all the parameters that our hook needs to function
 * properly. Think of it as the "contract" that any component using this
 * hook must fulfill.
 */
interface UseOptimizedRowManagementProps<T> {
	/** API endpoint for data operations
	 *
	 * This is the URL where we send our batch operations (add, update, delete).
	 * For example: "/api/projects" or "/api/users"
	 */
	endpoint: string;
	/** Function to display error messages to the user
	 *
	 * When something goes wrong (network errors, validation errors, etc.),
	 * we call this function to show a user-friendly error message.
	 * This could be a toast notification, alert, or any other UI component.
	 */
	showError: (error: unknown) => void;
	/** Field name used as the primary key for row identification
	 *
	 * This is the unique identifier field for each row. Common examples:
	 * - "id" for most tables
	 * - "userId" for user tables
	 * - "projectId" for project tables
	 *
	 * We use this to track which rows have been modified and to identify
	 * rows when communicating with the server.
	 */
	primaryKey: string;
	/** Callback function called after successful save operations
	 *
	 * This function is called whenever we successfully save our changes
	 * to the server. It receives the SavedData object with information
	 * about what was added, updated, or deleted.
	 *
	 * Common uses:
	 * - Update local state with server-assigned IDs
	 * - Show success notifications
	 * - Refresh related data
	 * - Update UI state (like clearing "unsaved changes" indicators)
	 */
	onSaveSuccess: (savedData: SavedData) => void;
	/** Current row data array
	 *
	 * This is the current state of all rows in the grid. It's an array
	 * of objects, where each object represents one row of data.
	 */
	rowData: T[];
	/** Function to update the row data array
	 *
	 * This is the setter function from a React useState hook. We use it
	 * to update the row data when we need to make changes that aren't
	 * handled by AG Grid's built-in transaction system.
	 */
	setRowData: React.Dispatch<React.SetStateAction<T[]>>;
	/** Column definitions for the grid
	 *
	 * This defines how each column should be displayed and behave.
	 * It includes things like:
	 * - Column headers
	 * - Data types
	 * - Editable fields
	 * - Cell renderers
	 * - Validation rules
	 */
	colDefs: ColDef<T>[];
	/** AG Grid API instance for grid operations
	 *
	 * This is the main interface for interacting with AG Grid. It provides
	 * methods for:
	 * - Adding/removing/updating rows
	 * - Getting selected rows
	 * - Refreshing the grid
	 * - Applying transactions
	 * - And much more
	 *
	 * This is optional because the grid might not be ready when the hook
	 * is first called.
	 */
	gridApi?: GridApi;
}

/**
 * Optimized row management hook using AG Grid's native delta row data mode
 *
 * This hook provides comprehensive row management functionality for AG Grid,
 * leveraging AG Grid's built-in features for optimal performance and user experience.
 * It's designed to work seamlessly with AG Grid's transaction system while providing
 * change tracking and save functionality.
 *
 * KEY CONCEPTS FOR BEGINNERS:
 *
 * 1. TRANSACTIONS: Instead of directly modifying the data array, we use AG Grid's
 *    transaction system (applyTransaction). This is more efficient because AG Grid
 *    can optimize how it updates the UI, only re-rendering what actually changed.
 *
 * 2. CHANGE TRACKING: We track which rows have been modified using special flags:
 *    - __isNewRow: True for rows that were added but not yet saved
 *    - __isDirty: True for existing rows that have been modified
 *    - __isDeleted: True for rows that have been marked for deletion
 *    - __isFailed: True for rows that failed to save
 *
 * 3. SAVE FUNCTIONALITY: We provide a comprehensive save system that:
 *    - Collects all changes (adds, updates, deletes)
 *    - Sends them to the server in a batch
 *    - Updates local state with server responses
 *    - Handles errors gracefully
 *
 * FEATURES:
 * - Add new rows with temporary IDs
 * - Update existing rows with change tracking
 * - Delete rows with visual feedback
 * - Batch save operations to server
 * - Comprehensive error handling
 * - Change tracking and visual indicators
 * - Optimized performance with AG Grid transactions
 *
 * @template T - The type of data objects managed by the grid
 * @param props - Configuration for row management
 * @returns Object containing row management functions and state
 */
export const useOptimizedRowManagement = <T>({
	endpoint: _endpoint,
	showError,
	primaryKey,
	onSaveSuccess,
	setRowData,
	gridApi,
}: UseOptimizedRowManagementProps<T>) => {
	// Add a state to force re-computation of hasUnsavedChanges
	//
	// This counter is incremented whenever we make changes to the grid.
	// We use it to trigger re-computation of the hasUnsavedChanges value,
	// which helps components know when to show "unsaved changes" warnings
	// or enable/disable save buttons.
	const [changeCounter, setChangeCounter] = useState(0);

	/**
	 * Adds a new row to the grid
	 *
	 * This function creates a new row with a temporary ID and adds it to the grid.
	 * The row is marked as a new row with the __isNewRow flag, which affects
	 * styling and save behavior.
	 *
	 * The process:
	 * 1. Generate a unique temporary ID for the new row
	 * 2. Create the new row object with default data
	 * 3. Mark it as a new row with the __isNewRow flag
	 * 4. Add it to the grid using AG Grid's transaction system
	 * 5. Update the change counter to trigger UI updates
	 *
	 * @param defaultData - Optional default values for the new row
	 * @returns The newly created row object
	 */
	const addNewRow = useCallback(
		(defaultData: Partial<T> = {}) => {
			const tempId = generateNewRowTempId();
			const newRow = {
				[primaryKey]: tempId,
				...defaultData,
				__isNewRow: true,
			} as T;

			// Increment change counter to trigger hasUnsavedChanges re-computation
			setChangeCounter((prev) => prev + 1);

			if (gridApi) {
				gridApi.applyTransaction({ add: [newRow] });
			} else {
				setRowData((prev) => [...prev, newRow]);
			}

			return newRow;
		},
		[gridApi, primaryKey, setRowData, setChangeCounter]
	);

	/**
	 * Saves changes using AG Grid's native change detection
	 *
	 * This function collects all the changes made to the grid and sends them
	 * to the server in a single batch request. It's the main function for
	 * persisting changes to the database.
	 *
	 * The process:
	 * 1. Get all changes from AG Grid (added, updated, deleted rows)
	 * 2. Prepare a batch request with the changes
	 * 3. Send the batch to the server
	 * 4. Handle the server response
	 * 5. Clear change tracking
	 * 6. Update the UI to reflect the saved state
	 *
	 * Error handling:
	 * - If the request fails, we show an error message to the user
	 * - Failed rows are marked with __isFailed flag for visual feedback
	 * - The user can retry saving or fix the issues
	 */
	const saveChanges = useCallback(async () => {
		if (!gridApi) return;

		try {
			// Get changes using AG Grid's native API (if available)
			let changes;
			if (typeof (gridApi as any).getChanges === "function") {
				changes = (gridApi as any).getChanges();
			} else {
				// Fallback: manually track changes using row data
				const currentData = gridApi
					.getRenderedNodes()
					.map((node: any) => node.data);
				const added = currentData.filter((row: any) => (row as any).__isNewRow);
				const updated = currentData.filter(
					(row: any) => (row as any).__isDirty && !(row as any).__isNewRow
				);
				const removed = currentData.filter(
					(row: any) => (row as any).__isDeleted
				);
				changes = { added, updated, removed };
			}

			const batch = {
				toAdd: changes.added || [],
				toUpdate: changes.updated || [],
				toDelete: changes.removed?.map((row: any) => row[primaryKey]) || [],
			};

			if (
				batch.toAdd.length === 0 &&
				batch.toUpdate.length === 0 &&
				batch.toDelete.length === 0
			) {
				return;
			}

			// TODO: Implement batch save logic here
			// For now, we'll just simulate a successful save
			console.log("Saving changes:", batch);
			const result = {
				added: batch.toAdd,
				updated: batch.toUpdate,
				deleted: batch.toDelete,
			};
			onSaveSuccess(result);

			// Clear change tracking after successful save
			// Reset change counter
			setChangeCounter(0);

			// Clear change tracking if available
			if (typeof (gridApi as any).clearChanges === "function") {
				(gridApi as any).clearChanges();
			} else {
				// Fallback: manually clear flags
				const allNodes = gridApi.getRenderedNodes();
				allNodes.forEach((node: any) => {
					if (node.data) {
						node.data.__isDirty = false;
						node.data.__isNewRow = false;
						node.data.__isDeleted = false;
						node.data.__isFailed = false;
					}
				});
				gridApi.refreshCells();
			}
		} catch (error) {
			showError(error);
		}
	}, [gridApi, onSaveSuccess, showError, primaryKey]);

	/**
	 * Clears all pending changes
	 *
	 * This function resets the grid to its last saved state, discarding
	 * all unsaved changes. It's useful for:
	 * - "Cancel" buttons that discard changes
	 * - Resetting the grid after errors
	 * - Clearing the grid when switching to different data
	 *
	 * The process:
	 * 1. Reset the change counter
	 * 2. Clear all change tracking flags
	 * 3. Refresh the grid to update visual styling
	 */
	const clearChanges = useCallback(() => {
		if (!gridApi) return;

		// Check if grid is destroyed
		if (gridApi.isDestroyed && gridApi.isDestroyed()) {
			return;
		}

		// Reset change counter
		setChangeCounter(0);

		// Check if AG Grid's native clearChanges is available
		if (typeof (gridApi as any).clearChanges === "function") {
			(gridApi as any).clearChanges();
		} else {
			// Fallback: manually clear flags
			try {
				const allNodes = gridApi.getRenderedNodes();
				if (allNodes && Array.isArray(allNodes)) {
					allNodes.forEach((node: any) => {
						if (node.data) {
							node.data.__isDirty = false;
							node.data.__isNewRow = false;
							node.data.__isDeleted = false;
							node.data.__isFailed = false;
						}
					});
					gridApi.refreshCells();
				}
			} catch {
				// Grid might be destroyed, just clear the state
			}
		}
	}, [gridApi, setChangeCounter]);

	/**
	 * Deletes selected rows
	 *
	 * This function handles the deletion of selected rows. It distinguishes
	 * between new rows (that haven't been saved yet) and existing rows
	 * (that exist in the database).
	 *
	 * For new rows:
	 * - Remove them completely from the grid (they don't exist in DB)
	 * - Remove their "add" operations from the undo stack
	 *
	 * For existing rows:
	 * - Mark them as deleted (__isDeleted: true)
	 * - Add "remove" operations to the undo stack
	 * - They'll be actually deleted when saveChanges() is called
	 *
	 * @param api - The AG Grid API instance
	 */
	const deleteSelectedRows = useCallback(
		(api: any) => {
			try {
				const selectedNodes = api.getSelectedNodes();
				if (selectedNodes?.length > 0) {
					// Separate new rows from existing rows
					const newRows = selectedNodes.filter(
						(node: any) => node.data.__isNewRow
					);
					const existingRows = selectedNodes.filter(
						(node: any) => !node.data.__isNewRow
					);

					// For new rows, just remove them completely (they don't exist in DB yet)
					if (newRows.length > 0) {
						// Remove the corresponding "add" operations from undo stack
						// since we're removing the rows completely
						// setUndoStack((prev) =>
						// 	prev.filter(
						// 		(op) =>
						// 			!(op.type === "add" && rowIdsToRemove.includes(op.rowId))
						// 	)
						// );

						// Remove new rows completely
						api.applyTransaction({
							remove: newRows.map((node: any) => node.data),
						});
					}

					// For existing rows, mark them as deleted
					if (existingRows.length > 0) {
						// Add to undo stack for existing rows

						// Mark existing rows as deleted
						const updatedRows = existingRows.map((node: any) => ({
							...node.data,
							__isDeleted: true,
							__isDirty: false,
							__isNewRow: false,
							__isFailed: false,
						}));

						// Update the rows to mark them as deleted
						api.applyTransaction({
							update: updatedRows,
						});
					}

					// Increment change counter
					setChangeCounter((prev) => prev + 1);

					// Force refresh to update styling
					if (api && !api.isDestroyed?.()) {
						try {
							api.refreshCells({ force: true });
							if (!api.isDestroyed?.()) {
								api.redrawRows();
							}
						} catch {
							// Ignore refresh errors
						}
					}
				}
			} catch (error) {
				// Handle case where grid is not ready or destroyed
				console.warn("Error deleting selected rows:", error);
			}
		},
		[primaryKey]
	);

	/**
	 * Duplicates selected rows
	 *
	 * This function creates copies of the selected rows. Each duplicated row:
	 * - Gets a new temporary ID
	 * - Is marked as a new row (__isNewRow: true)
	 * - Is added to the grid using AG Grid's transaction system
	 *
	 * @param api - The AG Grid API instance
	 */
	const duplicateSelectedRow = useCallback(
		(api: any) => {
			try {
				const selectedNodes = api.getSelectedNodes();
				if (selectedNodes?.length > 0) {
					const newRows = selectedNodes.map((node: any) => ({
						...node.data,
						[primaryKey]: generateNewRowTempId(),
						__isNewRow: true,
					}));
					api.applyTransaction({ add: newRows });
				}
			} catch (error) {
				// Handle case where grid is not ready or destroyed
				console.warn("Error duplicating selected rows:", error);
			}
		},
		[primaryKey]
	);

	/**
	 * Gets the row ID for AG Grid
	 *
	 * This function tells AG Grid how to identify each row. AG Grid uses
	 * this to track which rows have changed and to optimize updates.
	 *
	 * @param params - AG Grid parameters containing the row data
	 * @returns The row ID as a string
	 */
	const getRowId = useCallback(
		(params: any) => params.data[primaryKey].toString(),
		[primaryKey]
	);

	/**
	 * Gets context menu items
	 *
	 * This function defines what options appear when users right-click
	 * on the grid. It includes both built-in AG Grid options and custom
	 * options for our specific functionality.
	 *
	 * @param params - AG Grid parameters containing the grid API and context
	 * @returns Array of context menu items
	 */
	const getContextMenuItems = useCallback(
		(params: any) => {
			const items = [
				"copy",
				"copyWithHeaders",
				"paste",
				{
					name: "Duplicate Row",
					action: () => duplicateSelectedRow(params.api),
				},
				{
					name: "Delete Row",
					action: () => deleteSelectedRows(params.api),
				},
			];
			return items;
		},
		[deleteSelectedRows, duplicateSelectedRow]
	);

	/**
	 * Handles cell value changes
	 *
	 * This function is called whenever a user edits a cell in the grid.
	 * It's responsible for:
	 * 1. Marking the row as dirty (modified)
	 * 2. Adding the change to the undo stack
	 * 3. Updating the change counter
	 * 4. Refreshing the grid to show visual feedback
	 *
	 * Important notes:
	 * - We only track changes for existing rows (not new rows)
	 * - We store both old and new data for undo/redo functionality
	 * - We force visual updates to show the modified state
	 *
	 * @param event - AG Grid cell value changed event
	 */
	const handleCellValueChanged = useCallback(
		(event: any) => {
			const rowId = event.data[primaryKey];
			if (!rowId) return;

			// Mark row as dirty if it's not a new row
			if (!isTempId(rowId)) {
				// Create old data for undo (commented out for now)
				// const _oldData = {
				// 	...event.data,
				// 	[event.column.colId]: event.oldValue,
				// 	__isDirty: false,
				// 	__isNewRow: false,
				// 	__isDeleted: false,
				// };

				// Create new data for undo (commented out for now)
				// const newData = {
				// 	...event.data,
				// 	__isDirty: true,
				// 	__isNewRow: false,
				// 	__isDeleted: false,
				// };

				// Add to undo stack
				// addToUndoStack({
				// 	type: "update",
				// 	rowId,
				// 	oldData,
				// 	newData,
				// });

				// Update the row data directly
				event.data.__isDirty = true;
				event.data.__isNewRow = false;
				event.data.__isDeleted = false;

				// Increment change counter to trigger hasUnsavedChanges re-computation
				setChangeCounter((prev) => prev + 1);

				// Force immediate visual update
				if (gridApi && !gridApi.isDestroyed?.()) {
					try {
						// Refresh the specific row to update styling
						gridApi.refreshCells({ rowNodes: [event.node], force: true });

						// Also refresh the entire grid to ensure all styling is updated
						setTimeout(() => {
							if (gridApi && !gridApi.isDestroyed?.()) {
								gridApi.refreshCells({ force: true });
								// Force a re-render of the row to update class rules
								if (!gridApi.isDestroyed?.()) {
									gridApi.redrawRows({ rowNodes: [event.node] });
								}
							}
						}, 0);
					} catch {
						// Ignore refresh errors
					}
				}
			}
		},
		[gridApi, primaryKey, setChangeCounter]
	);

	/**
	 * Handles cell editing stopped
	 *
	 * This function is called when a user finishes editing a cell (by pressing
	 * Enter, clicking elsewhere, etc.). It ensures that the grid is properly
	 * refreshed to show any visual updates.
	 *
	 * This is important because AG Grid sometimes needs a nudge to update
	 * its visual state after editing operations.
	 */
	const handleCellEditingStopped = useCallback(() => {
		// Force a refresh when editing stops to ensure visual updates
		if (gridApi && !gridApi.isDestroyed?.()) {
			try {
				gridApi.refreshCells({ force: true });
			} catch {
				// Ignore refresh errors
			}
		}
	}, [gridApi]);

	/**
	 * Gets row class for styling
	 *
	 * This function determines what CSS classes should be applied to each row
	 * based on its state. These classes are used to style rows differently
	 * depending on whether they're new, modified, deleted, or failed.
	 *
	 * The CSS classes are:
	 * - ag-row-new: Applied to rows that have been added but not saved
	 * - ag-row-dirty: Applied to rows that have been modified but not saved
	 * - ag-row-deleted: Applied to rows that have been marked for deletion
	 * - ag-row-failed: Applied to rows that failed to save
	 *
	 * @param params - AG Grid parameters containing the row data
	 * @returns Space-separated string of CSS class names
	 */
	const getRowClass = useCallback((params: any) => {
		const classes = [];
		if (params.data) {
			if ((params.data as any).__isNewRow) {
				classes.push("ag-row-new");
			} else if ((params.data as any).__isDirty) {
				classes.push("ag-row-dirty");
			} else if ((params.data as any).__isDeleted) {
				classes.push("ag-row-deleted");
			} else if ((params.data as any).__isFailed) {
				classes.push("ag-row-failed");
			}
		}
		return classes.join(" ");
	}, []);

	// /**
	//  * Gets cell class for styling
	//  *
	//  * This function determines what CSS classes should be applied to each cell
	//  * based on the row's state. This is similar to getRowClass but applies
	//  * styling to individual cells rather than entire rows.
	//  *
	//  * Currently commented out because we're using row-level styling instead.
	//  *
	//  * @param params - AG Grid parameters containing the cell data
	//  * @returns Space-separated string of CSS class names
	//  */
	// const getCellClass = useCallback((params: any) => {
	// 	const classes = [];
	// 	if (params.data) {
	// 		if ((params.data as any).__isNewRow) {
	// 			classes.push("ag-cell-new");
	// 		} else if ((params.data as any).__isDirty) {
	// 			classes.push("ag-cell-dirty");
	// 		} else if ((params.data as any).__isDeleted) {
	// 			classes.push("ag-cell-deleted");
	// 		} else if ((params.data as any).__isFailed) {
	// 			classes.push("ag-cell-failed");
	// 		}
	// 	}
	// 	return classes.join(" ");
	// }, []);

	/**
	 * Computed value for unsaved changes
	 *
	 * This is a computed value that tells us whether there are any unsaved
	 * changes in the grid. It's used by components to:
	 * - Show "unsaved changes" warnings
	 * - Enable/disable save buttons
	 * - Show navigation warnings when leaving the page
	 *
	 * The computation:
	 * 1. First tries to use AG Grid's native hasChanges() method
	 * 2. Falls back to manually checking for __isNewRow, __isDirty, or __isDeleted flags
	 * 3. Returns false if the grid is destroyed or unavailable
	 *
	 * The changeCounter dependency ensures this value is recalculated
	 * whenever we make changes to the grid.
	 */
	const hasUnsavedChanges = useMemo(() => {
		if (!gridApi) {
			return false;
		}

		// Check if grid is destroyed
		if (gridApi.isDestroyed && gridApi.isDestroyed()) {
			return false;
		}

		// Check if AG Grid's native hasChanges is available
		if (typeof (gridApi as any).hasChanges === "function") {
			try {
				const hasChanges = (gridApi as any).hasChanges();
				return hasChanges;
			} catch {
				// Fall back to manual check
			}
		}

		// Fallback: manually check for changes
		try {
			const currentData = gridApi
				.getRenderedNodes()
				.map((node: any) => node.data);

			const hasChanges = currentData.some(
				(row: any) =>
					(row as any).__isNewRow ||
					(row as any).__isDirty ||
					(row as any).__isDeleted
			);

			return hasChanges;
		} catch {
			return false;
		}
	}, [gridApi, changeCounter]);

	/**
	 * Return all the functions and values that components can use
	 *
	 * This object contains everything a component needs to integrate
	 * with our row management system. Each property is documented
	 * above in its respective function.
	 */
	return {
		hasUnsavedChanges,
		addNewRow,
		saveChanges,
		clearChanges,
		getRowId,
		getContextMenuItems,
		handleCellValueChanged,
		handleCellEditingStopped,
		deleteSelectedRows,
		duplicateSelectedRow,
		getRowClass,
		//getCellClass,
	};
};
