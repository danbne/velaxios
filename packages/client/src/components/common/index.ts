/**
 * Common Components Module
 *
 * This module exports reusable UI components that use the centralized theme system.
 * All components are designed to be consistent, accessible, and maintainable.
 */

// Core components
export { default as Button } from "./Button";
export {
	default as Dialog,
	DialogHeader,
	DialogContent,
	DialogFooter,
} from "./Dialog";

// Theme system
export { default as theme } from "@styles/theme.css";
