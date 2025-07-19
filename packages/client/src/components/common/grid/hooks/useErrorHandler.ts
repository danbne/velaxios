import { useState, useCallback } from "react";

interface ErrorDetails {
	message?: string;
	error?: string;
	[key: string]: unknown;
}

interface ErrorObject {
	message?: string;
	error?: string;
	details?: ErrorDetails;
	[key: string]: unknown;
}

interface ErrorPopupData {
	message: string;
	details?: Record<string, unknown>;
}

export const useErrorHandler = () => {
	const [errorPopup, setErrorPopup] = useState<
		| string
		| ErrorPopupData
		| null
	>(null);
	const [showDialog, setShowDialog] = useState(false);
	const [flashRed, setFlashRed] = useState(false);

	const showError = useCallback((err: unknown) => {
		if (
			err &&
			typeof err === "object" &&
			err !== null &&
			"details" in err &&
			typeof (err as ErrorObject).details === "object"
		) {
			const errorObj = err as ErrorObject;
			const { message, error, ...rest } = errorObj.details as ErrorDetails;
			setErrorPopup({
				message: message || error || (errorObj.message as string) || "An error occurred",
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
				const parsed = JSON.parse(err) as ErrorObject;
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
		} else if (err && typeof err === "object" && err !== null) {
			const errorObj = err as ErrorObject;
			const { message, error, ...rest } = errorObj;
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
