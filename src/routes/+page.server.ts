import { getLatestFantasyData } from '$lib/fantasyDataService';

export async function load() {
	try {
		const weeklyData = await getLatestFantasyData();
		return { weeklyData };
	} catch (error) {
		console.error('Error loading fantasy data:', error);
		return {
			error: error instanceof Error ? error.message : 'Failed to load fantasy football data'
		};
	}
}
