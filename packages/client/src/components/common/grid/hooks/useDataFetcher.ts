import { useCallback } from "react";
import { useApiGet } from "./useApiClient";

interface ApiResponse<T> {
	[key: string]: T[] | T;
}

export const useDataFetcher = <T>(endpoint: string) => {
	// Remove the base URL from the endpoint if it's already included
	const cleanEndpoint = endpoint.replace(/^https?:\/\/[^/]+/, "");

	// Use the new API client hook
	const { data, error, isLoading, refetch } = useApiGet<ApiResponse<T>>(
		["data", cleanEndpoint],
		cleanEndpoint,
		{
			enabled: true, // Always enabled since endpoint is required
		}
	);

	// Extract endpoint name from the URL to use as the data key
	const endpointName = cleanEndpoint.split("/").pop()?.split("?")[0];

	// Handle different response structures
	// Try the endpoint name first, then common patterns, then fallback to data itself
	const items = (endpointName && data?.[endpointName]) || data || [];

	// Create a fetch function that returns a Promise - memoized to prevent infinite loops
	const createFetchData = useCallback(() => {
		return async (): Promise<T[]> => {
			try {
				const result = await refetch();
				const resultData = result.data as ApiResponse<T>;
				const resultItems =
					(endpointName && resultData?.[endpointName]) || resultData || [];
				return Array.isArray(resultItems) ? resultItems : [];
			} catch (error) {
				throw error;
			}
		};
	}, [refetch, endpointName]);

	return {
		data: Array.isArray(items) ? items : [],
		error,
		isLoading,
		refetch,
		createFetchData,
	};
};
