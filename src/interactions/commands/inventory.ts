import { APIApplicationCommandOptionChoice, ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { cache, prisma } from '../../database';
import { fetchAndFormatInventory, formatInventory } from '../../util/embeds';
import { getClosestAbilityName, getClosestImmunityName, getClosestItemName, getClosestPerkName, getClosestRoleName, getClosestStatusName, getInventory, getRole } from '../../util/database';
import { Alignment } from '@prisma/client';
import { capitalize } from '../../util/string';
import { getLuckTable, getRandomAnyAbility, getRandomItem } from '../../util/luck';
import { raw } from '@prisma/client/runtime';
import config from '../../config';

const data = new SlashCommandBuilder().setName('inventory').setDescription('Command to manage inventories');

const additionTypes = ['item', 'ability', 'perk', 'status', 'immunity', 'effect', 'aa'];
const updateTypes = ['ability', 'status', 'immunity', 'effect', 'aa'];
const types: APIApplicationCommandOptionChoice<string>[] = additionTypes.map((t) => ({ name: t == 'aa' ? 'AA' : capitalize(t), value: t }));
const update: APIApplicationCommandOptionChoice<string>[] = updateTypes.map((t) => ({ name: t == 'aa' ? 'AA' : capitalize(t), value: t }));

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
		.addStringOption((o) =>
			o
				.setName('type')
				.setDescription('Type of value to add')
				.setRequired(true)
				.addChoices(...types)
		)
		.addStringOption((opt) => opt.setName('value').setDescription('The value to add').setRequired(true))
		.addIntegerOption((opt) => opt.setName('charges').setDescription('The amount of charges to add').setRequired(false))
		.addIntegerOption((opt) => opt.setName('expiry').setDescription('Discord timestamp for when this expires/runs out').setRequired(false))
		.addIntegerOption((opt) => opt.setName('xfold').setDescription('Add this value with X-fold/x-shot etc').setRequired(false))
		.addBooleanOption((opt) => opt.setName('toggled').setDescription('[PERK] Start the perk toggled/not-toggled').setRequired(false))

		.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the value').setRequired(false))
);

data.addSubcommand((sub) =>
	sub
		.setName('update')
		.setDescription('Update a value in an inventory')
		.addStringOption((o) =>
			o
				.setName('type')
				.setDescription('Type of value to update')
				.setRequired(true)
				.addChoices(...update)
		)
		.addStringOption((opt) => opt.setName('value').setDescription('The value to update').setRequired(true))
		.addIntegerOption((opt) => opt.setName('charges').setDescription('The amount of charges to change to').setRequired(false))
		.addIntegerOption((opt) => opt.setName('expiry').setDescription('Discord timestamp for when this expires/runs out').setRequired(false))
		.addIntegerOption((opt) => opt.setName('xfold').setDescription('Change this value with X-fold/x-shot etc').setRequired(false))
		.addBooleanOption((opt) => opt.setName('toggled').setDescription('[PERK] Change the perk to be toggled/not-toggled').setRequired(false))
		.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the value').setRequired(false))
);

