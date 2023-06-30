import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder, TextChannel } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { FullInventory, fetchAndFormatInventory, formatInventory } from '../../util/embeds';
import { prisma } from '../../database';
import { getClosestAbilityName, getClosestImmunityName, getClosestItemName, getClosestStatusName, getInventory } from '../../util/database';

const data = new SlashCommandBuilder().setName('test').setDescription('Development only. Command to test');

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });

		try {
		} catch (err) {
			console.log(`[ERROR TEST COMMAND]`, err);
		}
	},
});
