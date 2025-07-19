import type { ColDef } from "./BaseGrid";

interface LayoutData {
	[key: string]: unknown;
}

interface LayoutSaveParams {
	layoutData: LayoutData;
	layoutName?: string;
}

/**
 * Creates the status bar configuration for the grid
 *
 * The status bar displays various information panels at the bottom of the grid:
 * - Total row count: Shows the total number of rows in the dataset
 * - Filtered row count: Shows the number of rows after applying filters
 * - Selected row count: Shows the number of currently selected rows
 * - Aggregation component: Displays aggregated values for selected cells
 * - Layout status panel: Custom panel showing current layout and save button
 *
 * @param gridId - Unique identifier for the grid instance
 * @param onLayoutSave - Callback function for saving the current layout
 * @returns Status bar configuration object for AG Grid
 */
export const createStatusBar = (
	gridId?: string,
	onLayoutSave?: (params: LayoutSaveParams) => Promise<void>
) => {
	return {
		statusPanels: [
			//{ statusPanel: "agTotalAndFilteredRowCountComponent" },
			{ statusPanel: "agTotalRowCountComponent" },
			{ statusPanel: "agFilteredRowCountComponent" },
			{ statusPanel: "agSelectedRowCountComponent" },
			{
				statusPanel: "agAggregationComponent",
				statusPanelParams: {
					//aggFuncs: ["avg"],
				},
			},
			{
				statusPanel: "agLayoutStatusPanel",
				align: "left",
				statusPanelParams: {
					gridId,
					onLayoutSave,
				},
			},
		],
	};
};

/**
 * Creates the sidebar configuration for the grid
 *
 * The sidebar contains tool panels that provide additional functionality:
 * - Columns panel: Allows users to show/hide columns and reorder them
 * - Filters panel: Provides advanced filtering capabilities
 * - Layouts panel: Custom panel for managing user-specific grid layouts
 *
 * Each panel has specific width constraints and functionality.
 * The sidebar is positioned on the right side of the grid by default.
 *
 * @param sideBarEnabled - Whether the sidebar should be displayed
 * @param gridId - Unique identifier for the grid instance
 * @param onLayoutChange - Callback function for when layout changes
 * @param onLayoutSave - Callback function for saving layouts
 * @returns Sidebar configuration object for AG Grid, or null if disabled
 */
export const createSideBar = (
	sideBarEnabled: boolean,
	gridId?: string,
	onLayoutChange?: (layoutData: LayoutData) => void,
	onLayoutSave?: (params: LayoutSaveParams) => Promise<void>
) => {
	if (sideBarEnabled) {
		return {
			toolPanels: [
				{
					id: "columns",
					labelDefault: "Columns",
					labelKey: "columns",
					iconKey: "columns",
					toolPanel: "agColumnsToolPanel",
					minWidth: 225,
					maxWidth: 225,
					width: 225,
				},
				{
					id: "filters",
					labelDefault: "Filters",
					labelKey: "filters",
					iconKey: "filter",
					toolPanel: "agNewFiltersToolPanel",
					minWidth: 180,
					maxWidth: 400,
					width: 250,
				},
				{
					id: "layouts",
					labelDefault: "Layouts",
					labelKey: "layouts",
					iconKey: "menu",
					toolPanel: "agLayoutsToolPanel",
					minWidth: 250,
					maxWidth: 300,
					width: 250,
					toolPanelParams: {
						gridId,
						onLayoutChange,
						onLayoutSave,
					},
				},
			],
			position: "right" as const,
			defaultToolPanel: "columns",
		};
	}
	return null;
};

/**
 * Creates the row selection configuration for the grid
 *
 * Currently configured for multi-row selection mode, allowing users
 * to select multiple rows simultaneously using Ctrl/Cmd+click or
 * Shift+click for range selection.
 *
 * @returns Row selection configuration object for AG Grid
 */
export const createRowSelection = () => {
	return {
		mode: "multiRow" as const,
	};
};

/**
 * Creates default column definitions for the grid
 *
 * This function merges the provided defaultColDef with system defaults
 * to ensure consistent behavior across all columns. The default configuration
 * includes:
 * - Filtering enabled on all columns
 * - Floating filters enabled for quick filtering
 * - Cell editing enabled for copy-paste operations
 *
 * @template T - The type of data objects displayed in the grid
 * @param defaultColDef - Optional custom default column configuration
 * @returns Merged default column definition object
 */
export const createDefaultColDef = <T,>(defaultColDef?: Partial<ColDef<T>>) => {
	return {
		filter: true, // default enabling filtering
		floatingFilter: true, // default enabling floating filters
		editable: true, // enable editing for copy-paste
		...defaultColDef,
	};
};

/**
 * Creates a complete grid configuration object
 *
 * This function consolidates all grid configuration options into a single
 * object, replacing the need for the useGridConfiguration hook. It handles:
 * - Status bar configuration with layout information
 * - Sidebar configuration with tool panels
 * - Row selection behavior
 * - Default column definitions
 *
 * @param sideBarEnabled - Whether the sidebar should be displayed
 * @param gridId - Unique identifier for the grid instance
 * @param handleLayoutChange - Function to handle layout changes
 * @param handleLayoutSave - Function to handle layout saves
 * @param defaultColDef - Default column configuration
 * @returns Complete grid configuration object
 */
export const createGridConfiguration = <T,>({
	sideBarEnabled,
	gridId,
	handleLayoutChange,
	handleLayoutSave,
	defaultColDef,
}: {
	sideBarEnabled: boolean;
	gridId: string;
	handleLayoutChange: (layoutData: LayoutData) => void;
	handleLayoutSave: (params: LayoutSaveParams) => Promise<void>;
	defaultColDef?: Partial<ColDef<T>>;
}) => {
	return {
		statusBar: createStatusBar(gridId, handleLayoutSave),
		sideBar: createSideBar(
			sideBarEnabled,
			gridId,
			handleLayoutChange,
			handleLayoutSave
		),
		rowSelection: createRowSelection(),
		defaultColDefInternal: createDefaultColDef(defaultColDef),
	};
};
