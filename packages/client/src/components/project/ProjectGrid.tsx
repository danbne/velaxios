"use client";

import { useMemo } from "react";
import { API_ENDPOINTS } from "../../config/api";
import { createDateColumn } from "../../utils/dateFormatters";
import BaseGrid, { type ColDef } from "../common/grid/BaseGrid";

interface Project {
	project_id: string;
	project_number: string;
	project_name: string;
	created_at: Date;
	updated_at: Date;
	// Add other project fields as needed
}

const ProjectGrid = () => {
	const colDefs = useMemo<ColDef[]>(
		() => [
			{
				field: "project_number",
				headerName: "Project Number",
				sortable: true,
				filter: true,
				editable: true,
				floatingFilter: true,
			},
			{
				field: "project_name",
				headerName: "Project Name",
				sortable: true,
				filter: true,
				editable: true,
				floatingFilter: true,
			},
			// Use utility function to create date columns with proper formatting
			createDateColumn("created_at", "Created At"),
			createDateColumn("updated_at", "Updated At"),
		],
		[]
	);

	return (
		<div style={{ height: "100%", width: "100%" }}>
			<BaseGrid<Project>
				gridId="project-grid"
				endpoint={API_ENDPOINTS.PROJECTS}
				colDefs={colDefs}
				primaryKey="project_id"
			/>
		</div>
	);
};

export default ProjectGrid;
