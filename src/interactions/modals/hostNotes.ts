import { ChannelType, EmbedBuilder, ModalSubmitInteraction } from 'discord.js';
import { Modal } from '../../structures/interactions';

export default new Modal('host-notes-action', 'Viewing/Editing Host Notes').onExecute(async (i: ModalSubmitInteraction, cache) => {
	if (!i.guild) return;
	if (!cache) return i.reply({ content: 'This modal is invalid', ephemeral: true });

	try {
		if (!i.message) return i.reply({ content: 'This modal is invalid', ephemeral: true });
		const hostNotesValue = i.fields.getTextInputValue('host-notes');

		await i.guild.channels.fetch();
		if (i.channel?.type != ChannelType.GuildText) return i.reply({ content: 'This modal is invalid', ephemeral: true });

		const message = await i.channel.messages.fetch(cache);
		if (!message) return i.reply({ content: 'This modal is invalid', ephemeral: true });

		const embeds = message.embeds;
		if (embeds.length == 0) return i.reply({ content: 'No embeds found', ephemeral: true });

		let hostNotesCaught = false;
		let fields = embeds[0].data.fields?.map((data) => {
			if (data.name == 'Host Notes') {
				hostNotesCaught = true;
				return {
					name: data.name,
					value: hostNotesValue,
					inline: data.inline,
				};
			}
			return {
				name: data.name,
				value: data.value,
				inline: data.inline,
			};
		});
		if (!fields) return i.reply({ content: 'No fields found', ephemeral: true });

		if (!hostNotesCaught)
			fields.push({
				name: 'Host Notes',
				value: hostNotesValue,
				inline: false,
			});

		const embed = new EmbedBuilder(embeds[0].data);
		embed.setFields(fields);

		await message.edit({ embeds: [embed] });

		await i.reply({ content: 'Host notes updated', ephemeral: true });
		return await i.deleteReply();
	} catch (err) {
		console.error(err);
		return i.reply({ content: 'An error occured', ephemeral: true });
	}
});
