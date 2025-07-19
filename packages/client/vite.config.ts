import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@client": path.resolve(__dirname, "./src"),
			"@components": path.resolve(__dirname, "./src/components"),
			"@utils": path.resolve(__dirname, "./src/utils"),
			"@pages": path.resolve(__dirname, "./src/pages"),
		},
	},
	server: {
		port: 3000,
	},
});
