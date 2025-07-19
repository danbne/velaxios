import { useEffect, useState, useCallback } from "react";
import {
	BrowserRouter as Router,
	Routes,
	Route,
	Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "@components/auth/Login";
import AuthCallback from "@components/auth/AuthCallback";
import ProjectGrid from "@components/project/ProjectGrid";
import { jwtDecode } from "jwt-decode";
import {
	initializeTokenManager,
	cleanupTokenManager,
} from "@utils/tokenManager";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface DecodedToken {
	userId: string;
	email: string;
	exp: number;
	iat?: number;
	iss?: string;
}

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes
			retry: 3,
			retryDelay: (attemptIndex: number) =>
				Math.min(1000 * 2 ** attemptIndex, 30000),
		},
	},
});

function App() {
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [loading, setLoading] = useState(true);

	const checkAuth = useCallback(() => {
		const token = localStorage.getItem("token");

		if (token) {
			try {
				const decoded: DecodedToken = jwtDecode(token);

				const isTokenValid = decoded.exp * 1000 > Date.now();

				if (isTokenValid) {
					setIsAuthenticated(true);
				} else {
					localStorage.removeItem("token");
					setIsAuthenticated(false);
				}
			} catch {
				localStorage.removeItem("token");
				setIsAuthenticated(false);
			}
		} else {
			setIsAuthenticated(false);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		// Initial auth check with small delay to allow for token storage
		const timer = setTimeout(() => {
			checkAuth();
		}, 50);

		// Listen for custom token stored event (same tab)
		const handleTokenStored = () => {
			checkAuth();
		};

		// Listen for localStorage changes (cross-tab)
		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === "token") {
				checkAuth();
			}
		};

		window.addEventListener("tokenStored", handleTokenStored);
		window.addEventListener("storage", handleStorageChange);

		return () => {
			clearTimeout(timer);
			window.removeEventListener("tokenStored", handleTokenStored);
			window.removeEventListener("storage", handleStorageChange);
		};
	}, [checkAuth]);

	// Initialize token refresh when authenticated
	useEffect(() => {
		if (isAuthenticated) {
			initializeTokenManager();
		} else {
			cleanupTokenManager();
		}

		return () => {
			cleanupTokenManager();
		};
	}, [isAuthenticated]);

	// Show a loading indicator while checking authentication
	if (loading) {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
				}}
			>
				<div className="loading-spinner"></div>
			</div>
		);
	}

	return (
		<QueryClientProvider client={queryClient}>
			<Router
				future={{
					v7_startTransition: true,
					v7_relativeSplatPath: true,
				}}
			>
				<ToastContainer position="top-right" autoClose={2000} />
				<Routes>
					<Route path="/login" element={<Login />} />
					<Route path="/auth/callback" element={<AuthCallback />} />
					<Route
						path="/"
						element={
							isAuthenticated ? (
								<Navigate to="/projects" replace />
							) : (
								<Navigate to="/login" replace />
							)
						}
					/>
					<Route
						path="/projects"
						element={
							isAuthenticated ? (
								<div style={{ height: "100vh", padding: "20px" }}>
									<ProjectGrid />
								</div>
							) : (
								<Navigate to="/login" replace />
							)
						}
					/>
					<Route path="*" element={<Navigate to="/login" replace />} />
				</Routes>
			</Router>
		</QueryClientProvider>
	);
}

export default App;
