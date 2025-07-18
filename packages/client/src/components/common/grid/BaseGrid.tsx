"use client";

// React Grid Logic
import { useMemo } from "react";

import type { ColDef } from "ag-grid-enterprise";

// Core CSS
import "../grid/ag-grid-theme.css";
import "../../../styles/grid-styles.css";

// Modular components and hooks
import GridRenderer from "./components/GridRenderer";
import { useGridState } from "./hooks/useGridState";
import { useErrorHandler } from "./hooks/useErrorHandler";
import { useDataFetcher } from "./hooks/useDataFetcher";
import { useOptimizedRowManagement } from "./hooks/useOptimizedRowManagement";
import { useLayoutManager } from "./layouts";
import { useGridConfiguration } from "./hooks/useGridConfiguration";
import { useNavigationWarning } from "./hooks/useNavigationWarning";
import { useGridActions } from "./hooks/useGridActions";
import { createOnSaveSuccessCallback } from "./utils/dataTransformers";
import { initializeAGGrid } from "./utils/gridInitialization";

// Initialize AG Grid once
initializeAGGrid();

/**
 * Props interface for the BaseGrid component
 *
 * @template T - The type of data objects displayed in the grid
 */
interface BaseGridProps<T> {
	/** Unique identifier for the grid instance, used for state persistence */
	gridId: string;
	/** API endpoint for data operations (fetch, insert, update, delete) - required */
	endpoint: string;
	/** Column definitions that specify how each column should be displayed and behave */
	colDefs: ColDef<T>[];
	/** Default column configuration applied to all columns unless overridden */
	defaultColDef?: Partial<ColDef<T>>;

	/** Whether to show the sidebar with columns, filters, and layouts panels */
	sideBarEnabled?: boolean;
	/** Field name used as the primary key for row identification */
	primaryKey: string;
}

/**
 * BaseGrid - Main grid component with comprehensive functionality
 *
 * Provides a complete data grid solution with data fetching, row management,
 * layout persistence, error handling, and CRUD operations.
 *
 * @template T - The type of data objects displayed in the grid
 * @param props - Configuration props for the grid
 * @returns JSX element representing the complete grid interface
 */
const BaseGrid = <T,>({
	gridId,
	endpoint,
	colDefs,
	defaultColDef,
	sideBarEnabled = true,
	primaryKey,
}: BaseGridProps<T>) => {
	// Core hooks for error handling and data fetching
	const { errorPopup, showDialog, flashRed, showError, clearError } =
		useErrorHandler();

	const { createFetchData } = useDataFetcher<T>(endpoint);

	const fetchData = useMemo(() => {
		return createFetchData();
	}, [createFetchData]);

	// Grid state management
	const {
		rowData,
		setRowData,
		setIsLoading,
		gridApi,
		savedState,
		shouldShowGrid,
		onGridReady,
	} = useGridState<T>({ gridId, fetchData });

	// Row management without undo/redo
	const onSaveSuccess = useMemo(
		() => createOnSaveSuccessCallback(primaryKey, setRowData),
		[primaryKey, setRowData]
	);

	const {
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
	} = useOptimizedRowManagement({
		endpoint,
		showError,
		primaryKey,
		onSaveSuccess,
		rowData,
		setRowData,
		colDefs,
		gridApi,
	});

	// Layout management
	const { handleLayoutChange, handleLayoutSave } = useLayoutManager({
		gridId,
		gridApi,
	});

	// Grid actions (toolbar buttons)
	const {
		handleAddRow,
		handleAddMultipleRows,
		handleDeleteRows,
		handleDuplicateRow,
		handleRefresh,
		handleSave,
	} = useGridActions({
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
	});

	// Grid configuration
	const gridConfig = useGridConfiguration({
		sideBarEnabled,
		gridId,
		handleLayoutChange,
		handleLayoutSave,
		defaultColDef,
	});

	// Navigation warning for unsaved changes
	const { handleRefreshWithWarning } = useNavigationWarning({
		hasUnsavedChanges,
		clearChanges,
		handleRefresh,
	});
	return (
		<GridRenderer
			shouldShowGrid={shouldShowGrid}
			errorPopup={errorPopup}
			showDialog={showDialog}
			flashRed={flashRed}
			clearError={clearError}
			handleAddRow={handleAddRow}
			handleAddMultipleRows={handleAddMultipleRows}
			handleDeleteRows={handleDeleteRows}
			handleDuplicateRow={handleDuplicateRow}
			handleSave={handleSave}
			handleRefreshWithWarning={handleRefreshWithWarning}
			hasUnsavedChanges={hasUnsavedChanges}
			gridApi={gridApi}
			gridConfig={gridConfig}
			rowData={rowData}
			colDefs={colDefs}
			onGridReady={onGridReady}
			handleCellValueChanged={handleCellValueChanged}
			handleCellEditingStopped={handleCellEditingStopped}
			getRowId={getRowId}
			getContextMenuItems={getContextMenuItems}
			getRowClass={getRowClass}
			savedState={savedState}
		/>
	);
};

export type { ColDef };
export default BaseGrid;
