import { useContext } from "react";
import { LayoutContext } from "./LayoutContextValue";
import type { LayoutContextValue } from "./types";

/**
 * Custom hook for accessing layout context
 *
 * This hook provides a convenient way to access the layout context
 * from any component within the LayoutProvider tree. It includes
 * proper error handling for when the hook is used outside of a provider.
 *
 * @returns The layout context value
 * @throws Error if used outside of LayoutProvider
 */
export const useLayoutContext = (): LayoutContextValue => {
	const context = useContext(LayoutContext);

	if (!context) {
		throw new Error("useLayoutContext must be used within a LayoutProvider");
	}

	return context;
};
