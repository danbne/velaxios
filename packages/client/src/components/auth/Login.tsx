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

		console.log("Login: Using redirect URI:", redirectUri);
		console.log("Login: Using client ID:", clientId);

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
		<div className="flex items-center justify-center h-screen">
			<button
				onClick={handleMicrosoftLogin}
				className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
			>
				Login with Microsoft
			</button>
		</div>
	);
};

export default Login;
