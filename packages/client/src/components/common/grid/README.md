# AG Grid Enterprise Components

A comprehensive collection of reusable grid components built with AG Grid Enterprise, designed for modern React applications with TypeScript support. This module provides a complete data grid solution with advanced features for data management, layout persistence, and user interaction.

## 🎯 Overview

This grid system provides a complete data grid solution with the following features:

### Core Features

- **Multi-draft row management** for batch operations
- **Real-time data synchronization** with API endpoints
- **Grid state persistence** for user preferences
- **Advanced filtering and sorting** capabilities
- **Error handling** with detailed user feedback
- **Responsive design** that works on all devices

### Advanced Features

- **Layout management** with user-specific saved layouts
- **Undo/Redo functionality** with history tracking
- **Visual change tracking** with row and cell styling
- **Custom toolbar** with CRUD operations
- **Sidebar panels** for columns, filters, and layouts
- **Status bar** with row counts and layout information

## 🏗️ Architecture

The grid system follows a **modular architecture** with clear separation of concerns:

### Core Components

| Component     | Purpose                     | Lines | Features                        |
| ------------- | --------------------------- | ----- | ------------------------------- |
| `BaseGrid`    | Main grid orchestrator      | ~432  | Complete grid with all features |
| `GridToolbar` | Action buttons and controls | ~108  | CRUD operations, undo/redo      |
| `ErrorDialog` | Error display and handling  | ~79   | User-friendly error messages    |
| `GridConfig`  | Grid configuration          | ~214  | Status bar, sidebar, defaults   |

### Custom Hooks

| Hook                       | Responsibility                   | Features                                                 |
| -------------------------- | -------------------------------- | -------------------------------------------------------- |
| `useRowManagement`         | Row operations & change tracking | Add, delete, duplicate, save, undo/redo, visual feedback |
| `useGridState`             | State management & persistence   | Data loading, grid API, state restoration                |
| `useUndoRedo`              | History management               | Undo/redo with Immer, history limits                     |
| `useErrorHandler`          | Error management                 | Error display, user feedback, error recovery             |
| `useDataFetcher`           | API communication                | Data fetching, caching, error handling                   |
| `useUnsavedChangesWarning` | Navigation warnings              | Browser warnings, refresh confirmations                  |
| `useLayoutManager`         | Layout operations                | Save/load layouts, layout changes                        |

### Layout Management

| Component           | Purpose               | Features                       |
| ------------------- | --------------------- | ------------------------------ |
| `LayoutsToolPanel`  | Layout management UI  | Create, delete, select layouts |
| `LayoutStatusPanel` | Layout status display | Current layout, save button    |
| `useLayoutManager`  | Layout operations     | Save, load, change layouts     |

### Utility Functions

| Module                      | Purpose                           |
| --------------------------- | --------------------------------- |
| `gridComponentRegistration` | AG Grid component registration    |
| `gridStateUtils`            | Grid state utilities and examples |

## 🚀 Quick Start

### Basic Usage

```tsx
import BaseGrid from "../common/grid/BaseGrid";
import type { ColDef } from "ag-grid-enterprise";

interface User {
	id: string;
	name: string;
	email: string;
	role: string;
}

const UserGrid = () => {
	const colDefs: ColDef<User>[] = [
		{ field: "name", headerName: "Name", editable: true },
		{ field: "email", headerName: "Email", editable: true },
		{ field: "role", headerName: "Role", editable: true },
	];

	return (
		<BaseGrid<User>
			gridId="users-grid"
			endpoint="/api/users"
			colDefs={colDefs}
			primaryKey="id"
		/>
	);
};
```

### Advanced Usage with Custom Configuration

```tsx
import BaseGrid from "../common/grid/BaseGrid";
import type { ColDef } from "ag-grid-enterprise";

interface Project {
	id: string;
	name: string;
	status: "active" | "completed" | "pending";
	budget: number;
	startDate: Date;
}

const ProjectGrid = () => {
	const colDefs: ColDef<Project>[] = [
		{ field: "name", headerName: "Project Name", editable: true },
		{
			field: "status",
			headerName: "Status",
			editable: true,
			cellEditor: "agSelectCellEditor",
			cellEditorParams: {
				values: ["active", "completed", "pending"],
			},
		},
		{
			field: "budget",
			headerName: "Budget",
			editable: true,
			valueFormatter: (params) => `$${params.value?.toLocaleString()}`,
		},
		{
			field: "startDate",
			headerName: "Start Date",
			editable: true,
			valueFormatter: (params) => params.value?.toLocaleDateString(),
		},
	];

	const defaultColDef: Partial<ColDef<Project>> = {
		sortable: true,
		filter: true,
		resizable: true,
	};

	return (
		<BaseGrid<Project>
			gridId="projects-grid"
			endpoint="/api/projects"
			colDefs={colDefs}
			defaultColDef={defaultColDef}
			primaryKey="id"
			sideBarEnabled={true}
		/>
	);
};
```

## 📁 File Structure

