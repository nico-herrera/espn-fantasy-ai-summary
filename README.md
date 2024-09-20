# ESPN Fantasy Football Summary Generator

This SvelteKit project generates weekly summaries for an ESPN Fantasy Football league, including highest scoring players, teams, and detailed matchup summaries. The summaries are generated using AI and stored in a MongoDB database.

## Project Setup

To set up the project:

```bash
# Clone the repository
git clone https://github.com/nico-herrera/espn-fantasy-ai-summary.git
cd espn-fantasy-ai-summary

# Install dependencies
npm install
```

## Development

To start the development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

The app will be available at `http://localhost:5173`.

## Building for Production

To create a production version of your app:

```bash
npm run build
```

Preview the production build with:

```bash
npm run preview
```

## Configuration

This project supports two methods of configuration:

1. Environment variables (recommended for deployment)
2. Local `config.json` file (convenient for local development)

### Environment Variables

For deployment, set the following environment variables:

- `ANTHROPIC_API_KEY`
- `MONGODB_URI`
- `COLLECTION_NAME`
- `DB_NAME`
- `CRON_SECRET`
- `SWID`
- `ESPN_S2`
- `OWNER_DICT` (as a JSON string)
- `OVERALL_SUMMARY_PROMPT`
- `MATCHUP_SUMMARY_PROMPT`

### Local Configuration

For local development, you can use a `config.json` file. Create this file in the root directory with the following structure:

```json
{
	"ANTHROPIC_API_KEY": "your_anthropic_api_key",
	"MONGODB_URI": "your_mongodb_uri",
	"COLLECTION_NAME": "weekly-summaries",
	"DB_NAME": "fantasy-football",
	"CRON_SECRET": "your_cron_secret",
	"SWID": "your_espn_swid",
	"ESPN_S2": "your_espn_s2_cookie",
	"OVERALL_SUMMARY_PROMPT": "Example overall summary prompt text here.",
	"MATCHUP_SUMMARY_PROMPT": "Example matchup summary prompt text here.",
	"OWNER_DICT": {
		"1": "Owner1Name",
		"2": "Owner2Name"
		// ... add all owner mappings
	}
}
```

**Important:** Do not commit your `config.json` file to version control. Add it to your `.gitignore` file to prevent accidentally exposing sensitive information.

## MongoDB Configuration

The MongoDB connection is configured using the `MONGODB_URI` from your environment variables or `config.json` file. Ensure this URI is correct and that you have the necessary permissions to access the database.

## Weekly Summary Generation

The weekly summary generation is handled automatically by the application through a cron job. The cron job runs every Tuesday at midnight CST, triggering the update process to pull the newest data.

## API Endpoint

An API endpoint is available to update the fantasy data. It's protected with the secret key specified in `CRON_SECRET`.

To test the API endpoint locally:

```bash
curl -X POST http://localhost:5173/api/update-fantasy-data -H "Authorization: Bearer your_cron_secret"
```

Replace `your_cron_secret` with the actual secret from your configuration.

## Frontend

The frontend is built with SvelteKit and displays the weekly summary, highest scoring players, teams, matchups, and standings.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
