import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
    DATABASE_URL: z.string(),
    DISCORD_TOKEN: z.string(),
    DISCORD_CLIENT_ID: z.string(),
    CHANGELOG_WEBHOOK: z.string(),
    LOGS_WEBHOOK: z.string(),

    STAFF_CATEGORY_ID: z.string(),
    MAIN_SERVER_ID: z.string(),

    // ROLES
    DECEPTIONIST_ROLE_ID: z.string(),
    ALIVE_ROLE_ID: z.string(),
    DEAD_ROLE_ID: z.string(),
});

export const env = envSchema.parse(process.env);

export default {
    ...env,
};