```
grid/
├── BaseGrid.tsx                    # Main grid component (orchestrator)
├── GridConfig.tsx                  # Grid configuration functions
├── ag-grid-theme.css              # AG Grid styles
├── components/                     # Reusable UI components
│   ├── ErrorDialog.tsx            # Error display component
│   ├── ErrorDetails.tsx           # Error details sub-component
│   ├── GridToolbar.tsx            # Toolbar component
│   └── GridToolbarButton.tsx      # Individual toolbar button
├── hooks/                         # Custom logic hooks
│   ├── useRowManagement.ts        # Row operations & change tracking
│   ├── useGridState.ts           # Grid state management
│   ├── useUndoRedo.ts            # Undo/redo functionality
│   ├── useErrorHandler.ts        # Error handling logic
│   ├── useDataFetcher.ts         # Data fetching logic
│   ├── useRowOperations.ts       # Row operations logic
│   ├── useChangeTracker.ts       # Change tracking logic
│   └── useUnsavedChangesWarning.ts # Navigation warnings
├── layouts/                       # Layout management
│   ├── LayoutsToolPanel.tsx      # Layout management UI
│   ├── LayoutStatusPanel.tsx     # Layout status display
│   ├── LayoutContext.tsx         # React context for layouts
│   ├── useLayoutManager.ts       # Layout operations hook
│   ├── types.ts                  # Layout type definitions
│   └── index.ts                  # Layout exports
├── utils/                         # Utility functions
│   ├── gridComponentRegistration.ts # AG Grid component registration
│   └── gridStateUtils.ts         # Grid state utilities
└── README.md                      # This documentation
```

## 🔧 Component API

### BaseGrid Props

| Prop             | Type                 | Required | Description                                  |
| ---------------- | -------------------- | -------- | -------------------------------------------- |
| `gridId`         | `string`             | Yes      | Unique identifier for grid state persistence |
| `endpoint`       | `string`             | No       | API endpoint for data operations             |
| `colDefs`        | `ColDef<T>[]`        | Yes      | Column definitions for the grid              |
| `defaultColDef`  | `Partial<ColDef<T>>` | No       | Default column configuration                 |
| `primaryKey`     | `string`             | Yes      | Primary key field for row identification     |
| `sideBarEnabled` | `boolean`            | No       | Enable grid sidebar (default: true)          |

### Grid Features

#### Row Management

- **Multi-draft support**: Create multiple draft rows simultaneously
- **Batch operations**: Save all changes at once
- **Change tracking**: Track unsaved changes with visual feedback
- **Undo/Redo**: Full history management with keyboard shortcuts

#### Visual Feedback

- **New rows**: Green background with left border
- **Modified rows**: Orange background with left border
- **Deleted rows**: Red background with opacity
- **Failed rows**: Red background for save errors

#### Layout Management

- **User-specific layouts**: Save and load custom grid configurations
- **Layout persistence**: Backend storage for layout data
- **Layout switching**: Quick switching between saved layouts
- **Default layouts**: Automatic default layout creation

#### State Persistence

- **Grid state**: Column order, width, visibility
- **Filter state**: Applied filters
- **Sort state**: Applied sorting
- **User preferences**: Per-user settings

#### Error Handling

- **Detailed error messages**: User-friendly error display
- **Error recovery**: Automatic retry mechanisms
- **Validation feedback**: Real-time validation errors
- **Error details**: Expandable error information

## 🎨 Customization

### Custom Cell Editors

```tsx
import CustomTextEditor from "./components/CustomTextEditor";

const colDefs: ColDef<User>[] = [
	{
		field: "name",
		headerName: "Name",
		editable: true,
		cellEditor: CustomTextEditor,
		cellEditorParams: {
			maxLength: 50,
			placeholder: "Enter name...",
		},
	},
];
```

### Custom Toolbar Actions

```tsx
import GridToolbar from "./components/GridToolbar";

const CustomToolbar = () => (
	<GridToolbar
		onAddRow={handleAddRow}
		onDeleteRows={handleDeleteRows}
		onRefresh={handleRefresh}
		onExport={handleExport}
		hasUnsavedChanges={hasUnsavedChanges}
		onUndo={undo}
		onRedo={redo}
		canUndo={canUndo}
		canRedo={canRedo}
	/>
);
```

### Custom Error Handling

```tsx
import ErrorDialog from "./components/ErrorDialog";

const CustomErrorDialog = () => (
	<ErrorDialog
		error={error}
		showDialog={showDialog}
		onClose={handleClose}
		onRetry={handleRetry}
	/>
);
```

## 🔄 Data Flow

### 1. Data Fetching

```
API Request → useDataFetcher → Grid State → UI Update
```

### 2. Row Management

```
User Action → useRowManagement → State Update → UI Refresh
```

### 3. Change Tracking

```
Cell Edit → markDirty → Tracking Sets → Visual Feedback
```

### 4. Save Operations

```
Save Request → Batch API Call → Server Response → State Update
```

### 5. Layout Management

```
Layout Change → useLayoutManager → Grid State → UI Update
```

