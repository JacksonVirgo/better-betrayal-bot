import { ChannelType, ChatInputCommandInteraction, ColorResolvable, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { prisma } from '../../database';
import { Alignment, Item } from '@prisma/client';
import { RarityColors } from '../../util/colors';
import { formatRoleEmbed } from '../../util/embeds';
import { formatActionType, formatActionCategory } from '../../util/database';
import { capitalize } from '../../util/string';

const data = new SlashCommandBuilder().setName('post').setDescription('Staff only. Posts important stuff idk');

data.addStringOption((opt) =>
	opt.setName('thing').setDescription('The thing to post').setRequired(true).setChoices({
		name: 'Item Shop',
		value: 'itemshop',
	})
);

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });

		const thing = i.options.getString('thing', true);

		if (thing === 'itemshop') {
			return postItemShop(i);
		} else if (thing === 'rolelist') {
			return postRoleList(i);
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

	const ephemeral = true;

	await i.followUp({ embeds: [commonEmbed], ephemeral: ephemeral });
	await i.followUp({ embeds: [uncommonEmbed], ephemeral: ephemeral });
	await i.followUp({ embeds: [rareEmbed], ephemeral: ephemeral });
	await i.followUp({ embeds: [epicEmbed], ephemeral: ephemeral });
	await i.followUp({ embeds: [legendaryEmbed], ephemeral: ephemeral });
	await i.followUp({ embeds: [mythicEmbed], ephemeral: ephemeral });
	await i.followUp({ embeds: [unique], ephemeral: ephemeral });

	// await i.deleteReply();
}

async function postRoleList(i: ChatInputCommandInteraction) {
	const channel = i.channel;
	if (!channel) return;
	if (channel.type !== ChannelType.GuildText) return;
	if (!i.guild) return;

	const parent = channel.parent;
	if (!parent) return;

	await i.reply({ content: 'Going', ephemeral: true });

	const forum = await parent.children.create({
		name: 'role-list',
		type: ChannelType.GuildForum,
	});

	forum.setAvailableTags([
		{
			name: Alignment.GOOD,
			id: 'good',
		},
		{
			name: Alignment.NEUTRAL,
			id: 'neutral',
		},
		{
			name: Alignment.EVIL,
			id: 'evil',
		},
	]);

	// Iterate over all roles. 5 at a time through pagination and create a forum post for each

	const allRoles = await prisma.role.findMany({
		where: {},
		include: {
			abilities: true,
			perks: true,
		},
	});

	for (let index = 0; index < allRoles.length; index++) {
		const role = allRoles[index];
		const embed = formatRoleEmbed(i.guild, role);
		await forum.threads.create({
			name: allRoles[index].name,
			message: {
				embeds: [embed],
			},
			appliedTags: [role.alignment.toLowerCase()],
		});
	}
}
