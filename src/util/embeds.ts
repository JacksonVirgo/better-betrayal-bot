import { Ability, Item, Perk, Status, Role, AbilityChange, ActionType, PerkCategory, Inventory, OwnedAbility, OwnedAnyAbility, OwnedImmunity, OwnedItem, OwnedPerk, OwnedStatus } from '@prisma/client';
import { Guild, EmbedBuilder, Colors, ActionRowBuilder, StringSelectMenuBuilder, ColorResolvable, GuildMember, ButtonBuilder } from 'discord.js';
import { rarityToColor } from './colors';
import { capitalize } from './string';
import { formatActionCategory, formatActionType, formatPerkCategory } from './database';
import viewAbilityChangeSelect from '../interactions/selectmenu/viewAbilityChange';
import { getInventory } from './database';
import { Button } from '../structures/interactions';

export function generateAbilityFooter(ability: Ability) {
	let footerList: string[] = [ability.rarity ? `${capitalize(ability.rarity)} AA` : 'Not an AA'];
	if (ability.isRoleSpecific) footerList.push(`Role Specific`);

	if (ability.actionType) {
		const type = formatActionType(ability.actionType);
		if (type) footerList.push(type);
	}

	for (const category of ability.categories) {
		const cat = formatActionCategory(category);
		if (cat) footerList.push(cat);
	}

	if (!ability.categories.includes('VISITING')) footerList.push('Non-Visiting');

	return footerList;
}

export function generatePerkFooter(perk: Perk) {
	const footerList: string[] = [];

	for (const category of perk.categories) {
		const cat = formatPerkCategory(category);
		if (cat) footerList.push(cat);
	}

	return footerList;
}

export function formatRoleEmbed(_guild: Guild, role: Role & { abilities: Ability[]; perks: Perk[] }) {
	const embed = new EmbedBuilder();
	embed.setTitle(role.name);
	embed.setColor(role.alignment === 'GOOD' ? Colors.Green : role.alignment === 'NEUTRAL' ? Colors.Grey : Colors.Red);
	// embed.setThumbnail(guild.iconURL({ extension: 'png', size: 512 }));

	embed.addFields([
		{
			name: '__Abilities__',
			value: '\u200B',
		},
		...role.abilities
			.sort((a, b) => a.id - b.id)
			.map((ability) => {
				const { name, effect, charges } = ability;
				const footerList = generateAbilityFooter(ability);
				const categories = footerList.join(' · ');

				return {
					name: `**${name} [${charges === -1 ? 'inf' : 'x' + charges}]** - ${categories}`,
					value: `${effect}`,
				};
			}),
		{
			name: '__Perks__',
			value: '\u200B',
		},
		...role.perks.map((perk) => {
			const { name, effect } = perk;
			const footerList = generatePerkFooter(perk);
			const categoriesString = footerList.join(' · ');

			return {
				name: `**${name}**${categoriesString.length > 0 ? ` - ${categoriesString}` : ''}`,
				value: `${effect}`,
			};
		}),
	]);

	return embed;
}

export function formatRolePlainText(_guild: Guild, role: Role & { abilities: Ability[]; perks: Perk[] }) {
	let result = '```';

	if (role.alignment === 'NEUTRAL') result += 'ini\n[ NEUTRAL ]\n';
	else result += `diff\n${role.alignment === 'EVIL' ? '- EVIL -' : '+ GOOD +'}\n`;

	result += `${role.name}\n\n`;
	result += 'Abilities:\n';

	for (const ability of role.abilities) {
		const { name, effect, charges } = ability;
		let attachment = '';
		if (ability.rarity) attachment = '*';
		if (ability.isRoleSpecific) attachment = '^';

		const footerValues: string[] = [];
		let isVisiting = false;
		for (const category of ability.categories) {
			const cat = formatActionCategory(category);
			if (cat) {
				if (cat === 'Visiting') isVisiting = true;
				else footerValues.push(capitalize(cat));
			}
		}

		if (ability.actionType) {
			const type = formatActionType(ability.actionType);
			if (type) footerValues.push(type);
		}

		footerValues.push(isVisiting ? 'Visiting' : 'Non-visiting');

		let footer = '';
		if (ability.actionType) {
			footer += formatActionType(ability.actionType);
		}

		result += `${name} (${charges === -1 ? '∞' : 'x' + charges})${attachment} (${footerValues.join('/')}) - ${effect}\n\n`;
	}

	result += 'Perks:\n';
	for (const perk of role.perks) {
		const { name, effect } = perk;
		result += `${name} - ${effect}\n\n`;
	}

	result += '\n```';

	return result;
}

