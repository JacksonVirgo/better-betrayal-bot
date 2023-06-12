import { REST } from 'discord.js';
import config from './config';
import { BotClient } from './structures/BotClient';

export const client = new BotClient(config.DISCORD_CLIENT_ID, config.DISCORD_TOKEN);
// export let rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

(async () => {
	await client.login();
	tick(client);
})();

async function tick(client: BotClient) {
	setTimeout(() => {
		tick(client);
	}, 1000 * 60 * 5);
}