data.addSubcommand((sub) =>
	sub
		.setName('remove')
		.setDescription('Remove a value from an inventory')
		.addStringOption((o) =>
			o
				.setName('type')
				.setDescription('Type of the value')
				.setRequired(true)
				.addChoices(...types)
		)
		.addStringOption((opt) => opt.setName('value').setDescription('The value to remove').setRequired(true))
		.addBooleanOption((opt) => opt.setName('spellcheck').setDescription('Whether to spellcheck the value').setRequired(false))
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

export default newSlashCommand({
	data,
	mainServer: true,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });
		if (i.guildId != config.MAIN_SERVER_ID) return i.reply({ content: 'This command can only be used in the official server', ephemeral: true });

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
					case 'add':
						return await addValue(i);
					case 'remove':
						return await removeValue(i);
					case 'update':
						return await updateValue(i);
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
	const carePackageLuck = i.options.getInteger('carepackage', false);

	if (channel.type != ChannelType.GuildText) return;

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

	if (carePackageLuck) {
		const luckTable = getLuckTable(carePackageLuck);
		const item = await getRandomItem(luckTable);
		const anyAbility = await getRandomAnyAbility(luckTable);

		await prisma.inventory.update({
			where: {
				id: rawInventory.id,
			},
			data: {
				items: {
					push: item.name,
				},
				anyAbilities: {
					create: {
						abilityName: anyAbility.name,
						charges: 1,
					},
				},
			},
		});
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
	const type = i.options.getString('type', true);
	const value = i.options.getString('value', true);
	const charges = i.options.getInteger('charges', false);
	const expiry = i.options.getInteger('expiry', false);
	const xfold = i.options.getInteger('xfold', false);
	const toggle = i.options.getBoolean('toggle', false);
	const showToggle = toggle !== null;

	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;

	if (!additionTypes.includes(type)) return await i.reply({ content: 'Invalid type', ephemeral: true });
	const inventory = await getInventory({ channelId: i.channelId });
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });
	await i.deferReply({ ephemeral: false });

	const changes: string[] = [];

	try {
		switch (type) {
			case 'item':
				let itemName = spellcheck ? await getClosestItemName(value) : value;
				await prisma.inventory.update({
					where: {
						channelId: inventory.channelId,
					},
					data: {
						items: {
							push: itemName,
						},
					},
				});

				changes.push(`Added item: ${itemName}`);
				break;
			case 'aa':
				let aaName = spellcheck ? await getClosestAbilityName(value) : value;
				let AAExists = false;
				for (const a of inventory.anyAbilities) {
					if (a.abilityName == aaName) AAExists = true;
				}
				if (AAExists) return await i.editReply({ content: 'That AA already exists, update to add a charge instead' });

				await prisma.anyAbility.create({
					data: {
						abilityName: aaName,
						charges: charges ?? 1,
						inventoryId: inventory.id,
					},
				});

				changes.push(`Added AA: ${aaName} with ${charges ?? 1} charge/s`);
				break;

			case 'status':
				let statusName = spellcheck ? await getClosestStatusName(value) : value;
				for (const a of inventory.statuses)
					if (a.statusName == statusName) return await i.editReply({ content: 'Status with this name already exists in their inventory. Either remove it, or use a different name' });
				await prisma.afflictedStatus.create({
					data: {
						statusName: statusName,
						expiry: expiry ?? undefined,
						inventoryId: inventory.id,
						xFold: xfold ?? undefined,
					},
				});
				changes.push(`Added Status: ${xfold ? xfold + '-fold ' : ''}${statusName}${expiry ? ` that expires <t:${expiry}:R>` : ''}`);
				break;
			case 'immunity':
				let immunityName = spellcheck ? await getClosestImmunityName(value) : value;
				for (const a of inventory.immunities)
					if (a.name == immunityName) return await i.editReply({ content: 'Immunity with this name already exists in their inventory. Either remove it, or use a different name' });

				await prisma.afflictedImmunity.create({
					data: {
						name: immunityName,
						expiry: expiry ?? undefined,
						inventoryId: inventory.id,
						xShot: xfold ?? undefined,
					},
				});

				changes.push(`Added immunity: \`${xfold ? `${xfold}-shot ` : ''}${immunityName}\`${expiry ? ` which expires <t:${expiry}:R>` : ''}`);
				break;
			case 'effect':
				let effectName = value;
				for (const a of inventory.effects)
					if (a.name == effectName) return await i.editReply({ content: 'Effect with this name already exists in their inventory. Either remove it, or use a different name' });

				await prisma.afflictedEffect.create({
					data: {
						name: effectName,
						expiry: expiry ?? undefined,
						inventoryId: inventory.id,
					},
				});

				changes.push(`Added effect: \`${effectName}\`${expiry ? ` which expires <t:${expiry}:R>` : ''}`);
				break;
			case 'perk':
				let perkName = spellcheck ? await getClosestPerkName(value) : value;
				for (const perk of inventory.basePerk)
					if (perk.name == perkName) return await i.editReply({ content: 'Perk with this name already exists in their inventory. Either remove it, or use a different name' });

				await prisma.basePerk.create({
					data: {
						name: perkName,
						inventoryId: inventory.id,
						toggled: showToggle ? toggle : undefined,
					},
				});

				changes.push(`Added perk: \`${perkName}\`${showToggle ? ` which is ${toggle ? 'enabled' : 'disabled'}` : ''}`);
				break;
			case 'ability':
				let abilityName = spellcheck ? await getClosestAbilityName(value) : value;
				for (const ability of inventory.baseAbility)
					if (ability.name == abilityName) return await i.editReply({ content: 'Ability with this name already exists in their inventory. Either remove it, or use a different name' });

				await prisma.baseAbility.create({
					data: {
						name: abilityName,
						inventoryId: inventory.id,
						charges: charges ?? 0,
					},
				});

				changes.push(`Added ability: \`${abilityName}\`${charges ? ` with ${charges} charge/s` : ''}`);
				break;
		}

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		return await i.editReply({
			content: `### Changed <@${inventory.discordId}>'s Inventory\n${changes.length > 0 ? changes.join('\n') : '- No documented changes were made'}`,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'Failed to add value' });
	}
}

