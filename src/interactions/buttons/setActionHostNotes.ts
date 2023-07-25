import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Button } from '../../structures/interactions';
import { getSubmittedAction } from '../../util/database';
import hostNotes from '../modals/hostNotes';

export default new Button('set-action-host-notes')
	.setButton(new ButtonBuilder().setLabel('Set Host Notes').setStyle(ButtonStyle.Secondary))
	.onExecute(async (i, cache) => {
		if (!i.guild)
			return i.reply({
				content: 'You need to be in a server to use this button',
				ephemeral: true,
			});

		const embeds = i.message.embeds;
		if (embeds.length == 0) return i.reply({ content: 'No embeds found', ephemeral: true });

		const storedAction = await getSubmittedAction(i.message.id);
		if (!storedAction) return i.reply({ content: 'No action found', ephemeral: true });

		const confessional = i.guild.channels.cache.get(storedAction.inventory.channelId);
		if (confessional?.type != ChannelType.GuildText)
			return i.reply({
				content: 'Confessional channel not found',
				ephemeral: true,
			});

		const rawEmbed = embeds[0];
		const embed = new EmbedBuilder(rawEmbed.data);

		const modal = new ModalBuilder();
		modal.setTitle('Host Notes');
		modal.setCustomId(hostNotes.getCustomID() + '_' + i.message.id);

		const row = new ActionRowBuilder<TextInputBuilder>();
		const input = new TextInputBuilder()
			.setLabel('Host Notes')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true)
			.setCustomId('host-notes')
			.setValue('');

		const hostNoteFields = embed.data.fields?.filter((field) => field.name == 'Host Notes');
		const hostNote = hostNoteFields?.length ? hostNoteFields[0].value : null;
		if (hostNote) input.setValue(hostNote);

		row.addComponents(input);
		modal.addComponents(row);

		await i.showModal(modal);
	});
