import { AttachmentBuilder, ChannelType, ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { prisma } from '../../database';
import { Ability, Alignment, Item, Rarity } from '@prisma/client';
import { RarityColors } from '../../util/colors';
import { formatRoleEmbed } from '../../util/embeds';
import { formatActionType, formatActionCategory } from '../../util/database';
import { capitalize } from '../../util/string';

const data = new SlashCommandBuilder().setName('post').setDescription('Staff only. Posts important stuff idk');

data.addStringOption((opt) =>
	opt.setName('thing').setDescription('The thing to post').setRequired(true).setChoices(
		{
			name: 'Item Shop',
			value: 'itemshop',
		},
		{
			name: 'AAs',
			value: 'aa',
		}
	)
);

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
		if (i.guildId != '1096058997477490861') return i.reply({ content: 'This command can only be used in the official server', ephemeral: true });

		try {
			const thing = i.options.getString('thing', true);

			if (thing === 'itemshop') {
				return postItemShop(i);
			} else if (thing === 'aa') {
				return postAAs(i);
			}
		} catch (err) {
			console.log(`[ERROR POST COMMAND]`, err);
		}
	},
});

async function postItemShop(i: ChatInputCommandInteraction) {
	if (!i.guild) return;
	const iconURL = i.guild.iconURL({ extension: 'png', size: 1024 });

	await i.deferReply({ ephemeral: true });

	const formatEmbed = (title: string, color: ColorResolvable, items: Item[]) => {
		const e = new EmbedBuilder();
		e.setTitle(`Item Shop - ${title}`);
		e.setColor(color);

		for (const item of items) {
			const canBeBought = item.cost !== 0;
			const canBeRanded = item.bannedFromItemRain !== true;
			let label = '';
			if (!canBeBought && !canBeRanded) label = 'Cannot be Bought/Randed';
			else if (!canBeBought) label = 'Cannot be Bought';
			else label = `${item.cost ?? 'Cannot be Bought'}`;
			if (!canBeRanded && canBeBought) label += ' - Cannot be Randed';
			const effect = item.effect.split('\\n').join('\n');
			const extraEffect = item.detailedEffect?.split('\\n').join('\n');

			let footerList: string[] = [capitalize(item.rarity)];

			if (item.actionType) {
				const type = formatActionType(item.actionType);
				if (type) footerList.push(type);
			}

			for (const category of item.categories) {
				const cat = formatActionCategory(category);
				if (cat) footerList.push(cat);
			}

			e.addFields({
				name: `${item.name} - [${label}] - ${footerList.join(' · ')}`,
				value: effect,
			});
			if (extraEffect) {
				e.addFields({
					name: '\u200B',
					value: extraEffect,
				});
			}
		}

		e.setFooter({ text: '\u200B', iconURL: iconURL ?? undefined });

		return e;
	};

	const commonEmbed = formatEmbed(
		'Common',
		RarityColors.COMMON,
		(
			await prisma.item.findMany({
				where: {
					rarity: 'COMMON',
				},
			})
		).sort((a, b) => a.id - b.id)
	);

	const uncommonEmbed = formatEmbed(
		'Uncommon',
		RarityColors.UNCOMMON,
		(
			await prisma.item.findMany({
				where: {
					rarity: 'UNCOMMON',
				},
			})
		).sort((a, b) => a.id - b.id)
	);

	const rareEmbed = formatEmbed(
		'Rare',
		RarityColors.RARE,
		(
			await prisma.item.findMany({
				where: {
					rarity: 'RARE',
				},
			})
		).sort((a, b) => a.id - b.id)
	);

	const epicEmbed = formatEmbed(
		'Epic',
		RarityColors.EPIC,
		(
			await prisma.item.findMany({
				where: {
					rarity: 'EPIC',
				},
			})
		).sort((a, b) => a.id - b.id)
	);

	const legendaryEmbed = formatEmbed(
		'Legendary',
		RarityColors.LEGENDARY,
		(
			await prisma.item.findMany({
				where: {
					rarity: 'LEGENDARY',
				},
			})
		).sort((a, b) => a.id - b.id)
	);

	const mythicEmbed = formatEmbed(
		'Mythical',
		RarityColors.MYTHICAL,
		(
			await prisma.item.findMany({
				where: {
					rarity: 'MYTHICAL',
				},
			})
		).sort((a, b) => a.id - b.id)
	);

	const unique = formatEmbed(
		'Unique',
		RarityColors.UNIQUE,
		(
			await prisma.item.findMany({
				where: {
					rarity: 'UNIQUE',
				},
			})
		).sort((a, b) => a.id - b.id)
	);

	const channel = i.channel;

	if (!channel) return;

	const ephemeral = false;

	await channel.send({ embeds: [commonEmbed] });
	await channel.send({ embeds: [uncommonEmbed] });
	await channel.send({ embeds: [rareEmbed] });
	await channel.send({ embeds: [epicEmbed] });
	await channel.send({ embeds: [legendaryEmbed] });
	await channel.send({ embeds: [mythicEmbed] });
	await channel.send({ embeds: [unique] });

	// await i.deleteReply();
}

async function postAAs(i: ChatInputCommandInteraction) {
	if (!i.guild) return;
	const iconURL = i.guild.iconURL({ extension: 'png', size: 1024 });

	await i.deferReply({ ephemeral: false });

	const commons = await getAnyAbilities('COMMON');
	const uncommons = await getAnyAbilities('UNCOMMON');
	const rares = await getAnyAbilities('RARE');
	const epics = await getAnyAbilities('EPIC');
	const legendaries = await getAnyAbilities('LEGENDARY');

	await i.editReply({ files: [commons, uncommons, rares, epics, legendaries] });
}

async function getAnyAbilities(rarity: Rarity) {
	const anyAbilities = await prisma.ability.findMany({
		where: {
			rarity: rarity,
		},
		include: {
			abilityAttachments: {
				include: {
					roles: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	});

	const abilities: string[] = [];
	const roleSpecific: string[] = [];

	for (const ability of anyAbilities) {
		if (!ability.isRoleSpecific) {
			abilities.push(`${ability.name} - ${ability.effect}`);
			continue;
		}

		if (!ability.abilityAttachments) continue;
		const roles = ability.abilityAttachments.roles.map((r) => r.name);
		if (roles[0]) roleSpecific.push(`${ability.name} [${roles[0]}]`);
	}

	const value = `${capitalize(rarity)} AAs\n\n` + abilities.join('\n\n') + '\n\n' + roleSpecific.join('\n');

	const attachment = new AttachmentBuilder(Buffer.from(value)).setName('commons.txt');

	return attachment;
}
