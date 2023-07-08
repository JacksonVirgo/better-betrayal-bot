import {
	SlashCommandBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
	ActionRowBuilder,
	AutocompleteInteraction,
	ChannelType,
	EmbedBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	GuildMember,
} from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { cache, prisma } from '../../database';

const data = new SlashCommandBuilder().setName('action').setDescription('Register an action');

data.addSubcommand((sub) =>
	sub
		.setName('ability')
		.setDescription('Request to use an ability')
		.addStringOption((opt) => opt.setName('name').setDescription('The ability to use').setRequired(true).setAutocomplete(true))
		.addUserOption((opt) => opt.setName('target').setDescription('The focus user to target. Self-use abilities do not require this'))
		.addIntegerOption((opt) => opt.setName('time').setDescription('The time to use the ability at').setRequired(false))
);

type Action = {
	author: string;
	action: string;
	targets?: string[];
	timestamp?: number;
};

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
		if (i.guildId != '1096058997477490861') return i.reply({ content: 'This command can only be used in the official server', ephemeral: true });
		await i.guild.members.fetch();
		const member = i.guild.members.cache.get(i.user.id);
		if (!member) return;

		return processAbilityAction(i, member);
	},
	autocomplete: async (i: AutocompleteInteraction) => {
		const focusedValue = i.options.getFocused();

		const subcommand = i.options.getSubcommand(false);
		if (!subcommand) return await i.respond([]);

		switch (subcommand) {
			case 'ability':
				let allMatchingAbilities = cache.abilities.filter((ability) => ability.toLowerCase().startsWith(focusedValue.toLowerCase()));
				allMatchingAbilities = allMatchingAbilities.splice(0, Math.min(allMatchingAbilities.length, 25));
				return await i.respond(allMatchingAbilities.map((match) => ({ name: match, value: match })));
			case 'perk':
				let allMatchingPerks = cache.perks.filter((perk) => perk.toLowerCase().startsWith(focusedValue.toLowerCase()));
				allMatchingPerks = allMatchingPerks.splice(0, Math.min(allMatchingPerks.length, 25));
				return await i.respond(allMatchingPerks.map((match) => ({ name: match, value: match })));
			case 'item':
				let allMatchingItems = cache.items.filter((item) => item.toLowerCase().startsWith(focusedValue.toLowerCase()));
				allMatchingItems = allMatchingItems.splice(0, Math.min(allMatchingItems.length, 25));
				return await i.respond(allMatchingItems.map((match) => ({ name: match, value: match })));
			default:
				return await i.respond([]);
		}
	},
});

async function processAbilityAction(i: ChatInputCommandInteraction, member: GuildMember) {
	if (!i.guild) return;
	await i.deferReply({ ephemeral: true });

	const ability = i.options.getString('name', true);
	const target = i.options.getUser('target', false);
	const timestamp = i.options.getInteger('time', false);

	const inventory = await prisma.inventory.findUnique({
		where: {
			discordId: i.user.id,
		},
	});

	if (!inventory) return i.reply({ content: 'You need to be a player to use this command', ephemeral: true });
	// if (i.channel.id != inventory.channelId) return i.reply({ content: `You need to be in your confessional (<#${inventory.channelId}>) to use this command`, ephemeral: true });

	await i.guild.channels.fetch();
	const actionChannel = i.guild.channels.cache.find((c) => c.name === 'action-funnel');

	if (!actionChannel || actionChannel.type != ChannelType.GuildText)
		return i.reply({ content: 'Action funnel channel not found. Please tell the host/s your actions directly instead.', ephemeral: true });

	const action: Action = {
		action: ability,
		author: member.displayName,
		targets: [target?.username ?? ''],
		// timestamp: timestamp,
	};

	const proposedAction = `Using \`${ability}\`${target ? ` on ${target}` : ''}`;

	const embed = new EmbedBuilder();
	embed.setColor('Grey');
	embed.setDescription(proposedAction);
	embed.setAuthor({
		name: member.displayName,
		iconURL: i.user.displayAvatarURL({}),
	});

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder().setCustomId('action-funnel_process').setLabel('Toggle Processed').setStyle(ButtonStyle.Secondary),
		new ButtonBuilder().setCustomId('action-funnel_notes').setLabel('Edit Host Notes').setStyle(ButtonStyle.Secondary)
	);

	await actionChannel.send({ embeds: [embed], components: [row] });
	await i.deleteReply();
}
