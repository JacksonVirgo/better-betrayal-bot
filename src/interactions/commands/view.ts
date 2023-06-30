import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { formatAbilityEmbed, formatInventory, formatItemEmbed, formatPerkEmbed, formatRoleEmbed, formatRolePlainText, formatStatusEmbed } from '../../util/embeds';
import viewRoleButton from '../buttons/viewRole';
import { prisma } from '../../database';
import { findBestMatch } from 'string-similarity';
import viewChangesButton from '../buttons/viewChanges';
import { getAbility, getClosestItem, getClosestStatusName, getInventory, getPerk, getRole, getStatus } from '../../util/database';

const data = new SlashCommandBuilder().setName('view').setDescription('View information about Betrayal');

data.addSubcommand((sub) =>
	sub
		.setName('role')
		.setDescription('View a role')
		.addStringOption((opt) => opt.setName('name').setDescription('The role to view').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
		.addBooleanOption((opt) => opt.setName('plaintext').setDescription('View the role in plaintext'))
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

data.addSubcommand((sub) =>
	sub
		.setName('inventory')
		.setDescription('View your inventory (defaults to hidden outside of you channel)')
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
					return await viewRole(i);
				case 'ability':
					return await viewAbility(i);
				case 'perk':
					return await viewPerk(i);
				case 'item':
					return await viewItem(i);
				case 'status':
					return await viewStatus(i);
				case 'inventory':
					return await viewInventory(i);

				default:
					return await i.reply({ content: 'Invalid subcommand', ephemeral: true });
			}
		} catch (err) {
			console.log(`[ERROR VIEW COMMAND]`, err);
		}
	},
});

async function viewRole(i: ChatInputCommandInteraction) {
	if (!i.guild) return;
	const name = i.options.getString('name', true);
	const hidden = i.options.getBoolean('hidden') ?? false;
	const plaintext = i.options.getBoolean('plaintext') ?? false;
	await i.deferReply({ ephemeral: hidden });

	const allRoles = await prisma.role.findMany({ where: {}, select: { name: true } });
	const allRoleNames = allRoles.map((r) => r.name);
	const spellCheck = findBestMatch(name, allRoleNames);
	const bestMatch = spellCheck.bestMatch.target;

	const fetchedRole = await getRole(bestMatch);

	if (!fetchedRole) return i.reply({ content: `Role ${name} not found`, ephemeral: true });

	const correctionString = bestMatch.toLowerCase() != name.toLowerCase() ? `Did you mean __${bestMatch}__?` : undefined;

	if (!plaintext) {
		const embed = formatRoleEmbed(i.guild, fetchedRole);
		return await i.editReply({
			content: correctionString,
			embeds: [embed],
		});
	}

	const plaintextRolecard = formatRolePlainText(i.guild, fetchedRole);
	return await i.editReply({
		content: correctionString ? correctionString + '\n' + plaintextRolecard : plaintextRolecard,
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

	const ability = await getAbility(bestMatch);

	if (!ability) return i.reply({ content: `Ability ${name} not found`, ephemeral: true });
	const embed = formatAbilityEmbed(i.guild, ability);
	const row = new ActionRowBuilder<ButtonBuilder>();
	const attachments = ability.abilityAttachments;

	if (attachments) {
		for (const role of attachments.roles) {
			row.addComponents(new ButtonBuilder().setCustomId(viewRoleButton.createCustomID(role.name)).setLabel(`View ${role.name}`).setStyle(ButtonStyle.Secondary));
		}

		if (ability.changes.length > 0) {
			row.addComponents(new ButtonBuilder().setCustomId(viewChangesButton.createCustomID(ability.name)).setLabel(`View Upgrades/Downgrades`).setStyle(ButtonStyle.Secondary));
		}
	}

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

	const perk = await getPerk(bestMatch);
	if (!perk) return i.reply({ content: `Perk ${name} not found`, ephemeral: true });
	const attachment = perk.perkAttachments;

	const embed = formatPerkEmbed(i.guild, perk);

	const row = new ActionRowBuilder<ButtonBuilder>();

	if (attachment) {
		for (const role of attachment.roles) {
			row.addComponents(new ButtonBuilder().setCustomId(viewRoleButton.createCustomID(role.name)).setLabel(`View ${role.name}`).setStyle(ButtonStyle.Secondary));
		}
	}

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

	const { item, correctedName } = await getClosestItem(name);

	if (!item) return i.reply({ content: `Item ${name} not found`, ephemeral: true });

	const embed = formatItemEmbed(i.guild, item);

	return i.editReply({ content: correctedName.toLowerCase() != name.toLowerCase() ? `Did you mean __${correctedName}__?` : undefined, embeds: [embed] });
}

async function viewStatus(i: ChatInputCommandInteraction) {
	if (!i.guild) return;
	const name = i.options.getString('name', true);
	const hidden = i.options.getBoolean('hidden') ?? false;
	await i.deferReply({ ephemeral: hidden });

	const bestMatch = await getClosestStatusName(name);
	const fetchedStatus = await getStatus(bestMatch);

	if (!fetchedStatus) return i.reply({ content: `Status ${name} not found`, ephemeral: true });

	const embed = formatStatusEmbed(i.guild, fetchedStatus);
	return i.editReply({ content: bestMatch.toLowerCase() != name.toLowerCase() ? `Did you mean __${bestMatch}__?` : undefined, embeds: [embed] });
}

async function viewInventory(i: ChatInputCommandInteraction) {
	const hidden = i.options.getBoolean('hidden') ?? false;
	const inventory = await getInventory(i.user.id);
	if (!inventory) return i.reply({ content: 'You do not have an inventory', ephemeral: true });

	if (!i.channelId) return i.reply({ content: 'This command can only be used in a channel', ephemeral: true });

	const designatedChannel = i.channelId == inventory.channelId;

	await i.deferReply({ ephemeral: designatedChannel ? hidden : true });
	const { embed } = formatInventory(inventory);
	return i.editReply({ embeds: [embed] });
}
