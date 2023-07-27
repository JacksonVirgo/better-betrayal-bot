import { ButtonBuilder, ButtonStyle, ChannelType, ColorResolvable, EmbedBuilder } from 'discord.js';
import { Button } from '../../structures/interactions';
import { getAverageColor } from 'fast-average-color-node';
import { getSubmittedAction } from '../../util/database';

export default new Button('unset-processed')
	.setButton(new ButtonBuilder().setLabel('Set Not Processed').setStyle(ButtonStyle.Secondary))
	.onExecute(async (i, cache) => {
		if (!i.guild) return i.reply({ content: 'You need to be in a server to use this button', ephemeral: true });

		const embeds = i.message.embeds;
		if (embeds.length == 0) return i.reply({ content: 'No embeds found', ephemeral: true });

		const storedAction = await getSubmittedAction(i.message.id);
		if (!storedAction) return i.reply({ content: 'No action found', ephemeral: true });

		await i.guild.channels.fetch();
		await i.guild.members.fetch();

		const member = i.guild.members.cache.get(i.user.id);
		if (!member) return i.reply({ content: 'You need to be in the server to use this command', ephemeral: true });

		const confessional = i.guild.channels.cache.get(storedAction.inventory.channelId);
		if (confessional?.type != ChannelType.GuildText) return i.reply({ content: 'Confessional channel not found', ephemeral: true });
		const playerMessage = await confessional.messages.fetch(storedAction.playerMessageId);

		const rawEmbed = embeds[0];
		const embed = new EmbedBuilder(rawEmbed.data);
		const changeEmbed = (e: EmbedBuilder) => {
			e.setTitle('Action Not Processed');
			e.setFooter(null);
			e.setTimestamp(null);
			e.setColor('#FFFFFF');
		};

		try {
			changeEmbed(embed);
			await i.message.edit({ embeds: [embed] });

			if (playerMessage && playerMessage.embeds.length > 0) {
				const playerEmbed = new EmbedBuilder(playerMessage.embeds[0].data);
				changeEmbed(playerEmbed);
				await playerMessage.edit({ embeds: [playerEmbed] });
			}

			await i.deferReply({ ephemeral: true });
			await i.deleteReply();
		} catch (err) {
			console.log(err);
			await i.reply({ content: 'An error occurred while fetching the role', ephemeral: true });
		}
	});
