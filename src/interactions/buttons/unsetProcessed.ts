import { ButtonBuilder, ButtonStyle, ColorResolvable, EmbedBuilder, EmbedData } from 'discord.js';
import { Button } from '../../structures/interactions';
import { getAverageColor } from 'fast-average-color-node';

export default new Button('unset-processed').setButton(new ButtonBuilder().setLabel('Set Not Processed').setStyle(ButtonStyle.Secondary)).onExecute(async (i, cache) => {
	if (!i.guild) return i.reply({ content: 'You need to be in a server to use this button', ephemeral: true });

	const embeds = i.message.embeds;
	if (embeds.length == 0) return i.reply({ content: 'No embeds found', ephemeral: true });
	await i.guild.members.fetch();

	const member = i.guild.members.cache.get(i.user.id);
	if (!member) return i.reply({ content: 'You need to be in the server to use this command', ephemeral: true });

	const rawEmbed = embeds[0];
	const avatarURL = member.displayAvatarURL({});
	const color = await getAverageColor(avatarURL);
	const embed = new EmbedBuilder(rawEmbed.data);

	embed.setTitle('Action Submitted');
	embed.setFooter(null);
	embed.setTimestamp(null);
	embed.setColor(color.hex as ColorResolvable);

	try {
		await i.message.edit({ embeds: [embed] });
		await i.deferReply({ ephemeral: true });
		await i.deleteReply();
	} catch (err) {
		console.log(err);
		await i.reply({ content: 'An error occurred while fetching the role', ephemeral: true });
	}
});
