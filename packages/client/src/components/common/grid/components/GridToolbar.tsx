import React, { memo, useState, useEffect } from "react";
import GridToolbarButton from "./GridToolbarButton";
import { ModuleRegistry, type GridApi } from "ag-grid-community";
import { RowSelectionModule, EventApiModule } from "ag-grid-community";
import { RowStyleModule } from "ag-grid-community";
import { SideBarModule } from "ag-grid-enterprise";
import { StatusBarModule } from "ag-grid-enterprise";
import { ColumnsToolPanelModule } from "ag-grid-enterprise";
import { NewFiltersToolPanelModule } from "ag-grid-enterprise";

ModuleRegistry.registerModules([
	RowSelectionModule,
	EventApiModule,
	RowStyleModule,
	SideBarModule,
	StatusBarModule,
	ColumnsToolPanelModule,
	NewFiltersToolPanelModule,
]);

/**
 * Props interface for the GridToolbar component
 */
interface GridToolbarProps {
	/** Callback function for adding a single row */
	onAddRow: () => void;
	/** Callback function for adding multiple rows */
	onAddMultipleRows: () => void;
	/** Callback function for deleting selected rows */
	onDeleteRows: () => void;
	/** Callback function for duplicating selected rows */
	onDuplicateRow: () => void;
	/** Callback function for saving changes */
	onSave: () => Promise<void>;
	/** Callback function for refreshing the grid */
	onRefresh: () => void;
	/** Whether there are unsaved changes */
	hasUnsavedChanges?: boolean;
	/** AG Grid API instance for grid operations */
	gridApi?: GridApi;
}

/**
 * GridToolbar - Custom toolbar component for grid operations
 *
 * This component provides a comprehensive toolbar with buttons for:
 * - Row management (add, delete, duplicate)
 * - Data operations (save, refresh)
 * - Visual feedback for unsaved changes
 *
 * The toolbar is styled to match the grid theme and provides
 * clear visual feedback for button states and availability.
 *
 * @param props - Configuration and callback functions for toolbar actions
 * @returns JSX element representing the grid toolbar
 */
const GridToolbar: React.FC<GridToolbarProps> = memo(
	({
		onAddRow,
		onDeleteRows,
		onDuplicateRow,
		onSave,
		onRefresh,
		hasUnsavedChanges = false,
		gridApi,
	}) => {
		// State to track selected rows
		const [hasSelectedRows, setHasSelectedRows] = useState(false);
		const [selectedCount, setSelectedCount] = useState(0);

		// Update selection state when gridApi changes or selection changes
		useEffect(() => {
			if (!gridApi || !gridApi.getSelectedNodes) {
				setHasSelectedRows(false);
				setSelectedCount(0);
				return;
			}

			const updateSelection = () => {
				try {
					const selectedNodes = gridApi.getSelectedNodes();
					const count = selectedNodes?.length || 0;
					setHasSelectedRows(count > 0);
					setSelectedCount(count);
				} catch {
					// Handle case where grid is not ready or destroyed
					setHasSelectedRows(false);
					setSelectedCount(0);
				}
			};

			// Initial check
			updateSelection();

			// Listen for selection changes
			gridApi.addEventListener("selectionChanged", updateSelection);

			return () => {
				gridApi.removeEventListener("selectionChanged", updateSelection);
			};
		}, [gridApi]);

		const handleSave = async () => {
			try {
				await onSave();
			} catch (error) {
				// Error is already handled by the saveChanges function
				// This just prevents the uncaught exception
				console.error("Save operation failed:", error);
			}
		};

		return (
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "8px",
					borderBottom: "1px solid #e0e0e0",
					backgroundColor: "#f8f9fa",
				}}
			>
				{/* Status Label */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "16px",
						fontSize: "12px",
						color: "#666",
					}}
				>
					{hasUnsavedChanges ? (
						<span>📝 Unsaved changes</span>
					) : (
						<span>✨ No unsaved changes</span>
					)}
					{hasSelectedRows && (
						<span>
							📋 {selectedCount} row{selectedCount > 1 ? "s" : ""} selected
						</span>
					)}
				</div>

				{/* Toolbar Buttons */}
				<div style={{ display: "flex", alignItems: "center" }}>
					{/* Custom Undo/Redo buttons */}
					{/* Removed Undo/Redo buttons */}

					{/* Separator */}
					<div
						style={{
							width: "1px",
							height: "24px",
							backgroundColor: "#e0e0e0",
							margin: "0 8px",
						}}
					/>

					<GridToolbarButton icon="➕" tooltip="Add Row" onClick={onAddRow} />

					<GridToolbarButton
						icon="🗑️"
						tooltip={
							hasSelectedRows
								? `Delete ${selectedCount} Selected Row${
										selectedCount > 1 ? "s" : ""
								  }`
								: "No rows selected"
						}
						onClick={onDeleteRows}
						disabled={!hasSelectedRows}
					/>
					<GridToolbarButton
						icon="📄"
						tooltip={
							hasSelectedRows
								? `Duplicate ${selectedCount} Selected Row${
										selectedCount > 1 ? "s" : ""
								  }`
								: "No rows selected"
						}
						onClick={onDuplicateRow}
						disabled={!hasSelectedRows}
					/>
					<GridToolbarButton
						icon=" 💾"
						tooltip={hasUnsavedChanges ? "Save Changes" : "Save"}
						onClick={handleSave}
						disabled={!hasUnsavedChanges}
						isSaveButton={true}
						hasUnsavedChanges={hasUnsavedChanges}
					/>
					<GridToolbarButton icon="🔄" tooltip="Refresh" onClick={onRefresh} />
				</div>
			</div>
		);
	}
);

export default GridToolbar;
