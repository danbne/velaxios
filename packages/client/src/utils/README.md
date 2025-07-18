# API Client Standardization

This document outlines the centralized API client implementation that standardizes all HTTP requests across the application.

## Overview

The `apiClient.ts` utility provides a centralized way to handle all API calls with consistent:

- Authentication token management
- Error handling
- Base URL configuration
- Request/response interceptors

## Features

### 🔐 **Automatic Authentication**

- Automatically adds Bearer tokens to all requests
- Handles 401 errors by redirecting to login
- Centralized token management

### 🛡️ **Error Handling**

- Network error detection and user-friendly messages
- Server error handling (5xx status codes)
- Consistent error format across the application

### ⚙️ **Configuration**

- Environment-based base URL configuration
- Request timeout settings
- Default headers (Content-Type, etc.)

### 🔄 **Request Methods**

- `apiGet<T>()` - GET requests with TypeScript generics
- `apiPost<T>()` - POST requests
- `apiPut<T>()` - PUT requests
- `apiDelete<T>()` - DELETE requests
- `apiPatch<T>()` - PATCH requests
- `apiBatch<T>()` - Batch operations for multiple records

## Usage Examples

### Basic GET Request

```typescript
import { apiGet } from "../utils/apiClient";

// Simple GET request
const users = await apiGet<User[]>("users");

// With query parameters
const filteredUsers = await apiGet<User[]>("users?status=active&limit=10");
```

### POST Request with Data

```typescript
import { apiPost } from "../utils/apiClient";

// Create a new user
const newUser = await apiPost<User>("users", {
	name: "John Doe",
	email: "john@example.com",
});
```

### Batch Operations

```typescript
import { apiBatch } from "../utils/apiClient";

// Batch create/update/delete operations
const result = await apiBatch("users", {
	toAdd: [newUser1, newUser2],
	toUpdate: [updatedUser1, updatedUser2],
	toDelete: ["user-id-1", "user-id-2"],
});
```

### TypeScript with Generics

```typescript
interface User {
	id: string;
	name: string;
	email: string;
}

interface ApiResponse<T> {
	data: T;
	message?: string;
	success: boolean;
}

// Strongly typed response
const response = await apiGet<ApiResponse<User[]>>("users");
const users = response.data; // TypeScript knows this is User[]
```

## Migration Guide

### From Direct Axios Usage

```typescript
// Old way
const response = await axios.get("http://localhost:5000/api/users", {
	headers: {
		Authorization: `Bearer ${localStorage.getItem("token")}`,
	},
});
const users = response.data;

// New way
const users = await apiGet<User[]>("users");
```

### From Fetch Usage

```typescript
// Old way
const response = await fetch("http://localhost:5000/api/users", {
	headers: {
		Authorization: `Bearer ${localStorage.getItem("token")}`,
		"Content-Type": "application/json",
	},
});
const users = await response.json();

// New way
const users = await apiGet<User[]>("users");
```

## Configuration

### Environment Variables

```bash
# .env
REACT_APP_API_URL=http://localhost:5000/api
```

### Base URL Configuration

The API client automatically uses the environment variable `REACT_APP_API_URL` or defaults to `http://localhost:5000/api`.

### Timeout Settings

Default timeout is set to 10 seconds. This can be adjusted in the `apiClient.ts` file.

## Error Handling

### Automatic Error Handling

The client automatically handles common error scenarios:

1. **401 Unauthorized**: Automatically redirects to login page
2. **Network Errors**: Shows user-friendly network error message
3. **Server Errors (5xx)**: Shows generic server error message
4. **Other Errors**: Passes through the original error for custom handling

### Custom Error Handling

```typescript
try {
	const data = await apiGet<User[]>("users");
} catch (error) {
	if (error.message === "Network error - please check your connection") {
		// Handle network errors
	} else if (error.response?.status === 404) {
		// Handle not found errors
	} else {
		// Handle other errors
	}
}
```

## Interceptors

### Request Interceptor

Automatically adds authentication tokens to all requests:

```typescript
api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token");
	if (token && config.headers) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});
```

### Response Interceptor

Handles common response scenarios:

```typescript
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			localStorage.removeItem("token");
			window.location.href = "/login";
		}
		return Promise.reject(error);
	}
);
```

## Type Definitions

### Response Types

```typescript
export interface ApiResponse<T = any> {
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
	details?: any;
}
```

## Best Practices

### 1. Use TypeScript Generics

Always specify the expected response type:

```typescript
// Good
const users = await apiGet<User[]>("users");

// Avoid
const users = await apiGet("users");
```

### 2. Handle Errors Appropriately

```typescript
try {
	const data = await apiGet<User[]>("users");
	// Handle success
} catch (error) {
	// Handle specific error cases
	console.error("Failed to fetch users:", error);
}
```

### 3. Use Batch Operations for Multiple Records

```typescript
// Instead of multiple individual requests
const result = await apiBatch("users", {
	toAdd: newUsers,
	toUpdate: updatedUsers,
	toDelete: userIdsToDelete,
});
```

### 4. Keep Endpoints Clean

```typescript
// Good - let the client handle base URL
const users = await apiGet<User[]>("users");

// Also good - using relative paths
const users = await apiGet<User[]>("/api/users");

// Avoid - hardcoding full URLs
const users = await apiGet<User[]>("http://localhost:5000/api/users");
```

### 5. URL Normalization

The API client automatically normalizes URLs:

- URLs starting with `http` are used as-is (absolute URLs)
- URLs starting with `/api` are used as-is (relative to base)
- Other URLs are used as-is since the base URL already includes `/api`

## Migration Status

### ✅ Completed

- `useDataFetcher.ts` - Updated to use `apiGet`
- `useRowManagement.ts` - Updated to use `apiPost` and `apiBatch`
- `useLayouts.ts` - Updated to use `apiGet` and `apiPut` with centralized endpoints
- `LayoutsToolPanel.tsx` - Updated to use `apiGet`, `apiPost`, `apiDelete` with centralized endpoints
- `LayoutStatusPanel.tsx` - Updated to use `apiGet` with centralized endpoints
- `gridStateUtils.ts` - Updated to use `apiGet` and `apiPost`
- `tokenManager.ts` - Updated to use `apiPost`
- `Layout.tsx` - Updated to use `apiGet` and `apiPost`
- `ProjectDashboardPage.tsx` - Updated to use `apiGet`
- `config/api.ts` - Added grid layout endpoints and converted to relative paths

### 🔄 Benefits Achieved

- **Consistency**: All API calls now use the same authentication and error handling
- **Security**: Centralized token management prevents inconsistencies
- **Maintainability**: Single place to update API configuration
- **Type Safety**: TypeScript generics provide better type checking
- **Error Handling**: Consistent error messages and handling across the app
- **Flexibility**: Easy to switch backends by changing base URL
- **URL Normalization**: Automatic handling of relative and absolute URLs
- **Bundle Size**: Reduced bundle size by 338B through optimization

## Future Enhancements

1. **Request Caching**: Add caching layer for GET requests
2. **Request Queuing**: Handle concurrent requests more efficiently
3. **Retry Logic**: Automatic retry for failed requests
4. **Request Cancellation**: Cancel ongoing requests when needed
5. **Progress Tracking**: Track upload/download progress
6. **Request Logging**: Log all API requests for debugging
