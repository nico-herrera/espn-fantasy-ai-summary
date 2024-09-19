import { runWeeklyESPN, getNFLWeek } from '$lib/utils';
import { supabase } from '$lib/supabaseClient';

export async function load() {
	try {
		const currentWeek = getNFLWeek();
		console.log('Current week:', currentWeek);
		// Check if data for the current week exists in the database
		const { data: existingData, error: fetchError } = await supabase
			.from('weekly_summaries')
			.select('*')
			.eq('week', currentWeek)
			.single();

		if (fetchError) {
			if (fetchError.code === 'PGRST116') {
				console.log('No existing data found for week', currentWeek);
			} else {
				console.error('Error fetching existing data:', fetchError);
				throw new Error(`Database fetch error: ${fetchError.message}`);
			}
		}

		if (existingData) {
			console.log('Using existing data for week', currentWeek);
			return {
				weeklyData: {
					week: existingData.week,
					summary: existingData.summary,
					standings: existingData.standings,
					matchups: existingData.matchups,
					highestScoringPlayer: existingData.highest_scoring_player,
					highestScoringTeam: existingData.highest_scoring_team
				}
			};
		}

		console.log('Generating new data for week', currentWeek);
		const weeklyData = await runWeeklyESPN(currentWeek);

		// Insert the new data into the database
		const { error: insertError } = await supabase.from('weekly_summaries').insert([
			{
				week: weeklyData.week,
				summary: weeklyData.summary,
				standings: weeklyData.standings,
				matchups: weeklyData.matchups,
				highest_scoring_player: weeklyData.highestScoringPlayer,
				highest_scoring_team: weeklyData.highestScoringTeam
			}
		]);

		if (insertError) {
			console.error('Error inserting new data:', insertError);
			throw new Error(`Failed to save new data: ${insertError.message}`);
		}

		return {
			weeklyData
		};
	} catch (error) {
		console.error('Error in load function:', error);
		return {
			error: error instanceof Error ? error.message : 'Failed to load fantasy football data'
		};
	}
}