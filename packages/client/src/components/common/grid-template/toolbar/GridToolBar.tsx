import React from "react";
import GridToolBarButton from "./GridToolBarButton";

interface GridToolBarProps {
	onAddRows?: () => void;
	onDeleteRows?: () => void;
	onSave?: () => void;
	onRefresh?: () => void;
	isAddRowsDisabled?: boolean;
	isDeleteRowsDisabled?: boolean;
	isSaveDisabled?: boolean;
	isRefreshDisabled?: boolean;
}

/**
 * GridToolbar - Toolbar component for grid operations
 *
 * This component provides a toolbar with action buttons for grid operations.
 * It includes buttons for adding rows, deleting rows, saving, and refreshing.
 * The toolbar is aligned to the top right and uses consistent styling.
 *
 * Features:
 * - Add rows button
 * - Delete rows button
 * - Save button
 * - Refresh button
 * - Top right alignment
 * - Consistent button styling
 * - TypeScript support
 *
 * @param onAddRows - Callback for add rows action
 * @param onDeleteRows - Callback for delete rows action
 * @param onSave - Callback for save action
 * @param onRefresh - Callback for refresh action
 * @param className - Additional CSS classes
 * @returns JSX element representing the toolbar
 */
const GridToolbar: React.FC<GridToolBarProps> = ({
	onAddRows,
	isAddRowsDisabled = false,
	onDeleteRows,
	isDeleteRowsDisabled = false,
	onSave,
	isSaveDisabled = false,
	onRefresh,
	isRefreshDisabled = false,
}) => {
	return (
		<div
			className={`flex justify-end items-center gap-1 p-1 px-4 bg-gray-50 border-b border-gray-200 h-8 w-full`}
		>
			<GridToolBarButton
				icon="PlusIcon"
				onClick={onAddRows}
				disabled={isAddRowsDisabled}
			></GridToolBarButton>
			<GridToolBarButton
				icon="TrashIcon"
				onClick={onDeleteRows}
				disabled={isDeleteRowsDisabled}
			></GridToolBarButton>
			<GridToolBarButton
				icon="CheckIcon"
				onClick={onSave}
				disabled={isSaveDisabled}
			></GridToolBarButton>
			<GridToolBarButton
				icon="ArrowPathIcon"
				onClick={onRefresh}
				disabled={isRefreshDisabled}
			></GridToolBarButton>
		</div>
	);
};

export default GridToolbar;
