import { useCallback, useEffect } from "react";
import { useApiGet } from "./useApiClient";

export const useDataFetcher = <T>(endpoint: string) => {
	// Remove the base URL from the endpoint if it's already included
	const cleanEndpoint = endpoint.replace(/^https?:\/\/[^/]+/, "");

	// Use the new API client hook
	const { data, error, isLoading, refetch } = useApiGet<any>(
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
				const resultData = result.data;
				const resultItems =
					(endpointName && resultData?.[endpointName]) || resultData || [];
				return resultItems as T[];
			} catch (error) {
				throw error;
			}
		};
	}, [refetch, endpointName]);

	return {
		data: items as T[],
		error,
		isLoading,
		refetch,
		createFetchData,
	};
};
