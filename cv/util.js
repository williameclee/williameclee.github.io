export function capitaliseFirstLetter(string) {
	if (!string) return ""; // Handle empty or null strings
	return string.charAt(0).toUpperCase() + string.slice(1);
}