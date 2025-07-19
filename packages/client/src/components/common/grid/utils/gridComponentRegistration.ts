import LayoutsToolPanel from "../layouts/LayoutsToolPanel";
import LayoutStatusPanel from "../layouts/LayoutStatusPanel";

interface CustomWindow extends Window {
	agLayoutsToolPanel?: typeof LayoutsToolPanel;
	agLayoutStatusPanel?: typeof LayoutStatusPanel;
}

/**
 * Registers custom AG Grid components globally
 *
 * This function registers our custom React components with AG Grid's
 * component system by attaching them to the global window object.
 * This allows AG Grid to find and instantiate our custom components
 * when they are referenced in the grid configuration.
 *
 * The registration happens only on the client side (browser environment)
 * to avoid SSR-related issues. This is necessary because AG Grid
 * looks for components on the global window object during initialization.
 *
 * Components registered:
 * - agLayoutsToolPanel: Custom tool panel for layout management
 * - agLayoutStatusPanel: Custom status panel showing current layout
 */
export const registerGridComponents = () => {
	if (typeof window !== "undefined") {
		const customWindow = window as CustomWindow;
		// Register custom tool panel for layout management
		customWindow.agLayoutsToolPanel = LayoutsToolPanel;
		// Register custom status panel for layout information
		customWindow.agLayoutStatusPanel = LayoutStatusPanel;
	}
};

/**
 * Returns the custom components object for AG Grid
 *
 * This function provides the components object that can be passed
 * directly to the AgGridReact component's `components` prop.
 * It maps component names to their React component implementations.
 *
 * This approach ensures that AG Grid can properly instantiate and
 * manage our custom components within the grid's component system.
 * The components object is used by AG Grid to resolve component
 * references in the grid configuration.
 *
 * @returns Object mapping component names to React components
 */
export const getGridComponents = () => ({
	agLayoutsToolPanel: LayoutsToolPanel,
	agLayoutStatusPanel: LayoutStatusPanel,
});
