import { useState, useEffect } from "react";

/**
 * Options interface for the useDataFetcher hook
 *
 * This interface defines the configuration options for data fetching
 */
interface UseDataFetcherOptions {
	/** The API endpoint to fetch data from (e.g., "project", "users") */
	endpoint: string;
}

/**
 * Custom hook for fetching data from API endpoints with authentication
 *
 * This hook provides a complete data fetching solution with:
 * - Automatic authentication using bearer token from localStorage
 * - Loading state management
 * - Error handling and state management
 * - Response parsing with endpoint key extraction
 * - Automatic re-fetching when endpoint changes
 *
 * @param options - Configuration options for data fetching
 * @returns Object containing data, loading state, and error information
 */
export const useDataFetcher = ({ endpoint }: UseDataFetcherOptions) => {
	/**
	 * State for storing the fetched data
	 * Initialized as an empty array to prevent undefined errors
	 */
	const [data, setData] = useState<any[]>([]);

	/**
	 * State for tracking the loading status
	 * Used to show loading indicators in the UI
	 */
	const [loading, setLoading] = useState(false);

	/**
	 * State for storing any error messages
	 * Used to display error information to the user
	 */
	const [error, setError] = useState<string | null>(null);

	/**
	 * Effect hook that runs whenever the endpoint changes
	 * This ensures data is re-fetched when switching between different endpoints
	 */
	useEffect(() => {
		/**
		 * Async function to fetch data from the API
		 * Handles the complete data fetching lifecycle
		 */
		const fetchData = async () => {
			try {
				// Set loading state to true to indicate data fetching is in progress
				setLoading(true);
				// Clear any previous errors when starting a new fetch
				setError(null);

				/**
				 * Get the authentication token from localStorage
				 * This token is set during user login and used for API authentication
				 */
				const token = localStorage.getItem("token");

				/**
				 * Make the API request with authentication headers
				 * The URL is constructed using the localhost:5000 base URL and the provided endpoint
				 */
				const response = await fetch(`http://localhost:5000/api/${endpoint}`, {
					headers: {
						// Include bearer token for authentication
						Authorization: `Bearer ${token}`,
						// Specify content type for JSON requests
						"Content-Type": "application/json",
					},
				});

				/**
				 * Check if the response is successful (status code 200-299)
				 * If not, throw an error with the status code
				 */
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				/**
				 * Parse the JSON response from the server
				 * This contains the actual data we need to display
				 */
				const result = await response.json();
				console.log("Result", result);

				/**
				 * Extract the endpoint key from the URL to get the correct data property
				 * For example, if endpoint is "project", we look for result.project
				 * If endpoint is "users", we look for result.users
				 */
				const endpointKey = endpoint.split("/").pop() || endpoint;

				/**
				 * Get the list data from the response
				 * Try to get data using the endpoint key first, fall back to the entire result
				 * This handles different API response structures
				 */
				const listData = result[endpointKey] || result;

				/**
				 * Set the data state with the fetched data
				 * Ensure it's always an array to prevent rendering errors
				 */
				setData(Array.isArray(listData) ? listData : []);
			} catch (error) {
				/**
				 * Handle any errors that occur during data fetching
				 * Log the error for debugging and set error state for UI display
				 */
				console.error("Error fetching data:", error);
				setError(error instanceof Error ? error.message : "Unknown error");
				// Set empty array to prevent undefined errors in the grid
				setData([]);
			} finally {
				/**
				 * Always set loading to false when the fetch operation completes
				 * This ensures loading indicators are properly hidden
				 */
				setLoading(false);
			}
		};

		/**
		 * Execute the data fetching function
		 * This will run immediately when the effect is triggered
		 */
		fetchData();
	}, [endpoint]); // Dependency array ensures effect runs when endpoint changes

	/**
	 * Return the data, loading state, and error information
	 * This allows consuming components to handle different states appropriately
	 */
	return { data, loading, error };
};
