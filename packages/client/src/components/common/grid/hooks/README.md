# Grid Hooks

This directory contains hooks that provide functionality for the grid system, including API client hooks, row management, and action handlers.

## Overview

The grid hooks provide:

- **API Client Integration**: Consistent patterns for API calls with React Query
- **Row Management**: Optimized row operations with undo/redo support
- **Action Handlers**: Centralized grid action logic
- **Error Handling**: Normalized error messages and authentication redirects
- **Type Safety**: Full TypeScript support with generic types

## Overview

The shared API client hooks consolidate common API patterns and provide:

- **React Query Integration**: Automatic caching, background updates, and retry logic
- **Consistent Error Handling**: Normalized error messages and authentication redirects
- **Type Safety**: Full TypeScript support with generic types
- **Optimistic Updates**: Support for optimistic UI updates with rollback
- **Query Invalidation**: Automatic cache invalidation for related queries

## Available Hooks

### `useGridActions<T>`

Centralizes all grid action handlers for consistent behavior across grid instances.

```typescript
const {
	handleAddRow,
	handleAddMultipleRows,
	handleDeleteRows,
	handleDuplicateRow,
	handleRefresh,
	handleSave,
} = useGridActions({
	addNewRow,
	setRowData,
	deleteSelectedRows,
	duplicateSelectedRow,
	saveChanges,
	clearChanges,
	fetchData,
	showError,
	setIsLoading,
	gridApi,
});
```

**Features:**

- Row operations (add, delete, duplicate)
- Data operations (save, refresh)
- Error handling and loading states
- Memoized callbacks for performance

### `useGridConfiguration<T>`

Manages grid configuration and UI settings.

```typescript
const gridConfig = useGridConfiguration({
	sideBarEnabled,
	gridId,
	handleLayoutChange,
	handleLayoutSave,
	defaultColDef,
});
```

**Features:**

- Memoized grid configuration for performance
- Centralized UI settings management
- Clean interface for grid components

### `useNavigationWarning<T>`

Handles navigation warnings for unsaved changes.

```typescript
const { handleRefreshWithWarning } = useNavigationWarning({
	hasUnsavedChanges,
	clearChanges,
	handleRefresh,
});
```

**Features:**

- Unsaved changes protection
- Navigation warning dialogs
- Refresh with confirmation

### `useOptimizedRowManagement<T>`

Provides optimized row management with AG Grid's native features.

```typescript
const {
	hasUnsavedChanges,
	addNewRow,
	saveChanges,
	clearChanges,
	undo,
	redo,
	canUndo,
	canRedo,
} = useOptimizedRowManagement({
	endpoint,
	showError,
	primaryKey,
	onSaveSuccess,
	rowData,
	setRowData,
	colDefs,
	gridApi,
});
```

**Features:**

- Native undo/redo for cell editing and row operations
- Delta row data mode for automatic change tracking
- Transaction-based row operations
- Visual feedback through row class rules

### `useApiGet<T>`

For GET requests with caching and automatic retries.

```typescript
const { data, error, isLoading, refetch } = useApiGet<MyDataType>(
	["my-data", id], // Query key
	"/api/my-endpoint", // Endpoint
	{
		enabled: true, // Optional: control when query runs
		staleTime: 5 * 60 * 1000, // Optional: how long data stays fresh
		retry: 3, // Optional: retry attempts
	}
);
```

### `useApiPost<T>`

For POST mutations with optimistic updates and cache invalidation.

```typescript
const createMutation = useApiPost<MyResponseType>({
	invalidateQueries: ["my-data"], // Queries to invalidate on success
	onSuccess: (data) => {
		// Handle success
	},
	onError: (error) => {
		// Handle error
	},
});

// Usage
await createMutation.mutateAsync({
	endpoint: "/api/create",
	data: { name: "New Item" },
});
```

### `useApiPut<T>`

For PUT mutations with optimistic updates.

```typescript
const updateMutation = useApiPut<MyResponseType>({
	invalidateQueries: ["my-data"],
});

await updateMutation.mutateAsync({
	endpoint: "/api/update/123",
	data: { name: "Updated Item" },
});
```

### `useApiDelete<T>`

For DELETE mutations with cache invalidation.

```typescript
const deleteMutation = useApiDelete<MyResponseType>({
	invalidateQueries: ["my-data"],
});

await deleteMutation.mutateAsync({
	endpoint: "/api/delete/123",
});
```

### `useApiPatch<T>`

For PATCH mutations with optimistic updates.

```typescript
const patchMutation = useApiPatch<MyResponseType>({
	invalidateQueries: ["my-data"],
});

await patchMutation.mutateAsync({
	endpoint: "/api/patch/123",
	data: { status: "active" },
});
```

## Migration Guide

### From Direct API Calls

**Before:**

```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);

const fetchData = async () => {
	try {
		setLoading(true);
		const response = await apiGet("/api/data");
		setData(response.data);
	} catch (error) {
		console.error("Error:", error);
		if (error.response?.status === 401) {
			localStorage.removeItem("token");
			window.location.href = "/login";
		}
	} finally {
		setLoading(false);
	}
};
```

**After:**

```typescript
const { data, error, isLoading, refetch } = useApiGet<MyDataType>(
	["data"],
	"/api/data"
);
```

### From Manual State Management

**Before:**

```typescript
const [layouts, setLayouts] = useState([]);
const [isLoading, setIsLoading] = useState(false);

const fetchLayouts = async () => {
	try {
		setIsLoading(true);
		const response = await apiGet("/api/layouts");
		setLayouts(response.gridLayout);
	} catch (error) {
		// Error handling
	} finally {
		setIsLoading(false);
	}
};
```

**After:**

```typescript
const {
	data: layoutsData,
	error,
	isLoading,
} = useApiGet<any>(["layouts", gridId], API_ENDPOINTS.GRID_LAYOUTS(gridId), {
	onSuccess: (data) => {
		// Handle success
	},
	onError: (error) => {
		// Handle error
	},
});

const layouts = layoutsData?.gridLayout || [];
```

## Benefits

1. **Reduced Code Duplication**: ~100 lines of repeated try-catch blocks eliminated
2. **Automatic Caching**: React Query handles caching, background updates, and stale data management
3. **Consistent Error Handling**: Centralized error normalization and authentication redirects
4. **Better UX**: Loading states, error states, and optimistic updates handled automatically
5. **Type Safety**: Full TypeScript support with proper type inference
6. **Performance**: Automatic request deduplication and background refetching

## Configuration

The hooks use default configuration that can be customized:

- **Stale Time**: 5 minutes (data considered fresh)
- **Cache Time**: 10 minutes (how long to keep unused data)
- **Retry**: 3 attempts with exponential backoff
- **Authentication**: Automatic token handling and 401 redirects

## Error Handling

All hooks provide consistent error handling:

- **401 Unauthorized**: Automatic redirect to login page
- **Network Errors**: User-friendly error messages
- **Server Errors**: Appropriate error messages with retry options
- **Normalized Errors**: Consistent error object structure

## Cache Management

The hooks integrate with React Query's cache management:

- **Automatic Invalidation**: Related queries are invalidated on mutations
- **Background Updates**: Data is refreshed in the background
- **Optimistic Updates**: UI updates immediately with rollback on error
- **Query Keys**: Structured query keys for efficient cache management
