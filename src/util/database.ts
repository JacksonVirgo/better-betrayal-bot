import { ActionCategory, ActionType, Rarity } from '@prisma/client';

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

export function formatActionCategory(category: string | ActionCategory) {
	try {
		const categoryKey = category as ActionCategory;
		return categoryMap[categoryKey] || null;
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
