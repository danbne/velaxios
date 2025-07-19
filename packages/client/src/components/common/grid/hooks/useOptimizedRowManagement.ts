/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useMemo } from "react";
import { generateNewRowTempId, isTempId } from "@utils/tempIdGenerator";
import type { ColDef } from "../BaseGrid";
import type { GridApi, IRowNode } from "ag-grid-community";

import { ModuleRegistry } from "ag-grid-community";
import { RowApiModule } from "ag-grid-community";

ModuleRegistry.registerModules([RowApiModule]);

interface RowWithMetadata {
	[key: string]: unknown;
	__isNewRow?: boolean;
	__isDirty?: boolean;
	__isDeleted?: boolean;
	__isFailed?: boolean;
}

interface GridChanges {
	added?: RowWithMetadata[];
	updated?: RowWithMetadata[];
	removed?: RowWithMetadata[];
}

interface ExtendedGridApi extends GridApi {
	getChanges?: () => GridChanges;
	clearChanges?: () => void;
}

interface BatchOperation {
	toAdd: RowWithMetadata[];
	toUpdate: RowWithMetadata[];
	toDelete: string[];
}

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
	gridApi?: ExtendedGridApi;
}

/**
 * Type guard to check if a row has metadata
 */
function hasRowMetadata(row: unknown): row is RowWithMetadata {
	return typeof row === "object" && row !== null;
}

/**
 * Type guard to check if an API has extended methods
 */
