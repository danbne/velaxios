import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiGet } from "../utils/apiClient";
import { API_ENDPOINTS } from "../config/api";

interface Project {
	project_id: string;
	project_number: string;
	project_name: string;
}

const ProjectDashboardPage: React.FC = () => {
	const { projectId } = useParams<{ projectId: string }>();
	const [project, setProject] = useState<Project | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!projectId) return;
		setLoading(true);
		apiGet<Project>(API_ENDPOINTS.PROJECT(projectId))
			.then((res) => {
				setProject(res);
				setError(null);
			})
			.catch(() => {
				setError("Project not found");
				setProject(null);
			})
			.finally(() => setLoading(false));
	}, [projectId]);

	if (loading) return <div className="p-8">Loading project...</div>;
	if (error) return <div className="p-8 text-red-500">{error}</div>;
	if (!project) return null;

	return (
		<div className="p-8">
			<h1 className="text-3xl font-bold mb-4">
				Project: {project.project_number} — {project.project_name}
			</h1>
			<p className="text-gray-600">Project ID: {project.project_id}</p>
			{/* Add more project summary/info here if desired */}
		</div>
	);
};

export default ProjectDashboardPage;
