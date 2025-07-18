import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
	FolderIcon,
	UsersIcon,
	ChartBarIcon,
	Cog6ToothIcon,
	CubeIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
	collapsed: boolean;
}

interface NavItem {
	name: string;
	path: string;
	icon: React.ComponentType<{ className?: string }>;
	projectSpecific?: boolean;
}

const navItems: NavItem[] = [
	{ name: "Projects", path: "/projects", icon: FolderIcon },
	{ name: "Assets", path: "assets", icon: CubeIcon, projectSpecific: true },
	// Add more project-specific links here if needed
	{ name: "Users", path: "/users", icon: UsersIcon },
	{ name: "Analytics", path: "/analytics", icon: ChartBarIcon },
	{ name: "Settings", path: "/settings", icon: Cog6ToothIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
	const location = useLocation();

	// Extract projectId from the URL if present
	const match = location.pathname.match(/^\/projects\/([^/]+)/);
	const projectId = match ? match[1] : null;

	return (
		<aside
			className={`bg-sidebar shadow-lg transition-all duration-300 ${
				collapsed ? "w-16" : "w-64"
			}`}
		>
			<nav className="p-4">
				<ul className="space-y-2">
					{navItems.map((item) => {
						if (item.projectSpecific && !projectId) return null;
						const Icon = item.icon;
						const to = item.projectSpecific
							? `/projects/${projectId}/${item.path}`
							: item.path;

						return (
							<li key={item.name}>
								<NavLink
									to={to}
									className={({ isActive }) =>
										[
											"nav-link",
											isActive ? "nav-link-active" : "",
											collapsed ? "justify-center" : "",
										].join(" ")
									}
								>
									<Icon className="w-4 h-4 flex-shrink-0" />
									{!collapsed && (
										<span className="ml-3 font-medium">{item.name}</span>
									)}
								</NavLink>
							</li>
						);
					})}
				</ul>
			</nav>
		</aside>
	);
};

export default Sidebar;