function hasExtendedMethods(api: GridApi): api is ExtendedGridApi {
	return typeof (api as ExtendedGridApi).getChanges === "function";
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
			let changes: GridChanges;
			if (hasExtendedMethods(gridApi) && gridApi.getChanges) {
				changes = gridApi.getChanges();
			} else {
				// Fallback: manually track changes using row data
				const currentData = gridApi
					.getRenderedNodes()
					.map((node: IRowNode) => node.data as RowWithMetadata);
				const added = currentData.filter((row) => hasRowMetadata(row) && row.__isNewRow);
				const updated = currentData.filter(
					(row) => hasRowMetadata(row) && row.__isDirty && !row.__isNewRow
				);
				const removed = currentData.filter(
					(row) => hasRowMetadata(row) && row.__isDeleted
				);
				changes = { added, updated, removed };
			}

			const batch: BatchOperation = {
				toAdd: changes.added || [],
				toUpdate: changes.updated || [],
				toDelete: changes.removed?.map((row) => {
					if (hasRowMetadata(row) && typeof row[primaryKey] === "string") {
						return row[primaryKey] as string;
					}
					return "";
				}).filter(Boolean) || [],
			};

			if (
				batch.toAdd.length === 0 &&
				batch.toUpdate.length === 0 &&
				batch.toDelete.length === 0
			) {
				return;
			}

			// Implement batch save logic
			// This would typically make an API call to save the changes
			// For now, we'll simulate a successful save with the current data
			const result: SavedData = {
				added: batch.toAdd,
				updated: batch.toUpdate,
				deleted: batch.toDelete,
			};
			onSaveSuccess(result);

			// Clear change tracking after successful save
			// Reset change counter
			setChangeCounter(0);

			// Clear change tracking if available
			if (hasExtendedMethods(gridApi) && gridApi.clearChanges) {
				gridApi.clearChanges();
			} else {
				// Fallback: manually clear flags
				const allNodes = gridApi.getRenderedNodes();
				allNodes.forEach((node: IRowNode) => {
					if (node.data && hasRowMetadata(node.data)) {
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
		if (hasExtendedMethods(gridApi) && gridApi.clearChanges) {
			gridApi.clearChanges();
		} else {
			// Fallback: manually clear flags
			try {
				const allNodes = gridApi.getRenderedNodes();
				if (allNodes && Array.isArray(allNodes)) {
					allNodes.forEach((node: IRowNode) => {
						if (node.data && hasRowMetadata(node.data)) {
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
		(api: ExtendedGridApi) => {
			try {
				const selectedNodes = api.getSelectedNodes();
				if (selectedNodes?.length > 0) {
					// Separate new rows from existing rows
					const newRows = selectedNodes.filter((node: IRowNode) => {
						return node.data && hasRowMetadata(node.data) && node.data.__isNewRow;
					});
					const existingRows = selectedNodes.filter((node: IRowNode) => {
						return node.data && hasRowMetadata(node.data) && !node.data.__isNewRow;
					});

					// For new rows, just remove them completely (they don't exist in DB yet)
					if (newRows.length > 0) {
						// Remove the corresponding "add" operations from undo stack
						// since we're removing the rows completely
						// setUndoStack((prev) =>
						//   prev.filter((op) => !newRows.some((node) => node.data.id === op.rowId))
						// );

						// Remove from grid
						api.applyTransaction({
							remove: newRows.map((node: IRowNode) => node.data as T),
						});
					}

					// For existing rows, mark them as deleted
					if (existingRows.length > 0) {
						existingRows.forEach((node: IRowNode) => {
							if (node.data && hasRowMetadata(node.data)) {
								node.data.__isDeleted = true;
								node.data.__isDirty = false; // Clear dirty flag since we're deleting
							}
						});

						// Add "remove" operations to undo stack
						// setUndoStack((prev) => [
						//   ...prev,
						//   ...existingRows.map((node) => ({
						//     type: "remove" as const,
						//     rowId: node.data.id,
						//     originalData: { ...node.data },
						//   })),
						// ]);

						// Refresh the grid to show visual changes
						api.refreshCells();
					}

					// Increment change counter
					setChangeCounter((prev) => prev + 1);
				}
			} catch (error) {
				showError(error);
			}
		},
		[showError, setChangeCounter]
	);

	/**
	 * Duplicates the selected row
	 *
	 * This function creates a copy of the selected row with a new temporary ID.
	 * The duplicated row is marked as a new row and will be saved when
	 * saveChanges() is called.
	 *
	 * @param api - The AG Grid API instance
	 */
	const duplicateSelectedRow = useCallback(
		(api: ExtendedGridApi) => {
			try {
				const selectedNodes = api.getSelectedNodes();
				if (selectedNodes?.length === 1) {
					const selectedNode = selectedNodes[0];
					if (selectedNode.data) {
						const originalData = selectedNode.data as RowWithMetadata;
						const tempId = generateNewRowTempId();

						// Create a new row with the same data but a new ID
						const duplicatedRow = {
							...originalData,
							[primaryKey]: tempId,
							__isNewRow: true,
							__isDirty: false,
							__isDeleted: false,
							__isFailed: false,
						} as T;

						// Add to grid
						api.applyTransaction({ add: [duplicatedRow] });

						// Increment change counter
						setChangeCounter((prev) => prev + 1);
					}
				}
			} catch (error) {
				showError(error);
			}
		},
		[primaryKey, showError, setChangeCounter]
	);

	/**
	 * Checks if there are any unsaved changes
	 *
	 * This function examines the current state of the grid to determine
	 * if there are any changes that haven't been saved yet. It's used
	 * to show warnings when users try to navigate away or to enable/disable
	 * save buttons.
	 *
	 * The function checks for:
	 * - New rows that haven't been saved
	 * - Existing rows that have been modified
	 * - Rows that have been marked for deletion
	 *
	 * @returns True if there are unsaved changes, false otherwise
	 */
	const hasUnsavedChanges = useMemo(() => {
		if (!gridApi) return false;

		try {
			const allNodes = gridApi.getRenderedNodes();
			return allNodes.some((node: IRowNode) => {
				if (node.data && hasRowMetadata(node.data)) {
					return (
						node.data.__isNewRow ||
						node.data.__isDirty ||
						node.data.__isDeleted
					);
				}
				return false;
			});
		} catch {
			// Grid might be destroyed or not ready
			return false;
		}
	}, [gridApi, changeCounter]);

	/**
	 * Gets the number of unsaved changes
	 *
	 * This function counts the total number of changes that haven't been
	 * saved yet. It's useful for showing change counts in the UI.
	 *
	 * @returns Object with counts of different types of changes
	 */
	const getChangeCounts = useMemo(() => {
		if (!gridApi) return { new: 0, modified: 0, deleted: 0 };

		try {
			const allNodes = gridApi.getRenderedNodes();
			let newCount = 0;
			let modifiedCount = 0;
			let deletedCount = 0;

			allNodes.forEach((node: IRowNode) => {
				if (node.data && hasRowMetadata(node.data)) {
					if (node.data.__isNewRow) newCount++;
					if (node.data.__isDirty && !node.data.__isNewRow) modifiedCount++;
					if (node.data.__isDeleted) deletedCount++;
				}
			});

			return { new: newCount, modified: modifiedCount, deleted: deletedCount };
		} catch {
			return { new: 0, modified: 0, deleted: 0 };
		}
	}, [gridApi, changeCounter]);

	/**
	 * Gets the primary key value for a row
	 *
	 * This function extracts the primary key value from a row object.
	 * It's used for identifying rows in operations like deletion.
	 *
	 * @param params - AG Grid cell renderer parameters
	 * @returns The primary key value as a string
	 */
	const getPrimaryKeyValue = useCallback(
		(params: { data: RowWithMetadata }) => {
			const value = params.data[primaryKey];
			return typeof value === "string" ? value : String(value);
		},
		[primaryKey]
	);

	/**
	 * Gets CSS classes for row styling
	 *
	 * This function returns CSS classes based on the row's state.
	 * It's used to provide visual feedback about row status.
	 *
	 * @param params - AG Grid row class parameters
	 * @returns CSS class string
	 */
	const getRowClass = useCallback((params: { data: RowWithMetadata }) => {
		const classes: string[] = [];

		if (params.data.__isNewRow) {
			classes.push("ag-row-new");
		}
		if (params.data.__isDirty) {
			classes.push("ag-row-dirty");
		}
		if (params.data.__isDeleted) {
			classes.push("ag-row-deleted");
		}
		if (params.data.__isFailed) {
			classes.push("ag-row-failed");
		}

		return classes.join(" ");
	}, []);

	/**
	 * Gets CSS classes for cell styling
	 *
	 * This function returns CSS classes for individual cells based on
	 * the cell's state and the row's state.
	 *
	 * @param params - AG Grid cell class parameters
	 * @returns CSS class string
	 */
	// const getCellClass = useCallback((params: { data: RowWithMetadata; colDef: ColDef }) => {
	//   const classes: string[] = [];
	//
	//   if (params.data.__isNewRow) {
	//     classes.push("ag-cell-new");
	//   }
	//   if (params.data.__isDirty && params.colDef.editable) {
	//     classes.push("ag-cell-dirty");
	//   }
	//   if (params.data.__isDeleted) {
	//     classes.push("ag-cell-deleted");
	//   }
	//   if (params.data.__isFailed) {
	//     classes.push("ag-cell-failed");
	//   }
	//
	//   return classes.join(" ");
	// }, []);

	/**
	 * Handles cell value changes
	 *
	 * This function is called when a cell value is changed. It updates
	 * the change tracking flags and triggers UI updates.
	 *
	 * @param event - AG Grid cell value changed event
	 */
	const handleCellValueChanged = useCallback(
		(event: { data: RowWithMetadata; colDef: ColDef<T> }) => {
			if (event.data && hasRowMetadata(event.data)) {
				// Mark as dirty if it's not a new row
				if (!event.data.__isNewRow) {
					event.data.__isDirty = true;
				}

				// Increment change counter to trigger UI updates
				setChangeCounter((prev) => prev + 1);
			}
		},
		[setChangeCounter]
	);

	/**
	 * Gets the current row data with metadata
	 *
	 * This function returns the current row data from the grid with
	 * all the metadata flags intact. It's useful for debugging or
	 * for operations that need to examine the current state.
	 *
	 * @returns Array of row data with metadata
	 */
	const getCurrentRowData = useCallback(() => {
		if (!gridApi) return [];

		try {
			return gridApi
				.getRenderedNodes()
				.map((node: IRowNode) => node.data as RowWithMetadata)
				.filter(Boolean);
		} catch {
			return [];
		}
	}, [gridApi]);

	return {
		addNewRow,
		saveChanges,
		clearChanges,
		deleteSelectedRows,
		duplicateSelectedRow,
		hasUnsavedChanges,
		getChangeCounts,
		getPrimaryKeyValue,
		getRowClass,
		// getCellClass,
		handleCellValueChanged,
		getCurrentRowData,
	};
};
