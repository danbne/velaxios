import React from "react";
import type { ReactNode } from "react";
import type { LayoutContextValue } from "./types";
import { LayoutContext } from "./LayoutContextValue";

/**
 * Props interface for the LayoutProvider component
 */
interface LayoutProviderProps {
	/** The layout context value to provide */
	value: LayoutContextValue;
	/** Child components that will have access to the layout context */
	children: ReactNode;
}

/**
 * LayoutProvider - React context provider for layout management
 *
 * This component provides layout management state and functions to all
 * child components through React's context system. This allows components
 * to access layout functionality without prop drilling.
 *
 * @param value - The layout context value containing state and functions
 * @param children - Child components that will have access to the context
 * @returns JSX element wrapping children with layout context
 */
export const LayoutProvider: React.FC<LayoutProviderProps> = ({
	value,
	children,
}) => {
	return (
		<LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
	);
};
