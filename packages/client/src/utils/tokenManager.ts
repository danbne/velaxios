import { apiPost } from "./apiClient";
import { API_ENDPOINTS } from "../config/api";
import { toast } from "react-toastify"; // Install react-toastify for notifications

// Token refresh interval (45 minutes - refresh before 1 hour expiry)
const REFRESH_INTERVAL = 45 * 60 * 1000;
// Activity timeout (5 minutes of inactivity before considering user inactive)
const ACTIVITY_TIMEOUT = 5 * 60 * 1000;

let refreshTimer: NodeJS.Timeout | null = null;
let activityTimer: NodeJS.Timeout | null = null;
let lastActivityTime: number = Date.now();

/**
 * Refresh the user's token
 */
export const refreshToken = async (): Promise<boolean> => {
	try {
		const token = localStorage.getItem("token");
		if (!token) return false;

		// Note: This endpoint might need special handling since it doesn't use the standard auth interceptor
		const response = await apiPost(API_ENDPOINTS.AUTH_REFRESH, {});

		localStorage.setItem("token", response.token);
		return true;
	} catch (error) {
		toast.error("Session expired. Please log in again.");
		setTimeout(() => {
			localStorage.removeItem("token");
			window.location.href = "/login";
		}, 2000);
		return false;
	}
};

/**
 * Record user activity
 */
export const recordActivity = (): void => {
	lastActivityTime = Date.now();
};

/**
 * Check if user is active
 */
const isUserActive = (): boolean => {
	return Date.now() - lastActivityTime < ACTIVITY_TIMEOUT;
};

/**
 * Start automatic token refresh
 */
export const startTokenRefresh = (): void => {
	// Clear any existing timer
	if (refreshTimer) {
		clearInterval(refreshTimer);
	}

	// Set up periodic token refresh
	refreshTimer = setInterval(async () => {
		// Only refresh if user is active
		if (isUserActive()) {
			await refreshToken();
		}
	}, REFRESH_INTERVAL);

	// Set up activity monitoring
	if (activityTimer) {
		clearInterval(activityTimer);
	}

	activityTimer = setInterval(() => {
		recordActivity();
	}, 60000); // Record activity every minute

	// Set up activity event listeners
	const activityEvents = [
		"mousedown",
		"mousemove",
		"keypress",
		"scroll",
		"touchstart",
		"click",
	];
	activityEvents.forEach((event) => {
		document.addEventListener(event, recordActivity, true);
	});
};

/**
 * Stop automatic token refresh
 */
export const stopTokenRefresh = (): void => {
	if (refreshTimer) {
		clearInterval(refreshTimer);
		refreshTimer = null;
	}

	if (activityTimer) {
		clearInterval(activityTimer);
		activityTimer = null;
	}

	// Remove activity event listeners
	const activityEvents = [
		"mousedown",
		"mousemove",
		"keypress",
		"scroll",
		"touchstart",
		"click",
	];
	activityEvents.forEach((event) => {
		document.removeEventListener(event, recordActivity, true);
	});
};

/**
 * Initialize token management
 */
export const initializeTokenManager = (): void => {
	// Start refresh timer if user is logged in
	const token = localStorage.getItem("token");
	if (token) {
		startTokenRefresh();
	}
};

/**
 * Clean up token management
 */
export const cleanupTokenManager = (): void => {
	stopTokenRefresh();
};
