import { ActionCategory, ActionType, PerkCategory, Rarity } from '@prisma/client';
import { prisma } from '../database';
import { findBestMatch } from 'string-similarity';

export const rarityMap: Record<Rarity, string> = {
	COMMON: 'Common',
	UNCOMMON: 'Uncommon',
	RARE: 'Rare',
	EPIC: 'Epic',
	LEGENDARY: 'Legendary',
	MYTHICAL: 'Mythical',
	ULTIMATE: 'Ultimate',
	UNIQUE: 'Unique',
};

export function formatRarity(rarity: string | Rarity) {
	try {
		const rarityKey = rarity as Rarity;
		return rarityMap[rarityKey] || null;
	} catch (err) {
		return null;
	}
}

export const categoryMap: Record<ActionCategory, string> = {
	VOTE_BLOCKING: 'Vote Blocking',
	VOTE_AVOIDING: 'Vote Avoiding',
	VOTE_REDIRECTION: 'Vote Redirection',
	VOTE_IMMUNITY: 'Vote Immunity',
	VOTE_CHANGE: 'Vote Change',
	VISIT_BLOCKING: 'Visit Blocking',
	VISIT_REDIRECTION: 'Visit Redirection',
	REACTIVE: 'Reactive',
	INVESTIGATION: 'Investigation',
	KILLING: 'Killing',
	PROTECTION: 'Protection',
	SUPPORT: 'Support',
	HEALING: 'Healing',
	DEBUFF: 'Debuff',
	THEFT: 'Theft',
	DESTRUCTION: 'Destruction',
	ALTERATION: 'Alteration',
	VISITING: 'Visiting',
};

export const perkCategoryMap: Record<PerkCategory, string> = {
	TOGGLABLE: 'Togglable',
};

export function formatActionCategory(category: string | ActionCategory) {
	try {
		const categoryKey = category as ActionCategory;
		return categoryMap[categoryKey] || null;
	} catch (err) {
		return null;
	}
}

export function formatPerkCategory(category: string | PerkCategory) {
	try {
		const categoryKey = category as PerkCategory;
		return perkCategoryMap[categoryKey] || null;
	} catch (err) {
		return null;
	}
}

const typeMap: Record<ActionType, string> = {
	NEGATIVE: 'Negative',
	POSITIVE: 'Positive',
	NEUTRAL: 'Neutral',
};

export function formatActionType(category: string | ActionType) {
	try {
		const categoryKey = category as ActionType;
		return typeMap[categoryKey] || null;
	} catch (err) {
		return null;
	}
}

export type NonNullable<T> = T extends null | undefined ? never : T;

export async function getInventory(discordId: string) {
	const inventory = await prisma.inventory.findUnique({
		where: {
			discordId,
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

	return inventory;
}

export async function getClosestItem(name: string) {
	const allItems = await prisma.item.findMany({ where: {}, select: { name: true } });
	const allItemNames = allItems.map((i) => i.name);
	const spellCheck = findBestMatch(name, allItemNames);
	const bestMatch = spellCheck.bestMatch.target;

	const fetchedItem = await prisma.item.findUnique({
		where: {
			name: bestMatch,
		},
	});

	return {
		item: fetchedItem,
		correctedName: bestMatch,
	};
}
