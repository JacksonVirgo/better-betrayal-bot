import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { array } from 'zod';
import { prisma } from '../../database';
import { formatInventory } from '../../util/embeds';

const data = new SlashCommandBuilder().setName('inventory').setDescription('Command to manage inventories');

data.addSubcommand((sub) =>
	sub
		.setName('create')
		.setDescription('Create an inventory')
		.addChannelOption((opt) => opt.setName('channel').setDescription('The channel to create the inventory in').setRequired(true).addChannelTypes(ChannelType.GuildText))
		.addUserOption((opt) => opt.setName('user').setDescription('The user to create the inventory for').setRequired(true))
);

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });

		const subcommand = i.options.getSubcommand(true);
		switch (subcommand) {
			case 'create':
				return await createInventory(i);
			default:
				return await i.reply({ content: 'Invalid subcommand', ephemeral: true });
		}
	},
});

async function createInventory(i: ChatInputCommandInteraction) {
	const channel = i.options.getChannel('channel', true);
	const user = i.options.getUser('user', true);

	const newInventory = await prisma.inventory.create({
		data: {
			channelId: channel.id,
			discordId: user.id,
		},
		include: {
			abilities: true,
			anyAbilities: {
				include: {
					ability: true,
				},
			},
			items: {
				include: {
					item: true,
				},
			},
			perks: true,
			statuses: {
				include: {
					status: true,
				},
			},
			immunities: true,
		},
	});

	const { embed } = formatInventory(newInventory);

	return await i.reply({ embeds: [embed] });
}
