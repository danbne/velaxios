import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const AuthCallback: React.FC = () => {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const hasNavigated = useRef(false);

	useEffect(() => {
		const handleCallback = async () => {
			// Prevent multiple executions
			if (hasNavigated.current) {
				return;
			}

			const code = searchParams.get("code");
			const token = searchParams.get("token");
			const success = searchParams.get("success");
			const error = searchParams.get("error");

			console.log("AuthCallback: URL parameters:", {
				code: code ? "present" : "not present",
				token: token ? "present" : "not present",
				success,
				error,
			});

			if (error) {
				setError(`Authentication error: ${error}`);
				setLoading(false);
				return;
			}

			// If we have a token directly (from server redirect)
			if (token && success === "true") {
				console.log("AuthCallback: Received token from server redirect");
				localStorage.setItem("token", token);
				console.log("AuthCallback: Token stored, navigating immediately");

				// Dispatch custom event to notify App component
				window.dispatchEvent(new CustomEvent("tokenStored"));

				hasNavigated.current = true;
				navigate("/projects", { replace: true });
				return;
			}

			if (!code) {
				setError("No authorization code received");
				setLoading(false);
				return;
			}

			try {
				// Exchange the code for a token via your server
				const response = await fetch("http://localhost:5000/auth/callback", {
					method: "GET",
					headers: {
						"Content-Type": "application/json",
					},
				});

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(errorData.error || "Authentication failed");
				}

				const data = await response.json();

				if (data.success && data.token) {
					// Store the token
					localStorage.setItem("token", data.token);
					console.log(
						"AuthCallback: Token stored via API, navigating immediately"
					);

					// Dispatch custom event to notify App component
					window.dispatchEvent(new CustomEvent("tokenStored"));

					hasNavigated.current = true;
					navigate("/projects", { replace: true });
				} else {
					setError("Authentication failed: No token received");
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Authentication failed");
			} finally {
				setLoading(false);
			}
		};

		handleCallback();
	}, [searchParams, navigate]);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Completing authentication...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="text-red-600 mb-4">
						<h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
						<p>{error}</p>
					</div>
					<button
						onClick={() => navigate("/login")}
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
					>
						Back to Login
					</button>
				</div>
			</div>
		);
	}

	return null;
};

export default AuthCallback;
