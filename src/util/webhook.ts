import { TextChannel } from 'discord.js';

export async function fetchOrCreateWebhook(channel: TextChannel) {
	const webhooks = await channel.fetchWebhooks();
	if (webhooks.size == 0) {
		return await createWebhook(channel);
	}

	const webhook = webhooks.find((w) => {
		return w.owner?.id == channel.client.user?.id;
	});

	if (!webhook) {
		return await createWebhook(channel);
	}

	return webhook;
}

export async function createWebhook(channel: TextChannel) {
	const webhook = await channel.createWebhook({
		name: 'Testing Webhook',
	});
	return webhook;
}