export function formatItemEmbed(_guild: Guild, item: Item) {
	const embed = new EmbedBuilder();
	embed.setTitle(item.name);
	// embed.setThumbnail(guild.iconURL({ extension: 'png', size: 1024 }));

	const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
	embed.setDescription(capitalize(item.rarity));
	embed.setColor('#64ce89');
	if (item.customColour && regex.test(item.customColour)) {
		embed.setColor(item.customColour as ColorResolvable);
	}
	if (item.iconURL) embed.setThumbnail(item.iconURL);

	const effect = item.effect.split('\\n').join('\n');
	const extraEffect = item.detailedEffect?.split('\\n').join('\n');

	embed.addFields([
		{
			name: 'Cost',
			value: item.cost ? `${item.cost} coins` : 'Cannot be bought',
		},
	]);

	embed.addFields({
		name: 'On Use',
		value: effect,
	});

	if (extraEffect) {
		embed.addFields({
			name: '\u200B',
			value: extraEffect,
		});
	}

	let footerList: string[] = [capitalize(item.rarity)];

	if (item.actionType) {
		const type = formatActionType(item.actionType);
		if (type) footerList.push(type);
	}

	for (const category of item.categories) {
		const cat = formatActionCategory(category);
		if (cat) footerList.push(cat);
	}

	const iconURL = _guild.iconURL({ extension: 'png', size: 1024 });
	let footer: string | undefined;
	if (footerList.length > 0) footer = footerList.join(' · ');
	if (footer) embed.setFooter({ text: footer, iconURL: iconURL ?? undefined });

	return embed;
}

export function formatStatusEmbed(_guild: Guild, status: Status) {
	const embed = new EmbedBuilder();
	embed.setTitle(status.name);
	// embed.setThumbnail(guild.iconURL({ extenson: 'png', size: 1024 }));
	embed.setColor('#8964CE');
	embed.addFields([
		{
			name: 'Effect',
			value: status.effect,
		},
	]);

	return embed;
}

export function formatAbilityEmbed(_guild: Guild, ability: Ability & { role: { name: string } }, showCharges: boolean = false) {
	const embed = new EmbedBuilder();
	embed.setTitle(ability.name);
	embed.setColor('#CE8964');

	const effect = ability.effect.split('\\n').join('\n');

	embed.addFields([
		{
			name: showCharges ? `**Effect [${ability.charges === -1 ? 'inf' : 'x' + ability.charges}]**` : '**Effect**',
			value: effect,
		},
	]);

	const footerList = generateAbilityFooter(ability);

	const iconURL = _guild.iconURL({ extension: 'png', size: 1024 });
	let footer: string | undefined;
	if (footerList.length > 0) footer = footerList.join(' · ');
	if (footer) embed.setFooter({ text: footer, iconURL: iconURL ?? undefined });

	return embed;
}

export function formatPerkEmbed(_guild: Guild, perk: Perk & { role: { name: string } }, extraDetails: boolean = false) {
	const embed = new EmbedBuilder();
	embed.setTitle(perk.name);
	embed.setColor('#096B72');

	const effect = perk.effect.split('\\n').join('\n');

	embed.addFields([
		{
			name: 'Effect',
			value: effect,
		},
	]);

	const footerList = generatePerkFooter(perk);

	const iconURL = _guild.iconURL({ extension: 'png', size: 1024 });
	embed.setFooter({ iconURL: iconURL ?? undefined, text: footerList.length > 0 ? footerList.join(' · ') : '\u200B' });

	return embed;
}

