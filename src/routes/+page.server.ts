import { runWeeklyESPN } from '$lib/utils';

export async function load() {
	try {
		const weeklyData = await runWeeklyESPN();
		return {
			weeklyData
		};
	} catch (error) {
		console.error('Error fetching fantasy football data:', error);
		return {
			error: 'Failed to load fantasy football data'
		};
	}
}
