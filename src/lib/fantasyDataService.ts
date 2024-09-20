import { MongoClient, ServerApiVersion } from 'mongodb';
import { runWeeklyESPN, getNFLWeek } from '$lib/utils';
import { MONGODB_URI, DB_NAME, COLLECTION_NAME } from '$env/static/private';

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
		owner: string; // Ensure this is always a string
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

export async function updateFantasyData(): Promise<WeeklyDataWithId | null> {
	try {
		await client.connect();
		const db = client.db(DB_NAME);
		const collection = db.collection(COLLECTION_NAME);
		const currentWeek = getNFLWeek();

		const existingData = await collection.findOne<WeeklyDataWithId>({ week: currentWeek });
		if (existingData) {
			console.log('Data already exists for week', currentWeek);
			return existingData;
		}

		console.log('Generating new data for week', currentWeek);
		const weeklyData = await runWeeklyESPN(currentWeek);
		const result = await collection.insertOne(weeklyData);
		console.log('New data saved to MongoDB');

		return { ...weeklyData, _id: result.insertedId.toString() };
	} finally {
		await client.close();
	}
}

export async function getFantasyData() {
	try {
		await client.connect();
		const db = client.db(DB_NAME);
		const collection = db.collection(COLLECTION_NAME);
		const currentWeek = getNFLWeek();

		let data = await collection.findOne<WeeklyDataWithId>({ week: currentWeek });
		if (!data) {
			const newData = await updateFantasyData();
			data = { ...newData, _id: newData._id.toString() };
		}

		return {
			...data,
			_id: data._id.toString()
		};
	} finally {
		await client.close();
	}
}
