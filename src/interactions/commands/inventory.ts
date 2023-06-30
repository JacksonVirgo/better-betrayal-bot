import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { prisma } from '../../database';
import { FullInventory, fetchAndFormatInventory, formatInventory } from '../../util/embeds';
import { getClosestAbilityName, getClosestImmunityName, getClosestItemName, getClosestStatusName, getInventory } from '../../util/database';

const data = new SlashCommandBuilder().setName('inventory').setDescription('Command to manage inventories');

data.addSubcommand((sub) =>
	sub
		.setName('create')
		.setDescription('Create an inventory')
		.addChannelOption((opt) => opt.setName('channel').setDescription('The channel to create the inventory in').setRequired(true).addChannelTypes(ChannelType.GuildText))
		.addUserOption((opt) => opt.setName('user').setDescription('The user to create the inventory for').setRequired(true))
);

data.addSubcommand((sub) =>
	sub
		.setName('delete')
		.setDescription('Delete an inventory')
		.addChannelOption((opt) => opt.setName('channel').setDescription('The channel to create the inventory in').setRequired(false).addChannelTypes(ChannelType.GuildText))
		.addUserOption((opt) => opt.setName('user').setDescription('The user to delete the inventory for').setRequired(false))
);

data.addSubcommand((sub) =>
	sub
		.setName('view')
		.setDescription('View an inventory')
		.addUserOption((opt) => opt.setName('user').setDescription('The user to view the inventory for').setRequired(true))
		.addBooleanOption((opt) => opt.setName('hidden').setDescription('To make this for only you to see'))
);

data.addSubcommand((sub) =>
	sub
		.setName('set')
		.setDescription('Set a few core values of an inventory')
		.addUserOption((opt) => opt.setName('user').setDescription('The user to change the values for').setRequired(true))
		.addIntegerOption((opt) => opt.setName('coins').setDescription('The amount of coins to set').setRequired(false))
		.addIntegerOption((opt) => opt.setName('itemlimit').setDescription('The item limit to set').setRequired(false))
		.addIntegerOption((opt) => opt.setName('coinbonus').setDescription('The coin bonus % to set. Percent without the period. 500 = 5%.').setRequired(false))
);

data.addSubcommandGroup((group) =>
	group
		.setName('item')
		.setDescription('Item related commands')
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add an item to an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('item').setDescription('The item to add').setRequired(true))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the name').setRequired(false))
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove an item from an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('item').setDescription('The item to remove').setRequired(true))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the name').setRequired(false))
		)
);

data.addSubcommandGroup((group) =>
	group
		.setName('aa')
		.setDescription('AA related commands')
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add an AA to an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('ability').setDescription('The name of the AA to add').setRequired(true))
				.addIntegerOption((opt) => opt.setName('charges').setDescription('The amount of charges to set initially').setRequired(false))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the name').setRequired(false))
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove an AA from an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('ability').setDescription('The name of the AA').setRequired(true))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the name').setRequired(false))
		)
		.addSubcommand((sub) =>
			sub
				.setName('update')
				.setDescription('Update an AA from an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('ability').setDescription('The name of the AA').setRequired(true))
				.addIntegerOption((opt) => opt.setName('charges').setDescription('The amount of charges to set').setRequired(false))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the name').setRequired(false))
		)
);

data.addSubcommandGroup((group) =>
	group
		.setName('status')
		.setDescription('Status related commands')
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add a status to an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('status').setDescription('The name of the status to add').setRequired(true))
				.addIntegerOption((opt) => opt.setName('expiry').setDescription('Discord timestamp (number only).').setRequired(false))
				.addIntegerOption((opt) => opt.setName('xfold').setDescription('Designate how many X-fold. Default none').setRequired(false))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the name').setRequired(false))
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove a status from an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('status').setDescription('The name of the status').setRequired(true))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the name').setRequired(false))
		)
		.addSubcommand((sub) =>
			sub
				.setName('update')
				.setDescription('Update a status from an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('status').setDescription('The name of the status to add').setRequired(true))
				.addIntegerOption((opt) => opt.setName('expiry').setDescription('Discord timestamp (number only).').setRequired(false))
				.addIntegerOption((opt) => opt.setName('xfold').setDescription('Designate how many X-fold. Default none').setRequired(false))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the name').setRequired(false))
		)
);

