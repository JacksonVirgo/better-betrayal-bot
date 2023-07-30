import { APIApplicationCommandOptionChoice, ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { prisma } from '../../database';
import { formatAbilityEmbed, formatRoleEmbed } from '../../util/embeds';
import { getAbility, getRole } from '../../util/database';
import { ActionCategory, ActionType } from '@prisma/client';

const data = new SlashCommandBuilder().setName('test').setDescription('Command to manage inventories');

export default newSlashCommand({
	data,
	mainServer: true,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
		if (i.user.id != '416757703516356628') return i.reply({ content: 'This command is currently disabled', ephemeral: true });

		await i.deferReply({ ephemeral: true });

		await i.deleteReply();
	},
});
