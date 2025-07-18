import { useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "@utils/apiClient";
import type { AxiosRequestConfig } from "axios";

// Types for the hook
export interface ApiClientOptions<T> {
	enabled?: boolean;
	staleTime?: number;
	cacheTime?: number;
	retry?: number | boolean;
	retryDelay?: number;
	onSuccess?: (data: T) => void;
	onError?: (error: unknown) => void;
	onSettled?: (data: T | undefined, error: unknown) => void;
}

export interface MutationOptions<T> extends ApiClientOptions<T> {
	onMutate?: (variables: unknown) => void;
	onMutateError?: (
		error: unknown,
		variables: unknown,
		context: unknown
	) => void;
}

export interface ApiClientConfig {
	baseUrl?: string;
	defaultOptions?: ApiClientOptions<unknown>;
}

/**
 * Enhanced error handler that normalizes errors and handles auth redirects
 */
const handleError = (error: unknown) => {
	console.error("API Error:", error);

	// Type guard for axios errors
	const axiosError = error as {
		response?: { status?: number; data?: unknown };
		message?: string;
	};

	// Handle authentication errors
	if (axiosError.response?.status === 401) {
		localStorage.removeItem("token");
		window.location.href = "/login";
		return;
	}

	// Normalize error messages
	const errorMessage =
		(axiosError.response?.data as { message?: string })?.message ||
		axiosError.message ||
		"An unexpected error occurred";

	return {
		message: errorMessage,
		status: axiosError.response?.status,
		details: axiosError.response?.data,
	};
};

/**
 * Shared API client hook that provides:
 * - React Query integration for caching and background updates
 * - Consistent error handling and authentication redirects
 * - Optimistic updates for mutations
 * - Automatic retry logic
 * - Type-safe API calls
 */
export const useApiClient = (config?: ApiClientConfig) => {
	const queryClient = useQueryClient();

	const defaultOptions = useMemo(
		() => ({
			staleTime: 5 * 60 * 1000, // 5 minutes
			cacheTime: 10 * 60 * 1000, // 10 minutes
			retry: 3,
			retryDelay: (attemptIndex: number) =>
				Math.min(1000 * 2 ** attemptIndex, 30000),
			...config?.defaultOptions,
		}),
		[config?.defaultOptions]
	);

	/**
	 * Utility function to invalidate queries
	 */
	const invalidateQueries = useCallback(
		(queryKeys: string[]) => {
			queryKeys.forEach((queryKey) => {
				queryClient.invalidateQueries({ queryKey: [queryKey] });
			});
		},
		[queryClient]
	);

	/**
	 * Utility function to set query data directly
	 */
	const setQueryData = useCallback(
		<T>(queryKey: string, data: T) => {
			queryClient.setQueryData([queryKey], data);
		},
		[queryClient]
	);

	return {
		defaultOptions,
		invalidateQueries,
		setQueryData,
		queryClient,
	};
};

/**
 * GET request with React Query caching
 */
export const useApiGet = <T>(
	key: string | string[],
	endpoint: string,
	options?: ApiClientOptions<T> & { requestConfig?: AxiosRequestConfig }
) => {
	const queryKey = Array.isArray(key) ? key : [key];

	return useQuery({
		queryKey,
		queryFn: async (): Promise<T> => {
			try {
				const data = await apiGet<T>(endpoint, options?.requestConfig);
				return data;
			} catch (error) {
				const normalizedError = handleError(error);
				throw normalizedError;
			}
		},
		enabled: options?.enabled ?? true,
		staleTime: options?.staleTime ?? 5 * 60 * 1000,
		gcTime: options?.cacheTime ?? 10 * 60 * 1000,
		retry: options?.retry ?? 3,
		retryDelay:
			options?.retryDelay ??
			((attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000)),
	});
};

/**
 * POST mutation with optimistic updates
 */
export const useApiPost = <T>(
	options?: MutationOptions<T> & {
		invalidateQueries?: string[];
		optimisticUpdate?: (variables: unknown) => unknown;
	}
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			endpoint,
			data,
			requestConfig,
		}: {
			endpoint: string;
			data?: unknown;
			requestConfig?: AxiosRequestConfig;
		}): Promise<T> => {
			try {
				const response = await apiPost<T>(endpoint, data, requestConfig);
				return response;
			} catch (error) {
				const normalizedError = handleError(error);
				throw normalizedError;
			}
		},
		onMutate: options?.onMutate,
		onSuccess: (data, _variables) => {
			// Invalidate related queries
			if (options?.invalidateQueries) {
				options.invalidateQueries.forEach((queryKey) => {
					queryClient.invalidateQueries({ queryKey: [queryKey] });
				});
			}
			options?.onSuccess?.(data);
		},
		onError: (error, _variables, context) => {
			// Rollback optimistic updates if needed
			if (context) {
				queryClient.setQueryData(
					[options?.invalidateQueries?.[0] || "data"],
					context
				);
			}
			options?.onError?.(error);
		},
		onSettled: options?.onSettled,
	});
};

