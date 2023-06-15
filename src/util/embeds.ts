import { Ability, Item, Perk, Status, Role, AbilityChange } from '@prisma/client';
import { Guild, EmbedBuilder, Colors, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { rarityToColor } from './colors';
import { capitalize } from './string';
import { formatActionCategory, formatActionType } from './database';
import viewAbilityChangeSelect from '../interactions/selectmenu/viewAbilityChange';
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
	if (ability.isRoleSpecific) footerList.push(`Role Specific`);

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
	embed.setFooter({ iconURL: iconURL ?? undefined, text: '\u200B' });

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
