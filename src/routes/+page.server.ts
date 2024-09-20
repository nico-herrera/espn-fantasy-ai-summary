import { getFantasyData } from '$lib/fantasyDataService';

export async function load() {
	try {
		console.log('Loading');
		const weeklyData = await getFantasyData();
		console.log('Loading weekly');
		return { weeklyData };
	} catch (error) {
		console.error('Error loading fantasy data:', error);
		return {
			error: error instanceof Error ? error.message : 'Failed to load fantasy football data'
		};
	}
}
