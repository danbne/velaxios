"use client";

// React Grid Logic
import { useMemo } from "react";

import type { ColDef } from "ag-grid-enterprise";

// Core CSS - theme is now imported globally
import "../../../styles/theme.css";

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
		gridApi: gridApi || undefined,
	});

	// Layout management
	const {
		currentLayout,
		handleLayoutChange,
		handleLayoutSave,
		restoreDefaultLayout,
	} = useLayoutManager({
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
		gridApi: gridApi || undefined,
	});

	// Grid configuration with type-adapted layout handlers
	const gridConfig = useGridConfiguration({
		sideBarEnabled,
		gridId,
		handleLayoutChange: (layoutData: { [key: string]: unknown }) => {
			// Extract layoutId from the layout data
			const layoutId = layoutData.layoutId as string;
			if (layoutId) {
				handleLayoutChange({ layoutId });
			}
		},
		handleLayoutSave: (params: {
			layoutData: { [key: string]: unknown };
			layoutName?: string;
		}) => {
			// Extract layoutId from the params
			const layoutId = params.layoutData.layoutId as string;
			if (layoutId) {
				return handleLayoutSave({ layoutId });
			}
			return Promise.resolve();
		},
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
			errorPopup={typeof errorPopup === "string" ? errorPopup : null}
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
			gridApi={gridApi || undefined}
			gridConfig={gridConfig}
			rowData={rowData}
			colDefs={colDefs}
			onGridReady={onGridReady}
			handleCellValueChanged={handleCellValueChanged}
			handleCellEditingStopped={handleCellEditingStopped}
			getRowId={getRowId}
			getContextMenuItems={getContextMenuItems as any}
			getRowClass={getRowClass}
			savedState={savedState || {}}
			gridId={gridId}
			onLayoutChange={handleLayoutChange}
			onLayoutSave={handleLayoutSave}
			currentLayoutId={currentLayout?.layout_id}
			currentLayoutName={currentLayout?.layout_name}
			onRestoreDefault={async () => {
				await restoreDefaultLayout();
			}}
		/>
	);
};

export type { ColDef };
export default BaseGrid;
