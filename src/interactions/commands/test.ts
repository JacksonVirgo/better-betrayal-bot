import { ActionRowBuilder, EmbedBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { items } from '../../data';
import { prisma } from '../../database';

const data = new SlashCommandBuilder().setName('test').setDescription('Development only. Command to test');
export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
		// if (i.guildId != '1096058997477490861') return i.reply({ content: 'This command can only be used in the official server', ephemeral: true });

		await i.reply({ content: 'Loading database entries' });

		const embed = new EmbedBuilder().setTitle('MIGRATING DATABASE');
		embed.setColor('Grey');
		embed.setDescription(`**Migrating database entries**`);

		const update = {
			roles: 0,
			perks: 0,
			abilities: 0,
			statuses: 0,
			perkAttachments: 0,
			abilityAttachments: 0,
			items: 0,
		};

		for (const itemRaw of items) {
			try {
				await prisma.item.create({
					data: {
						name: itemRaw.name,
						effect: itemRaw.effect,
						rarity: itemRaw.rarity,
						actionType: itemRaw.actionType,
						bannedFromItemRain: itemRaw.bannedFromItemRain,
						categories: itemRaw.categories,
						cost: itemRaw.cost,
						customColour: itemRaw.customColour,
						detailedEffect: itemRaw.detailedEffect,
						iconURL: itemRaw.iconURL,
					},
				});
			} catch (err) {
				console.log(err);
			}
		}

		// const embed = new EmbedBuilder().setTitle('PENDING ACTION/S');
		// embed.setColor('Grey');
		// embed.setDescription(`**These actions have not been submitted**`);
		// embed.addFields({
		// 	name: 'Actions',
		// 	value: `1. Blah blah\n2. Blah blah`,
		// });
		// embed.setAuthor({
		// 	name: i.user.username,
		// 	iconURL: i.user.displayAvatarURL({}),
		// });

		// return i.reply({ embeds: [embed] });
	},
});
