# ESPN Fantasy Football Summary Generator

This project generates weekly summaries for an ESPN Fantasy Football league, including highest scoring players, teams, and detailed matchup summaries. The summaries are generated using AI and stored in a MongoDB database.

## Creating a project

To create a new project, use the following commands:

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

## Building

To create a production version of your app:

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment.

## Environment Variables

Ensure you have the following environment variables set up in your `.env` file:

- `ANTHROPIC_API_KEY`
- `MONGODB_URI`
- `COLLECTION_NAME`
- `DB_NAME`
- `CRON_SECRET`
- `SWID`
- `ESPN_S2`
- `OWNER_DICT`

Refer to the `env.example` file for the structure of these variables.

### Local Configuration

If you prefer to use a local configuration file instead of environment variables, create a `config.json` file in the root directory with the following structure:

Refer to the `example.config.json` file for the structure of these variables.

## MongoDB Configuration

The MongoDB connection is configured in the `src/lib/fantasyDataService.ts` file. Ensure your MongoDB URI and other related configurations are correctly set.

## Running the Weekly Summary

To generate the weekly summary, use the `runWeeklyESPN` function. This function fetches the latest data, processes it, and stores it in MongoDB.

## API Endpoint

An API endpoint is set up to update the fantasy data via a cron job. The endpoint is protected with a secret key.

## Frontend

The frontend is built using Svelte and displays the weekly summary, highest scoring players, teams, matchups, and standings.

## License

This project is licensed under the MIT License.
