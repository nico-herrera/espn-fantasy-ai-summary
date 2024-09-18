import { json } from '@sveltejs/kit';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic({
	apiKey: process.env.ANTHROPIC_API_KEY
});

export async function POST({ request }) {
	const { matchups } = await request.json();

	const response = await client.messages.create({
		model: 'claude-3-sonnet',
		max_tokens: 1000,
		messages: [
			{
				role: 'user',
				content: `Provide a summary of the following fantasy football matchups: ${JSON.stringify(matchups)}`
			}
		]
	});

	console.log(response);

	//   return new Response(response.content[0].text);
}
