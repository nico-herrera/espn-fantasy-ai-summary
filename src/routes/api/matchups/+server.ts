import { json } from '@sveltejs/kit';

const SWID = '{36D9EA16-C2C6-4D0F-99EA-16C2C63D0F3D}'; // Replace with your SWID
const ESPN_S2 =
	'AEBy1OgzveID8ZS0fDUf6glSfU1css8uaI84k6utLzKfjeA6ek7njs%2BtghCLzbL%2BVFcmAIiXHdAlCdOh%2Ftp3DRdyK3Ql7CrYXkg6wQToB4iynjTBpXS%2Fu%2F9cQ4YQBwojsecRHQcmuGZQhYJmddhPtKd%2Bv0dFv%2FxriogIGbKsZBdDqk1Ja1gqEEX3TB56Qt6%2FM6Uu9kKF9pUC7LWmORhwE9%2FDBVZ8bWexNCLXC9PHQWFPXyUiWYBnmKaqjnaS3otXYuF%2BsnhLdFUOb1%2F0%2FxwXYXTtBI3d2aYoo7GOaa1P4wWrYNw%2FJVcmDHXeajp0tibwi80%3D'; // Replace with your ESPN_S2 cookie value

export async function GET() {
	try {
		const url =
			'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2024/segments/0/leagues/39720439?view=mMatchup&view=mMatchupScore';

		const response = await fetch(url, {
			headers: {
				Cookie: `SWID=${SWID}; espn_s2=${ESPN_S2}`,
				Accept: 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const data = await response.json();
		return json(data);
	} catch (error) {
		return json({ error: `Failed to fetch matchups, error: ${error}` }, { status: 500 });
	}
}