data.addSubcommandGroup((group) =>
	group
		.setName('immunity')
		.setDescription('Immunity related commands')
		.addSubcommand((sub) =>
			sub
				.setName('add')
				.setDescription('Add an immunity to an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('immunity').setDescription('The name of the immunity to add').setRequired(true))
				.addIntegerOption((opt) => opt.setName('expiry').setDescription('Discord timestamp (number only).').setRequired(false))
				.addIntegerOption((opt) => opt.setName('xshot').setDescription('How many times it takes to remove the immunity. Default none').setRequired(false))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the name').setRequired(false))
		)
		.addSubcommand((sub) =>
			sub
				.setName('remove')
				.setDescription('Remove an immunity from an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('immunity').setDescription('The name of the immunity').setRequired(true))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the immunity name').setRequired(false))
		)
		.addSubcommand((sub) =>
			sub
				.setName('update')
				.setDescription('Update a status from an inventory')
				.addUserOption((opt) => opt.setName('user').setDescription('The user the inventory belongs to').setRequired(true))
				.addStringOption((opt) => opt.setName('immunity').setDescription('The name of the immunity').setRequired(true))
				.addIntegerOption((opt) => opt.setName('expiry').setDescription('Discord timestamp (number only).').setRequired(false))
				.addIntegerOption((opt) => opt.setName('xshot').setDescription('How many times it takes to remove the immunity. Default none').setRequired(false))
				.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the status name').setRequired(false))
		)
);

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });

		try {
			const subcommand = i.options.getSubcommand(true);
			const subcommandGroup = i.options.getSubcommandGroup(false);

			if (!subcommandGroup) {
				switch (subcommand) {
					case 'create':
						return await createInventory(i);
					case 'delete':
						return await removeInventory(i);
					case 'view':
						return await viewInventory(i);
					case 'set':
						return await setMiscData(i);
					default:
						return await i.reply({ content: 'Invalid subcommand', ephemeral: true });
				}
			}

			if (subcommandGroup === 'item') {
				switch (subcommand) {
					case 'add':
						return await addItem(i);
					case 'remove':
						return await removeItem(i);
					default:
						return await i.reply({ content: 'Invalid subcommand', ephemeral: true });
				}
			}

			if (subcommandGroup === 'aa') {
				switch (subcommand) {
					case 'add':
						return await addAnyAbility(i);
					case 'remove':
						return await removeAnyAbility(i);
					case 'update':
						return await updateAnyAbility(i);
					default:
						return await i.reply({ content: 'Invalid subcommand', ephemeral: true });
				}
			}

			if (subcommandGroup === 'status') {
				switch (subcommand) {
					case 'add':
						return await addStatus(i);
					case 'remove':
						return await removeStatus(i);
					case 'update':
						return await updateStatus(i);
					default:
						return await i.reply({ content: 'Invalid subcommand', ephemeral: true });
				}
			}

			if (subcommandGroup === 'immunity') {
				switch (subcommand) {
					case 'add':
						return await addImmunity(i);
					case 'remove':
						return await removeImmunity(i);
					case 'update':
						return await updateImmunity(i);
					default:
						return await i.reply({ content: 'Invalid subcommand', ephemeral: true });
				}
			}

			return await i.reply({ content: 'Invalid subcommand group', ephemeral: true });
		} catch (err) {
			console.log(err);
			return await i.reply({ content: 'An error occurred', ephemeral: true });
		}
	},
});
type UpdatePinnedProps = {
	channelId: string;
	messageId: string | undefined;
	discordId: string;
};
async function updatePinnedInventory(i: ChatInputCommandInteraction, inv: UpdatePinnedProps) {
	if (!i.guild) return null;
	if (!inv.messageId) return null;

	const { embed } = await fetchAndFormatInventory(inv.discordId);
	if (!embed) return null;

	await i.guild.channels.fetch();
	const channel = i.guild.channels.cache.get(inv.channelId);
	if (!channel) return null;

	if (!channel.isTextBased()) return null;

	const message = await channel.messages.fetch(inv.messageId);
	embed.setTimestamp(new Date());

	await message.edit({ embeds: [embed] });
}

async function createInventory(i: ChatInputCommandInteraction) {
	const channel = i.options.getChannel('channel', true);
	const user = i.options.getUser('user', true);

	const existingInventory = await getInventory(user.id);
	if (existingInventory) return await i.reply({ content: 'That player already has an inventory', ephemeral: true });

	await prisma.inventory.create({
		data: {
			channelId: channel.id,
			discordId: user.id,
		},
	});

	const refetchInventory = await getInventory(user.id);
	if (!refetchInventory) return await i.reply({ content: 'Failed to create an inventory for that player', ephemeral: true });
	const { embed } = formatInventory(refetchInventory);

	return await i.reply({ embeds: [embed] });
}

