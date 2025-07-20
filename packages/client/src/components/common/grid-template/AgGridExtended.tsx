import { useState } from "react";
import GridToolBar from "./toolbar/GridToolBar";
import type { ColDef } from "ag-grid-community";
import { Grid } from "./grid/Grid";

interface AgGridExtendedProps {
	endpoint: string;
	primaryKey: string;
	colDefs: ColDef[];
}

export const AgGridExtended = ({
	endpoint,
	primaryKey,
	colDefs,
}: AgGridExtendedProps) => {
	const [isAddRowsDisabled, setIsAddRowsDisabled] = useState(true);
	const [isDeleteRowsDisabled, setIsDeleteRowsDisabled] = useState(false);
	const [isSaveDisabled, setIsSaveDisabled] = useState(false);
	const [isRefreshDisabled, setIsRefreshDisabled] = useState(false);

	const onAddRows = () => {
		console.log("onAddRows");
	};

	const onDeleteRows = () => {
		console.log("onDeleteRows");
	};

	const onSave = () => {
		console.log("onSave");
	};

	const onRefresh = () => {
		console.log("onRefresh");
	};

	return (
		<div className="h-full w-full flex flex-col" style={{ height: "100vh" }}>
			<GridToolBar
				onAddRows={onAddRows}
				onDeleteRows={onDeleteRows}
				onSave={onSave}
				onRefresh={onRefresh}
				isAddRowsDisabled={isAddRowsDisabled}
				isDeleteRowsDisabled={isDeleteRowsDisabled}
				isSaveDisabled={isSaveDisabled}
				isRefreshDisabled={isRefreshDisabled}
			/>
			<div className="flex-1 min-h-0" style={{ height: "calc(100vh - 32px)" }}>
				<Grid endpoint={endpoint} primaryKey={primaryKey} colDefs={colDefs} />
			</div>
		</div>
	);
};
