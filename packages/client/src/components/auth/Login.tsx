import React from "react";
//import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
	//const navigate = useNavigate();

	const handleMicrosoftLogin = () => {
		// Get Microsoft OAuth configuration from environment variables
		const clientId =
			import.meta.env.VITE_MICROSOFT_CLIENT_ID ||
			"fa93519a-af72-44a5-9d4b-6dce95da7c5f";
		const redirectUri =
			import.meta.env.VITE_MICROSOFT_REDIRECT_URI ||
			"http://localhost:5000/auth/callback";

		// Redirect directly to Microsoft OAuth
		window.location.href =
			"https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" +
			`client_id=${clientId}` +
			"&response_type=code" +
			`&redirect_uri=${encodeURIComponent(redirectUri)}` +
			"&scope=user.read" +
			"&response_mode=query";
	};

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				height: "100vh",
				backgroundColor: "var(--bg-secondary)",
			}}
		>
			<button
				onClick={handleMicrosoftLogin}
				style={{
					backgroundColor: "#0078d4",
					color: "var(--text-light)",
					padding: "var(--spacing-sm) var(--spacing-lg)",
					borderRadius: "var(--radius-md)",
					border: "none",
					fontSize: "var(--font-size-base)",
					fontWeight: "500",
					cursor: "pointer",
					transition: "background-color var(--transition-normal)",
				}}
				onMouseOver={e => {
					e.currentTarget.style.backgroundColor = "#106ebe";
				}}
				onMouseOut={e => {
					e.currentTarget.style.backgroundColor = "#0078d4";
				}}
			>
				Login with Microsoft
			</button>
		</div>
	);
};

export default Login;
