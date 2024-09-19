// fantasy-football-utils.js

import fetch from 'node-fetch';

const OWNER_DICT = {
	'1': 'Rotenheimer',
	'2': 'Bones Knows',
	'3': 'owner_name',
	'4': 'captain beef',
	'5': 'STROUD TO BE AN AMERICAN',
	'6': 'owner_name',
	'7': 'Matty Ice Tea',
	'8': 'Marty Cold Cutz',
	'9': 'MANDEM CEO',
	'10': 'Nutty Toilets',
	'11': 'BIG LUMBER',
	'12': 'Burrow This L',
	'13': 'King of Brentwood',
	'14': 'DaCreamist'
};

const SWID = '{36D9EA16-C2C6-4D0F-99EA-16C2C63D0F3D}'; // Replace with your SWID
const ESPN_S2 =
	'AEBy1OgzveID8ZS0fDUf6glSfU1css8uaI84k6utLzKfjeA6ek7njs%2BtghCLzbL%2BVFcmAIiXHdAlCdOh%2Ftp3DRdyK3Ql7CrYXkg6wQToB4iynjTBpXS%2Fu%2F9cQ4YQBwojsecRHQcmuGZQhYJmddhPtKd%2Bv0dFv%2FxriogIGbKsZBdDqk1Ja1gqEEX3TB56Qt6%2FM6Uu9kKF9pUC7LWmORhwE9%2FDBVZ8bWexNCLXC9PHQWFPXyUiWYBnmKaqjnaS3otXYuF%2BsnhLdFUOb1%2F0%2FxwXYXTtBI3d2aYoo7GOaa1P4wWrYNw%2FJVcmDHXeajp0tibwi80%3D'; // Replace with your ESPN_S2 cookie value

const headers = {
	Connection: 'keep-alive',
	Accept: 'application/json, text/plain, */*',
	'User-Agent':
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36'
};

const customHeaders = {
	...headers,
	'x-fantasy-filter': '{"filterActive":null}',
	'x-fantasy-platform': 'kona-PROD-1dc40132dc2070ef47881dc95b633e62cebc9913',
	'x-fantasy-source': 'kona'
};

const positionMapping = {
	1: 'QB',
	2: 'RB',
	3: 'WR',
	4: 'TE',
	5: 'K',
	16: 'D/ST'
};

