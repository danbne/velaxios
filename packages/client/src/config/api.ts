// API Configuration
// This file centralizes all API endpoint configuration

// Get the current hostname and protocol
const getCurrentHost = () => {
	return (
		import.meta.env.VITE_API_HOST || window.location.hostname || "localhost"
	);
};

// Get the backend port
const getBackendPort = () => {
	return import.meta.env.VITE_BACKEND_PORT || "5000";
};

// Construct the base API URL
export const API_BASE_URL = `http://${getCurrentHost()}:${getBackendPort()}/api`;

// API endpoints
export const API_ENDPOINTS = {
	// Authentication
	AUTH_REFRESH: "auth/refresh",

	// Grid state
	GRID_STATE: (gridId: string) => `grid-state/${gridId}`,

	// Grid layouts
	GRID_LAYOUTS: (gridId: string) => `grid-layouts/${gridId}`,
	GRID_LAYOUT: (gridId: string, layoutId: string) =>
		`grid-layouts/${gridId}/${layoutId}`,
	GRID_LAYOUT_DEFAULT: (gridId: string) =>
		`grid-layouts/${gridId}/default/ensure`,

	// Projects
	PROJECTS: "project",
	PROJECT: (projectId: string) => `project/${projectId}`,

	// Users
	USERS: "users",

	// User Roles
	USER_ROLES: "user-role",
	USER_ROLE: (userId: string, roleId: string) =>
		`user-role/${userId}/${roleId}`,

	// Assets
	ASSETS: (projectId: string) => `asset/project/${projectId}`,
	ASSET: (assetId: string) => `asset/${assetId}`,
	CREATE_ASSET: (projectId: string) => `asset/project/${projectId}`,

	// Asset Levels
	ASSET_LEVELS: (projectId: string) => `asset-level/project/${projectId}`,
	ASSET_LEVEL: (levelId: string) => `asset-level/level/${levelId}`,

	// Asset Photos
	ASSET_PHOTOS: (assetId: string) => `asset-photo/asset/${assetId}`,
	ASSET_PHOTO: (assetId: string, photoId: string) =>
		`asset-photo/asset/${assetId}/photo/${photoId}`,

	// Asset Components
	ASSET_COMPONENTS: (assetId: string) => `asset-component/asset/${assetId}`,
	ASSET_COMPONENT: (assetId: string, componentId: string) =>
		`asset-component/asset/${assetId}/component/${componentId}`,
};
