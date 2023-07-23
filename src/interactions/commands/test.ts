import { APIApplicationCommandOptionChoice, ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { cache, prisma } from '../../database';
import { fetchAndFormatInventory, formatInventory } from '../../util/embeds';
import { getClosestAbilityName, getClosestImmunityName, getClosestItemName, getClosestRoleName, getClosestStatusName, getInventory, getRole } from '../../util/database';
import { Alignment } from '@prisma/client';
import config from '../../config';

const data = new SlashCommandBuilder().setName('test').setDescription('Command to manage inventories');

const additionTypes = ['item', 'ability', 'perk', 'status', 'immunity', 'effect', 'aa'];
const types: APIApplicationCommandOptionChoice<string>[] = additionTypes.map((t) => ({ name: t, value: t }));

data.addSubcommand((sub) =>
	sub
		.setName('create')
		.setDescription('Create an inventory')
		.addChannelOption((opt) => opt.setName('channel').setDescription('The channel to create the inventory in').setRequired(true).addChannelTypes(ChannelType.GuildText))
		.addUserOption((opt) => opt.setName('user').setDescription('The user to create the inventory for').setRequired(true))
		.addStringOption((opt) => opt.setName('role').setDescription('Default role to create the inventory for, sets appropriate values').setRequired(true).setAutocomplete(true))
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
		.setName('add')
		.setDescription('Add a value to an inventory')
		.addUserOption((opt) => opt.setName('user').setDescription('The user to add the value to').setRequired(true))
		.addStringOption((o) =>
			o
				.setName('type')
				.setDescription('Type of value to add')
				.setRequired(true)
				.addChoices(...types)
		)
		.addStringOption((opt) => opt.setName('value').setDescription('The value to add').setRequired(true))
		.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the value').setRequired(false))
);

data.addSubcommand((sub) =>
	sub
		.setName('remove')
		.setDescription('Remove a value from an inventory')
		.addUserOption((opt) => opt.setName('user').setDescription('The user to remove the value from').setRequired(true))
		.addStringOption((o) =>
			o
				.setName('type')
				.setDescription('Type of value to add')
				.setRequired(true)
				.addChoices(...types)
		)
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
		.addIntegerOption((opt) => opt.setName('setcoins').setDescription('The amount of coins to set').setRequired(false))
		.addIntegerOption((opt) => opt.setName('addcoins').setDescription('The amount of coins to add').setRequired(false))
		.addIntegerOption((opt) => opt.setName('removecoins').setDescription('The amount of coins to remove').setRequired(false))
		.addIntegerOption((opt) => opt.setName('itemlimit').setDescription('The item limit to set').setRequired(false))
		.addIntegerOption((opt) => opt.setName('coinbonus').setDescription('The coin bonus % to set. Percent without the period. 500 = 5%.').setRequired(false))
		.addStringOption((opt) =>
			opt.setName('alignment').setDescription('Set the alignment of the player').setRequired(false).setChoices(
				{
					name: 'Good',
					value: Alignment.GOOD,
				},
				{
					name: 'Neutral',
					value: Alignment.NEUTRAL,
				},
				{
					name: 'Evil',
					value: Alignment.EVIL,
				}
			)
		)
);

data.addSubcommand((sub) =>
	sub
		.setName('hostnotes')
		.setDescription('View or edit the host notes for an inventory')
		.addUserOption((usr) => usr.setName('player').setDescription('Player to access the host notes for'))
);

export default newSlashCommand({
	data,
	mainServer: true,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
		if (i.user.id != '416757703516356628') return i.reply({ content: 'This command is currently disabled', ephemeral: true });

		try {
			const subcommand = i.options.getSubcommand(true);
			switch (subcommand) {
				case 'create':
					return await createInventory(i);
				case 'delete':
					return await removeInventory(i);
				case 'view':
					return await viewInventory(i);
				case 'set':
					return await setMiscData(i);
				case 'add':
					return await addValue(i);
				default:
					return await i.reply({ content: 'Invalid subcommand', ephemeral: true });
			}
		} catch (err) {
			console.log(err);
			return await i.reply({ content: 'An error occurred', ephemeral: true });
		}
	},
	autocomplete: async (i) => {
		const group = i.options.getSubcommandGroup(false);
		const subcommand = i.options.getSubcommand(true);
		const focusedValue = i.options.getFocused();

		if (!group) {
			switch (subcommand) {
				case 'create':
					let allMatchingRoles = cache.roles.filter((role) => role.toLowerCase().startsWith(focusedValue.toLowerCase()));
					allMatchingRoles = allMatchingRoles.splice(0, Math.min(allMatchingRoles.length, 25));
					return await i.respond(allMatchingRoles.map((match) => ({ name: match, value: match })));
				default:
					return await i.respond([]);
			}
		}

		return await i.respond([]);
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
	const requestedRoleName = i.options.getString('role', false);

	const existingInventory = await getInventory(user.id);
	if (existingInventory) return await i.reply({ content: 'That player already has an inventory', ephemeral: true });

	const rawInventory = await prisma.inventory.create({
		data: {
			channelId: channel.id,
			discordId: user.id,
		},
	});

	if (requestedRoleName) {
		const roleName = await getClosestRoleName(requestedRoleName);
		const role = await getRole(roleName);

		if (role) {
			await prisma.inventory.update({
				where: {
					id: rawInventory.id,
				},
				data: {
					alignment: role.alignment,
				},
			});

			for (const abilAttachment of role.abilityAttachments) {
				const ability = abilAttachment.abilities;
				if (!ability) continue;

				try {
					await prisma.baseAbility.create({
						data: {
							name: ability.name,
							charges: ability.charges,
							inventory: {
								connect: {
									id: rawInventory.id,
								},
							},
						},
					});
				} catch (err) {
					console.log(err);
				}
			}

			for (const perkAttach of role.perkAttachments) {
				const perk = perkAttach.perk;
				if (!perk) continue;

				try {
					await prisma.basePerk.create({
						data: {
							name: perk.name,
							toggled: perk.categories.includes('TOGGLABLE') ? false : undefined,
							inventory: {
								connect: {
									id: rawInventory.id,
								},
							},
						},
					});
				} catch (err) {
					console.log(err);
				}
			}
		}
	}

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

		const query = { where: { inventory: { discordId: user.id } } };

		await prisma.afflictedImmunity.deleteMany(query);
		await prisma.afflictedStatus.deleteMany(query);
		await prisma.afflictedEffect.deleteMany(query);
		await prisma.anyAbility.deleteMany(query);
		await prisma.baseAbility.deleteMany(query);
		await prisma.basePerk.deleteMany(query);

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
	const coins = i.options.getInteger('setcoins', false);
	const addCoins = i.options.getInteger('addcoins', false);
	const removeCoins = i.options.getInteger('removecoins', false);
	const itemLimit = i.options.getInteger('itemlimit', false);
	const coinBonus = i.options.getInteger('coinbonus', false);
	const alignment = i.options.getString('alignment', false) as Alignment | null;

	if (coins && addCoins) return await i.reply({ content: 'You cannot set and add coins at the same time', ephemeral: true });
	if (coins && removeCoins) return await i.reply({ content: 'You cannot set and remove coins at the same time', ephemeral: true });

	const finalAddCoins = addCoins ?? 0;
	const finalRemoveCoins = removeCoins ?? 0;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	const saved = await prisma.inventory.update({
		where: {
			id: inventory.id,
		},
		data: {
			coins: coins ? coins : inventory.coins + finalAddCoins - finalRemoveCoins,
			inventorySize: itemLimit ?? undefined,
			coinBonus: coinBonus ?? undefined,
			alignment: alignment ?? undefined,
		},
	});

	const changes = [];
	if (inventory.coins != saved.coins) changes.push(`- Coins: ${saved.coins} from ${inventory.coins}`);
	if (inventory.inventorySize != saved.inventorySize) changes.push(`- Item Limit: ${saved.inventorySize} from ${inventory.inventorySize}`);
	if (inventory.coinBonus != saved.coinBonus) changes.push(`- Coin Bonus: ${saved.coinBonus} (aka ${saved.coinBonus / 100}%) from ${inventory.coinBonus} (aka ${inventory.coinBonus / 100}%)`);
	if (inventory.alignment != saved.alignment) changes.push(`- Alignment: ${saved.alignment} from ${inventory.alignment}`);
	await updatePinnedInventory(i, {
		channelId: inventory.channelId,
		messageId: inventory.messageId ?? undefined,
		discordId: inventory.discordId,
	});

	return await i.editReply({ content: changes.length > 0 ? `### Changed <@${user.id}>'s Inventory \n${changes.join('\n')}` : 'No changes were made' });
}

async function addValue(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const type = i.options.getString('type', true);
	const value = i.options.getString('value', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;

	if (additionTypes.includes(type)) {
	}
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
		const updatedInventory = await prisma.inventory.update({
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
			content: `### Changed <@${user.id}>'s Inventory\n- Removed Item: \`${itemName}\` so now their inventory size is now ${updatedInventory.items.length}/${inventory.inventorySize}`,
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

		let content = `### Changed <@${user.id}>'s Inventory\n- Added immunity: \`${xshot ? `${xshot}-shot ` : ''}${immunityName}\``;
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

		let content = `### Changed <@${user.id}>'s Inventory\n- Removed immunity: \`${oldXShot ? `${oldXShot}-shot ` : ''}${immunityName}\``;
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

		let content = `### Changed <@${user.id}>'s Inventory\n- Updated immunity \`${immunityName}\``;

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

async function addEffect(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const effect = i.options.getString('effect', true);
	const expiry = i.options.getInteger('expiry', false) ?? undefined;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let effectName = effect;
	let effectExists = false;
	for (const a of inventory.effects) {
		if (a.name == effectName) effectExists = true;
	}

	if (effectExists) return await i.editReply({ content: 'Effect with this name already exists in their inventory. Either remove it, or use a different name' });

	try {
		await prisma.afflictedEffect.create({
			data: {
				name: effectName,
				expiry: expiry ?? undefined,
				inventoryId: inventory.id,
			},
		});

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		let content = `### Changed <@${user.id}>'s Inventory\n- Added effect: \`${effectName}\``;
		if (expiry) content += `- Expires <t:${expiry}:R>`;

		return await i.editReply({
			content,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function removeEffect(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const effect = i.options.getString('effect', true);

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let effectId: number | undefined;
	let oldExpiry: number | undefined;
	let oldDetails: string | undefined;
	for (const a of inventory.effects) {
		if (a.name == effect) {
			effectId = a.id;
			oldExpiry = a.expiry ?? undefined;
			oldDetails = a.details ?? undefined;
		}
	}

	if (!effectId) return await i.editReply({ content: 'There is no effect to remove with this request' });

	try {
		await prisma.afflictedEffect.delete({
			where: {
				id: effectId,
			},
		});

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		let content = `### Changed <@${user.id}>'s Inventory\n- Removed effect: \`${effect}\``;
		if (oldExpiry) content += ` which expired <t:${oldExpiry}:R>`;
		if (oldDetails) content += ` with details: \`${oldDetails}\``;

		return await i.editReply({
			content,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function updateEffect(i: ChatInputCommandInteraction) {
	const user = i.options.getUser('user', true);
	const effect = i.options.getString('effect', true);
	const expiry = i.options.getInteger('expiry', false) ?? undefined;

	const inventory = await getInventory(user.id);
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });

	await i.deferReply({ ephemeral: false });

	let effectId: number | undefined;
	let oldExpiry: number | undefined;
	let oldDetails: string | undefined;
	for (const a of inventory.effects) {
		if (a.name == effect) {
			effectId = a.id;
			oldExpiry = a.expiry ?? undefined;
			oldDetails = a.details ?? undefined;
		}
	}

	if (!effectId) return await i.editReply({ content: 'There is no effect to remove with this request' });

	try {
		await prisma.afflictedEffect.update({
			where: {
				id: effectId,
			},
			data: {
				expiry: expiry ?? undefined,
			},
		});
		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		const changes: string[] = [];
		if (expiry) changes.push(`- Changed expiry of \`${effect}\` from ${oldExpiry ? `<t:${oldExpiry}:R>` : 'none'} to <t:${expiry}:R>`);

		let content = `### Changed <@${user.id}>'s Inventory\n- Uppdate immunity \`${effect}\``;

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

async function addBaseAbility(i: ChatInputCommandInteraction) {
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
	for (const a of inventory.baseAbility) {
		if (a.name == abilityName) abilityExists = true;
	}

	if (abilityExists) return await i.editReply({ content: 'That ability with this name already exists in their inventory. Either remove it, or use a different name' });

	try {
		await prisma.baseAbility.create({
			data: {
				name: abilityName,
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
			content: `### Changed <@${user.id}>'s Inventory\n- Added Base Ability: \`${abilityName}\` with ${charges} charges`,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function removeBaseAbility(i: ChatInputCommandInteraction) {
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
	for (const a of inventory.baseAbility) {
		if (a.name == abilityName) {
			abilityId = a.id;
			charges = a.charges;
		}
	}

	if (!abilityId) return await i.editReply({ content: 'AA does not exist with this name.' });

	try {
		await prisma.baseAbility.deleteMany({
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
			content: `### Changed <@${user.id}>'s Inventory\n- Removed Base Ability: \`${abilityName}\` with ${charges} charges`,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'An error occured' });
	}
}

async function updateBaseAbility(i: ChatInputCommandInteraction) {
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
	let cooldown: Date | undefined;
	for (const a of inventory.baseAbility) {
		if (a.name == abilityName) {
			abilityId = a.id;
			oldCharges = a.charges;
			cooldown = a.cooldown ?? undefined;
		}
	}

	if (!abilityId) return await i.editReply({ content: 'Ability does not exist with this name.' });

	try {
		await prisma.baseAbility.update({
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
