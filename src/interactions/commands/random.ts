import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	Colors,
	Embed,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { getRandomItem, getRandomRole } from '../../util/luck';
import { formatItemEmbed, formatRoleEmbed } from '../../util/embeds';
import viewRole from '../buttons/viewRole';
import { cache, prisma } from '../../database';
import { getClosestRoleName, getRole } from '../../util/database';

const data = new SlashCommandBuilder().setName('random').setDescription('View commands that give you a random result');

data.addSubcommand((sub) =>
	sub
		.setName('role')
		.setDescription('Get a random role')
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);
data.addSubcommand((sub) =>
	sub
		.setName('deceptionist')
		.setDescription('Get a random deceptionist pick of 3 roles of each alignment')
		.addStringOption((opt) => opt.setName('good-role').setDescription('The good role to use').setRequired(false).setAutocomplete(true))
		.addStringOption((opt) => opt.setName('neutral-role').setDescription('The neutral role to use').setRequired(false).setAutocomplete(true))
		.addStringOption((opt) => opt.setName('evil-role').setDescription('The evil role to use').setRequired(false).setAutocomplete(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);
data.addSubcommand((sub) =>
	sub
		.setName('setup')
		.setDescription('Get a randomised setup')
		.addIntegerOption((opt) => opt.setName('players').setDescription('The amount of players').setRequired(true))
		.addIntegerOption((opt) => opt.setName('deceptionists').setDescription('The amount of deceptionist picks to get').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);
data.addSubcommand((sub) =>
	sub
		.setName('item')
		.setDescription('Get a random item. FOR LUCK USE /luck itemrain')
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);
data.addSubcommand((sub) =>
	sub
		.setName('dice')
		.setDescription('Roll a dice')
		.addIntegerOption((opt) => opt.setName('sides').setDescription('The amount of sides the dice has').setRequired(true))
		.addIntegerOption((opt) => opt.setName('amount').setDescription('The amount of dice to roll').setRequired(false))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);
export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return;
		try {
			const subcommand = i.options.getSubcommand(true);

			switch (subcommand) {
				case 'role':
					showRandomRole(i);
					break;
				case 'deceptionist':
					showDeceptionistPick(i);
					break;
				case 'item':
					showRandomItem(i);
					break;
				case 'dice':
					showDiceRole(i);
					break;

				case 'setup':
					showFullDecept(i);
					break;

				default:
					return i.reply({ content: 'Invalid subcommand', ephemeral: true });
			}
		} catch (err) {
			console.log(`[ERROR RANDOM COMMAND]`, err);
		}
	},
	autocomplete: async (i) => {
		const subcommand = i.options.getSubcommand(true);
		const focused = i.options.getFocused(true);

		switch (subcommand) {
			case 'deceptionist':
				let roles = focused.name == 'good-role' ? cache.goodRoles : focused.name == 'neutral-role' ? cache.neutralRoles : cache.evilRoles;
				let filtered = roles.filter((role) => role.toLowerCase().startsWith(focused.value.toLowerCase()));
				filtered = filtered.splice(0, Math.min(filtered.length, 25));
				return await i.respond(filtered.map((match) => ({ name: match, value: match })));
			default:
				return i.respond([]);
		}
	},
});

async function showRandomRole(i: ChatInputCommandInteraction) {
	if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
	const hidden = i.options.getBoolean('hidden') ?? false;

	const randomRole = await getRandomRole();
	if (!randomRole) return i.reply({ content: 'No role found', ephemeral: true });
	const embed = formatRoleEmbed(i.guild, randomRole);
	return i.reply({ embeds: [embed], ephemeral: hidden });
}

async function showDeceptionistPick(i: ChatInputCommandInteraction) {
	if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
	const hidden = i.options.getBoolean('hidden') ?? false;

	const goodRole = i.options.getString('good-role');
	const neutralRole = i.options.getString('neutral-role');
	const evilRole = i.options.getString('evil-role');

	const randomGood = goodRole ? await getClosestRoleName(goodRole) : (await getRandomRole('GOOD'))?.name;
	const randomNeutral = neutralRole ? await getClosestRoleName(neutralRole) : (await getRandomRole('NEUTRAL'))?.name;
	const randomEvil = evilRole ? await getClosestRoleName(evilRole) : (await getRandomRole('EVIL'))?.name;

	if (!(randomGood && randomNeutral && randomEvil)) return i.reply({ content: 'Failed to fetch one of each alignment', ephemeral: true });

	const row = new ActionRowBuilder<ButtonBuilder>();
	row.addComponents(new ButtonBuilder().setCustomId(viewRole.createCustomID(randomGood)).setLabel(randomGood).setStyle(ButtonStyle.Success));
	row.addComponents(
		new ButtonBuilder().setCustomId(viewRole.createCustomID(randomNeutral)).setLabel(randomNeutral).setStyle(ButtonStyle.Secondary)
	);
	row.addComponents(new ButtonBuilder().setCustomId(viewRole.createCustomID(randomEvil)).setLabel(randomEvil).setStyle(ButtonStyle.Danger));

	return i.reply({ content: 'Press the appropriate buttons to see the full role-cards', components: [row], ephemeral: hidden });
}

