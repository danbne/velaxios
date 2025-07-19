import { useMemo } from "react";
import { createGridConfiguration } from "../GridConfig";
import type { ColDef } from "../BaseGrid";

interface LayoutData {
	[key: string]: unknown;
}

interface LayoutSaveParams {
	layoutData: LayoutData;
	layoutName?: string;
}

/**
 * Props interface for the useGridConfiguration hook
 */
interface UseGridConfigurationProps {
	/** Whether to show the sidebar with columns, filters, and layouts panels */
	sideBarEnabled: boolean;
	/** Unique identifier for the grid instance */
	gridId: string;
	/** Function to handle layout changes */
	handleLayoutChange: (layout: LayoutData) => void;
	/** Function to handle layout saves */
	handleLayoutSave: (params: LayoutSaveParams) => Promise<void>;
	/** Default column configuration */
	defaultColDef?: ColDef;
}

/**
 * Hook that manages grid configuration and UI settings
 *
 * This hook centralizes all grid configuration logic and provides
 * a clean interface for grid UI components.
 */
export const useGridConfiguration = ({
	sideBarEnabled,
	gridId,
	handleLayoutChange,
	handleLayoutSave,
	defaultColDef,
}: UseGridConfigurationProps) => {
	// Memoize the grid config to stabilize references and prevent unnecessary re-renders
	const gridConfig = useMemo(
		() =>
			createGridConfiguration({
				sideBarEnabled,
				gridId,
				handleLayoutChange,
				handleLayoutSave,
				defaultColDef,
			}),
		[
			sideBarEnabled,
			gridId,
			handleLayoutChange,
			handleLayoutSave,
			defaultColDef,
		]
	);

	return gridConfig;
};
