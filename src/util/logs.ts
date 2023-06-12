import { MessageCreateOptions, MessagePayload, WebhookClient } from 'discord.js';
import config from '../config';

export async function createChangeLog(data: string | MessagePayload | MessageCreateOptions) {
	try {
		const webhook = new WebhookClient({ url: config.CHANGELOG_WEBHOOK });
		await webhook.send(data);
	} catch (err) {
		console.log(err);
	}
}
