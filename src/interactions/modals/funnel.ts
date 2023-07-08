import { ChannelType, EmbedBuilder, ModalSubmitInteraction } from 'discord.js';
import { Modal } from '../../structures/interactions';
import { prisma } from '../../database';
import { formatAbilityChanges } from '../../util/embeds';

export default new Modal('submit-action', 'Submit Action').onExecute(async (i: ModalSubmitInteraction, cache) => {
	if (!i.guild) return;
	if (!i.channel) return;
	try {
		const inventory = await prisma.inventory.findUnique({
			where: {
				discordId: i.user.id,
			},
		});

		if (!inventory) return i.reply({ content: 'You need to be a player to use this command', ephemeral: true });
		// if (i.channel.id != inventory.channelId) return i.reply({ content: `You need to be in your confessional (<#${inventory.channelId}>) to use this command`, ephemeral: true });

		const actionData = i.fields.getTextInputValue('action-data');
		if (!actionData) return i.reply('Missing fields');

		await i.guild.channels.fetch();
		const actionChannel = i.guild.channels.cache.find((c) => c.name === 'action-funnel');

		if (!actionChannel || actionChannel.type != ChannelType.GuildText)
			return i.reply({ content: 'Action funnel channel not found. Please tell the host/s your actions directly instead.', ephemeral: true });

		const embed = new EmbedBuilder().setTitle('Action Submitted');
		embed.setColor('Grey');
		embed.addFields({ name: 'Action', value: actionData });
		await actionChannel.send({ embeds: [embed] });
		return i.reply({ content: actionData });
	} catch (err) {
		console.error(err);
		return i.reply({ content: 'An error occured', ephemeral: true });
	}
});
