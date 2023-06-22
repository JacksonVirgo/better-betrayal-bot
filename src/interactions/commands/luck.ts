import { ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { getLuckTable, getRandomAnyAbility, getRandomItem } from '../../util/luck';
import { prisma } from '../../database';
import { findBestMatch } from 'string-similarity';

const data = new SlashCommandBuilder().setName('luck').setDescription('View the luck table for a specific luck value');

data.addSubcommand((sub) =>
	sub
		.setName('table')
		.setDescription('View the luck table for a specific luck value')
		.addIntegerOption((opt) => opt.setName('luck').setDescription('The luck value to view').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);

data.addSubcommand((sub) =>
	sub
		.setName('itemrain')
		.setDescription('Calculate the items received by an item rain')
		.addIntegerOption((opt) => opt.setName('luck').setDescription('The luck value to view').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);

data.addSubcommand((sub) =>
	sub
		.setName('powerdrop')
		.setDescription('Calculate the AA received by a power drop')
		.addIntegerOption((opt) => opt.setName('luck').setDescription('The luck value to view').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);

data.addSubcommand((sub) =>
	sub
		.setName('carepackage')
		.setDescription('Calculate a care package')
		.addIntegerOption((opt) => opt.setName('luck').setDescription('The luck value to view').setRequired(false))
		.addIntegerOption((opt) => opt.setName('items').setDescription('Amount of items to have. Default 1').setRequired(false))
		.addIntegerOption((opt) => opt.setName('aas').setDescription('Amount of AAs to have. Default 1').setRequired(false))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return;

		const subcommand = i.options.getSubcommand(true);

		switch (subcommand) {
			case 'table':
				return showLuckTable(i);
			case 'itemrain':
				return calculateItemRain(i);
			case 'powerdrop':
				return calculatePowerDrop(i);
			case 'carepackage':
				return calculateCarePackage(i);
			default:
				return i.reply({ content: 'Invalid subcommand', ephemeral: true });
		}
	},
});

async function showLuckTable(i: ChatInputCommandInteraction) {
	const luck = i.options.getInteger('luck', true);
	const hidden = i.options.getBoolean('hidden') ?? false;
	const luckTable = getLuckTable(luck);
	const embed = new EmbedBuilder();
	embed.setTitle('Luck Table: ' + luck);
	embed.setColor(Colors.LuminousVividPink);

	embed.addFields(
		{
			name: 'Common',
			value: `> ${luckTable.common / 100}%`,
			inline: true,
		},
		{
			name: 'Uncommon',
			value: `> ${luckTable.uncommon / 100}%`,
			inline: true,
		},
		{
			name: 'Rare',
			value: `> ${luckTable.rare / 100}%`,
			inline: true,
		},
		{
			name: 'Epic',
			value: `> ${luckTable.epic / 100}%`,
			inline: true,
		},
		{
			name: 'Legendary',
			value: `> ${luckTable.legendary / 100}%`,
			inline: true,
		},
		{
			name: 'Mythical',
			value: `> ${luckTable.mythical / 100}%`,
			inline: true,
		}
	);

	return i.reply({ embeds: [embed], ephemeral: hidden });
}

async function calculateItemRain(i: ChatInputCommandInteraction) {
	const luck = i.options.getInteger('luck', true);
	const hidden = i.options.getBoolean('hidden') ?? false;
	await i.deferReply({ ephemeral: hidden });

	const itemCount = Math.floor(Math.random() * 3) + 1;
	const items: string[] = [];

	const luckTable = getLuckTable(luck);

	for (let i = 0; i < itemCount; i++) {
		const randomItem = await getRandomItem(luckTable);
		items.push(randomItem.name);
	}

	let message = '';
	for (let i = 0; i < itemCount; i++) {
		message += `**${items[i]}**`;
		if (i === itemCount - 2 && itemCount === 2) {
			message += ' and ';
		} else if (i !== itemCount - 1) {
			message += ', ';
		}
	}

	const embed = new EmbedBuilder();
	embed.setTitle(`Item Rain: ${luck} Luck`);
	embed.setColor(Colors.LuminousVividPink);
	embed.setDescription(`Received ${itemCount} items: ${message}`);

	return i.editReply({ embeds: [embed] });
}

async function calculatePowerDrop(i: ChatInputCommandInteraction) {
	const luck = i.options.getInteger('luck', true);
	const hidden = i.options.getBoolean('hidden') ?? false;

	await i.deferReply({ ephemeral: hidden });

	const luckTable = getLuckTable(luck);
	const ability = await getRandomAnyAbility(luckTable);

	const embed = new EmbedBuilder();
	embed.setTitle(`Power Drop: ${luck} Luck`);
	embed.setColor(Colors.LuminousVividPink);
	embed.setDescription(`Received **${ability.name}**`);

	if (ability.isRoleSpecific) {
		embed.setFooter({
			text: 'This contains role specific abilities.',
		});
	}

	return i.editReply({ embeds: [embed] });
}

async function calculateCarePackage(i: ChatInputCommandInteraction) {
	const luck = i.options.getInteger('luck') ?? 0;
	const itemCount = i.options.getInteger('items') ?? 1;
	const aaCount = i.options.getInteger('aas') ?? 1;
	const hidden = i.options.getBoolean('hidden') ?? false;
	await i.deferReply({ ephemeral: hidden });

	const items: string[] = [];
	const aas: string[] = [];
	const luckTable = getLuckTable(luck);

	for (let i = 0; i < itemCount; i++) {
		const item = await getRandomItem(luckTable);
		items.push(item.name);
	}

	let containsRoleSpecific = false;

	for (let j = 0; j < aaCount; j++) {
		const ability = await getRandomAnyAbility(luckTable);
		if (ability.isRoleSpecific) containsRoleSpecific = true;
		aas.push(ability.name);
	}

	let itemMessage = '';
	for (let i = 0; i < itemCount; i++) {
		itemMessage += `**${items[i]}**`;
		if (i === itemCount - 2 && itemCount === 2) {
			itemMessage += ' and ';
		} else if (i !== itemCount - 1) {
			itemMessage += ', ';
		}
	}

	let aaMessage = '';

	for (let i = 0; i < aaCount; i++) {
		aaMessage += `**${aas[i]}**`;
		if (i === aaCount - 2 && aaCount === 2) {
			aaMessage += ' and ';
		} else if (i !== aaCount - 1) {
			aaMessage += ', ';
		}
	}

	const embed = new EmbedBuilder();
	embed.setTitle(`Care Package: ${luck} Luck`);
	embed.setColor(Colors.LuminousVividPink);
	embed.setDescription(`Received ${itemCount} items: ${itemMessage}\nReceived ${aaCount} AAs: ${aaMessage}`);

	if (containsRoleSpecific) {
		embed.setFooter({
			text: 'This contains role specific abilities.',
		});
	}

	return i.editReply({ embeds: [embed] });
}
