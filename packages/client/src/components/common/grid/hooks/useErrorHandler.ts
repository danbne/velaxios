import { useState, useCallback } from "react";

export const useErrorHandler = () => {
	const [errorPopup, setErrorPopup] = useState<
		| string
		| {
				message: string;
				details?: Record<string, any>;
		  }
		| null
	>(null);
	const [showDialog, setShowDialog] = useState(false);
	const [flashRed, setFlashRed] = useState(false);

	const showError = useCallback((err: any) => {
		if (
			err &&
			typeof err === "object" &&
			"details" in err &&
			typeof err.details === "object"
		) {
			const { message, error, ...rest } = err.details;
			setErrorPopup({
				message: message || error || err.message || "An error occurred",
				details: Object.keys(rest).length > 0 ? rest : undefined,
			});
			setShowDialog(true);
			setFlashRed(true);
			setTimeout(() => setFlashRed(false), 400);
			return;
		}

		if (typeof err === "string") {
			// Try to parse as JSON
			try {
				const parsed = JSON.parse(err);
				if (typeof parsed === "object" && parsed !== null) {
					const { message, error, ...rest } = parsed;
					setErrorPopup({
						message: message || error || "An error occurred",
						details: Object.keys(rest).length > 0 ? rest : undefined,
					});
					setShowDialog(true);
					setFlashRed(true);
					setTimeout(() => setFlashRed(false), 400);
					return;
				}
			} catch {
				// Not JSON, just show as string
			}
			setErrorPopup(err);
		} else if (err && typeof err === "object") {
			const { message, error, ...rest } = err;
			setErrorPopup({
				message: message || error || "An error occurred",
				details: Object.keys(rest).length > 0 ? rest : undefined,
			});
		} else {
			setErrorPopup("An error occurred");
		}
		setShowDialog(true);
		setFlashRed(true);
		setTimeout(() => setFlashRed(false), 400);
	}, []);

	const clearError = useCallback(() => {
		setShowDialog(false);
		setErrorPopup(null);
	}, []);

	return {
		errorPopup,
		showDialog,
		flashRed,
		showError,
		clearError,
	};
};
