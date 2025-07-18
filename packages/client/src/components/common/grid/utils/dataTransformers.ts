/**
 * Data transformation utilities for grid operations
 *
 * This module contains pure functions for transforming data between
 * different formats used by the grid system.
 */

/**
 * Transforms server response data to update local row data
 *
 * @param savedData - Server response containing added, updated, and deleted data
 * @param prevData - Current local row data
 * @param primaryKey - Field name used as primary key
 * @returns Updated row data array
 */
export function transformSavedDataToRowData<T>(
	savedData: any,
	prevData: T[],
	primaryKey: string
): T[] {
	// Extract the actual data from the server response
	// The server returns { message, results, summary } structure
	const actualData = savedData.results || savedData;

	// Remove deleted rows (with null check)
	const withoutDeleted = prevData.filter(
		(row) => !(actualData.deleted || []).includes((row as any)[primaryKey])
	);

	// Remove temp rows (they will be replaced with saved data)
	const withoutTempRows = withoutDeleted.filter(
		(row) => !(row as any).__isNewRow
	);

	// Remove rows that were marked as deleted locally
	const withoutLocalDeleted = withoutTempRows.filter(
		(row) => !(row as any).__isDeleted
	);

	// Update existing rows with server data
	const updated = withoutLocalDeleted.map((row) => {
		const updatedRow = (actualData.updated || []).find(
			(updated: any) =>
				(updated as any)[primaryKey] === (row as any)[primaryKey]
		);
		return updatedRow || row;
	});

	// Add new rows with server-assigned primary keys
	// If actualData.added is empty but we had temp rows, keep the temp rows
	// but mark them as no longer new
	const addedRows = actualData.added || [];
	const tempRows = prevData.filter((row) => (row as any).__isNewRow);

	let finalRows = [...updated];

	if (addedRows.length > 0) {
		// Server returned saved data, use it
		finalRows = [...finalRows, ...addedRows];
	} else if (tempRows.length > 0) {
		// Server didn't return added data, but we had temp rows
		// Keep them but mark as no longer new
		const nonNewTempRows = tempRows.map((row) => ({
			...row,
			__isNewRow: false,
			__isDirty: false,
		}));
		finalRows = [...finalRows, ...nonNewTempRows];
	}

	return finalRows;
}

/**
 * Creates a memoized onSaveSuccess callback for use in grid components
 *
 * @param primaryKey - Field name used as primary key
 * @param setRowData - Function to update row data
 * @returns Memoized callback function
 */
export function createOnSaveSuccessCallback<T>(
	primaryKey: string,
	setRowData: React.Dispatch<React.SetStateAction<T[]>>
) {
	return (savedData: any) => {
		setRowData((prevData) =>
			transformSavedDataToRowData(savedData, prevData, primaryKey)
		);
	};
}

/**
 * Cleans row data by removing internal metadata flags
 *
 * @param row - Row data object
 * @returns Cleaned row data without internal flags
 */
export function cleanRowData<T>(row: T): T {
	const clean = { ...row } as any;
	delete clean.__isDirty;
	delete clean.__isNewRow;
	delete clean.__isDeleted;
	delete clean.__isFailed;
	return clean as T;
}

/**
 * Cleans an array of row data by removing internal metadata flags
 *
 * @param rows - Array of row data objects
 * @returns Array of cleaned row data
 */
export function cleanRowDataArray<T>(rows: T[]): T[] {
	return rows.map(cleanRowData);
}
