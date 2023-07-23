import { ButtonBuilder, ButtonStyle, EmbedBuilder, EmbedData } from 'discord.js';
import { Button } from '../../structures/interactions';

export default new Button('set-processed').setButton(new ButtonBuilder().setLabel('Set Processed').setStyle(ButtonStyle.Secondary)).onExecute(async (i, cache) => {
	if (!i.guild) return i.reply({ content: 'You need to be in a server to use this button', ephemeral: true });

	const embeds = i.message.embeds;
	if (embeds.length == 0) return i.reply({ content: 'No embeds found', ephemeral: true });

	const rawEmbed = embeds[0];
	const embed = new EmbedBuilder(rawEmbed.data);

	embed.setTitle('Action Processed');
	embed.setFooter({
		text: 'Processed by ' + i.user.username,
		iconURL: i.user.displayAvatarURL({}),
	});
	embed.setTimestamp(new Date());
	embed.setColor('#00FF00');

	try {
		await i.message.edit({ embeds: [embed] });
		await i.deferReply({ ephemeral: true });
		await i.deleteReply();
	} catch (err) {
		console.log(err);
		await i.reply({ content: 'An error occurred while fetching the role', ephemeral: true });
	}
});
