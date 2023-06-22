import { REST } from 'discord.js';
import config from './config';
import { BotClient } from './structures/BotClient';

export const client = new BotClient(config.DISCORD_CLIENT_ID, config.DISCORD_TOKEN);

(async () => {
	await client.login();
	tick(client);
})();

async function tick(_client: BotClient) {
	// setTimeout(() => {
	// 	tick(client);
	// }, 1000 * 60 * 5);
}
