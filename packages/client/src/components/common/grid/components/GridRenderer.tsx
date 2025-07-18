import { AgGridReact } from "ag-grid-react";
import GridToolbar from "./GridToolbar";
import ErrorDialog from "./ErrorDialog";
import { getGridComponents } from "../utils/gridComponentRegistration";
import type {
	ColDef,
	GridApi,
	GridOptions,
	GridReadyEvent,
	CellValueChangedEvent,
	CellEditingStoppedEvent,
	GetRowIdParams,
	RowClassParams,
	GetContextMenuItemsParams,
} from "ag-grid-community";

import { ModuleRegistry } from "ag-grid-community";
import {
	SetFilterModule,
	TextFilterModule,
	TextEditorModule,
	LicenseManager,
} from "ag-grid-enterprise";
ModuleRegistry.registerModules([
	SetFilterModule,
	TextFilterModule,
	TextEditorModule,
]);

/**
 * Props interface for the GridRenderer component
 */
interface GridRendererProps<T> {
	/** Whether to show the grid */
	shouldShowGrid: boolean;
	/** Error dialog props */
	errorPopup: string | null;
	showDialog: boolean;
	flashRed: boolean;
	clearError: () => void;
	/** Toolbar action handlers */
	handleAddRow: () => void;
	handleAddMultipleRows: () => void;
	handleDeleteRows: () => void;
	handleDuplicateRow: () => void;
	handleSave: () => Promise<void>;
	handleRefreshWithWarning: () => void;
	/** Grid state */
	hasUnsavedChanges: boolean;
	gridApi?: GridApi;
	/** Grid configuration */
	gridConfig: GridOptions;
	/** Grid data and handlers */
	rowData: T[];
	colDefs: ColDef[];
	onGridReady: (params: GridReadyEvent) => void;
	handleCellValueChanged: (params: CellValueChangedEvent) => void;
	handleCellEditingStopped: (params: CellEditingStoppedEvent) => void;
	getRowId: (params: GetRowIdParams) => string;
	getContextMenuItems: (params: GetContextMenuItemsParams) => string[];
	getRowClass: (params: RowClassParams) => string | string[];
	savedState: Record<string, unknown>;
}

/**
 * GridRenderer - Handles the rendering of the grid interface
 *
 * This component is responsible for rendering the grid toolbar,
 * error dialog, and the main AG Grid component. It separates
 * the rendering logic from the business logic in BaseGrid.
 */
const GridRenderer = <T,>({
	shouldShowGrid,
	errorPopup,
	showDialog,
	flashRed,
	clearError,
	handleAddRow,
	handleAddMultipleRows,
	handleDeleteRows,
	handleDuplicateRow,
	handleSave,
	handleRefreshWithWarning,
	hasUnsavedChanges,
	gridApi,
	gridConfig,
	rowData,
	colDefs,
	onGridReady,
	handleCellValueChanged,
	handleCellEditingStopped,
	getRowId,
	getContextMenuItems,
	getRowClass,
	savedState,
}: GridRendererProps<T>) => {
	// Verify license is set (for debugging)
	LicenseManager.setLicenseKey(
		"[TRIAL]_this_{AG_Charts_and_AG_Grid}_Enterprise_key_{AG-088973}_is_granted_for_evaluation_only___Use_in_production_is_not_permitted___Please_report_misuse_to_legal@ag-grid.com___For_help_with_purchasing_a_production_key_please_contact_info@ag-grid.com___You_are_granted_a_{Single_Application}_Developer_License_for_one_application_only___All_Front-End_JavaScript_developers_working_on_the_application_would_need_to_be_licensed___This_key_will_deactivate_on_{31 July 2025}____[v3]_[0102]_MTc1MzkxNjQwMDAwMA==6e64d6974b07ee1c751d36c6da13e44a"
	);

	return (
		<>
			{/* Error dialog for displaying user-friendly error messages */}
			<ErrorDialog
				error={errorPopup}
				showDialog={showDialog}
				flashRed={flashRed}
				onClose={clearError}
			/>

			<div style={{ width: "100%", height: "100%" }}>
				{/* Loading state while grid is initializing */}
				{!shouldShowGrid ? (
					<div style={{ textAlign: "center", padding: "20px" }}>
						<p>Loading data...</p>
					</div>
				) : (
					<>
						{/* Custom toolbar with CRUD operations */}
						<GridToolbar
							onAddRow={handleAddRow}
							onAddMultipleRows={handleAddMultipleRows}
							onDeleteRows={handleDeleteRows}
							onDuplicateRow={handleDuplicateRow}
							onSave={handleSave}
							onRefresh={handleRefreshWithWarning}
							hasUnsavedChanges={hasUnsavedChanges}
							gridApi={gridApi}
						/>

						{/* Main AG Grid component with all configurations */}
						<div style={{ height: "calc(100% - 60px)" }}>
							<AgGridReact
								// Row styling rules
								rowClassRules={{
									"ag-row-new": (params: RowClassParams) =>
										params.data?.__isNewRow,
									"ag-row-dirty": (params: RowClassParams) =>
										params.data?.__isDirty,
									"ag-row-deleted": (params: RowClassParams) =>
										params.data?.__isDeleted,
									"ag-row-failed": (params: RowClassParams) =>
										params.data?.__isFailed,
								}}
								// Grid options
								statusBar={gridConfig.statusBar}
								sideBar={gridConfig.sideBar}
								enableFilterHandlers={true}
								suppressSetFilterByDefault={true}
								// Performance optimizations
								// Event handlers
								onGridReady={onGridReady}
								onCellValueChanged={handleCellValueChanged}
								onCellEditingStopped={handleCellEditingStopped}
								// Data and configuration
								rowData={rowData}
								columnDefs={colDefs}
								defaultColDef={gridConfig.defaultColDef}
								initialState={savedState}
								suppressContextMenu={false}
								rowSelection={gridConfig.rowSelection}
								cellSelection={true}
								getRowId={getRowId}
								// @ts-expect-error - AG Grid typing conflict with actual implementation
								getContextMenuItems={getContextMenuItems}
								// Row styling
								getRowClass={getRowClass}
								// Custom components
								components={getGridComponents()}
							/>
						</div>
					</>
				)}
			</div>
		</>
	);
};

export default GridRenderer;
