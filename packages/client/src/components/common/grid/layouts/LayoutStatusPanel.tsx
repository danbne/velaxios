import React, { useState, useEffect, useCallback } from "react";
import { apiGet } from "../../../../utils/apiClient";
import { API_ENDPOINTS } from "../../../../config/api";
import type { Layout, LayoutStatusPanelProps } from "./types";

/**
 * LayoutStatusPanel - Custom AG Grid status panel for layout information
 *
 * This component displays in the grid's status bar and provides:
 * - Current layout name display
 * - Quick save button for the current layout
 * - Loading state while fetching layout information
 *
 * The component automatically loads the default layout on mount
 * and provides a convenient way for users to save their current
 * grid state to the active layout.
 *
 * @param gridId - Unique identifier for the grid instance
 * @param onLayoutSave - Callback for when the save button is clicked
 * @returns JSX element representing the layout status panel
 */
const LayoutStatusPanel: React.FC<LayoutStatusPanelProps> = ({
	gridId,
	onLayoutSave,
}) => {
	// State for current layout information and loading state
	const [currentLayout, setCurrentLayout] = useState<Layout | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	/**
	 * Loads the default layout for the current grid
	 *
	 * This function:
	 * - Makes an API call to ensure the default layout exists
	 * - Sets the current layout state with the default layout info
	 * - Handles authentication errors and redirects to login if needed
	 * - Updates the loading state appropriately
	 */
	const loadDefaultLayout = useCallback(async () => {
		try {
			setIsLoading(true);
			const response = await apiGet<{ gridLayout: Layout }>(
				API_ENDPOINTS.GRID_LAYOUT_DEFAULT(gridId)
			);
			setCurrentLayout(response.gridLayout);
		} catch (err: unknown) {
			console.error("Error loading default layout:", err);
			const axiosError = err as { response?: { status?: number } };
			if (axiosError.response?.status === 401) {
				localStorage.removeItem("token");
				window.location.href = "/login";
			}
		} finally {
			setIsLoading(false);
		}
	}, [gridId]);

	// Load the default layout when the component mounts
	useEffect(() => {
		loadDefaultLayout();
	}, [loadDefaultLayout]);

	/**
	 * Handles the save layout button click
	 *
	 * This function triggers the save operation by calling the onLayoutSave
	 * callback with the current layout ID. The actual grid state capture
	 * and saving is handled by the parent component.
	 */
	const handleSaveLayout = () => {
		if (currentLayout) {
			onLayoutSave({ layoutId: currentLayout.layout_id });
		}
	};

	// Loading state while fetching layout information
	if (isLoading) {
		return (
			<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
				<span>Loading layout...</span>
			</div>
		);
	}

	// Main component render with layout info and save button
	return (
		<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
			<span style={{ fontSize: "12px", color: "#666" }}>
				Layout: <strong>{currentLayout?.layout_name || "My Layout"}</strong>
			</span>
			<button
				onClick={handleSaveLayout}
				style={{
					padding: "4px 8px",
					background: "#1976d2",
					color: "white",
					border: "none",
					borderRadius: "4px",
					cursor: "pointer",
					fontSize: "11px",
				}}
			>
				Save Layout
			</button>
		</div>
	);
};

export default LayoutStatusPanel;