async function updateValue(i: ChatInputCommandInteraction) {
	const type = i.options.getString('type', true);
	const value = i.options.getString('value', true);
	const charges = i.options.getInteger('charges', false);
	const expiry = i.options.getInteger('expiry', false);
	const xfold = i.options.getInteger('xfold', false);
	const toggle = i.options.getBoolean('toggle', false);
	const showToggle = toggle !== null;

	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;

	if (!updateTypes.includes(type)) return await i.reply({ content: 'Invalid type', ephemeral: true });
	const inventory = await getInventory({ channelId: i.channelId });
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });
	await i.deferReply({ ephemeral: false });

	const changes: string[] = [];

	try {
		switch (type) {
			case 'aa':
				let AAName = spellcheck ? await getClosestAbilityName(value) : value;
				let AAID: number | undefined;
				let oldCharges: number | undefined;
				for (const a of inventory.anyAbilities) {
					if (a.abilityName == AAName) {
						AAID = a.id;
						oldCharges = a.charges;
					}
				}

				if (!AAID) return await i.editReply({ content: 'Cannot update an AA that does not exist, silly' });
				await prisma.anyAbility.update({
					where: {
						id: AAID,
					},
					data: {
						charges: charges ?? undefined,
					},
				});

				changes.push(`Changed charges of AA: \`${AAName}\` from ${oldCharges} to ${charges}`);
				break;
			case 'status':
				let statusName = spellcheck ? await getClosestStatusName(value) : value;
				let statusId: number | undefined;
				let statusExpiry: number | undefined;
				let statusFold: number | undefined;
				for (const a of inventory.statuses) {
					if (a.statusName == statusName) {
						statusId = a.id;
						statusExpiry = a.expiry ?? undefined;
						statusFold = a.xFold ?? undefined;
					}
				}

				if (!statusId) return await i.editReply({ content: 'Cannot update a status that does not exist, silly' });

				await prisma.afflictedStatus.update({
					where: {
						id: statusId,
					},
					data: {
						expiry: expiry ?? undefined,
						xFold: xfold ?? undefined,
					},
				});

				changes.push(`Changed Status: \`${statusName}\`${expiry ? ` expiry changed to <t:${expiry}:R>` : ''}${xfold ? ` xFold changed to ${xfold}-fold` : ''}`);
				break;
			case 'immunity':
				let immunityName = spellcheck ? await getClosestImmunityName(value) : value;

				let immunityId: number | undefined;
				let immunityXshot: number | undefined;
				let immunityExpiry: number | undefined;
				for (const a of inventory.immunities) {
					if (a.name == immunityName) {
						immunityId = a.id;
						immunityXshot = a.xShot ?? undefined;
						immunityExpiry = a.expiry ?? undefined;
					}
				}

				if (!immunityId) return await i.editReply({ content: 'Cannot update an immunity that does not exist, silly' });
				await prisma.afflictedImmunity.update({
					where: {
						id: immunityId,
					},
					data: {
						expiry: expiry ?? undefined,
						xShot: xfold ?? undefined,
					},
				});

				changes.push(`Changed Immunity: \`${immunityName}\`${expiry ? ` expiry changed to <t:${expiry}:R>` : ''}${xfold ? ` xShot changed to ${xfold}-shot` : ''}`);
				break;

			case 'effect':
				let effectId: number | undefined;
				let effectExpiry: number | undefined;
				let effectDetails: string | undefined;
				for (const a of inventory.effects) {
					if (a.name == value) {
						effectId = a.id;
						effectExpiry = a.expiry ?? undefined;
						effectDetails = a.details ?? undefined;
					}
				}

				if (!effectId) return await i.editReply({ content: 'Cannot update an effect that does not exist, silly' });
				await prisma.afflictedEffect.update({
					where: {
						id: effectId,
					},
					data: {
						expiry: expiry ?? undefined,
					},
				});

				changes.push(`Changed Effect: \`${value}\`${expiry ? ` expiry changed to <t:${expiry}:R>` : ''}`);
				break;
			case 'ability':
				let abilityName = spellcheck ? await getClosestAbilityName(value) : value;
				let abilityId: number | undefined;
				for (const a of inventory.baseAbility) {
					if (a.name == abilityName) {
						abilityId = a.id;
					}
				}

				if (!abilityId) return await i.editReply({ content: 'Cannot update an ability that does not exist, silly' });

				await prisma.baseAbility.update({
					where: {
						id: abilityId,
					},
					data: {
						charges: charges ?? undefined,
					},
				});

				changes.push(`Changed Ability: \`${abilityName}\`${charges ? ` charges changed to ${charges}` : ''}`);
				break;
		}

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		return await i.editReply({
			content: `### Changed <@${inventory.discordId}>'s Inventory\n${changes.length > 0 ? changes.join('\n') : '- No documented changes were made'}`,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'Failed to add value' });
	}
}

