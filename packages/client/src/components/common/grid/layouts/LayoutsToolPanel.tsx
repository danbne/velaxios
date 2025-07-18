import React, { useState, useCallback } from "react";
import { useApiGet, useApiPost, useApiDelete } from "../hooks/useApiClient";
import { API_ENDPOINTS } from "../../../../config/api";
import type { Layout, LayoutsToolPanelProps } from "./types";

/**
 * LayoutsToolPanel - Custom AG Grid tool panel for layout management
 *
 * This component provides a user interface for managing grid layouts:
 * - Displaying available layouts for the current grid
 * - Selecting and applying different layouts
 * - Creating new layouts
 * - Deleting existing layouts (except the default "My Layout")
 * - Saving changes to the current layout
 *
 * The component integrates with the backend API to persist layout data
 * and provides real-time feedback for user actions.
 *
 * @param gridId - Unique identifier for the grid instance
 * @param onLayoutChange - Callback for when a layout is selected
 * @param onLayoutSave - Callback for when a layout is saved
 * @returns JSX element representing the layouts tool panel
 */
const LayoutsToolPanel: React.FC<LayoutsToolPanelProps> = ({
	gridId,
	onLayoutChange,
	onLayoutSave,
}) => {
	// State management for layouts and UI
	const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [newLayoutName, setNewLayoutName] = useState("");
	const [showCreateForm, setShowCreateForm] = useState(false);

	// Use the new API client hooks
	const { data: layoutsData, isLoading } = useApiGet<{ gridLayout: Layout[] }>(
		["layouts", gridId],
		API_ENDPOINTS.GRID_LAYOUTS(gridId),
		{
			onSuccess: (data) => {
				const layouts = data.gridLayout || [];
				// Set the default layout as selected if available
				const defaultLayout = layouts.find(
					(layout: Layout) => layout.is_default
				);
				if (defaultLayout) {
					setSelectedLayout(defaultLayout.layout_id);
				} else if (layouts.length > 0) {
					setSelectedLayout(layouts[0].layout_id);
				}
			},
			onError: () => {
				setError("Failed to load layouts");
			},
		}
	);

	const createLayoutMutation = useApiPost<{ gridLayout: Layout }>({
		invalidateQueries: [`layouts-${gridId}`],
		onSuccess: (data) => {
			const newLayout = data.gridLayout;
			setNewLayoutName("");
			setShowCreateForm(false);
			setSelectedLayout(newLayout.layout_id);
		},
		onError: (error) => {
			if ((error as { status?: number })?.status === 409) {
				setError("Layout name already exists");
			} else {
				setError("Failed to create layout");
			}
		},
	});

	const deleteLayoutMutation = useApiDelete<Layout>({
		invalidateQueries: [`layouts-${gridId}`],
		onSuccess: () => {
			// If the deleted layout was selected, select the default layout
			const layouts = layoutsData?.gridLayout || [];
			const defaultLayout = layouts.find((layout: Layout) => layout.is_default);
			if (defaultLayout) {
				setSelectedLayout(defaultLayout.layout_id);
			}
		},
		onError: () => {
			setError("Failed to delete layout");
		},
	});

	const layouts = layoutsData?.gridLayout || [];

	// Handle layout selection
	const handleLayoutSelect = useCallback(
		async (layoutId: string) => {
			try {
				setSelectedLayout(layoutId);
				// For loading individual layouts, we'll use the existing apiGet function
				// since we don't need caching for this specific use case
				const response = await fetch(
					API_ENDPOINTS.GRID_LAYOUT(gridId, layoutId),
					{
						headers: {
							Authorization: `Bearer ${localStorage.getItem("token")}`,
							"Content-Type": "application/json",
						},
					}
				);
				const data = await response.json();
				const layoutData = data.gridLayout.layout_data;
				onLayoutChange(layoutData);
			} catch (err: unknown) {
				console.error("Error loading layout:", err);
				setError("Failed to load layout");
			}
		},
		[gridId, onLayoutChange]
	);

	/**
	 * Saves the current grid state to the selected layout
	 *
	 * This function triggers the save operation by calling the onLayoutSave
	 * callback, which will capture the current grid state and persist it
	 * to the backend for the selected layout.
	 */
	const handleSaveLayout = useCallback(async () => {
		if (!selectedLayout) return;

		try {
			// Get current grid state from the grid API
			// This will be passed from the parent component
			onLayoutSave({ layoutId: selectedLayout });
		} catch (err: unknown) {
			console.error("Error saving layout:", err);
			setError("Failed to save layout");
		}
	}, [selectedLayout, onLayoutSave]);

	/**
	 * Creates a new layout with the specified name
	 *
	 * This function:
	 * - Validates the layout name is not empty
	 * - Makes an API call to create a new layout
	 * - Adds the new layout to the local state
	 * - Sets the new layout as selected
	 * - Handles duplicate name errors and authentication issues
	 *
	 * @param newLayoutName - The name for the new layout
	 */
	const handleCreateLayout = useCallback(async () => {
		if (!newLayoutName.trim()) return;

		try {
			await createLayoutMutation.mutateAsync({
				endpoint: API_ENDPOINTS.GRID_LAYOUTS(gridId),
				data: {
					layoutName: newLayoutName.trim(),
					layoutData: {}, // Empty layout data
					isDefault: false,
				},
			});
		} catch (err: unknown) {
			console.error("Error creating layout:", err);
		}
	}, [gridId, newLayoutName, createLayoutMutation]);

	/**
	 * Deletes a layout from the database and updates the UI
	 *
	 * This function:
	 * - Prevents deletion of the default "My Layout"
	 * - Makes an API call to delete the layout
	 * - Removes the layout from the local state
	 * - Selects the default layout if the deleted layout was selected
	 * - Handles authentication errors and user feedback
	 *
	 * @param layoutId - The ID of the layout to delete
	 * @param layoutName - The name of the layout (for validation)
	 */
	const handleDeleteLayout = useCallback(
		async (layoutId: string, layoutName: string) => {
			if (layoutName === "My Layout") {
				setError("Cannot delete the default layout");
				return;
			}

			try {
				await deleteLayoutMutation.mutateAsync({
					endpoint: API_ENDPOINTS.GRID_LAYOUT(gridId, layoutId),
				});
			} catch (err: unknown) {
				console.error("Error deleting layout:", err);
			}
		},
		[gridId, deleteLayoutMutation]
	);

	// Loading state
	if (isLoading) {
		return (
			<div className="ag-tool-panel-wrapper">
				<div className="ag-tool-panel-group">
					<div className="ag-tool-panel-group-title">Layouts</div>
					<div className="ag-tool-panel-group-content">
						<div>Loading layouts...</div>
					</div>
				</div>
			</div>
		);
	}

	// Main component render
	return (
		<div className="ag-tool-panel-wrapper">
			<div className="ag-tool-panel-group">
				<div className="ag-tool-panel-group-title">Layouts</div>
				<div className="ag-tool-panel-group-content">
					{error && (
						<div
							className="ag-error-message"
							style={{ color: "red", marginBottom: "10px" }}
						>
							{error}
						</div>
					)}

					{/* Layout List */}
					<div className="ag-layout-list">
						{layouts.map((layout: Layout) => (
							<div
								key={layout.layout_id}
								className={`ag-layout-item ${
									selectedLayout === layout.layout_id
										? "ag-layout-item-selected"
										: ""
								}`}
								onClick={() => handleLayoutSelect(layout.layout_id)}
							>
								<div className="ag-layout-item-name">{layout.layout_name}</div>
								{layout.layout_name !== "My Layout" && (
									<button
										className="ag-layout-delete-btn"
										onClick={(e) => {
											e.stopPropagation();
											handleDeleteLayout(layout.layout_id, layout.layout_name);
										}}
									>
										×
									</button>
								)}
							</div>
						))}
					</div>

					{/* Create Layout Form */}
					{showCreateForm ? (
						<div className="ag-create-layout-form">
							<input
								type="text"
								value={newLayoutName}
								onChange={(e) => setNewLayoutName(e.target.value)}
								placeholder="Enter layout name"
								className="ag-layout-name-input"
							/>
							<div className="ag-layout-form-buttons">
								<button
									onClick={handleCreateLayout}
									disabled={!newLayoutName.trim()}
									className="ag-layout-create-btn"
								>
									Create
								</button>
								<button
									onClick={() => {
										setShowCreateForm(false);
										setNewLayoutName("");
									}}
									className="ag-layout-cancel-btn"
								>
									Cancel
								</button>
							</div>
						</div>
					) : (
						<button
							onClick={() => setShowCreateForm(true)}
							className="ag-layout-create-new-btn"
						>
							+ Create New Layout
						</button>
					)}

					{/* Save Layout Button */}
					{selectedLayout && (
						<button
							onClick={handleSaveLayout}
							className="ag-layout-save-btn"
							disabled={
								createLayoutMutation.isPending || deleteLayoutMutation.isPending
							}
						>
							Save Layout
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default LayoutsToolPanel;
