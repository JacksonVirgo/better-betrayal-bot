import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Colors, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { getRandomItem, getRandomRole } from '../../util/luck';
import { formatItemEmbed, formatRoleEmbed } from '../../util/embeds';
import viewRole from '../buttons/viewRole';

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

				default:
					return i.reply({ content: 'Invalid subcommand', ephemeral: true });
			}
		} catch (err) {
			console.log(`[ERROR RANDOM COMMAND]`, err);
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
	const randomGood = await getRandomRole('GOOD');
	const randomNeutral = await getRandomRole('NEUTRAL');
	const randomEvil = await getRandomRole('EVIL');

	if (!(randomGood && randomNeutral && randomEvil)) return i.reply({ content: 'Failed to fetch one of each alignment', ephemeral: true });

	const row = new ActionRowBuilder<ButtonBuilder>();
	row.addComponents(new ButtonBuilder().setCustomId(viewRole.createCustomID(randomGood.name)).setLabel(randomGood.name).setStyle(ButtonStyle.Success));
	row.addComponents(new ButtonBuilder().setCustomId(viewRole.createCustomID(randomNeutral.name)).setLabel(randomNeutral.name).setStyle(ButtonStyle.Secondary));
	row.addComponents(new ButtonBuilder().setCustomId(viewRole.createCustomID(randomEvil.name)).setLabel(randomEvil.name).setStyle(ButtonStyle.Danger));

	return i.reply({ content: 'Press the appropriate buttons to see the full role-cards', components: [row], ephemeral: hidden });
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