const eligiblePositions = {
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

function getNFLWeek() {
	const today = new Date();
	const kickoff = new Date(2024, 8, 6); // Note: month is 0-indexed in JavaScript
	const daysSinceKickoff = Math.floor((today - kickoff) / (1000 * 60 * 60 * 24));
	const weeksSinceKickoff = Math.floor(daysSinceKickoff / 7);
	return weeksSinceKickoff + 1;
}

function getNFLSeason() {
	const today = new Date();
	return today.getMonth() < 7 ? today.getFullYear() - 1 : today.getFullYear();
}

async function fetchEspnData(url, params, cookies) {
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

async function loadLeague(leagueId, espnCookies, year) {
	const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mDraftDetail&view=mSettings&view=mTeam&view=modular&view=mNav`;
	return fetchEspnData(url, {}, espnCookies);
}

function loadRecords(leagueData) {
	const recordData = leagueData.teams.map((team) => ({
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

async function loadSchedule(year, leagueId, espnCookies, week) {
	const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mMatchupScoreLite`;
	const data = await fetchEspnData(url, {}, espnCookies);

	const schedule = data.schedule.filter((match) => match.matchupPeriodId === week);
	const transformedSchedule = schedule.flatMap((match) => [
		{ team: match.away, matchupId: match.id },
		{ team: match.home, matchupId: match.id }
	]);

	const weeklyScores = transformedSchedule.map((item) => ({
		...item.team,
		matchupId: item.matchupId
	}));

	return weeklyScores;
}

async function loadWeeklyStats(year, leagueId, espnCookies, week) {
	const ownerDict = OWNER_DICT;

	const url = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${year}/segments/0/leagues/${leagueId}?view=mMatchup&view=mMatchupScore`;

	const espnRawData = await fetchEspnData(url, { scoringPeriodId: week }, espnCookies);

	const projectionData = espnRawData.teams.flatMap((team) =>
		team.roster.entries.map((player) => {
			const stats = player.playerPoolEntry.player.stats;
			const actual = stats.find(
				(s) => s.scoringPeriodId === week && s.statSourceId === 0
			)?.appliedTotal;
			const projected = stats.find(
				(s) => s.scoringPeriodId === week && s.statSourceId === 1
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
		.map((item) => ({
			...item,
			owner: ownerDict[item.teamId],
			lineupSlot: eligiblePositions[item.lineupSlot]
		}))
		.filter((item) => item.lineupSlot && item.lineupSlot !== 'Bench');

	return weeklyDf;
}

function modifyPositions(df) {
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

function determineResult(df) {
	if (df.every((team) => typeof team.result === 'string')) {
		console.log('Results already determined. Skipping.');
		return df;
	}

	const matchups = df.reduce((acc, team) => {
		const matchupId = Number(team.matchupId);
		if (!acc[matchupId]) {
			acc[matchupId] = [];
		}
		acc[matchupId].push(team);
		return acc;
	}, {});

	Object.values(matchups).forEach((matchup) => {
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
function transformWeekly(weeklyDf, scheduleDf) {
	const mergedDf = scheduleDf.map((schedule) => {
		const playerData = weeklyDf.filter((w) => w.teamId === schedule.teamId);
		const playersByPosition = {};
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

function highestScoringPlayerEspn(weeklyDf) {
	const highestPlayer = weeklyDf.reduce((max, player) =>
		player.actual > max.actual ? player : max
	);
	return [highestPlayer.owner, highestPlayer.player, highestPlayer.actual];
}

function highestScoringTeamEspn(weeklyDf) {
	if (!Array.isArray(weeklyDf) || weeklyDf.length === 0) {
		console.error('Invalid weeklyDf:', weeklyDf);
		return ['Error', 0];
	}

	const teamScores = weeklyDf.reduce((acc, player) => {
		if (typeof player.actual !== 'number') {
			console.warn('Invalid player score:', player);
			return acc;
		}
		acc[player.owner] = (acc[player.owner] || 0) + player.actual;
		return acc;
	}, {});

	const highestTeam = Object.entries(teamScores).reduce(
		(max, [owner, score]) => (score > max[1] ? [owner, parseFloat(score.toFixed(2))] : max),
		['', -Infinity]
	);

	return highestTeam;
}

async function iterateWeeksEspn(year, week, standingsDf, leagueId, espnCookies) {
	standingsDf.forEach((team) => (team.lowestScoringTeam = 0));

	for (let i = 1; i <= week; i++) {
		const weeklyDf = await loadWeeklyStats(year, leagueId, espnCookies, i);
		const matchupDf = weeklyDf.reduce((acc, player) => {
			if (!acc[player.owner]) acc[player.owner] = { owner: player.owner, actual: 0 };
			acc[player.owner].actual += player.actual;
			return acc;
		}, {});

		const lowestScorer = Object.values(matchupDf).reduce((min, team) =>
			team.actual < min.actual ? team : min
		);
		standingsDf.find((team) => team.owner === lowestScorer.owner).lowestScoringTeam++;
	}

	const sortedStandings = standingsDf.sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor);

	return sortedStandings;
}

function rankPlayoffSeeds(standingsDf) {
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

async function runEspnWeekly(week = null, year = null, maxAttempts = 5) {
	year = year || getNFLSeason();
	const espnCookies = {
		swid: SWID,
		espn_s2: ESPN_S2
	};
	const leagueId = '39720439';

	let attempts = 0;
	let leagueData, standingsDf, weeklyDf, scheduleDf, matchupDf;

	while (attempts < maxAttempts) {
		try {
			leagueData = await loadLeague(leagueId, espnCookies, year);
			week = week || leagueData.scoringPeriodId - 1;

			standingsDf = loadRecords(leagueData);
			weeklyDf = await loadWeeklyStats(year, leagueId, espnCookies, week);
			scheduleDf = await loadSchedule(year, leagueId, espnCookies, week);

			scheduleDf = scheduleDf.map((team) => ({
				...team,
				teamName: OWNER_DICT[team.teamId]
			}));

			matchupDf = transformWeekly(weeklyDf, scheduleDf);
			matchupDf = determineResult(matchupDf); // Call determineResult only once

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

async function generateSummary(week, matchupDf) {
	const matchups = matchupDf.reduce((acc, team) => {
		const matchup = acc.find((m) => m.matchupId === team.matchupId);
		if (matchup) {
			matchup.teams.push(team);
		} else {
			acc.push({ matchupId: team.matchupId, teams: [team] });
		}
		return acc;
	}, []);

	const overallPrompt =
		`Week ${week} Fantasy Football Results:\n\n` +
		matchups
			.map(
				(matchup) =>
					`${matchup.teams[0].teamName} (${matchup.teams[0].totalPoints.toFixed(2)}) vs ` +
					`${matchup.teams[1].teamName} (${matchup.teams[1].totalPoints.toFixed(2)})`
			)
			.join('\n');

	const overallSummary = await getClaudeSummary(
		overallPrompt,
		"Provide a humorous and snarky overall summary of this week's fantasy football results. Sort of Bill Burr, right in your face-like. Focus on notable performances, upsets, and particularly low scores. Be extra snarky towards 'Bones Knows' and 'Matty Ice Tea' if they appear in the results."
	);

	const matchupSummaries = await Promise.all(
		matchups.map(async (matchup) => {
			const [team1, team2] = matchup.teams;
			const matchupPrompt =
				`Matchup: ${team1.teamName} (${team1.totalPoints.toFixed(2)}) vs ${team2.teamName} (${team2.totalPoints.toFixed(2)})\n\n` +
				`${team1.teamName} top performers:\n` +
				Object.entries(team1)
					.filter(([key, value]) => typeof value === 'object' && value.points)
					.map(([key, value]) => `${key}: ${value.player} (${value.points.toFixed(2)})`)
					.join('\n') +
				`\n\n${team2.teamName} top performers:\n` +
				Object.entries(team2)
					.filter(([key, value]) => typeof value === 'object' && value.points)
					.map(([key, value]) => `${key}: ${value.player} (${value.points.toFixed(2)})`)
					.join('\n');

			const summary = await getClaudeSummary(
				matchupPrompt,
				'Provide a brief, slightly sarcastic, humorous summary of this matchup. Highlight standout performances and any notably bad scores. Keep it concise and entertaining."'
			);

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

async function getClaudeSummary(prompt, systemMessage) {
	const response = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-Key': import.meta.env.VITE_ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: 'claude-3-sonnet-20240229',
			system: systemMessage,
			messages: [{ role: 'user', content: prompt }],
			max_tokens: 300
		})
	});

	const data = await response.json();
	if (!response.ok) {
		console.error('API Error:', data);
		throw new Error(`API request failed: ${data.error?.message || 'Unknown error'}`);
	}

	return data.content[0].text;
}

async function runWeeklyESPN(week = null) {
	try {
		week = week || getNFLWeek();
		const { standingsDf, matchupDf, hpOwner, hpPlayer, hpScore, htOwner, htScore } =
			await runEspnWeekly(week);

		const summary = await generateSummary(week, matchupDf, standingsDf);

		// Instead of sending an email, return an object with all the relevant data
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
