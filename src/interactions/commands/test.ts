import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { array } from 'zod';
import { fetchAndFormatInventory, formatInventory } from '../../util/embeds';
import { prisma } from '../../database';
import { getClosestItem, getInventory } from '../../util/database';

const data = new SlashCommandBuilder().setName('test').setDescription('Development only. Command to test');

data.addSubcommand((sub) =>
	sub
		.setName('create')
		.setDescription('Create an inventory')
		.addChannelOption((opt) => opt.setName('channel').setDescription('The channel to create the inventory in').setRequired(true).addChannelTypes(ChannelType.GuildText))
		.addUserOption((opt) => opt.setName('user').setDescription('The user to create the inventory for').setRequired(true))
);

data.addSubcommand((sub) =>
	sub
		.setName('coins')
		.setDescription('Change the coins of an inventory')
		.addUserOption((opt) => opt.setName('user').setDescription('The user to change the coins of').setRequired(true))
		.addIntegerOption((opt) => opt.setName('amount').setDescription('The amount of coins to change').setRequired(true))
);

data.addSubcommand((sub) =>
	sub
		.setName('itemlimit')
		.setDescription('Change the item limit of an inventory')
		.addUserOption((opt) => opt.setName('user').setDescription('The user to change the limit of').setRequired(true))
		.addIntegerOption((opt) => opt.setName('amount').setDescription('The amount of limit to change to').setRequired(true))
);

data.addSubcommand((sub) =>
	sub
		.setName('additem')
		.setDescription('Add an item to an inventory')
		.addUserOption((opt) => opt.setName('user').setDescription('The user to add the item to').setRequired(true))
		.addStringOption((opt) => opt.setName('item').setDescription('The item to add').setRequired(true))
);

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });

		const subcommand = i.options.getSubcommand(true);
		switch (subcommand) {
			case 'create':
				return await createInventory(i);
			case 'coins':
				return await changeCoins(i);
			case 'itemlimit':
				return await changeItemLimit(i);
			case 'additem':
				return await addItem(i);
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

async function changeCoins(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const amount = i.options.getInteger('amount', true);

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: true });

	const newInventory = await prisma.inventory.update({
		where: {
			id: inventory.id,
		},
		data: {
			coins: amount,
		},
	});

	inventory.coins = newInventory.coins;

	const { embed } = formatInventory(inventory);

	return await i.editReply({ embeds: [embed] });
}

async function changeItemLimit(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const amount = i.options.getInteger('amount', true);

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: true });

	const newInventory = await prisma.inventory.update({
		where: {
			id: inventory.id,
		},
		data: {
			inventorySize: amount,
		},
	});

	inventory.inventorySize = newInventory.inventorySize;

	const { embed } = formatInventory(inventory);

	return await i.editReply({ embeds: [embed] });
}

async function addItem(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const item = i.options.getString('item', true);

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: true });

	const { item: fetchedItem } = await getClosestItem(item);
	if (!fetchedItem) return await i.editReply({ content: 'That item does not exist' });

	await prisma.ownedItem.create({
		data: {
			inventoryId: inventory.id,
			itemId: fetchedItem.id,
		},
	});

	const response = await fetchAndFormatInventory(user.id);
	if (!response) return await i.editReply({ content: 'That user does not have an inventory' });

	return await i.editReply({ embeds: [response.embed] });
}
