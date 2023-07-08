import { ActionRowBuilder, EmbedBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';

const data = new SlashCommandBuilder().setName('test').setDescription('Development only. Command to test');
export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
		// if (i.guildId != '1096058997477490861') return i.reply({ content: 'This command can only be used in the official server', ephemeral: true });

		const embed = new EmbedBuilder().setTitle('PENDING ACTION/S');
		embed.setColor('Grey');
		embed.setDescription(`**These actions have not been submitted**`);
		embed.addFields({
			name: 'Actions',
			value: `1. Blah blah\n2. Blah blah`,
		});
		embed.setAuthor({
			name: i.user.username,
			iconURL: i.user.displayAvatarURL({}),
		});

		return i.reply({ embeds: [embed] });
	},
});
