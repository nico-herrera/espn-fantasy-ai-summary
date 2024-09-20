import { MongoClient, ServerApiVersion } from 'mongodb';
import { runWeeklyESPN, getNFLWeek } from '$lib/utils';
import { MONGODB_URI, DB_NAME, COLLECTION_NAME } from '$root/config.json';

const client = new MongoClient(MONGODB_URI, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true
	}
});

interface WeeklyData {
	week: number;
	summary: {
		overallSummary: string;
		matchupSummaries: {
			team1: string;
			team2: string;
			summary: string;
			matchupId: number;
		}[];
	};
	highestScoringPlayer: {
		player: string;
		owner: string;
		score: number;
	};
	highestScoringTeam: {
		owner: string;
		score: number;
	};
	matchups: {
		matchupId: number;
		teamName: string;
		totalPoints: number;
		result: 'Win' | 'Loss';
	}[];
	standings: {
		[key: string]: string | number;
	}[];
}

interface WeeklyDataWithId extends WeeklyData {
	_id: string;
}

export async function getLatestFantasyData(): Promise<WeeklyDataWithId | null> {
	try {
		await client.connect();
		const db = client.db(DB_NAME);
		const collection = db.collection(COLLECTION_NAME);

		// Find the latest record by sorting in descending order of week and limiting to 1
		const latestData = await collection
			.find<WeeklyDataWithId>({})
			.sort({ week: -1 })
			.limit(1)
			.toArray();

		if (latestData.length === 0) {
			console.log('No data found in the weekly-summaries table');
			return null;
		}

		const data = latestData[0];
		return {
			...data,
			_id: data._id.toString()
		};
	} finally {
		await client.close();
	}
}

// Legacy function, for wanting to update data
export async function updateFantasyData(): Promise<WeeklyDataWithId | null> {
	try {
		await client.connect();
		const db = client.db(DB_NAME);
		const collection = db.collection(COLLECTION_NAME);
		const currentWeek = getNFLWeek();

		console.log('Generating new data for week', currentWeek);
		const weeklyData = await runWeeklyESPN(currentWeek);
		const result = await collection.insertOne(weeklyData);
		console.log('New data saved to MongoDB');

		return { ...weeklyData, _id: result.insertedId.toString() };
	} finally {
		await client.close();
	}
}
