import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
	DATABASE_URL: z.string(),
	DISCORD_TOKEN: z.string(),
	DISCORD_CLIENT_ID: z.string(),
	CHANGELOG_WEBHOOK: z.string(),
	LOGS_WEBHOOK: z.string(),
	NEW_DATABASE_URL: z.string(),
});

export const env = envSchema.parse(process.env);

export default {
	...env,
};