async function showFullDecept(i: ChatInputCommandInteraction) {
	if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
	const hidden = i.options.getBoolean('hidden') ?? false;
	const decepts = i.options.getInteger('deceptionists', true);
	const players = i.options.getInteger('players', true);

	const goodAmount = await prisma.role.count({ where: { alignment: 'GOOD' } });
	const neutralAmount = await prisma.role.count({ where: { alignment: 'NEUTRAL' } });
	const evilAmount = await prisma.role.count({ where: { alignment: 'EVIL' } });

	if (decepts > goodAmount && decepts > neutralAmount && decepts > evilAmount)
		return i.reply({ content: 'Not enough roles to generate a setup', ephemeral: true });

	const totalNormalPlayers = players - decepts;

	let goods: string[] = [];
	let neutrals: string[] = [];
	let evils: string[] = [];
	let normalRoles: string[] = [];

	await i.deferReply({ ephemeral: hidden });

	while (goods.length < decepts) {
		const randomGood = (await getRandomRole('GOOD'))?.name;
		if (!randomGood) return i.editReply({ content: 'Failed to fetch a good role' });
		if (!goods.includes(randomGood)) goods.push(randomGood);
	}

	while (neutrals.length < decepts) {
		const randomNeutral = (await getRandomRole('NEUTRAL'))?.name;
		if (!randomNeutral) return i.editReply({ content: 'Failed to fetch a neutral role' });
		if (!neutrals.includes(randomNeutral)) neutrals.push(randomNeutral);
	}

	while (evils.length < decepts) {
		const randomEvil = (await getRandomRole('EVIL'))?.name;
		if (!randomEvil) return i.editReply({ content: 'Failed to fetch a evil role' });
		if (!evils.includes(randomEvil)) evils.push(randomEvil);
	}

	while (normalRoles.length < totalNormalPlayers) {
		const randomRole = (await getRandomRole())?.name;
		if (!randomRole) return i.editReply({ content: 'Failed to fetch a role' });
		if (!normalRoles.includes(randomRole)) normalRoles.push(randomRole);
	}

	let allDeceptionistRoles = [...goods, ...neutrals, ...evils];

	const embed = new EmbedBuilder();
	embed.setTitle(`Game Setup for ${players} Players`);
	embed.setColor('#FFFFFF');
	embed.setDescription(`${decepts} deceptionists\n^ = Deceptionist conflict`);

	let setup: string[] = [];
	for (let i = 0; i < decepts; i++) {
		setup.push(`${goods[i]} / ${neutrals[i]} / ${evils[i]}`);
	}

	for (let i = 0; i < totalNormalPlayers; i++) {
		setup.push(`${allDeceptionistRoles.includes(normalRoles[i]) ? '- ' : ''}${normalRoles[i]}`);
	}

	if (setup.length < 1) return i.editReply({ content: 'Failed to generate a setup' });

	embed.setFields({
		name: 'Roles',
		value: `\`\`\`diff\n${setup.join('\n').trim()}\`\`\``,
	});

	return i.editReply({ embeds: [embed] });
}

async function showRandomItem(i: ChatInputCommandInteraction) {
	if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
	const hidden = i.options.getBoolean('hidden') ?? false;

	const randomItem = await getRandomItem();
	if (!randomItem) return i.reply({ content: 'No item found', ephemeral: true });

	const embed = formatItemEmbed(i.guild, randomItem);
	return i.reply({ embeds: [embed], ephemeral: hidden });
}

async function showDiceRole(i: ChatInputCommandInteraction) {
	if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
	const hidden = i.options.getBoolean('hidden') ?? false;

	const sides = i.options.getInteger('sides', true);
	const amount = i.options.getInteger('amount') ?? 1;

	if (sides < 1) return i.reply({ content: 'The amount of sides must be at least 1', ephemeral: true });
	if (amount < 1) return i.reply({ content: 'The amount of dice must be at least 1', ephemeral: true });

	const rolls = [];

	for (let i = 0; i < amount; i++) {
		rolls.push(Math.floor(Math.random() * sides) + 1);
	}

	const embed = new EmbedBuilder()
		.setColor(Colors.Blurple)
		.setTitle('Dice roll')
		.setDescription(`You rolled ${amount} dice with ${sides} sides`)
		.addFields(
			{
				name: 'Total',
				value: rolls.reduce((a, b) => a + b, 0).toString(),
			},
			{
				name: 'Rolls',
				value: rolls.join(', '),
			}
		);

	return i.reply({ embeds: [embed], ephemeral: hidden });
}
