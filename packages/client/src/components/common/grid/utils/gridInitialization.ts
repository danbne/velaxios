import {
	ClientSideRowModelModule,
	ValidationModule,
	ModuleRegistry,
	CellSelectionModule,
	ClipboardModule,
	ColumnMenuModule,
	ContextMenuModule,
} from "ag-grid-enterprise";
import { GridStateModule } from "ag-grid-community";
import { registerGridComponents } from "./gridComponentRegistration";

/**
 * Initializes AG Grid with all required modules and components
 *
 * This function should be called once at application startup
 * to register all AG Grid modules and custom components.
 */
export function initializeAGGrid() {
	// Register AG Grid modules for enterprise features
	ModuleRegistry.registerModules([
		ClientSideRowModelModule,
		ClipboardModule,
		ColumnMenuModule,
		ContextMenuModule,
		CellSelectionModule,
		GridStateModule,
		...(process.env.NODE_ENV !== "production" ? [ValidationModule] : []),
	]);

	// Register custom components with AG Grid
	registerGridComponents();
}