## 🧪 Testing

### Component Testing

```tsx
import { render, screen } from "@testing-library/react";
import BaseGrid from "./BaseGrid";

describe("BaseGrid", () => {
	it("renders grid with data", () => {
		const colDefs = [{ field: "name", headerName: "Name" }];
		const data = [{ id: "1", name: "Test User" }];

		render(<BaseGrid gridId="test-grid" colDefs={colDefs} primaryKey="id" />);

		expect(screen.getByText("Test User")).toBeInTheDocument();
	});
});
```

### Hook Testing

```tsx
import { renderHook } from "@testing-library/react";
import { useGridState } from "./hooks/useGridState";

describe("useGridState", () => {
	it("manages grid state correctly", () => {
		const { result } = renderHook(() =>
			useGridState({ gridId: "test", fetchData: jest.fn() })
		);

		expect(result.current.rowData).toEqual([]);
		expect(result.current.isLoading).toBe(false);
	});
});
```

## 🚀 Performance Optimization

### 1. Memoization

- **Column definitions**: Memoize with `useMemo`
- **Grid configuration**: Cache configuration objects
- **Event handlers**: Use `useCallback` for handlers

### 2. Data Virtualization

- **Large datasets**: AG Grid handles virtualization automatically
- **Row rendering**: Only visible rows are rendered
- **Column rendering**: Only visible columns are rendered

### 3. State Management

- **Selective updates**: Only update changed data
- **Batch operations**: Group multiple operations
- **Debounced updates**: Prevent excessive re-renders

## 🔧 Configuration

### Grid Configuration

```tsx
import {
	createStatusBar,
	createSideBar,
	createRowSelection,
} from "./GridConfig";

const statusBar = createStatusBar();
const sideBar = createSideBar(true);
const rowSelection = createRowSelection();
```

### Column Configuration

```tsx
import { createDefaultColDef } from "./GridConfig";

const defaultColDef = createDefaultColDef({
	sortable: true,
	filter: true,
	resizable: true,
	editable: true,
});
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Grid Not Rendering

- Check if `colDefs` are properly defined
- Verify `primaryKey` is set correctly
- Ensure data is in the expected format

#### 2. Draft Rows Not Saving

- Verify API endpoint is correct
- Check network connectivity
- Review server-side validation

#### 3. State Not Persisting

- Check browser storage permissions
- Verify `gridId` is unique
- Review localStorage implementation

#### 4. Performance Issues

- Implement data virtualization for large datasets
- Use memoization for expensive calculations
- Optimize column definitions

### Debug Mode

Enable debug logging:

```tsx
const BaseGrid = <T,>({ debug = false, ...props }: BaseGridProps<T>) => {
	if (debug) {
		console.log("Grid props:", props);
		console.log("Grid state:", gridState);
	}
	// ... rest of component
};
```

## 📚 Examples

### Complete Example

```tsx
import React, { useMemo } from "react";
import BaseGrid from "../common/grid/BaseGrid";
import type { ColDef } from "ag-grid-enterprise";

interface Product {
	id: string;
	name: string;
	category: string;
	price: number;
	inStock: boolean;
}

const ProductGrid = () => {
	const colDefs = useMemo<ColDef<Product>[]>(
		() => [
			{ field: "name", headerName: "Product Name", editable: true },
			{ field: "category", headerName: "Category", editable: true },
			{
				field: "price",
				headerName: "Price",
				editable: true,
				valueFormatter: (params) => `$${params.value?.toFixed(2)}`,
			},
			{
				field: "inStock",
				headerName: "In Stock",
				editable: true,
				cellRenderer: "agCheckboxCellRenderer",
			},
		],
		[]
	);

	const defaultColDef = useMemo(
		() => ({
			sortable: true,
			filter: true,
			resizable: true,
		}),
		[]
	);

	return (
		<div className="h-full">
			<BaseGrid<Product>
				gridId="products-grid"
				endpoint="/api/products"
				colDefs={colDefs}
				defaultColDef={defaultColDef}
				primaryKey="id"
				sideBarEnabled={true}
			/>
		</div>
	);
};

export default ProductGrid;
```

## 🔄 Migration Guide

### From Previous Versions

1. **Update imports**: Use new modular structure
2. **Update props**: Follow new API design
3. **Test functionality**: Verify all features work
4. **Update documentation**: Review component usage

### Breaking Changes

- **Grid state API**: Updated persistence mechanism
- **Error handling**: New error dialog component
- **Draft row management**: Enhanced batch operations

## 🤝 Contributing

### Development Guidelines

1. **Follow TypeScript**: Use strict typing
2. **Write tests**: Add tests for new features
3. **Update docs**: Keep documentation current
4. **Follow patterns**: Use existing component patterns

### Adding New Features

1. **Create hook**: Add logic to appropriate hook
2. **Update component**: Modify component as needed
3. **Add tests**: Write comprehensive tests
4. **Update docs**: Document new functionality

---

**Built with AG Grid Enterprise and React 18**
