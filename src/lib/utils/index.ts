// import { SWID, ESPN_S2, OWNER_DICT, ANTHROPIC_API_KEY,  OVERALL_SUMMARY_PROMPT, MATCHUP_SUMMARY_PROMPT  } from '$root/config.json'; // use for local, no web deployment
import {
	SWID,
	ESPN_S2,
	OWNER_DICT,
	ANTHROPIC_API_KEY,
	OVERALL_SUMMARY_PROMPT,
	MATCHUP_SUMMARY_PROMPT
} from '$env/static/private'; // using envs for web deployment

import fetch from 'node-fetch';

interface Headers {
	[key: string]: string;
}

interface EligiblePositions {
	[key: number]: string;
}

interface Cookies {
	swid: string;
	espn_s2: string;
}

interface Team {
	id: number;
	name: string;
	record: {
		overall: {
			wins: number;
			losses: number;
			pointsFor: number;
			pointsAgainst: number;
		};
	};
}

interface LeagueData {
	teams: Team[];
	scoringPeriodId: number;
}

interface RecordData {
	teamId: number;
	teamName: string;
	wins: number;
	losses: number;
	pointsFor: number;
	pointsAgainst: number;
	owner?: string;
}

interface Schedule {
	teamId: number;
	matchupId: number;
	teamName?: string;
}

interface WeeklyStats {
	week: number;
	teamId: number;
	player: string;
	lineupSlot: number;
	projected: number;
	actual: number;
	owner?: string;
}

interface Matchup {
	matchupId: number;
	teams: any[];
}

interface Summary {
	overallSummary: string;
	matchupSummaries: any[];
}

const headers: Headers = {
	Connection: 'keep-alive',
	Accept: 'application/json, text/plain, */*',
	'User-Agent':
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36'
};

const eligiblePositions: EligiblePositions = {
	0: 'QB',
	2: 'RB',
	4: 'WR',
	6: 'TE',
	7: 'OP',
	16: 'D/ST',
	17: 'K',
	20: 'Bench',
	23: 'Flex'
};

function getNFLWeek(): number {
	const today = new Date();
	const kickoff = new Date(2024, 8, 6); // Note: month is 0-indexed in JavaScript
	const daysSinceKickoff = Math.floor(
		(today.getTime() - kickoff.getTime()) / (1000 * 60 * 60 * 24)
	);
	const weeksSinceKickoff = Math.floor(daysSinceKickoff / 7);

	// Adjust for the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
	const dayOfWeek = today.getDay();
	const isTuesdayOrLater = dayOfWeek >= 2;

	return weeksSinceKickoff + (isTuesdayOrLater ? 1 : 0);
}

function getNFLSeason(): number {
	const today = new Date();
	return today.getMonth() < 7 ? today.getFullYear() - 1 : today.getFullYear();
}

async function fetchEspnData(url: string, params: any, cookies: Cookies): Promise<any> {
	const response = await fetch(url, {
		headers: {
			...headers,
			Cookie: Object.entries(cookies)
				.map(([key, value]) => `${key}=${value}`)
				.join('; ')
		}
	});

	return await response.json();
}

async function loadLeague(
	leagueId: string,
	espnCookies: Cookies,
	year: number
): Promise<LeagueData> {
	const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mDraftDetail&view=mSettings&view=mTeam&view=modular&view=mNav`;
	return fetchEspnData(url, {}, espnCookies);
}

function loadRecords(leagueData: LeagueData): RecordData[] {
	const recordData: RecordData[] = leagueData.teams.map((team) => ({
		teamId: team.id,
		teamName: team.name,
		wins: team.record.overall.wins,
		losses: team.record.overall.losses,
		pointsFor: team.record.overall.pointsFor,
		pointsAgainst: team.record.overall.pointsAgainst
	}));

	const ownerDict = OWNER_DICT;
	recordData.forEach((record) => {
		record.owner = ownerDict[record.teamId];
	});
	return recordData.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);
}

async function loadSchedule(
	year: number,
	leagueId: string,
	espnCookies: Cookies,
	week: number
): Promise<Schedule[]> {
	const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mMatchupScoreLite`;
	const data = await fetchEspnData(url, {}, espnCookies);

	const schedule = data.schedule.filter((match: any) => match.matchupPeriodId === week);
	const transformedSchedule = schedule.flatMap((match: any) => [
		{ team: match.away, matchupId: match.id },
		{ team: match.home, matchupId: match.id }
	]);

	const weeklyScores = transformedSchedule.map((item: any) => ({
		...item.team,
		matchupId: item.matchupId
	}));

	return weeklyScores;
}

