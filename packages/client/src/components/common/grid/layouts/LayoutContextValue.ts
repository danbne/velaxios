import { createContext } from "react";
import type { LayoutContextValue } from "./types";

/**
 * React context for sharing layout management state across components
 */
export const LayoutContext = createContext<LayoutContextValue | null>(null);
