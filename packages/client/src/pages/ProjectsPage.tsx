import React from "react";
import ProjectGrid from "../components/project/ProjectGrid";
//import ProjectGrid from "../components/common/grid/utils/undoTest";
const ProjectsPage: React.FC = () => {
	return (
		<div className="h-full flex flex-col">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-gray-900">Projects</h1>
				<p className="text-gray-600 mt-2">
					Manage your projects and track their progress.
				</p>
			</div>

			<div
				className="bg-white rounded-lg shadow flex-1 flex flex-col"
				// style={{ minHeight: "200px" }}
			>
				{/* <div className="p-4 border-b">
					<button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
						New Project
					</button>
				</div> */}
				<div className="flex-1 p-4" style={{ minHeight: "200px" }}>
					{/* <div className="flex-1 p-4" style={{ minHeight: "200px" }}> */}
					<ProjectGrid />
				</div>
			</div>
		</div>
	);
};

export default ProjectsPage;
