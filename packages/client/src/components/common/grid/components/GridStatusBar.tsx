import React, { useState } from "react";
import { useApiGet } from "../hooks/useApiClient";
import { API_ENDPOINTS } from "../../../../config/api";
import Dialog from "../../Dialog";
import type { Layout } from "../layouts/types";

interface GridStatusBarProps {
	/** Grid ID for layout management */
	gridId?: string;
	/** Current layout ID */
	currentLayoutId?: string;
	/** Current layout name */
	currentLayoutName?: string;
	/** Callback function for layout changes */
	onLayoutChange?: (layoutData: { layoutId: string }) => void;
	/** Callback function for layout save */
	onLayoutSave?: (params: { layoutId: string }) => Promise<void>;
}

/**
 * GridStatusBar - Status bar component showing current view and save functionality
 *
 * This component displays the current view name and provides a save button.
 * Clicking on the view name opens a list of available views to choose from.
 *
 * @param props - Configuration and callback functions for status bar actions
 * @returns JSX element representing the grid status bar
 */
const GridStatusBar: React.FC<GridStatusBarProps> = ({
	gridId,
	currentLayoutId,
	currentLayoutName,
	onLayoutChange,
	onLayoutSave,
}) => {
	const [showViewsListModal, setShowViewsListModal] = useState(false);

	// Fetch layouts if gridId is provided
	const { data: layoutsData, isLoading: layoutsLoading } = useApiGet<{ gridLayout: Layout[] }>(
		["layouts", gridId || ""],
		gridId ? API_ENDPOINTS.GRID_LAYOUTS(gridId) : "",
		{
			enabled: !!gridId,
			staleTime: 2 * 60 * 1000, // 2 minutes
		}
	);

	const layouts = layoutsData?.gridLayout || [];
	const currentLayout = layouts.find(layout => layout.layout_id === currentLayoutId);

	const handleLayoutChange = async (layoutId: string) => {
		if (!layoutId) return;
		
		if (onLayoutChange) {
			// Call the layout change handler with the layout ID
			onLayoutChange({ layoutId });
		}
	};

	const handleSaveCurrentView = async () => {
		if (!currentLayoutId || !onLayoutSave) return;

		try {
			await onLayoutSave({ layoutId: currentLayoutId });
		} catch (error) {
			console.error("Error saving current view:", error);
		}
	};

	const displayName = currentLayout?.layout_name || currentLayoutName || "Default View";

	return (
		<>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					padding: "8px 16px",
					borderTop: "1px solid #e0e0e0",
					backgroundColor: "#f8f9fa",
					fontSize: "12px",
					color: "#666",
				}}
			>
				{/* Current View Display */}
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span>Current View:</span>
					<button
						onClick={() => setShowViewsListModal(true)}
						style={{
							background: "none",
							border: "none",
							color: "#3b82f6",
							cursor: "pointer",
							fontWeight: "bold",
							textDecoration: "underline",
							fontSize: "12px",
							padding: "0",
						}}
						disabled={layoutsLoading}
					>
						{displayName}
					</button>
					{currentLayout?.is_default && (
						<span style={{ fontSize: "10px", color: "#666" }}>(Default)</span>
					)}
				</div>

				{/* Save Button */}
				{currentLayoutId && (
					<button
						onClick={handleSaveCurrentView}
						style={{
							padding: "4px 8px",
							border: "1px solid #3b82f6",
							borderRadius: "4px",
							backgroundColor: "#3b82f6",
							color: "white",
							cursor: "pointer",
							fontSize: "11px",
						}}
					>
						💾 Save View
					</button>
				)}
			</div>

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
								backgroundColor: layout.layout_id === currentLayoutId ? "#e3f2fd" : "white",
							}}
							onMouseEnter={(e) => e.currentTarget.style.backgroundColor = layout.layout_id === currentLayoutId ? "#e3f2fd" : "#f5f5f5"}
							onMouseLeave={(e) => e.currentTarget.style.backgroundColor = layout.layout_id === currentLayoutId ? "#e3f2fd" : "white"}
						>
							<div style={{ fontWeight: layout.layout_id === currentLayoutId ? "bold" : "normal" }}>
								{layout.layout_name} {layout.is_default ? "(Default)" : ""}
							</div>
							{layout.layout_id === currentLayoutId && (
								<div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
									Current View
								</div>
							)}
						</div>
					))}
				</div>
			</Dialog>
		</>
	);
};

export default GridStatusBar; 