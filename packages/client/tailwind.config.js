/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			colors: {
				primary: "var(--primary)",
				secondary: "var(--secondary)",
				accent: "var(--accent)",
				background: "var(--background)",
				highlight: "var(--highlight)",
				"text-dark": "var(--text-dark)",
				"text-light": "var(--text-light)",
			},
			borderRadius: {
				theme: "var(--border-radius)",
			},
			fontFamily: {
				main: "var(--font-main)",
			},
		},
	},
	plugins: [],
};
