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
				backgroundColor: "#f5f5f5",
			}}
		>
			<button
				onClick={handleMicrosoftLogin}
				style={{
					backgroundColor: "#0078d4",
					color: "white",
					padding: "12px 24px",
					borderRadius: "6px",
					border: "none",
					fontSize: "16px",
					fontWeight: "500",
					cursor: "pointer",
					transition: "background-color 0.2s",
				}}
				onMouseOver={(e) => {
					e.currentTarget.style.backgroundColor = "#106ebe";
				}}
				onMouseOut={(e) => {
					e.currentTarget.style.backgroundColor = "#0078d4";
				}}
			>
				Login with Microsoft
			</button>
		</div>
	);
};

export default Login;