async function viewInventory(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const hidden = i.options.getBoolean('hidden', false) != false ? true : false;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'Failed to get inventory', ephemeral: true });

	const { embed } = formatInventory(inventory);
	return await i.reply({ embeds: [embed], ephemeral: hidden });
}

async function removeInventory(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);

	try {
		const existing = await getInventory(user.id);
		if (!existing) return await i.reply({ content: 'That player does not have an inventory', ephemeral: true });

		await prisma.afflictedImmunity.deleteMany({
			where: {
				inventory: {
					discordId: user.id,
				},
			},
		});

		await prisma.afflictedStatus.deleteMany({
			where: {
				inventory: {
					discordId: user.id,
				},
			},
		});

		await prisma.anyAbility.deleteMany({
			where: {
				inventory: {
					discordId: user.id,
				},
			},
		});

		await prisma.inventory.delete({
			where: {
				discordId: user.id,
			},
		});

		return await i.reply({ content: 'Inventory deleted', ephemeral: true });
	} catch (err) {
		console.log(err);
		return await i.reply({ content: 'Failed to delete inventory', ephemeral: true });
	}
}

async function setMiscData(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const coins = i.options.getInteger('coins', false);
	const itemLimit = i.options.getInteger('itemlimit', false);
	const coinBonus = i.options.getInteger('coinbonus', false);

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	await prisma.inventory.update({
		where: {
			id: inventory.id,
		},
		data: {
			coins: coins ?? undefined,
			inventorySize: itemLimit ?? undefined,
			coinBonus: coinBonus ?? undefined,
		},
	});

	const changes = [];
	if (coins) changes.push(`- Coins: ${coins} from ${inventory.coins}`);
	if (itemLimit) changes.push(`- Item Limit: ${itemLimit} from ${inventory.inventorySize}`);
	if (coinBonus) changes.push(`- Coin Bonus: ${coinBonus} (aka ${coinBonus / 100}%) from ${inventory.coinBonus} (aka ${inventory.coinBonus / 100}%)`);

	await updatePinnedInventory(i, {
		channelId: inventory.channelId,
		messageId: inventory.messageId ?? undefined,
		discordId: inventory.discordId,
	});

	return await i.editReply({ content: changes.length > 0 ? `### Changed <@${user.id}>'s Inventory \n${changes.join('\n')}` : 'No changes were made' });
}

