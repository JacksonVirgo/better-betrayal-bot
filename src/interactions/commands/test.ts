import { APIApplicationCommandOptionChoice, ChannelType, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { prisma } from '../../database';
import { formatAbilityEmbed, formatRoleEmbed } from '../../util/embeds';
import { getAbility, getRole } from '../../util/database';
import { ActionCategory, ActionType, StatusName } from '@prisma/client';

const data = new SlashCommandBuilder().setName('test').setDescription('Command to manage inventories');

export default newSlashCommand({
	data,
	mainServer: true,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
		if (i.user.id != '416757703516356628') return i.reply({ content: 'This command is currently disabled', ephemeral: true });

		await i.deferReply({ ephemeral: false });

		const perks = await prisma.perk.findMany({
			where: {
				immunities: {
					isEmpty: false,
				},
			},
			include: {
				perkAttachments: {
					include: {
						roles: true,
					},
				},
			},
		});

		const immunities: Record<string, string[]> = {};

		for (const perk of perks) {
			for (const immunity of perk.immunities) {
				if (!immunities[immunity]) immunities[immunity] = [];
				immunities[immunity].push(perk.perkAttachments?.roles[0].name ?? 'Unknown');
			}
		}

		const embed = new EmbedBuilder();
		embed.setTitle('Perk Immunities');
		embed.setColor('#8964CE');

		for (const immunity in immunities) {
			const roles = immunities[immunity];
			embed.addFields({
				name: `${immunity} Immunity (${roles.length})`,
				value: roles.join(', '),
			});
		}

		await i.editReply({ embeds: [embed] });
	},
});
