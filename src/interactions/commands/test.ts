import { ActionRowBuilder, EmbedBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { abilities, abilityAttachments, items, perkAttachments, perks, roles } from '../../data';
import { prisma } from '../../database';
import { Role } from '@prisma/client';

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

		embed.setDescription('Done Items');
		await i.editReply({ embeds: [embed] });

		for (const perkRaw of perks) {
			try {
				await prisma.perk.create({
					data: {
						name: perkRaw.name,
						effect: perkRaw.effect,
						categories: perkRaw.categories,
						orderPriority: perkRaw.orderPriority,
					},
				});
			} catch (err) {
				console.log(err);
			}
		}

		embed.setDescription('Done Perks');
		await i.editReply({ embeds: [embed] });

		for (const ability of abilities) {
			try {
				await prisma.ability.create({
					data: {
						name: ability.name,
						effect: ability.effect,
						categories: ability.categories,
						orderPriority: ability.orderPriority,
						charges: ability.charges,
						actionType: ability.actionType,
						detailedEffect: ability.detailedEffect,
						isAnyAbility: ability.isAnyAbility,
						isRoleSpecific: ability.isRoleSpecific,
						rarity: ability.rarity,
						showCategories: ability.showCategories,
					},
				});
			} catch (err) {
				console.log(err);
			}
		}

		embed.setDescription('Done Abilities');
		await i.editReply({ embeds: [embed] });

		for (const role of roles) {
			try {
				await prisma.role.create({
					data: {
						alignment: role.alignment,
						name: role.name,
					},
				});
			} catch (err) {
				console.log(err);
			}
		}

		embed.setDescription('Done Roles');
		await i.editReply({ embeds: [embed] });

		for (const perkAttachment of perkAttachments) {
			try {
				let roles: number[] = [];
				for (const roleData of perkAttachment.roles) {
					const role = await prisma.role.findFirst({
						where: {
							name: roleData.name,
						},
					});
					if (role) roles.push(role.id);
				}

				const attachment = await prisma.perkAttachment.create({
					data: {
						perkId: perkAttachment.perkId,
					},
				});

				if (roles.length > 0) {
					await prisma.perkAttachment.update({
						where: {
							id: attachment.id,
						},
						data: {
							roles: {
								set: roles.map((role) => {
									return {
										id: role,
									};
								}),
							},
						},
					});
				}
			} catch (err) {
				console.log(err);
			}
		}

		embed.setDescription('Done Perk Attachments');
		await i.editReply({ embeds: [embed] });

		for (const abil of abilityAttachments) {
			try {
				let roles: number[] = [];
				for (const roleData of abil.roles) {
					const role = await prisma.role.findFirst({
						where: {
							name: roleData.name,
						},
					});
					if (role) roles.push(role.id);
				}

				const attachment = await prisma.abilityAttachment.create({
					data: {
						abilityId: abil.abilityId,
					},
				});

				if (roles.length > 0) {
					await prisma.abilityAttachment.update({
						where: {
							id: attachment.id,
						},
						data: {
							roles: {
								set: roles.map((role) => {
									return {
										id: role,
									};
								}),
							},
						},
					});
				}
			} catch (err) {
				console.log(err);
			}
		}

		embed.setDescription('Done Ability Attachments');
		await i.editReply({ embeds: [embed] });
	},
});
