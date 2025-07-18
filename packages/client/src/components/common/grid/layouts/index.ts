/**
 * Layout Management Module
 *
 * This module provides a complete layout management system for AG Grid components.
 * It includes hooks, components, and utilities for managing grid layouts in a
 * general-purpose, reusable manner.
 */

// Core layout management hook
export { useLayoutManager } from "./useLayoutManager";

// React context for sharing layout state
export { LayoutProvider } from "./LayoutContext";
export { useLayoutContext } from "./useLayoutContext";

// Layout components
export { default as LayoutsToolPanel } from "./LayoutsToolPanel";
export { default as LayoutStatusPanel } from "./LayoutStatusPanel";

// Types and interfaces
export type {
	Layout,
	LayoutWithData,
	UseLayoutManagerProps,
	LayoutChangeCallback,
	LayoutSaveCallback,
	LayoutsToolPanelProps,
	LayoutStatusPanelProps,
	LayoutContextValue,
} from "./types";
