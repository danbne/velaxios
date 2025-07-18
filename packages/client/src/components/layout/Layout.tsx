import React, { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import {
	ArrowRightOnRectangleIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "@heroicons/react/24/outline";
import Sidebar from "./Sidebar";
import { apiGet, apiPost } from "../../utils/apiClient";
import { API_ENDPOINTS } from "../../config/api";

const Layout: React.FC = () => {
	const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
		// First check sessionStorage (this tab's state)
		const sessionSaved = sessionStorage.getItem("sidebarCollapsed");
		if (sessionSaved !== null) {
			return JSON.parse(sessionSaved);
		}

		// If no sessionStorage, inherit from localStorage (other tabs' state)
		const localSaved = localStorage.getItem("sidebarCollapsed");
		if (localSaved !== null) {
			const inheritedState = JSON.parse(localSaved);
			// Save to sessionStorage for this tab
			sessionStorage.setItem(
				"sidebarCollapsed",
				JSON.stringify(inheritedState)
			);
			return inheritedState;
		}

		// Default to expanded
		return false;
	});
	const navigate = useNavigate();
	const location = useLocation();

	// Extract projectId from the URL if present
	const match = location.pathname.match(/^\/projects\/([^/]+)/);
	const projectId = match ? match[1] : null;
	const [projectInfo, setProjectInfo] = useState<{
		project_number: string;
		project_name: string;
	} | null>(null);

	useEffect(() => {
		if (projectId) {
			apiGet(API_ENDPOINTS.PROJECT(projectId))
				.then((res) => {
					const projectData = res as {
						project_number: string;
						project_name: string;
					};
					setProjectInfo({
						project_number: projectData.project_number,
						project_name: projectData.project_name,
					});
				})
				.catch(() => setProjectInfo(null));
		} else {
			setProjectInfo(null);
		}
	}, [projectId]);

	const handleSignOut = async () => {
		try {
			// Call server to blacklist the token
			await apiPost("auth/logout", {});
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			// Remove token from localStorage
			localStorage.removeItem("token");
			// Navigate to login page
			navigate("/login");
		}
	};

	const handleToggle = () => {
		const newState = !sidebarCollapsed;
		setSidebarCollapsed(newState);
		// Save to sessionStorage for this tab
		sessionStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
		// Also save to localStorage for new tabs to inherit
		localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
	};

	return (
		<div className="flex flex-col h-screen bg-page">
			<header className="header">
				<div className="flex justify-between items-center">
					<div className="flex items-center space-x-4">
						<h1 className="text-2xl font-bold text-gray-900">Velaxios</h1>
						{projectInfo && (
							<span className="text-lg font-semibold text-blue-700">
								Project: {projectInfo.project_number} —{" "}
								{projectInfo.project_name}
							</span>
						)}
					</div>
					<button onClick={handleSignOut} className="btn btn-accent">
						<ArrowRightOnRectangleIcon className="w-5 h-5 mr-2" />
						<span>Sign Out</span>
					</button>
				</div>
			</header>

			<div className="flex flex-1 overflow-hidden">
				<Sidebar collapsed={sidebarCollapsed} />

				<div className="relative">
					<button
						onClick={handleToggle}
						className="sidebar-toggle absolute -left-2 top-1/2 transform -translate-y-1/2 z-10"
					>
						{sidebarCollapsed ? (
							<ChevronRightIcon className="w-3 h-3 text-gray-600" />
						) : (
							<ChevronLeftIcon className="w-3 h-3 text-gray-600" />
						)}
					</button>
				</div>

				<main className="flex-1 overflow-auto">
					<div className="p-6 h-full bg-grid rounded-theme">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
};

export default Layout;