async function addItem(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const item = i.options.getString('item', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });
	await i.deferReply({ ephemeral: false });

	let itemName = item;
	if (spellcheck) itemName = await getClosestItemName(item);

	try {
		await prisma.inventory.update({
			where: {
				discordId: user.id,
			},
			data: {
				items: {
					push: itemName,
				},
			},
		});

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		return await i.editReply({
			content: `### Changed <@${user.id}>'s Inventory\n- Added Item: \`${itemName}\` so now their inventory size is now ${inventory.items.length + 1}/${inventory.inventorySize}`,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function removeItem(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const item = i.options.getString('item', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });
	await i.deferReply({ ephemeral: false });

	let itemName = item;
	if (spellcheck) itemName = await getClosestItemName(item);

	const array = inventory.items;
	const index = array.indexOf(itemName);
	if (index > -1) {
		array.splice(index, 1);
	}

	try {
		await prisma.inventory.update({
			where: {
				discordId: user.id,
			},
			data: {
				items: {
					set: array,
				},
			},
		});

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		return await i.editReply({
			content: `### Changed <@${user.id}>'s Inventory\n- Removed Item: \`${itemName}\` so now their inventory size is now ${inventory.items.length + 1}/${inventory.inventorySize}`,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function addAnyAbility(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const ability = i.options.getString('ability', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;
	const charges = i.options.getInteger('charges', false);

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let abilityName = ability;
	if (spellcheck) abilityName = await getClosestAbilityName(ability);

	let abilityExists = false;
	for (const a of inventory.anyAbilities) {
		if (a.abilityName == abilityName) abilityExists = true;
	}

	if (abilityExists) return await i.editReply({ content: 'That ability with this name already exists in their inventory. Either remove it, or use a different name' });

	try {
		await prisma.anyAbility.create({
			data: {
				abilityName: abilityName,
				charges: charges ?? undefined,
				inventoryId: inventory.id,
			},
		});

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		return await i.editReply({
			content: `### Changed <@${user.id}>'s Inventory\n- Added AA: \`${abilityName}\` with ${charges} charges`,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function removeAnyAbility(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const ability = i.options.getString('ability', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let abilityName = ability;
	if (spellcheck) abilityName = await getClosestAbilityName(ability);

	let abilityId: number | undefined;
	let charges: number | undefined;
	for (const a of inventory.anyAbilities) {
		if (a.abilityName == abilityName) {
			abilityId = a.id;
			charges = a.charges;
		}
	}

	if (!abilityId) return await i.editReply({ content: 'AA does not exist with this name.' });

	try {
		await prisma.anyAbility.deleteMany({
			where: {
				id: abilityId,
			},
		});

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		return await i.editReply({
			content: `### Changed <@${user.id}>'s Inventory\n- Removed AA: \`${abilityName}\` with ${charges} charges`,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function updateAnyAbility(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const ability = i.options.getString('ability', true);
	const charges = i.options.getInteger('charges', false);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let abilityName = ability;
	if (spellcheck) abilityName = await getClosestAbilityName(ability);

	let abilityId: number | undefined;
	let oldCharges: number | undefined;
	for (const a of inventory.anyAbilities) {
		if (a.abilityName == abilityName) {
			abilityId = a.id;
			oldCharges = a.charges;
		}
	}

	if (!abilityId) return await i.editReply({ content: 'Ability does not exist with this name.' });

	try {
		await prisma.anyAbility.update({
			where: {
				id: abilityId,
			},
			data: {
				charges: charges ?? undefined,
			},
		});

		const changes: string[] = [];
		if (oldCharges != charges) changes.push(`- Changed charges of \`${abilityName}\` from ${oldCharges} to ${charges}`);

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		return await i.editReply({
			content: `### Changed <@${user.id}>'s Inventory\n${changes.length > 0 ? changes.join('\n') : '- No changes'}`,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function addStatus(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const status = i.options.getString('status', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;
	const expiry = i.options.getInteger('expiry', false) ?? undefined;
	const xfold = i.options.getInteger('xfold', false) ?? undefined;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let statusName = status;
	if (spellcheck) statusName = await getClosestStatusName(status);

	let statusExists = false;
	for (const a of inventory.statuses) {
		if (a.statusName == statusName) statusExists = true;
	}

	if (statusExists) return await i.editReply({ content: 'Status with this name already exists in their inventory. Either remove it, or use a different name' });

	try {
		await prisma.afflictedStatus.create({
			data: {
				statusName: statusName,
				expiry: expiry ?? undefined,
				inventoryId: inventory.id,
				xFold: xfold ?? undefined,
			},
		});

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		let content = `### Changed <@${user.id}>'s Inventory\n- Added status: \`${xfold ? `${xfold}-fold ` : ''}${statusName}\``;
		if (expiry) content += ` which expires <t:${expiry}:R>`;

		return await i.editReply({
			content,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function removeStatus(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const status = i.options.getString('status', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let statusName = status;
	if (spellcheck) statusName = await getClosestStatusName(status);

	let statusId: number | undefined;
	let expiry: number | undefined;
	let xFold: number | undefined;
	for (const a of inventory.statuses) {
		if (a.statusName == statusName) {
			statusId = a.id;
			expiry = a.expiry ?? undefined;
			xFold = a.xFold ?? undefined;
		}
	}

	if (!statusId) return await i.editReply({ content: 'There is no statuses to remove with this request' });

	try {
		await prisma.afflictedStatus.delete({
			where: {
				id: statusId,
			},
		});

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		let content = `### Changed <@${user.id}>'s Inventory\n- Removed status: \`${xFold ? `${xFold}-fold ` : ''}${statusName}\``;
		if (expiry) content += ` which expired <t:${expiry}:R>`;

		return await i.editReply({
			content,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function updateStatus(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const status = i.options.getString('status', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;
	const expiry = i.options.getInteger('expiry', false) ?? undefined;
	const xfold = i.options.getInteger('xfold', false) ?? undefined;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let statusName = status;
	if (spellcheck) statusName = await getClosestStatusName(status);

	let statusId: number | undefined;
	let oldExpiry: number | undefined;
	let oldXFold: number | undefined;
	for (const a of inventory.statuses) {
		if (a.statusName == statusName) {
			statusId = a.id;
			oldExpiry = a.expiry ?? undefined;
			oldXFold = a.xFold ?? undefined;
		}
	}

	if (!statusId) return await i.editReply({ content: 'That ability with this name already exists in their inventory. Either remove it, or use a different name' });

	try {
		await prisma.afflictedStatus.update({
			where: {
				id: statusId,
			},
			data: {
				expiry: expiry ?? undefined,
				xFold: xfold ?? undefined,
			},
		});

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		const changes: string[] = [];
		if (expiry) changes.push(`- Changed expiry of \`${statusName}\` from ${oldExpiry ? `<t:${oldExpiry}:R>` : 'none'} to <t:${expiry}:R>`);
		if (xfold) changes.push(`- Changed x-fold of \`${statusName}\` from ${oldXFold ? `${oldXFold}-fold` : 'none'} to ${xfold}-fold`);

		let content = `### Changed <@${user.id}>'s Inventory\n- Uppdate status \`${statusName}\``;

		if (changes.length > 0) {
			content += '\n';
			content += changes.join('\n');
		}

		return await i.editReply({
			content,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}
async function addImmunity(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const immunity = i.options.getString('immunity', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;
	const expiry = i.options.getInteger('expiry', false) ?? undefined;
	const xshot = i.options.getInteger('xshot', false) ?? undefined;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let immunityName = immunity;
	if (spellcheck) immunityName = await getClosestImmunityName(immunity);

	let immunityExists = false;
	for (const a of inventory.immunities) {
		if (a.name == immunityName) immunityExists = true;
	}

	if (immunityExists) return await i.editReply({ content: 'Immunity with this name already exists in their inventory. Either remove it, or use a different name' });

	try {
		await prisma.afflictedImmunity.create({
			data: {
				name: immunityName,
				expiry: expiry ?? undefined,
				inventoryId: inventory.id,
				xShot: xshot ?? undefined,
			},
		});
		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		let content = `### Changed <@${user.id}>'s Inventory\n- Added status: \`${xshot ? `${xshot}-shot ` : ''}${immunityName}\``;
		if (expiry) content += ` which expires <t:${expiry}:R>`;

		return await i.editReply({
			content,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function removeImmunity(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const immunity = i.options.getString('immunity', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let immunityName = immunity;
	if (spellcheck) immunityName = await getClosestImmunityName(immunity);

	let immunityId: number | undefined;
	let oldXShot: number | undefined;
	let oldExpiry: number | undefined;
	for (const a of inventory.immunities) {
		if (a.name == immunityName) {
			immunityId = a.id;
			oldXShot = a.xShot ?? undefined;
			oldExpiry = a.expiry ?? undefined;
		}
	}

	if (!immunityId) return await i.editReply({ content: 'There is no statuses to remove with this request' });

	try {
		await prisma.afflictedImmunity.delete({
			where: {
				id: immunityId,
			},
		});
		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		let content = `### Changed <@${user.id}>'s Inventory\n- Removed status: \`${oldXShot ? `${oldXShot}-shot ` : ''}${immunityName}\``;
		if (oldExpiry) content += ` which expired <t:${oldExpiry}:R>`;

		return await i.editReply({
			content,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function updateImmunity(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const immunity = i.options.getString('immunity', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;
	const expiry = i.options.getInteger('expiry', false) ?? undefined;
	const xshot = i.options.getInteger('xshot', false) ?? undefined;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let immunityName = immunity;
	if (spellcheck) immunityName = await getClosestImmunityName(immunity);

	let immunityId: number | undefined;
	let oldXShot: number | undefined;
	let oldExpiry: number | undefined;
	for (const a of inventory.immunities) {
		if (a.name == immunityName) {
			immunityId = a.id;
			oldXShot = a.xShot ?? undefined;
			oldExpiry = a.expiry ?? undefined;
		}
	}

	if (!immunityId) return await i.editReply({ content: 'There is no statuses to remove with this request' });

	try {
		await prisma.afflictedImmunity.update({
			where: {
				id: immunityId,
			},
			data: {
				expiry: expiry ?? undefined,
				xShot: xshot ?? undefined,
			},
		});
		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		const changes: string[] = [];
		if (expiry) changes.push(`- Changed expiry of \`${immunityName}\` from ${oldExpiry ? `<t:${oldExpiry}:R>` : 'none'} to <t:${expiry}:R>`);
		if (xshot) changes.push(`- Changed x-shot of \`${immunityName}\` from ${oldXShot ? `${oldXShot}-shot` : 'none'} to ${xshot}-shot`);

		let content = `### Changed <@${user.id}>'s Inventory\n- Uppdate immunity \`${immunityName}\``;

		if (changes.length > 0) {
			content += '\n';
			content += changes.join('\n');
		}
		return await i.editReply({
			content,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}
