import { getLatestFantasyData, callCronUpdateFantasyData } from '$lib/fantasyDataService';

export async function load({ fetch }) {
	try {
		// const weeklyData = await callCronUpdateFantasyData(fetch); // for manual running
		const weeklyData = await getLatestFantasyData();

		return { weeklyData };
	} catch (error) {
		console.error('Error loading fantasy data:', error);
		return {
			error: error instanceof Error ? error.message : 'Failed to load fantasy football data'
		};
	}
}
