/**
 * Layout Management Types
 *
 * This file contains all shared types and interfaces for the layout management module.
 * These types define the structure for grid layouts, including their data, metadata,
 * and the interfaces used by layout management components and hooks.
 */

/**
 * Interface representing a grid layout stored in the database
 *
 * This interface defines the structure of a layout as stored in the backend,
 * including metadata about the layout and its relationship to the grid.
 */
export interface Layout {
	/** Unique identifier for the layout */
	layout_id: string;
	/** User-friendly name for the layout */
	layout_name: string;
	/** Whether this is the default layout for the grid */
	is_default: boolean;
	/** When the layout was created */
	created_at: string;
	/** When the layout was last updated */
	updated_at: string;
}

/**
 * Interface representing a layout with its data for internal use
 *
 * This interface extends the base Layout interface to include the actual
 * grid state data that defines how the grid should be configured.
 * The layout_data contains AG Grid state information like column order,
 * filters, sorting, and other grid configuration.
 */
export interface LayoutWithData extends Layout {
	/** The actual grid state data for this layout */
	layout_data: unknown;
}

/**
 * Interface for layout management hook props
 */
export interface UseLayoutManagerProps {
	/** Unique identifier for the grid instance */
	gridId: string;
	/** AG Grid API instance for state manipulation */
	gridApi: unknown;
}

/**
 * Interface for layout change callback
 */
export interface LayoutChangeCallback {
	/** The layout ID to load and apply to the grid */
	layoutId: string;
}

/**
 * Interface for layout save callback
 */
export interface LayoutSaveCallback {
	/** The ID of the layout to save the current state to */
	layoutId: string;
}

/**
 * Interface for layout tool panel props
 */
export interface LayoutsToolPanelProps {
	/** Unique identifier for the grid instance */
	gridId: string;
	/** Callback function when a layout is selected/changed */
	onLayoutChange: (layoutData: unknown) => void;
	/** Callback function when a layout is saved */
	onLayoutSave: (layoutData: unknown) => void;
}

/**
 * Interface for layout status panel props
 */
export interface LayoutStatusPanelProps {
	/** Unique identifier for the grid instance */
	gridId: string;
	/** Callback function when the layout save button is clicked */
	onLayoutSave: (layoutData: unknown) => void;
}

/**
 * Interface for layout context value
 */
export interface LayoutContextValue {
	/** Current active layout */
	currentLayout: LayoutWithData | null;
	/** Loading state */
	isLoading: boolean;
	/** Load a specific layout */
	loadLayout: (layoutId: string) => Promise<LayoutWithData>;
	/** Save current grid state to a layout */
	saveLayout: (layoutId: string) => Promise<boolean>;
	/** Ensure default layout exists and load it */
	ensureDefaultLayout: () => Promise<LayoutWithData>;
	/** Handle layout change by applying to grid */
	handleLayoutChange: (layoutData: unknown) => void;
	/** Handle layout save operation */
	handleLayoutSave: (params: LayoutSaveCallback) => Promise<void>;
}
