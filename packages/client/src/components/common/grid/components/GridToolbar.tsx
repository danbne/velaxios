import React, { memo, useState, useEffect } from "react";
import GridToolbarButton from "./GridToolbarButton";
import { ModuleRegistry, type GridApi } from "ag-grid-community";
import { RowSelectionModule, EventApiModule } from "ag-grid-community";
import { RowStyleModule } from "ag-grid-community";
import { GridStateModule } from "ag-grid-community";
import { SideBarModule } from "ag-grid-enterprise";
import { StatusBarModule } from "ag-grid-enterprise";
import { ColumnsToolPanelModule } from "ag-grid-enterprise";
import { NewFiltersToolPanelModule } from "ag-grid-enterprise";
import {
	useApiGet,
	useApiPost,
	useApiPut,
	useApiDelete,
} from "../hooks/useApiClient";
import { API_ENDPOINTS } from "../../../../config/api";
import Dialog from "../../Dialog";
import type { Layout } from "../layouts/types";

ModuleRegistry.registerModules([
	RowSelectionModule,
	EventApiModule,
	RowStyleModule,
	GridStateModule,
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
	/** Grid ID for layout management */
	gridId?: string;
	/** Callback function for layout changes */
	onLayoutChange?: (layoutData: { layoutId: string }) => void;
	/** Callback function for layout save */
	onLayoutSave?: (params: { layoutId: string }) => Promise<void>;
	/** Current layout ID */
	currentLayoutId?: string;
	/** Current layout name */
	currentLayoutName?: string;
	/** Callback to restore default layout */
	onRestoreDefault?: () => Promise<void>;
}

/**
 * GridToolbar - Custom toolbar component for grid operations
 *
 * This component provides a comprehensive toolbar with buttons for:
 * - Row management (add, delete, duplicate)
 * - Data operations (save, refresh)
 * - Layout management (view dropdown, save view, manage views)
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
		gridId,
		onLayoutChange,
		onLayoutSave,
		currentLayoutId,
		currentLayoutName,
		onRestoreDefault,
	}) => {
		// State to track selected rows
		const [hasSelectedRows, setHasSelectedRows] = useState(false);
		const [selectedCount, setSelectedCount] = useState(0);

		// Layout management state
		const [selectedLayoutId, setSelectedLayoutId] = useState<string>(
			currentLayoutId || ""
		);
		const [showSaveLayoutModal, setShowSaveLayoutModal] = useState(false);
		const [showSaveAsModal, setShowSaveAsModal] = useState(false);
		const [showManageViewsModal, setShowManageViewsModal] = useState(false);
		const [showViewsListModal, setShowViewsListModal] = useState(false);
		const [newLayoutName, setNewLayoutName] = useState("");
		const [editingLayout, setEditingLayout] = useState<Layout | null>(null);
		const [isMenuOpen, setIsMenuOpen] = useState(false);

		// Fetch layouts if gridId is provided
		const { data: layoutsData, isLoading: layoutsLoading } = useApiGet<{
			gridLayout: Layout[];
		}>(
			["layouts", gridId || ""],
			gridId ? API_ENDPOINTS.GRID_LAYOUTS(gridId) : "",
			{
				enabled: !!gridId,
				staleTime: 2 * 60 * 1000, // 2 minutes
			}
		);

		// Create new layout mutation
		const createLayoutMutation = useApiPost<Layout>({
			invalidateQueries: ["layouts", gridId || ""],
		});

		// Update layout mutation
		const updateLayoutMutation = useApiPut<Layout>({
			invalidateQueries: ["layouts", gridId || ""],
		});

		// Delete layout mutation
		const deleteLayoutMutation = useApiDelete<boolean>({
			invalidateQueries: ["layouts", gridId || ""],
		});

		const layouts = layoutsData?.gridLayout || [];

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

		// Update selected layout when currentLayoutId changes
		useEffect(() => {
			setSelectedLayoutId(currentLayoutId || "");
		}, [currentLayoutId]);

		const handleSave = async () => {
			try {
				await onSave();
			} catch (error) {
				// Error is already handled by the saveChanges function
				// This just prevents the uncaught exception
				console.error("Save operation failed:", error);
			}
		};

		const handleLayoutChange = async (layoutId: string) => {
			if (!layoutId) return;

			setSelectedLayoutId(layoutId);
			if (onLayoutChange) {
				// Call the layout change handler with the layout ID
				onLayoutChange({ layoutId });
			}
		};

		const handleSaveLayout = async () => {
			if (!newLayoutName.trim() || !gridId || !gridApi) return;

			try {
				// Get current grid state
				const currentState = gridApi.getState();

				// Ensure we have valid state data
				if (!currentState || typeof currentState !== "object") {
					console.error("Invalid grid state:", currentState);
					// Use empty object as fallback
					const fallbackState = {};
					console.log("Using fallback state:", fallbackState);

					// Create new layout with fallback state
					const newLayout = await createLayoutMutation.mutateAsync({
						endpoint: API_ENDPOINTS.GRID_LAYOUTS(gridId),
						data: {
							layoutName: newLayoutName.trim(),
							layoutData: fallbackState,
							isDefault: false,
						},
					});

					// Update the selected layout to the new one
					setSelectedLayoutId(newLayout.layout_id);
					setShowSaveLayoutModal(false);
					setNewLayoutName("");
					return;
				}

				console.log("Saving layout with data:", {
					layoutName: newLayoutName.trim(),
					layoutData: currentState,
					isDefault: false,
				});

				// Create new layout
				const newLayout = await createLayoutMutation.mutateAsync({
					endpoint: API_ENDPOINTS.GRID_LAYOUTS(gridId),
					data: {
						layoutName: newLayoutName.trim(),
						layoutData: currentState,
						isDefault: false,
					},
				});

				// Update the selected layout to the new one
				setSelectedLayoutId(newLayout.layout_id);

				setShowSaveLayoutModal(false);
				setNewLayoutName("");
			} catch (error) {
				console.error("Error saving layout:", error);
			}
		};

		const handleSaveAsLayout = async () => {
			if (!newLayoutName.trim() || !gridId || !gridApi) return;

			try {
				// Get current grid state
				const currentState = gridApi.getState();

				// Ensure we have valid state data
				if (!currentState || typeof currentState !== "object") {
					console.error("Invalid grid state:", currentState);
					// Use empty object as fallback
					const fallbackState = {};
					console.log("Using fallback state:", fallbackState);

					// Create new layout with fallback state
					const newLayout = await createLayoutMutation.mutateAsync({
						endpoint: API_ENDPOINTS.GRID_LAYOUTS(gridId),
						data: {
							layoutName: newLayoutName.trim(),
							layoutData: fallbackState,
							isDefault: false,
						},
					});

					// Update the selected layout to the new one
					setSelectedLayoutId(newLayout.layout_id);
					setShowSaveAsModal(false);
					setNewLayoutName("");
					return;
				}

				console.log("Saving layout with data:", {
					layoutName: newLayoutName.trim(),
					layoutData: currentState,
					isDefault: false,
				});

				// Create new layout
				const newLayout = await createLayoutMutation.mutateAsync({
					endpoint: API_ENDPOINTS.GRID_LAYOUTS(gridId),
					data: {
						layoutName: newLayoutName.trim(),
						layoutData: currentState,
						isDefault: false,
					},
				});

				// Update the selected layout to the new one
				setSelectedLayoutId(newLayout.layout_id);

				setShowSaveAsModal(false);
				setNewLayoutName("");
			} catch (error) {
				console.error("Error saving layout as:", error);
			}
		};

		const handleUpdateLayout = async () => {
			if (!editingLayout || !gridId || !gridApi) return;

			try {
				// Get current grid state
				const currentState = gridApi.getState();

				// Update layout
				await updateLayoutMutation.mutateAsync({
					endpoint: API_ENDPOINTS.GRID_LAYOUT(gridId, editingLayout.layout_id),
					data: {
						layoutName: editingLayout.layout_name,
						layoutData: currentState,
					},
				});

				setShowManageViewsModal(false);
				setEditingLayout(null);
			} catch (error) {
				console.error("Error updating layout:", error);
			}
		};

		const handleDeleteLayout = async (layoutId: string) => {
			if (!gridId) return;

			try {
				await deleteLayoutMutation.mutateAsync({
					endpoint: API_ENDPOINTS.GRID_LAYOUT(gridId, layoutId),
				});

				// If we deleted the current layout, select the default
				if (layoutId === selectedLayoutId) {
					const defaultLayout = layouts.find(layout => layout.is_default);
					if (defaultLayout) {
						handleLayoutChange(defaultLayout.layout_id);
					}
				}
			} catch (error) {
				console.error("Error deleting layout:", error);
			}
		};

		const handleRestoreDefault = async () => {
			if (!onRestoreDefault) return;

			try {
				await onRestoreDefault();
			} catch (error) {
				console.error("Error restoring default:", error);
			}
		};

		const currentLayout = layouts.find(
			layout => layout.layout_id === selectedLayoutId
		);

		return (
			<>
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
						{/* Layout Management */}
						{gridId && layouts.length > 0 && (
							<>
								{/* View Management Dropdown */}
								<div style={{ marginRight: "8px", position: "relative" }}>
									<button
										onClick={() => setIsMenuOpen(!isMenuOpen)}
										style={{
											padding: "6px 12px",
											border: "1px solid #d1d5db",
											borderRadius: "4px",
											backgroundColor: "white",
											cursor: "pointer",
											fontSize: "12px",
											display: "flex",
											alignItems: "center",
											gap: "4px",
										}}
									>
										📋 Views
										<span style={{ fontSize: "10px" }}>▼</span>
									</button>

									{/* Dropdown Menu */}
									{isMenuOpen && (
										<div
											style={{
												position: "absolute",
												top: "100%",
												left: 0,
												backgroundColor: "white",
												border: "1px solid #d1d5db",
												borderRadius: "4px",
												boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
												zIndex: 1000,
												minWidth: "200px",
											}}
										>
											<div
												onClick={() => {
													setShowViewsListModal(true);
													setIsMenuOpen(false);
												}}
												style={{
													padding: "8px 12px",
													cursor: "pointer",
													borderBottom: "1px solid #f0f0f0",
												}}
												onMouseEnter={e =>
													(e.currentTarget.style.backgroundColor = "#f5f5f5")
												}
												onMouseLeave={e =>
													(e.currentTarget.style.backgroundColor = "white")
												}
											>
												📂 Open View
											</div>
											<div
												onClick={() => {
													setShowSaveLayoutModal(true);
													setIsMenuOpen(false);
												}}
												style={{
													padding: "8px 12px",
													cursor: "pointer",
													borderBottom: "1px solid #f0f0f0",
												}}
												onMouseEnter={e =>
													(e.currentTarget.style.backgroundColor = "#f5f5f5")
												}
												onMouseLeave={e =>
													(e.currentTarget.style.backgroundColor = "white")
												}
											>
												💾 Save View
											</div>
											<div
												onClick={() => {
													setShowSaveAsModal(true);
													setIsMenuOpen(false);
												}}
												style={{
													padding: "8px 12px",
													cursor: "pointer",
													borderBottom: "1px solid #f0f0f0",
												}}
												onMouseEnter={e =>
													(e.currentTarget.style.backgroundColor = "#f5f5f5")
												}
												onMouseLeave={e =>
													(e.currentTarget.style.backgroundColor = "white")
												}
											>
												📄 Save View As
											</div>
											<div
												onClick={() => {
													setShowManageViewsModal(true);
													setIsMenuOpen(false);
												}}
												style={{
													padding: "8px 12px",
													cursor: "pointer",
													borderBottom: "1px solid #f0f0f0",
												}}
												onMouseEnter={e =>
													(e.currentTarget.style.backgroundColor = "#f5f5f5")
												}
												onMouseLeave={e =>
													(e.currentTarget.style.backgroundColor = "white")
												}
											>
												⚙️ Manage Views
											</div>
											<div
												onClick={() => {
													handleRestoreDefault();
													setIsMenuOpen(false);
												}}
												style={{
													padding: "8px 12px",
													cursor: "pointer",
												}}
												onMouseEnter={e =>
													(e.currentTarget.style.backgroundColor = "#f5f5f5")
												}
												onMouseLeave={e =>
													(e.currentTarget.style.backgroundColor = "white")
												}
											>
												🔄 Restore to Default
											</div>
										</div>
									)}
								</div>

								{/* Separator */}
								<div
									style={{
										width: "1px",
										height: "24px",
										backgroundColor: "#e0e0e0",
										margin: "0 8px",
									}}
								/>
							</>
						)}

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
							icon="💾"
							tooltip={hasUnsavedChanges ? "Save Changes" : "Save"}
							onClick={handleSave}
							disabled={!hasUnsavedChanges}
							isSaveButton={true}
							hasUnsavedChanges={hasUnsavedChanges}
						/>
						<GridToolbarButton
							icon="🔄"
							tooltip="Refresh"
							onClick={onRefresh}
						/>
					</div>
				</div>

				{/* Save Layout Modal */}
				<Dialog
					isOpen={showSaveLayoutModal}
					onClose={() => {
						setShowSaveLayoutModal(false);
						setNewLayoutName("");
					}}
					title="Save View"
					footer={
						<div style={{ display: "flex", gap: "8px" }}>
							<button
								onClick={() => {
									setShowSaveLayoutModal(false);
									setNewLayoutName("");
								}}
								style={{
									padding: "6px 12px",
									border: "1px solid #d1d5db",
									borderRadius: "4px",
									backgroundColor: "white",
									cursor: "pointer",
								}}
							>
								Cancel
							</button>
							<button
								onClick={handleSaveLayout}
								disabled={!newLayoutName.trim()}
								style={{
									padding: "6px 12px",
									border: "1px solid #3b82f6",
									borderRadius: "4px",
									backgroundColor: "#3b82f6",
									color: "white",
									cursor: "pointer",
									opacity: newLayoutName.trim() ? 1 : 0.5,
								}}
							>
								Save View
							</button>
						</div>
					}
				>
					<div style={{ marginBottom: "12px" }}>
						<label
							htmlFor="layout-name"
							style={{
								display: "block",
								marginBottom: "4px",
								fontSize: "14px",
							}}
						>
							View Name:
						</label>
						<input
							id="layout-name"
							type="text"
							value={newLayoutName}
							onChange={e => setNewLayoutName(e.target.value)}
							placeholder="Enter view name..."
							style={{
								width: "100%",
								padding: "8px",
								border: "1px solid #d1d5db",
								borderRadius: "4px",
								fontSize: "14px",
							}}
							onKeyDown={e => {
								if (e.key === "Enter" && newLayoutName.trim()) {
									handleSaveLayout();
								}
							}}
						/>
					</div>
				</Dialog>

				{/* Save As Layout Modal */}
				<Dialog
					isOpen={showSaveAsModal}
					onClose={() => {
						setShowSaveAsModal(false);
						setNewLayoutName("");
					}}
					title="Save View As"
					footer={
						<div style={{ display: "flex", gap: "8px" }}>
							<button
								onClick={() => {
									setShowSaveAsModal(false);
									setNewLayoutName("");
								}}
								style={{
									padding: "6px 12px",
									border: "1px solid #d1d5db",
									borderRadius: "4px",
									backgroundColor: "white",
									cursor: "pointer",
								}}
							>
								Cancel
							</button>
							<button
								onClick={handleSaveAsLayout}
								disabled={!newLayoutName.trim()}
								style={{
									padding: "6px 12px",
									border: "1px solid #3b82f6",
									borderRadius: "4px",
									backgroundColor: "#3b82f6",
									color: "white",
									cursor: "pointer",
									opacity: newLayoutName.trim() ? 1 : 0.5,
								}}
							>
								Save View As
							</button>
						</div>
					}
				>
					<div style={{ marginBottom: "12px" }}>
						<label
							htmlFor="layout-name-as"
							style={{
								display: "block",
								marginBottom: "4px",
								fontSize: "14px",
							}}
						>
							View Name:
						</label>
						<input
							id="layout-name-as"
							type="text"
							value={newLayoutName}
							onChange={e => setNewLayoutName(e.target.value)}
							placeholder="Enter new view name..."
							style={{
								width: "100%",
								padding: "8px",
								border: "1px solid #d1d5db",
								borderRadius: "4px",
								fontSize: "14px",
							}}
							onKeyDown={e => {
								if (e.key === "Enter" && newLayoutName.trim()) {
									handleSaveAsLayout();
								}
							}}
						/>
					</div>
				</Dialog>

				{/* Views List Modal */}
				<Dialog
					isOpen={showViewsListModal}
					onClose={() => setShowViewsListModal(false)}
					title="Select View"
					footer={
						<div style={{ display: "flex", gap: "8px" }}>
							<button
								onClick={() => setShowViewsListModal(false)}
								style={{
									padding: "6px 12px",
									border: "1px solid #d1d5db",
									borderRadius: "4px",
									backgroundColor: "white",
									cursor: "pointer",
								}}
							>
								Cancel
							</button>
						</div>
					}
				>
					<div style={{ maxHeight: "300px", overflowY: "auto" }}>
						{layouts.map(layout => (
							<div
								key={layout.layout_id}
								onClick={() => {
									handleLayoutChange(layout.layout_id);
									setShowViewsListModal(false);
								}}
								style={{
									padding: "8px 12px",
									cursor: "pointer",
									borderBottom: "1px solid #f0f0f0",
									backgroundColor:
										layout.layout_id === selectedLayoutId ? "#e3f2fd" : "white",
								}}
								onMouseEnter={e =>
									(e.currentTarget.style.backgroundColor =
										layout.layout_id === selectedLayoutId
											? "#e3f2fd"
											: "#f5f5f5")
								}
								onMouseLeave={e =>
									(e.currentTarget.style.backgroundColor =
										layout.layout_id === selectedLayoutId ? "#e3f2fd" : "white")
								}
							>
								<div
									style={{
										fontWeight:
											layout.layout_id === selectedLayoutId ? "bold" : "normal",
									}}
								>
									{layout.layout_name} {layout.is_default ? "(Default)" : ""}
								</div>
								{layout.layout_id === selectedLayoutId && (
									<div
										style={{
											fontSize: "12px",
											color: "#666",
											marginTop: "2px",
										}}
									>
										Current View
									</div>
								)}
							</div>
						))}
					</div>
				</Dialog>

				{/* Manage Views Modal */}
				<Dialog
					isOpen={showManageViewsModal}
					onClose={() => {
						setShowManageViewsModal(false);
						setEditingLayout(null);
					}}
					title="Manage Views"
					footer={
						<div style={{ display: "flex", gap: "8px" }}>
							<button
								onClick={() => {
									setShowManageViewsModal(false);
									setEditingLayout(null);
								}}
								style={{
									padding: "6px 12px",
									border: "1px solid #d1d5db",
									borderRadius: "4px",
									backgroundColor: "white",
									cursor: "pointer",
								}}
							>
								Close
							</button>
						</div>
					}
				>
					<div style={{ maxHeight: "400px", overflowY: "auto" }}>
						{layouts.map(layout => (
							<div
								key={layout.layout_id}
								style={{
									padding: "12px",
									border: "1px solid #e0e0e0",
									borderRadius: "4px",
									marginBottom: "8px",
									backgroundColor: "white",
								}}
							>
								<div
									style={{
										display: "flex",
										justifyContent: "space-between",
										alignItems: "center",
									}}
								>
									<div style={{ flex: 1 }}>
										{editingLayout?.layout_id === layout.layout_id ? (
											<input
												type="text"
												value={editingLayout.layout_name}
												onChange={e =>
													setEditingLayout({
														...editingLayout,
														layout_name: e.target.value,
													})
												}
												style={{
													width: "100%",
													padding: "4px 8px",
													border: "1px solid #d1d5db",
													borderRadius: "4px",
													fontSize: "14px",
												}}
											/>
										) : (
											<div style={{ fontWeight: "bold" }}>
												{layout.layout_name}{" "}
												{layout.is_default ? "(Default)" : ""}
											</div>
										)}
									</div>
									<div style={{ display: "flex", gap: "4px" }}>
										{editingLayout?.layout_id === layout.layout_id ? (
											<>
												<button
													onClick={handleUpdateLayout}
													style={{
														padding: "4px 8px",
														border: "1px solid #3b82f6",
														borderRadius: "4px",
														backgroundColor: "#3b82f6",
														color: "white",
														cursor: "pointer",
														fontSize: "12px",
													}}
												>
													Save
												</button>
												<button
													onClick={() => setEditingLayout(null)}
													style={{
														padding: "4px 8px",
														border: "1px solid #d1d5db",
														borderRadius: "4px",
														backgroundColor: "white",
														cursor: "pointer",
														fontSize: "12px",
													}}
												>
													Cancel
												</button>
											</>
										) : (
											<>
												<button
													onClick={() => setEditingLayout(layout)}
													disabled={layout.is_default}
													style={{
														padding: "4px 8px",
														border: "1px solid #d1d5db",
														borderRadius: "4px",
														backgroundColor: "white",
														cursor: "pointer",
														fontSize: "12px",
														opacity: layout.is_default ? 0.5 : 1,
													}}
												>
													Rename
												</button>
												<button
													onClick={() => handleDeleteLayout(layout.layout_id)}
													disabled={layout.is_default}
													style={{
														padding: "4px 8px",
														border: "1px solid #dc2626",
														borderRadius: "4px",
														backgroundColor: "#dc2626",
														color: "white",
														cursor: "pointer",
														fontSize: "12px",
														opacity: layout.is_default ? 0.5 : 1,
													}}
												>
													Delete
												</button>
											</>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</Dialog>

				{/* Click outside to close menu */}
				{isMenuOpen && (
					<div
						style={{
							position: "fixed",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							zIndex: 999,
						}}
						onClick={() => setIsMenuOpen(false)}
					/>
				)}
			</>
		);
	}
);

export default GridToolbar;