/**
 * PUT mutation with optimistic updates
 */
export const useApiPut = <T>(
	options?: MutationOptions<T> & {
		invalidateQueries?: string[];
		optimisticUpdate?: (variables: unknown) => unknown;
	}
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			endpoint,
			data,
			requestConfig,
		}: {
			endpoint: string;
			data?: unknown;
			requestConfig?: AxiosRequestConfig;
		}): Promise<T> => {
			try {
				const response = await apiPut<T>(endpoint, data, requestConfig);
				return response;
			} catch (error) {
				const normalizedError = handleError(error);
				throw normalizedError;
			}
		},
		onMutate: options?.onMutate,
		onSuccess: (data, _variables) => {
			// Invalidate related queries
			if (options?.invalidateQueries) {
				options.invalidateQueries.forEach((queryKey) => {
					queryClient.invalidateQueries({ queryKey: [queryKey] });
				});
			}
			options?.onSuccess?.(data);
		},
		onError: (error, variables, context) => {
			// Rollback optimistic updates if needed
			if (context) {
				queryClient.setQueryData(
					[options?.invalidateQueries?.[0] || "data"],
					context
				);
			}
			options?.onError?.(error);
		},
		onSettled: options?.onSettled,
	});
};

/**
 * DELETE mutation with optimistic updates
 */
export const useApiDelete = <T>(
	options?: MutationOptions<T> & {
		invalidateQueries?: string[];
		optimisticUpdate?: (variables: unknown) => unknown;
	}
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			endpoint,
			requestConfig,
		}: {
			endpoint: string;
			requestConfig?: AxiosRequestConfig;
		}): Promise<T> => {
			try {
				const response = await apiDelete<T>(endpoint, requestConfig);
				return response;
			} catch (error) {
				const normalizedError = handleError(error);
				throw normalizedError;
			}
		},
		onMutate: options?.onMutate,
		onSuccess: (data, _variables) => {
			// Invalidate related queries
			if (options?.invalidateQueries) {
				options.invalidateQueries.forEach((queryKey) => {
					queryClient.invalidateQueries({ queryKey: [queryKey] });
				});
			}
			options?.onSuccess?.(data);
		},
		onError: (error, _variables, context) => {
			// Rollback optimistic updates if needed
			if (context) {
				queryClient.setQueryData(
					[options?.invalidateQueries?.[0] || "data"],
					context
				);
			}
			options?.onError?.(error);
		},
		onSettled: options?.onSettled,
	});
};

/**
 * PATCH mutation with optimistic updates
 */
export const useApiPatch = <T>(
	options?: MutationOptions<T> & {
		invalidateQueries?: string[];
		optimisticUpdate?: (variables: unknown) => unknown;
	}
) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			endpoint,
			data,
			requestConfig,
		}: {
			endpoint: string;
			data?: unknown;
			requestConfig?: AxiosRequestConfig;
		}): Promise<T> => {
			try {
				const response = await apiPatch<T>(endpoint, data, requestConfig);
				return response;
			} catch (error) {
				const normalizedError = handleError(error);
				throw normalizedError;
			}
		},
		onMutate: options?.onMutate,
		onSuccess: (data, _variables) => {
			// Invalidate related queries
			if (options?.invalidateQueries) {
				options.invalidateQueries.forEach((queryKey: string) => {
					queryClient.invalidateQueries({ queryKey: [queryKey] });
				});
			}
			options?.onSuccess?.(data);
		},
		onError: (error, _variables, context) => {
			// Rollback optimistic updates if needed
			if (context) {
				queryClient.setQueryData(
					[options?.invalidateQueries?.[0] || "data"],
					context
				);
			}
			options?.onError?.(error);
		},
		onSettled: options?.onSettled,
	});
};
