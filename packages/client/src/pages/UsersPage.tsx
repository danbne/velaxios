import React from "react";
//import GridTemplate from "../components/common/grid-template/GridTemplate";
//import type { ColDef } from "ag-grid-enterprise";

const UsersPage: React.FC = () => {
	// const grid_id = "project-grid-template";
	// const primaryKey = "project_id";
	// const endpoint = "project";
	// const colDefs = useMemo<ColDef[]>(
	// 	() => [
	// 		{ field: "project_number", headerName: "Project Number", width: 100 },
	// 		{ field: "project_name", headerName: "Project Name", width: 100 },
	// 	],
	// 	[]
	// );

	return (
		<div>
			<div
				className="bg-white rounded-lg shadow p-6"
				style={{ height: "calc(100vh - 200px)" }}
			>
				{/* <GridTemplate
					grid_id={grid_id}
					primaryKey={primaryKey}
					endpoint={endpoint}
					colDefs={colDefs}
				/> */}
			</div>
		</div>
	);
};

export default UsersPage;
