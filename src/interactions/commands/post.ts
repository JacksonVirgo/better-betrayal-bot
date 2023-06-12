import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	ColorResolvable,
	EmbedBuilder,
	Message,
	MessagePayload,
	SlashCommandBuilder,
	TextChannel,
} from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { prisma } from '../../database';
import { formatItemEmbed } from '../../util/embeds';
import { fetchOrCreateWebhook } from '../../util/webhook';
import { REST } from 'discord.js';
import { client } from '../..';
import { Item, Rarity } from '@prisma/client';
import { RarityColors } from '../../util/colors';

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
			else label = `${item.cost}`;
			if (!canBeRanded && canBeBought) label += ' - Cannot be Randed';
			const effect = item.effect.split('\\n').join('\n');
			e.addFields({
				name: `${item.name} - [${label}]`,
				value: effect,
			});
		}

		e.setFooter({ text: '\u200B', iconURL: iconURL ?? undefined });

		return e;
	};

	const commonEmbed = formatEmbed(
		'Common',
		RarityColors.COMMON,
		await prisma.item.findMany({
			where: {
				rarity: 'COMMON',
			},
		})
	);

	const uncommonEmbed = formatEmbed(
		'Uncommon',
		RarityColors.UNCOMMON,
		await prisma.item.findMany({
			where: {
				rarity: 'UNCOMMON',
			},
		})
	);

	const rareEmbed = formatEmbed(
		'Rare',
		RarityColors.RARE,
		await prisma.item.findMany({
			where: {
				rarity: 'RARE',
			},
		})
	);

	const epicEmbed = formatEmbed(
		'Epic',
		RarityColors.EPIC,
		await prisma.item.findMany({
			where: {
				rarity: 'EPIC',
			},
		})
	);

	const legendaryEmbed = formatEmbed(
		'Legendary',
		RarityColors.LEGENDARY,
		await prisma.item.findMany({
			where: {
				rarity: 'LEGENDARY',
			},
		})
	);

	const mythicEmbed = formatEmbed(
		'Mythical',
		RarityColors.MYTHICAL,
		await prisma.item.findMany({
			where: {
				rarity: 'MYTHICAL',
			},
		})
	);

	const unique = formatEmbed(
		'Unique',
		RarityColors.UNIQUE,
		await prisma.item.findMany({
			where: {
				rarity: 'UNIQUE',
			},
		})
	);

	const channel = i.channel;

	if (!channel) return;

	channel.send({ embeds: [commonEmbed] });
	channel.send({ embeds: [uncommonEmbed] });
	channel.send({ embeds: [rareEmbed] });
	channel.send({ embeds: [epicEmbed] });
	channel.send({ embeds: [legendaryEmbed] });
	channel.send({ embeds: [mythicEmbed] });
	channel.send({ embeds: [unique] });

	await i.deleteReply();
}