async function removeValue(i: ChatInputCommandInteraction) {
	const type = i.options.getString('type', true);
	const value = i.options.getString('value', true);
	const spellcheck = i.options.getBoolean('spellcheck', false) != false ? true : false;

	if (!additionTypes.includes(type)) return await i.reply({ content: 'Invalid type', ephemeral: true });
	const inventory = await getInventory({ channelId: i.channelId });
	if (!inventory) return await i.reply({ content: 'That user does not have an inventory', ephemeral: true });
	await i.deferReply({ ephemeral: false });

	const changes: string[] = [];

	try {
		switch (type) {
			case 'item':
				let itemName = spellcheck ? await getClosestItemName(value) : value;
				const itemArray = inventory.items;
				const index = itemArray.indexOf(itemName);
				if (index > -1) itemArray.splice(index, 1);

				await prisma.inventory.update({
					where: {
						id: inventory.id,
					},
					data: {
						items: {
							set: itemArray,
						},
					},
				});

				changes.push(`Removed item: \`${itemName}\` (${itemArray.length}/${inventory.inventorySize})`);
				break;
			case 'aa':
				let anyAbilityName = spellcheck ? await getClosestAbilityName(value) : value;
				let abilityId: number | undefined;
				let charges: number | undefined;
				for (const a of inventory.anyAbilities) {
					if (a.abilityName == anyAbilityName) {
						abilityId = a.id;
						charges = a.charges;
					}
				}
				if (!abilityId) return await i.editReply({ content: 'AA does not exist with this name.' });
				await prisma.anyAbility.deleteMany({
					where: {
						id: abilityId,
					},
				});

				changes.push(`Removed AA: \`${anyAbilityName}\`${charges ? ` with ${charges} charge/s` : ''}`);
				break;
			case 'status':
				let statusName = spellcheck ? await getClosestStatusName(value) : value;
				let statusId: number | undefined;
				let statusExpiry: number | undefined;
				let statusXFold: number | undefined;
				for (const a of inventory.statuses) {
					if (a.statusName == statusName) {
						statusId = a.id;
						statusExpiry = a.expiry ?? undefined;
						statusXFold = a.xFold ?? undefined;
					}
				}
				if (!statusId) return await i.editReply({ content: 'There is no statuses to remove with this request' });
				await prisma.afflictedStatus.delete({
					where: {
						id: statusId,
					},
				});

				changes.push(`Removed status: \`${statusName}\`${statusExpiry ? ` which would have expired <t:${statusExpiry}:R>` : ''}${statusXFold ? ` which was ${statusXFold}-fold` : ''}`);
				break;
			case 'immunity':
				let immunityName = spellcheck ? await getClosestImmunityName(value) : value;
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
				await prisma.afflictedImmunity.delete({
					where: {
						id: immunityId,
					},
				});

				changes.push(`Removed immunity: \`${immunityName}\`${oldXShot ? ` which was ${oldXShot}-shot` : ''}${oldExpiry ? ` which would have expired <t:${oldExpiry}:R>` : ''}`);
				break;
			case 'effect':
				let effectName = value;
				let effectId: number | undefined;
				let effectExpiry: number | undefined;
				let oldDetails: string | undefined;
				for (const a of inventory.effects) {
					if (a.name == effectName) {
						effectId = a.id;
						effectExpiry = a.expiry ?? undefined;
						oldDetails = a.details ?? undefined;
					}
				}
				if (!effectId) return await i.editReply({ content: 'There is no effect to remove with this request' });

				await prisma.afflictedEffect.delete({
					where: {
						id: effectId,
					},
				});

				changes.push(`Removed effect: \`${effectName}\`${effectExpiry ? ` which would have expired <t:${effectExpiry}:R>` : ''}${oldDetails ? ` with details: \`${oldDetails}\`` : ''}`);
				break;
			case 'perk':
				let perkName = spellcheck ? await getClosestPerkName(value) : value;
				let perkId: number | undefined;
				for (const a of inventory.basePerk) {
					if (a.name == perkName) {
						perkId = a.id;
					}
				}

				if (!perkId) return await i.editReply({ content: 'There is no perk to remove with this request' });

				await prisma.basePerk.delete({
					where: {
						id: perkId,
					},
				});

				changes.push(`Removed perk: \`${perkName}\``);
				break;
			case 'ability':
				let abilityName = spellcheck ? await getClosestAbilityName(value) : value;
				let baseAbilityId: number | undefined;
				for (const a of inventory.baseAbility) {
					if (a.name == abilityName) {
						baseAbilityId = a.id;
					}
				}

				if (!baseAbilityId) return await i.editReply({ content: 'There is no ability to remove with this request' });

				await prisma.baseAbility.delete({
					where: {
						id: baseAbilityId,
					},
				});

				changes.push(`Removed ability: \`${abilityName}\``);
				break;
		}

		await updatePinnedInventory(i, {
			channelId: inventory.channelId,
			messageId: inventory.messageId ?? undefined,
			discordId: inventory.discordId,
		});

		return await i.editReply({
			content: `### Changed <@${inventory.discordId}>'s Inventory\n${changes.length > 0 ? changes.join('\n') : '- No documented changes were made'}`,
		});
	} catch (err) {
		console.log(err);
		return await i.editReply({ content: 'Failed to add value' });
	}
}
