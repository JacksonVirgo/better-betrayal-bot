import { ActionRow, ActionRowBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { cache } from '../../database';
import config from '../../config';

const data = new SlashCommandBuilder().setName('action').setDescription('Submit an action');

data.addSubcommand((sub) => sub.setName('custom').setDescription('Submit a custom action, ONLY USE when nothing else works'));

export default newSlashCommand({
	data,
	mainServer: true,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
		if (i.guildId != config.MAIN_SERVER_ID) return i.reply({ content: 'This command can only be used in the official server', ephemeral: true });

		const subcommand = i.options.getSubcommand(true);

		switch (subcommand) {
			case 'custom':
				const modal = new ModalBuilder();
				modal.setTitle('Custom Action');
				modal.setCustomId('submit-custom-action');
				modal.addComponents(
					new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setLabel('Action/s').setStyle(TextInputStyle.Paragraph).setRequired(true).setCustomId('actions'))
				);
				return i.showModal(modal);
		}
	},
});
