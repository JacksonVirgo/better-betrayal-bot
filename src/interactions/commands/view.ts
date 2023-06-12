import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { formatAbilityEmbed, formatItemEmbed, formatPerkEmbed, formatRoleEmbed, formatStatusEmbed } from '../../util/embeds';
import viewRoleButton from '../buttons/viewRole';
import { prisma } from '../../database';
import { findBestMatch } from 'string-similarity';

const data = new SlashCommandBuilder().setName('view').setDescription('View information about Betrayal');

data.addSubcommand((sub) =>
	sub
		.setName('role')
		.setDescription('View a role')
		.addStringOption((opt) => opt.setName('name').setDescription('The role to view').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);
data.addSubcommand((sub) =>
	sub
		.setName('ability')
		.setDescription('View an ability')
		.addStringOption((opt) => opt.setName('name').setDescription('The ability to view').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);
data.addSubcommand((sub) =>
	sub
		.setName('perk')
		.setDescription('View a perk')
		.addStringOption((opt) => opt.setName('name').setDescription('The perk to view').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);
data.addSubcommand((sub) =>
	sub
		.setName('item')
		.setDescription('View an item')
		.addStringOption((opt) => opt.setName('name').setDescription('The item to view').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);
data.addSubcommand((sub) =>
	sub
		.setName('status')
		.setDescription('View a specific status')
		.addStringOption((opt) => opt.setName('name').setDescription('The status to view').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return;

		const subcommand = i.options.getSubcommand(true);
		switch (subcommand) {
			case 'role':
				return await viewRole(i);
			case 'ability':
				return await viewAbility(i);
			case 'perk':
				return await viewPerk(i);
			case 'item':
				return await viewItem(i);
			case 'status':
				return await viewStatus(i);
			default:
				return await i.reply({ content: 'Invalid subcommand', ephemeral: true });
		}
	},
});

async function viewRole(i: ChatInputCommandInteraction) {
	if (!i.guild) return;
	const name = i.options.getString('name', true);
	const hidden = i.options.getBoolean('hidden') ?? false;
	await i.deferReply({ ephemeral: hidden });

	const allRoles = await prisma.role.findMany({ where: {}, select: { name: true } });
	const allRoleNames = allRoles.map((r) => r.name);
	const spellCheck = findBestMatch(name, allRoleNames);
	const bestMatch = spellCheck.bestMatch.target;

	const fetchedRole = await prisma.role.findUnique({
		where: {
			name: bestMatch,
		},
		include: {
			abilities: true,
			perks: true,
		},
	});

	if (!fetchedRole) return i.reply({ content: `Role ${name} not found`, ephemeral: true });

	const embed = formatRoleEmbed(i.guild, fetchedRole);

	return await i.editReply({
		content: bestMatch.toLowerCase() != name.toLowerCase() ? `Did you mean __${bestMatch}__?` : undefined,
		embeds: [embed],
	});
}

async function viewAbility(i: ChatInputCommandInteraction) {
	if (!i.guild) return;
	const name = i.options.getString('name', true);
	const hidden = i.options.getBoolean('hidden') ?? false;
	await i.deferReply({ ephemeral: hidden });

	const allAbilities = await prisma.ability.findMany({ where: {}, select: { name: true } });
	const allAbilityNames = allAbilities.map((a) => a.name);
	const spellCheck = findBestMatch(name, allAbilityNames);
	const bestMatch = spellCheck.bestMatch.target;
	const ability = await prisma.ability.findUnique({
		where: {
			name: bestMatch,
		},
		include: {
			role: {
				select: {
					name: true,
				},
			},
		},
	});

	if (!ability) return i.reply({ content: `Ability ${name} not found`, ephemeral: true });
	const embed = formatAbilityEmbed(i.guild, ability);
	const row = new ActionRowBuilder<ButtonBuilder>();
	row.addComponents(
		new ButtonBuilder()
			.setCustomId(viewRoleButton.createCustomID(ability.role.name))
			.setLabel(`View ${ability.role.name}`)
			.setStyle(ButtonStyle.Secondary)
	);
	// row.addComponents(
	// 	new ButtonBuilder()
	// 		.setCustomId(viewRoleButton.createCustomID(ability.role.name + '1'))
	// 		.setLabel(`More Details`)
	// 		.setStyle(ButtonStyle.Secondary)
	// );

	return await i.editReply({
		content: bestMatch.toLowerCase() != name.toLowerCase() ? `Did you mean __${bestMatch}__?` : undefined,
		embeds: [embed],
		components: [row],
	});
}

async function viewPerk(i: ChatInputCommandInteraction) {
	if (!i.guild) return;
	const name = i.options.getString('name', true);
	const hidden = i.options.getBoolean('hidden') ?? false;
	await i.deferReply({ ephemeral: hidden });

	const allPerks = await prisma.perk.findMany({ where: {}, select: { name: true } });
	const allPerkNames = allPerks.map((p) => p.name);
	const spellCheck = findBestMatch(name, allPerkNames);
	const bestMatch = spellCheck.bestMatch.target;

	const fetched = await prisma.perk.findUnique({
		where: {
			name: bestMatch,
		},
		include: {
			role: {
				select: {
					name: true,
				},
			},
		},
	});

	if (!fetched) return i.reply({ content: `Perk ${name} not found`, ephemeral: true });

	const embed = formatPerkEmbed(i.guild, fetched);

	const row = new ActionRowBuilder<ButtonBuilder>();
	row.addComponents(
		new ButtonBuilder()
			.setCustomId(viewRoleButton.createCustomID(fetched.role.name))
			.setLabel(`View ${fetched.role.name}`)
			.setStyle(ButtonStyle.Secondary)
	);

	return i.editReply({
		content: bestMatch.toLowerCase() != name.toLowerCase() ? `Did you mean __${bestMatch}__?` : undefined,
		embeds: [embed],
		components: [row],
	});
}

async function viewItem(i: ChatInputCommandInteraction) {
	if (!i.guild) return;
	const name = i.options.getString('name', true);
	const hidden = i.options.getBoolean('hidden') ?? false;
	await i.deferReply({ ephemeral: hidden });

	const allItems = await prisma.item.findMany({ where: {}, select: { name: true } });
	const allItemNames = allItems.map((i) => i.name);
	const spellCheck = findBestMatch(name, allItemNames);
	const bestMatch = spellCheck.bestMatch.target;

	const fetchedItem = await prisma.item.findUnique({
		where: {
			name: bestMatch,
		},
	});

	if (!fetchedItem) return i.reply({ content: `Item ${name} not found`, ephemeral: true });

	const embed = formatItemEmbed(i.guild, fetchedItem);
	return i.editReply({ content: bestMatch.toLowerCase() != name.toLowerCase() ? `Did you mean __${bestMatch}__?` : undefined, embeds: [embed] });
}

async function viewStatus(i: ChatInputCommandInteraction) {
	if (!i.guild) return;
	const name = i.options.getString('name', true);
	const hidden = i.options.getBoolean('hidden') ?? false;
	await i.deferReply({ ephemeral: hidden });

	const allStatuses = await prisma.status.findMany({ where: {}, select: { name: true } });
	const allStatusNames = allStatuses.map((s) => s.name);
	const spellCheck = findBestMatch(name, allStatusNames);
	const bestMatch = spellCheck.bestMatch.target;

	const fetchedStatus = await prisma.status.findUnique({
		where: {
			name: bestMatch,
		},
	});

	if (!fetchedStatus) return i.reply({ content: `Status ${name} not found`, ephemeral: true });

	const embed = formatStatusEmbed(i.guild, fetchedStatus);
	return i.editReply({ content: bestMatch.toLowerCase() != name.toLowerCase() ? `Did you mean __${bestMatch}__?` : undefined, embeds: [embed] });
}
