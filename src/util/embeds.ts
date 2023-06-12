import { Ability, Item, Perk, Status, Role, Inventory } from '@prisma/client';
import { Guild, EmbedBuilder, Colors } from 'discord.js';
import { rarityToColor } from './colors';
import { capitalize } from './string';
import { formatActionCategory, formatActionType } from './database';

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
		...role.abilities.map(({ name, effect, charges, rarity }) => {
			return {
				name: `**${name} [${charges === -1 ? 'inf' : 'x' + charges}]**`,
				value: `${effect}`,
			};
		}),
		{
			name: '__Perks__',
			value: '\u200B',
		},
		...role.perks.map(({ name, effect }) => {
			return {
				name: `**${name}**`,
				value: `${effect}`,
			};
		}),
	]);

	return embed;
}

export function formatItemEmbed(_guild: Guild, item: Item) {
	const embed = new EmbedBuilder();
	embed.setTitle(item.name);
	// embed.setThumbnail(guild.iconURL({ extension: 'png', size: 1024 }));
	embed.setDescription(capitalize(item.rarity));
	embed.setColor('#64ce89');

	const effect = item.effect.split('\\n').join('\n');

	embed.addFields([
		{
			name: 'Cost',
			value: item.cost ? `${item.cost} coins` : 'Cannot be bought',
		},
		{
			name: 'On Use',
			value: effect,
		},
	]);

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

	let footerList: string[] = [ability.rarity ? `${capitalize(ability.rarity)} AA` : 'Not an AA'];

	if (ability.actionType) {
		const type = formatActionType(ability.actionType);
		if (type) footerList.push(type);
	}

	for (const category of ability.categories) {
		const cat = formatActionCategory(category);
		if (cat) footerList.push(cat);
	}

	const iconURL = _guild.iconURL({ extension: 'png', size: 1024 });
	let footer: string | undefined;
	if (footerList.length > 0) footer = footerList.join(' · ');
	if (footer) embed.setFooter({ text: footer, iconURL: iconURL ?? undefined });

	return embed;
}

export function formatPerkEmbed(_guild: Guild, perk: Perk & { role: { name: string } }, extraDetails: boolean = false) {
	const embed = new EmbedBuilder();
	embed.setTitle(extraDetails && perk.detailedEffect ? `${perk.name} - Detailed` : perk.name);
	embed.setColor('#096B72');

	const effect = (extraDetails && perk.detailedEffect ? perk.detailedEffect : perk.effect).split('\\n').join('\n');

	embed.addFields([
		{
			name: 'Effect',
			value: effect,
		},
	]);

	const iconURL = _guild.iconURL({ extension: 'png', size: 1024 });
	embed.setFooter({ iconURL: iconURL ?? undefined, text: '\u200B/' });

	return embed;
}

export function formatInventory(inventory: Inventory) {
	const e = new EmbedBuilder();

	e.setTitle('Inventory');
	e.setColor('White');

	e.addFields([
		{
			name: 'Coins',
			value: `> ${inventory.coins}`,
			inline: true,
		},
		{
			name: 'Coin Bonus',
			value: `> ${inventory.coinBonus}%`,
			inline: true,
		},
	]);

	let statusString = '> None';
	e.addFields({
		name: 'Statuses',
		value: statusString,
	});

	let itemString = '> None';
	e.addFields({
		name: 'Items',
		value: itemString,
		inline: true,
	});

	let aaString = '> None';
	e.addFields({
		name: 'AAs',
		value: aaString,
		inline: true,
	});

	let immunityString = '> None';
	e.addFields({
		name: 'Immunities',
		value: immunityString,
	});

	let effectString = '> None';
	e.addFields({
		name: 'Effects',
		value: effectString,
	});

	return e;

	/* Coins: 859 [0%]
Inventory: Flint & Steel, Seed Gun, Vortex Liquid, Cheque
AA: Spy [0]
Statuses: Unlucky, Paralyzed
Effects: 
Immunities: 
Vote(s): */
}
