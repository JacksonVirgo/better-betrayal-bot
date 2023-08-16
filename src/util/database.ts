import {
    Ability,
    ActionCategory,
    ActionType,
    Item,
    Perk,
    PerkCategory,
    Rarity,
    StatusLink,
    StatusName,
} from "@prisma/client";
import { prisma } from "../database";
import { findBestMatch } from "string-similarity";

export const rarityMap: Record<Rarity, string> = {
    COMMON: "Common",
    UNCOMMON: "Uncommon",
    RARE: "Rare",
    EPIC: "Epic",
    LEGENDARY: "Legendary",
    MYTHICAL: "Mythical",
    ULTIMATE: "Ultimate",
    UNIQUE: "Unique",
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
    VOTE_BLOCKING: "Vote Blocking",
    VOTE_AVOIDING: "Vote Avoiding",
    VOTE_REDIRECTION: "Vote Redirection",
    VOTE_IMMUNITY: "Vote Immunity",
    VOTE_CHANGE: "Vote Change",
    VISIT_BLOCKING: "Visit Blocking",
    VISIT_REDIRECTION: "Visit Redirection",
    REACTIVE: "Reactive",
    INVESTIGATION: "Investigation",
    KILLING: "Killing",
    PROTECTION: "Protection",
    SUPPORT: "Support",
    HEALING: "Healing",
    DEBUFF: "Debuff",
    THEFT: "Theft",
    DESTRUCTION: "Destruction",
    ALTERATION: "Alteration",

    VISITING: "Visiting",
    GLOBAL_COOLDOWN: "Global Cooldown",
};

export const perkCategoryMap: Record<PerkCategory, string> = {
    TOGGLABLE: "Togglable",
};

export const statusMap: Record<StatusName, StatusName> = {
    Blackmailed: StatusName.Blackmailed,
    Burned: StatusName.Burned,
    Cursed: StatusName.Cursed,
    Despaired: StatusName.Despaired,
    Disabled: StatusName.Disabled,
    Drunk: StatusName.Drunk,
    Empowered: StatusName.Empowered,
    Frozen: StatusName.Frozen,
    Lucky: StatusName.Lucky,
    Madness: StatusName.Madness,
    Paralyzed: StatusName.Paralyzed,
    Restrained: StatusName.Restrained,
    Unlucky: StatusName.Unlucky,
};

export function formatStatus(status: string | StatusName): StatusName | null {
    try {
        const statusKey = status as StatusName;
        return statusMap[statusKey] || null;
    } catch (err) {
        return null;
    }
}

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
    NEGATIVE: "Negative",
    POSITIVE: "Positive",
    NEUTRAL: "Neutral",
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

type InventoryQuery = string | { channelId: string };
export async function getInventory(discordId: InventoryQuery) {
    if (typeof discordId === "string") {
        const inventory = await prisma.inventory.findUnique({
            where: {
                discordId,
            },
            include: {
                anyAbilities: true,
                statuses: true,
                immunities: true,
                effects: true,
                baseAbility: true,
                basePerk: true,
            },
        });

        return inventory;
    }

    const inventory = await prisma.inventory.findUnique({
        where: {
            channelId: discordId.channelId,
        },
        include: {
            anyAbilities: true,
            statuses: true,
            immunities: true,
            effects: true,
            baseAbility: true,
            basePerk: true,
        },
    });

    return inventory;
}

export async function getClosestItemName(name: string) {
    const allItems = await prisma.item.findMany({
        where: {},
        select: { name: true },
    });
    const allItemNames = allItems.map((i) => i.name);
    const spellCheck = findBestMatch(name, allItemNames);
    const bestMatch = spellCheck.bestMatch.target;
    return bestMatch;
}

export async function getClosestItem(name: string) {
    const bestMatch = await getClosestItemName(name);
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

export async function getClosestPerkName(name: string) {
    const allPerks = await prisma.perk.findMany({
        where: {},
        select: { name: true },
    });
    const allPerkNames = allPerks.map((a) => a.name);
    const spellCheck = findBestMatch(name, allPerkNames);
    const bestMatch = spellCheck.bestMatch.target;
    return bestMatch;
}
export async function getPerk(name: string) {
    const perk = await prisma.perk.findUnique({
        where: {
            name: name,
        },
        include: {
            perkAttachments: {
                include: {
                    roles: true,
                },
            },
        },
    });

    return perk;
}

export async function getClosestAbilityName(name: string) {
    const allAbilities = await prisma.ability.findMany({
        where: {},
        select: { name: true },
    });
    const allAbilityNames = allAbilities.map((a) => a.name);
    const spellCheck = findBestMatch(name, allAbilityNames);
    const bestMatch = spellCheck.bestMatch.target;
    return bestMatch;
}

export async function getAbility(name: string) {
    const perk = await prisma.ability.findUnique({
        where: {
            name: name,
        },
        include: {
            abilityAttachments: {
                include: {
                    roles: true,
                },
            },
            changes: true,
        },
    });

    return perk;
}

export async function getClosestRoleName(name: string) {
    const allRoles = await prisma.role.findMany({
        where: {},
        select: { name: true },
    });
    const allRoleNames = allRoles.map((r) => r.name);
    const spellCheck = findBestMatch(name, allRoleNames);
    const bestMatch = spellCheck.bestMatch.target;
    return bestMatch;
}
export async function getRole(name: string) {
    const fetchedRole = await prisma.role.findUnique({
        where: {
            name: name,
        },
        include: {
            abilityAttachments: {
                include: {
                    abilities: true,
                },
            },
            perkAttachments: {
                include: {
                    perk: true,
                },
            },
        },
    });

    return fetchedRole;
}

export async function getClosestImmunityName(name: string) {
    const bestMatch = await getClosestStatusName(name, [
        "Death",
        "Elimination",
    ]);
    return bestMatch;
}

export async function getClosestStatusName(
    name: string,
    additional: string[] = []
) {
    const allStatuses = await prisma.status.findMany({
        where: {},
        select: { name: true },
    });
    const allStatusNames = [...allStatuses.map((s) => s.name), ...additional];
    const spellCheck = findBestMatch(name, allStatusNames);
    const bestMatch = spellCheck.bestMatch.target;
    return bestMatch;
}

export type FullStatus = NonNullable<Awaited<ReturnType<typeof getStatus>>>;
export async function getStatus(name: string) {
    const fetchedStatus = await prisma.status.findUnique({
        where: {
            name: name,
        },
    });

    return fetchedStatus;
}

export type StatusLinks = NonNullable<
    Awaited<ReturnType<typeof getStatusLinks>>
>;
export async function getStatusLinks(name: StatusName) {
    const fetchedStatus = await prisma.statusLink.findMany({
        where: {
            statuses: {
                has: name,
            },
        },
        include: {
            ability: true,
            perk: true,
            item: true,
        },
    });

    return fetchedStatus;
}

export async function getSubmittedAction(messageId: string) {
    try {
        const storedAction = await prisma.submittedAction.findUnique({
            where: {
                hostMessageId: messageId,
            },
            include: {
                inventory: true,
            },
        });

        return storedAction;
    } catch (err) {
        return null;
    }
}

export type ActionBacklog = NonNullable<
    Awaited<ReturnType<typeof getActionBacklog>>
>;
export async function getActionBacklog(channelId: string) {
    try {
        const backlog = await prisma.actionBacklog.findUnique({
            where: {
                channelId,
            },
            include: {
                actions: true,
            },
        });

        return backlog;
    } catch (err) {
        return null;
    }
}