export function formatAbilityChanges(guild: Guild, ability: Ability & { changes: AbilityChange[] }) {
	const embed = new EmbedBuilder();
	embed.setTitle(`Upgrades/Downgrades for ${capitalize(ability.name)}`);
	embed.setColor('#CE8964');

	const totalUpgrades = ability.changes.filter((change) => change.changeType === 'UPGRADE');
	const totalDowngrades = ability.changes.filter((change) => change.changeType === 'DOWNGRADE');

	embed.addFields(
		totalUpgrades.map((upgrade, index) => {
			return {
				name: `[UPG] ${upgrade.name}`,
				value: `${upgrade.changes}`,
			};
		})
	);

	embed.addFields(
		totalDowngrades.map((downgrade, index) => {
			return {
				name: `[DGD] ${downgrade.name}`,
				value: `${downgrade.changes}`,
			};
		})
	);

	const iconURL = guild.iconURL({ extension: 'png', size: 1024 });
	embed.setFooter({ iconURL: iconURL ?? undefined, text: '\u200B' });

	const row = new ActionRowBuilder<StringSelectMenuBuilder>();
	const select = new StringSelectMenuBuilder();
	select.setCustomId(viewAbilityChangeSelect.getCustomID());
	select.setPlaceholder('Select an upgrade/downgrade to view the full effect');
	select.addOptions(
		[
			totalUpgrades.map((change) => {
				return {
					label: 'UPG - ' + change.name,
					description: change.changes,
					value: change.id.toString(),
				};
			}),
			totalDowngrades.map((change) => {
				return {
					label: 'DGD - ' + change.name,
					description: change.changes,
					value: change.id.toString(),
				};
			}),
		].flat()
	);
	select.setMinValues(1);
	select.setMaxValues(1);
	row.addComponents(select);

	return {
		embed: embed,
		components: row,
	};
}

type FullInventory = NonNullable<Awaited<ReturnType<typeof getInventory>>>;

export function formatInventory(inventory: FullInventory) {
	const e = new EmbedBuilder();
	e.setTitle('Inventory');
	e.setColor('#CE8964');

	e.addFields(
		{
			name: 'Coins',
			value: `> ${inventory.coins.toString() ?? 0}`,
			inline: true,
		},
		{
			name: 'Coin Bonus',
			value: `> ${inventory.coinBonus.toString() ?? 0}%`,
			inline: true,
		},
		{
			name: 'Luck Bonus',
			value: `> ${inventory.luckBonus.toString() ?? 0}%`,
			inline: true,
		}
	);

	const items: string = inventory.items.length > 0 ? inventory.items.map((item) => item.item.name).join(', ') : 'None';
	e.addFields({
		name: `Items [${inventory.items.length}/${inventory.inventorySize}]`,
		value: `> ${items}`,
	});

	const aas = inventory.anyAbilities.length > 0 ? inventory.anyAbilities.map((aa) => aa.ability.name).join(', ') : 'None';
	e.addFields({
		name: 'AAs',
		value: `> ${aas}`,
	});

	const statuses = inventory.statuses.length > 0 ? inventory.statuses.map((status) => status.status.name).join(', ') : 'None';
	e.addFields({
		name: 'Statuses',
		value: `> ${statuses}`,
	});

	const immunities = inventory.immunities.length > 0 ? inventory.immunities.map((immunity) => immunity.name).join(', ') : 'None';
	e.addFields({
		name: 'Immunities',
		value: `> ${immunities}`,
	});

	return {
		embed: e,
	};
}

export async function fetchAndFormatInventory(userId: string) {
	const inventory = await getInventory(userId);
	if (!inventory) return null;
	const embed = formatInventory(inventory);
	return embed;
}
