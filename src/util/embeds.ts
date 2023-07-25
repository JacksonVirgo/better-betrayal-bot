import { Ability, Item, Perk, Status, Role, AbilityChange, ActionType, PerkCategory, Inventory } from '@prisma/client';
import { Guild, EmbedBuilder, Colors, ActionRowBuilder, StringSelectMenuBuilder, ColorResolvable, GuildMember, ButtonBuilder } from 'discord.js';
import { rarityToColor } from './colors';
import { bulkReplaceAll, capitalize, fixWhitespace, replaceAll } from './string';
import { formatActionCategory, formatActionType, formatPerkCategory, getAbility, getPerk, getRole } from './database';
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

export type FullRole = NonNullable<Awaited<ReturnType<typeof getRole>>>;
export function formatRoleEmbed(_guild: Guild, role: FullRole) {
	const embed = new EmbedBuilder();
	embed.setTitle(role.name);
	embed.setColor(role.alignment === 'GOOD' ? Colors.Green : role.alignment === 'NEUTRAL' ? Colors.Grey : Colors.Red);
	// embed.setThumbnail(guild.iconURL({ extension: 'png', size: 512 }));

	if (role.name === 'Nephilim') {
		const desc: string[] = ['Role uses unique mechanics, check with the info server for its types.', '<#1096236057378422915>'];
		embed.setDescription(desc.join('\n'));
	}

	const abilities = role.abilityAttachments.map((a) => a.abilities);
	const perks = role.perkAttachments.map((p) => p.perk);

	embed.addFields([
		{
			name: '__Abilities__',
			value: '\u200B',
		},
		...abilities
			.sort((a, b) => a.orderPriority - b.orderPriority)
			.map((ability) => {
				const { name, effect, charges } = ability;
				const footerList = generateAbilityFooter(ability);
				const categories = footerList.join(' · ');
				const formattedEffect = fixWhitespace(effect);

				return {
					name: `**${name} [${charges === -1 ? 'inf' : 'x' + charges}]**${!ability.showCategories ? '' : ` - ${categories}`}`,
					value: `${formattedEffect}`,
				};
			}),
		{
			name: '__Perks__',
			value: '\u200B',
		},
		...perks
			.sort((a, b) => a.orderPriority - b.orderPriority)
			.map((perk) => {
				const { name, effect } = perk;
				const footerList = generatePerkFooter(perk);
				const categoriesString = footerList.join(' · ');

				const formattedEffect = fixWhitespace(effect);
				return {
					name: `**${name}**${categoriesString.length > 0 ? ` - ${categoriesString}` : ''}`,
					value: `${formattedEffect}`,
				};
			}),
	]);

	return embed;
}

