import { json } from '@sveltejs/kit';
import { updateFantasyData } from '$lib/fantasyDataService';
// import { CRON_SECRET } from '$root/config.json'; // use for local, no web deployment
import { CRON_SECRET } from '$env/static/private'; // using envs for web deployment

export async function GET({ request }) {
	const authHeader = request.headers.get('authorization');
	if (authHeader !== `Bearer ${CRON_SECRET}`) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		await updateFantasyData();
		return json({ message: 'Fantasy data updated successfully' });
	} catch (error) {
		console.error('Cron job error:', error);
		return json({ error: 'Failed to update fantasy data' }, { status: 500 });
	}
}