async function loadWeeklyStats(
	year: number,
	leagueId: string,
	espnCookies: Cookies,
	week: number
): Promise<WeeklyStats[]> {
	const ownerDict = OWNER_DICT;

	const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mMatchup&view=mMatchupScore`;

	const espnRawData = await fetchEspnData(url, { scoringPeriodId: week }, espnCookies);

	const projectionData = espnRawData.teams.flatMap((team: any) =>
		team.roster.entries.map((player: any) => {
			const stats = player.playerPoolEntry.player.stats;
			const actual = stats.find(
				(s: any) => s.scoringPeriodId === week && s.statSourceId === 0
			)?.appliedTotal;
			const projected = stats.find(
				(s: any) => s.scoringPeriodId === week && s.statSourceId === 1
			)?.appliedTotal;

			return {
				week,
				teamId: team.id,
				player: player.playerPoolEntry.player.fullName,
				lineupSlot: player.lineupSlotId,
				projected,
				actual
			};
		})
	);

	const weeklyDf = projectionData
		.map((item: any) => ({
			...item,
			owner: ownerDict[item.teamId],
			lineupSlot: eligiblePositions[item.lineupSlot]
		}))
		.filter((item: any) => item.lineupSlot && item.lineupSlot !== 'Bench');

	return weeklyDf;
}

function modifyPositions(df: any[]): any[] {
	const positionsToModify = ['RB', 'WR'];
	positionsToModify.forEach((position) => {
		let count = 0;
		df.forEach((row) => {
			if (row.lineupSlot === position) {
				count++;
				row.lineupSlot = `${position}${count}`;
			}
		});
	});
	return df;
}

function determineResult(df: any[]): any[] {
	if (df.every((team) => typeof team.result === 'string')) {
		console.log('Results already determined. Skipping.');
		return df;
	}

	const matchups = df.reduce(
		(acc, team) => {
			const matchupId = Number(team.matchupId);
			if (!acc[matchupId]) {
				acc[matchupId] = [];
			}
			acc[matchupId].push(team);
			return acc;
		},
		{} as { [key: number]: any[] }
	);

	Object.values(matchups).forEach((matchup: any) => {
		if (matchup.length !== 2) {
			console.error(`Invalid matchup: `, matchup);
			return;
		}

		const [team1, team2] = matchup;

		if (team1.totalPoints > team2.totalPoints) {
			team1.result = 'Win';
			team2.result = 'Loss';
		} else if (team1.totalPoints < team2.totalPoints) {
			team1.result = 'Loss';
			team2.result = 'Win';
		} else {
			team1.result = team2.result = 'Tie';
		}
	});

	return df;
}

function transformWeekly(weeklyDf: any[], scheduleDf: any[]): any[] {
	const mergedDf = scheduleDf.map((schedule) => {
		const playerData = weeklyDf.filter((w) => w.teamId === schedule.teamId);
		const playersByPosition: { [key: string]: { player: string; points: number } } = {};
		playerData.forEach((p) => {
			playersByPosition[p.lineupSlot] = {
				player: p.player,
				points: p.actual
			};
		});
		return {
			...schedule,
			...playersByPosition,
			teamName: schedule.teamName // Ensure teamName is included
		};
	});

	const modifiedDf = mergedDf.map((team) => modifyPositions([team])[0]);

	return modifiedDf;
}

function highestScoringPlayerEspn(weeklyDf: any[]): [string, string, number] {
	const highestPlayer = weeklyDf.reduce((max, player) =>
		player.actual > max.actual ? player : max
	);
	return [highestPlayer.owner, highestPlayer.player, highestPlayer.actual];
}

function highestScoringTeamEspn(weeklyDf: any[]): [string, number] {
	if (!Array.isArray(weeklyDf) || weeklyDf.length === 0) {
		console.error('Invalid weeklyDf:', weeklyDf);
		return ['Error', 0];
	}

	const teamScores: { [key: string]: number } = weeklyDf.reduce(
		(acc, player) => {
			if (typeof player.actual !== 'number') {
				console.warn('Invalid player score:', player);
				return acc;
			}
			acc[player.owner] = (acc[player.owner] || 0) + player.actual;
			return acc;
		},
		{} as { [key: string]: number }
	);

	const highestTeam = Object.entries(teamScores).reduce(
		(max, [owner, score]) => (score > max[1] ? [owner, parseFloat(score.toFixed(2))] : max),
		['', -Infinity] as [string, number]
	);

	return highestTeam;
}

async function iterateWeeksEspn(
	year: number,
	week: number,
	standingsDf: any[],
	leagueId: string,
	espnCookies: Cookies
): Promise<any[]> {
	standingsDf.forEach((team) => (team.lowestScoringTeam = 0));

	for (let i = 1; i <= week; i++) {
		const weeklyDf = await loadWeeklyStats(year, leagueId, espnCookies, i);
		const matchupDf = weeklyDf.reduce(
			(acc, player) => {
				if (!acc[player.owner]) acc[player.owner] = { owner: player.owner, actual: 0 };
				acc[player.owner].actual += player.actual;
				return acc;
			},
			{} as { [key: string]: { owner: string; actual: number } }
		);

		const lowestScorer = Object.values(matchupDf).reduce((min, team) =>
			team.actual < min.actual ? team : min
		);
		standingsDf.find((team) => team.owner === lowestScorer.owner).lowestScoringTeam++;
	}

	const sortedStandings = standingsDf.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);

	return sortedStandings;
}

function rankPlayoffSeeds(standingsDf: any[]): any[] {
	const sortedStandings = [...standingsDf].sort(
		(a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor
	);
	const top5 = sortedStandings.slice(0, 5);
	const remaining = sortedStandings.slice(5);
	const sixthSeed = remaining.reduce((max, team) => (team.pointsFor > max.pointsFor ? team : max));
	const seventhSeed = remaining
		.filter((team) => team !== sixthSeed)
		.reduce((max, team) => (team.pointsFor > max.pointsFor ? team : max));

	const playoffTeams = [...top5, sixthSeed, seventhSeed].map((team, index) => ({
		...team,
		playoffSeed: index + 1
	}));
	return standingsDf
		.map((team) => {
			const playoffTeam = playoffTeams.find((p) => p.teamId === team.teamId);
			return playoffTeam ? { ...team, playoffSeed: playoffTeam.playoffSeed } : team;
		})
		.sort((a, b) => (a.playoffSeed || Infinity) - (b.playoffSeed || Infinity));
}

async function runEspnWeekly(
	week: number | null = null,
	year: number | null = null,
	maxAttempts: number = 5
): Promise<any> {
	year = year || getNFLSeason();
	const espnCookies: Cookies = {
		swid: SWID,
		espn_s2: ESPN_S2
	};
	const leagueId = '39720439';

	let attempts = 0;
	let leagueData: LeagueData,
		standingsDf: any[],
		weeklyDf: any[],
		scheduleDf: any[],
		matchupDf: any[];

	while (attempts < maxAttempts) {
		try {
			leagueData = await loadLeague(leagueId, espnCookies, year);
			week = week || leagueData.scoringPeriodId - 1;

			// Parallelize independent tasks
			const [weeklyStats, schedule] = await Promise.all([
				loadWeeklyStats(year, leagueId, espnCookies, week),
				loadSchedule(year, leagueId, espnCookies, week)
			]);

			standingsDf = loadRecords(leagueData);
			weeklyDf = weeklyStats;
			scheduleDf = schedule.map((team) => ({
				...team,
				teamName: OWNER_DICT[team.teamId]
			}));

			matchupDf = transformWeekly(weeklyDf, scheduleDf);
			matchupDf = determineResult(matchupDf);

			standingsDf = await iterateWeeksEspn(year, week, standingsDf, leagueId, espnCookies);
			standingsDf = rankPlayoffSeeds(standingsDf);

			if (matchupDf.length > 0 && scheduleDf.length > 0 && standingsDf.length > 0) {
				break;
			}
		} catch (error) {
			console.error('Error loading data:', error);
		}

		attempts++;
		if (attempts < maxAttempts) {
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}
	}

	if (attempts === maxAttempts) {
		throw new Error(
			`Failed to load data after ${attempts} attempts. Please check your configuration.`
		);
	}

	const [hpOwner, hpPlayer, hpScore] = highestScoringPlayerEspn(weeklyDf);
	const [htOwner, htScore] = highestScoringTeamEspn(weeklyDf);

	return { standingsDf, matchupDf, hpOwner, hpPlayer, hpScore, htOwner, htScore };
}

async function generateSummary(week: number, matchupDf: any[]): Promise<Summary> {
	const matchups = matchupDf.reduce((acc, team) => {
		const matchup = acc.find((m) => m.matchupId === team.matchupId);
		if (matchup) {
			matchup.teams.push(team);
		} else {
			acc.push({ matchupId: team.matchupId, teams: [team] });
		}
		return acc;
	}, [] as Matchup[]);

	const overallPrompt =
		`Week ${week} Fantasy Football Results:\n\n` +
		matchups
			.map(
				(matchup) =>
					`${matchup.teams[0].teamName} (${matchup.teams[0].totalPoints.toFixed(2)}) vs ` +
					`${matchup.teams[1].teamName} (${matchup.teams[1].totalPoints.toFixed(2)})`
			)
			.join('\n');

	const overallSummary = await getClaudeSummary(overallPrompt, OVERALL_SUMMARY_PROMPT);

	const matchupSummaries = await Promise.all(
		matchups.map(async (matchup) => {
			const [team1, team2] = matchup.teams;
			const matchupPrompt =
				`Matchup: ${team1.teamName} (${team1.totalPoints.toFixed(2)}) vs ${team2.teamName} (${team2.totalPoints.toFixed(2)})\n\n` +
				`${team1.teamName} top performers:\n` +
				Object.entries(team1)
					.filter(([, value]) => typeof value === 'object' && (value as any).points)
					.map(
						([key, value]) =>
							`${key}: ${(value as any).player} (${(value as any).points.toFixed(2)})`
					)
					.join('\n') +
				`\n\n${team2.teamName} top performers:\n` +
				Object.entries(team2)
					.filter(([, value]) => typeof value === 'object' && (value as { points: number }).points)
					.map(
						([key, value]) =>
							`${key}: ${(value as { player: string; points: number }).player} (${(value as { points: number }).points.toFixed(2)})`
					)
					.join('\n');

			const summary = await getClaudeSummary(matchupPrompt, MATCHUP_SUMMARY_PROMPT);

			return {
				matchupId: matchup.matchupId,
				team1: team1.teamName,
				team2: team2.teamName,
				summary
			};
		})
	);

	return { overallSummary, matchupSummaries };
}

async function getClaudeSummary(prompt: string, systemMessage: string): Promise<string> {
	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: 'claude-3-sonnet-20240229',
			system: systemMessage,
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 500
		})
	});

	const data = await response.json();
	if (!response.ok) {
		console.error('API Error:', data);
		throw new Error(`API request failed: ${data.error?.message || 'Unknown error'}`);
	}

	return data.content[0].text;
}

async function runWeeklyESPN(week: number): Promise<any> {
	try {
		week = week || getNFLWeek();
		const { standingsDf, matchupDf, hpOwner, hpPlayer, hpScore, htOwner, htScore } =
			await runEspnWeekly(week);

		const summary = await generateSummary(week, matchupDf);

		return {
			week,
			summary,
			standings: standingsDf,
			matchups: matchupDf,
			highestScoringPlayer: {
				owner: hpOwner,
				player: hpPlayer,
				score: hpScore
			},
			highestScoringTeam: {
				owner: htOwner,
				score: htScore
			}
		};
	} catch (error) {
		console.error('Error in runWeeklyESPN:', error);
		throw error; // Re-throw the error so it can be handled by the calling function
	}
}

export {
	getNFLWeek,
	getNFLSeason,
	loadLeague,
	loadRecords,
	loadSchedule,
	loadWeeklyStats,
	runEspnWeekly,
	generateSummary,
	runWeeklyESPN
};