export function formatRolePlainText(_guild: Guild, role: FullRole) {
	let result = '```';

	let abilities = role.abilityAttachments.map((a) => a.abilities);
	let perks = role.perkAttachments.map((p) => p.perk);

	if (role.alignment === 'NEUTRAL') result += 'ini\n[ NEUTRAL ]\n';
	else result += `diff\n${role.alignment === 'EVIL' ? '- EVIL -' : '+ GOOD +'}\n`;

	result += `${role.name}\n\n`;
	result += 'Abilities:\n';

	abilities = abilities.sort((a, b) => a.orderPriority - b.orderPriority);
	perks = perks.sort((a, b) => a.orderPriority - b.orderPriority);

	for (const ability of abilities) {
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

		const formattedEffect = bulkReplaceAll(effect, [
			['=', '-'],
			['\n', '\n'],
		]);

		result += `${name} (${charges === -1 ? '∞' : 'x' + charges})${attachment}${!ability.showCategories ? '' : ` (${footerValues.join('/')})`} - ${formattedEffect}\n\n`;
	}

	result += 'Perks:\n';
	for (const perk of perks) {
		const { name, effect } = perk;
		const formattedEffect = bulkReplaceAll(effect, [
			['=', '-'],
			['\n', '\n'],
		]);

		const isToggle = perk.categories.includes('TOGGLABLE');

		result += `${name}${isToggle ? ` (Togglable)` : ''} - ${formattedEffect}\n\n`;
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

	if (item.bannedFromItemRain) footerList.push('Cannot be Randed');

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

export type FullAbility = NonNullable<Awaited<ReturnType<typeof getAbility>>>;
export function formatAbilityEmbed(_guild: Guild, ability: FullAbility, showCharges: boolean = false) {
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

	if (footer && ability.showCategories) embed.setFooter({ text: footer, iconURL: iconURL ?? undefined });

	return embed;
}

export type FullPerk = NonNullable<Awaited<ReturnType<typeof getPerk>>>;
export function formatPerkEmbed(_guild: Guild, perk: FullPerk) {
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

	if (footerList.length > 0) {
		const iconURL = _guild.iconURL({ extension: 'png', size: 1024 });
		embed.setFooter({ iconURL: iconURL ?? undefined, text: footerList.length > 0 ? footerList.join(' · ') : '\u200B' });
	}

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

export type FullInventory = NonNullable<Awaited<ReturnType<typeof getInventory>>>;
export function formatInventory(inventory: FullInventory) {
	const e = new EmbedBuilder();
	e.setTitle('Inventory');
	e.setColor('#CE8964');

	const { coins, coinBonus } = inventory;
	const coinValue = `${coins} [${coinBonus / 100}%] 🪙`;
	if (inventory.alignment) e.addFields({ name: 'Alignment', value: capitalize(inventory.alignment), inline: false });
	e.addFields({ name: 'Coins', value: coinValue, inline: false });

	const baseAbilities = inventory.baseAbility.length > 0 ? inventory.baseAbility.map((ability) => `- ${ability.name} [${ability.charges}]`).join('\n') : '- None';
	const basePerks = inventory.basePerk.length > 0 ? inventory.basePerk.map((perk) => `- ${perk.name}${perk.toggled != undefined ? ` [${perk.toggled ? 'ON' : 'OFF'}]` : ''}`).join('\n') : '- None';

	e.addFields(
		{
			name: 'Base Abilities',
			value: baseAbilities,
			inline: true,
		},
		{
			name: '\u200B',
			value: '\u200B',
			inline: true,
		},
		{
			name: 'Base Perks',
			value: basePerks,
			inline: true,
		}
	);

	const itemValue = inventory.items.length > 0 ? inventory.items.map((item, index) => `- ${item}`).join('\n') : '- None';
	const anyAbilities = inventory.anyAbilities.length > 0 ? inventory.anyAbilities.map((ability) => `- ${ability.abilityName} [${ability.charges}]`).join('\n') : '- None';

	e.addFields(
		{
			name: `Items [${inventory.items.length}/${inventory.inventorySize}]`,
			value: itemValue,
			inline: true,
		},
		{
			name: '\u200B',
			value: '\u200B',
			inline: true,
		},
		{
			name: 'Any Abilities',
			value: anyAbilities,
			inline: true,
		}
	);

	const statusValue =
		inventory.statuses.length > 0
			? inventory.statuses
					.map((status) => {
						const { statusName, expiry, xFold } = status;
						let response = `- ${xFold ? `${xFold}-fold ` : ''}${statusName}`;
						if (expiry) response += ` (expires <t:${expiry}:R>)`;
						return response;
					})
					.join('\n')
					.trim()
			: '- None';

	const immunityValue =
		inventory.immunities.length > 0
			? inventory.immunities
					.map((immunity) => {
						let result = `- ${immunity.xShot ? `${immunity.xShot}-shot ` : ''}${immunity.name}`;
						if (immunity.expiry) result += ` (expires <t:${immunity.expiry}:R>)`;
						return result;
					})
					.join('\n')
			: '- None';

	e.addFields(
		{
			name: 'Statuses',
			value: statusValue === '' ? '- None' : statusValue,
			inline: true,
		},
		{
			name: '\u200B',
			value: '\u200B',
			inline: true,
		},
		{
			name: 'Immunities',
			value: immunityValue,
			inline: true,
		}
	);

	const effectValue =
		inventory.effects.length > 0
			? inventory.effects
					.map((effect) => {
						let value = `- ${effect.name}`;
						if (effect.expiry) value += ` (expires <t:${effect.expiry}:R>)`;
						return value;
					})
					.join('\n')
			: '- None';

	e.addFields({
		name: 'Effects',
		value: effectValue,
	});
	return {
		embed: e,
	};
}

type FetchAndFormattedInventory = {
	embed: EmbedBuilder | null;
	inventory: FullInventory | null;
};
export async function fetchAndFormatInventory(userId: string): Promise<FetchAndFormattedInventory> {
	const inventory = await getInventory(userId);
	if (!inventory)
		return {
			embed: null,
			inventory: null,
		};
	const { embed } = formatInventory(inventory);
	return {
		embed,
		inventory: inventory,
	};
}
