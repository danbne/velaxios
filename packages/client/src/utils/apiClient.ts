import axios from "axios";
import type {
	AxiosInstance,
	AxiosRequestConfig,
	AxiosResponse,
	InternalAxiosRequestConfig,
} from "axios";

// API Configuration
import { API_BASE_URL } from "../config/api";

// Response type definitions
export interface ApiResponse<T> {
	data: T;
	message?: string;
	success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
	total: number;
	page: number;
	limit: number;
}

export interface ErrorResponse {
	message: string;
	error?: string;
	status?: number;
	details?: unknown;
}

// Create axios instance with default configuration
const api: AxiosInstance = axios.create({
	baseURL: API_BASE_URL,
	timeout: 10000,
	headers: {
		"Content-Type": "application/json",
	},
});

/**
 * Request interceptor to add authentication token
 */
api.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const token = localStorage.getItem("token");
		if (token && config.headers) {
			config.headers.Authorization = `Bearer ${token}`;
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

/**
 * Response interceptor to handle common error scenarios
 */
api.interceptors.response.use(
	(response: AxiosResponse) => {
		return response;
	},
	(error) => {
		// Handle authentication errors
		if (error.response?.status === 401) {
			localStorage.removeItem("token");
			window.location.href = "/login";
			return Promise.reject(new Error("Authentication failed"));
		}

		// Handle network errors
		if (!error.response) {
			return Promise.reject(
				new Error("Network error - please check your connection")
			);
		}

		// Handle server errors
		if (error.response?.status >= 500) {
			return Promise.reject(new Error("Server error - please try again later"));
		}

		// Return the original error for other cases
		return Promise.reject(error);
	}
);

/**
 * Helper function to normalize API URLs
 */
const normalizeUrl = (url: string): string => {
	// If URL already starts with http, return as is
	if (url.startsWith("http")) {
		return url;
	}

	// If URL starts with /api, return as is (relative to base)
	if (url.startsWith("/api")) {
		return url;
	}

	// Otherwise, just return the URL as-is since base URL already includes /api
	return url.startsWith("/") ? url : `/${url}`;
};

/**
 * Generic GET request
 */
export const apiGet = async <T>(
	url: string,
	config?: AxiosRequestConfig
): Promise<T> => {
	const normalizedUrl = normalizeUrl(url);
	const response = await api.get<T>(normalizedUrl, config);
	return response.data;
};

/**
 * Generic POST request
 */
export const apiPost = async <T>(
	url: string,
	data?: unknown,
	config?: AxiosRequestConfig
): Promise<T> => {
	const normalizedUrl = normalizeUrl(url);
	const response = await api.post<T>(normalizedUrl, data, config);
	return response.data;
};

/**
 * Generic PUT request
 */
export const apiPut = async <T>(
	url: string,
	data?: unknown,
	config?: AxiosRequestConfig
): Promise<T> => {
	const normalizedUrl = normalizeUrl(url);
	const response = await api.put<T>(normalizedUrl, data, config);
	return response.data;
};

/**
 * Generic DELETE request
 */
export const apiDelete = async <T>(
	url: string,
	config?: AxiosRequestConfig
): Promise<T> => {
	const normalizedUrl = normalizeUrl(url);
	const response = await api.delete<T>(normalizedUrl, config);
	return response.data;
};

/**
 * Generic PATCH request
 */
export const apiPatch = async <T>(
	url: string,
	data?: unknown,
	config?: AxiosRequestConfig
): Promise<T> => {
	const normalizedUrl = normalizeUrl(url);
	const response = await api.patch<T>(normalizedUrl, data, config);
	return response.data;
};

/**
 * Batch request for multiple operations
 */
export const apiBatch = async <T>(
	url: string,
	batchData: {
		toAdd?: unknown[];
		toUpdate?: unknown[];
		toDelete?: string[];
	},
	config?: AxiosRequestConfig
): Promise<T> => {
	const normalizedUrl = normalizeUrl(url);
	const response = await api.post<T>(
		`${normalizedUrl}/batch`,
		batchData,
		config
	);
	return response.data;
};

// Export the axios instance for advanced usage
export { api };

// Export types for use in other modules
export type { AxiosRequestConfig, AxiosResponse };
