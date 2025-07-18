/**
 * Generates a unique temporary ID for client-side row tracking
 * Uses timestamp + random number to ensure uniqueness
 * Format: temp-{timestamp}-{random}
 */
export const generateTempId = (): string => {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return `temp-${timestamp}-${random}`;
};

/**
 * Generates a new row temp ID with the "new_" prefix
 * Format: new_{timestamp}-{random}
 */
export const generateNewRowTempId = (): string => {
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 8);
	return `new_${timestamp}-${random}`;
};

/**
 * Checks if an ID is a temporary ID (starts with "new_")
 * @param id - The ID to check
 * @returns true if the ID is a temp ID, false otherwise
 */
export const isTempId = (id: string): boolean => {
	return id.startsWith("new_");
};
