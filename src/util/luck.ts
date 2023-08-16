import { Ability, Alignment, Rarity, Role } from "@prisma/client";
import { prisma } from "../database";
import { getRole } from "./database";

interface LuckTable {
    common: number;
    uncommon: number;
    rare: number;
    epic: number;
    legendary: number;
    mythical: number;
}

export function getLuckTable(luck: number): LuckTable {
    const luckCap: number = 398;
    if (luck > luckCap) {
        luck = luckCap;
    }
    let commonOdds: number = 8000 - 500 * luck;
    if (commonOdds < 0) {
        commonOdds = 0;
    }

    let uncommonOdds: number = 1500 + 300 * luck;
    if (luck > 16) {
        uncommonOdds -= 500 * (luck - 16);
    }
    if (uncommonOdds < 0) {
        uncommonOdds = 0;
    }

    let rareOdds: number = 200 + luck * 100;
    if (luck >= 48) {
        rareOdds -= 100 * (luck - 47);
    }
    if (luck > 48) {
        rareOdds -= 100 * (luck - 48);
    }
    if (rareOdds < 0) {
        rareOdds = 0;
    }

    let epicOdds: number = 150 + luck * 50;
    if (luck > 97) {
        epicOdds -= 100 * (luck - 97);
    }
    if (epicOdds < 0) {
        epicOdds = 0;
    }

    let legendaryOdds: number = 100 + luck * 25;
    if (luck > 197) {
        legendaryOdds -= 50 * (luck - 197);
    }

    let mythicalOdds: number = 50 + luck * 25;

    return {
        common: commonOdds,
        uncommon: uncommonOdds,
        rare: rareOdds,
        epic: epicOdds,
        legendary: legendaryOdds,
        mythical: mythicalOdds,
    };
}

export async function getRandomItem(luckTable?: LuckTable) {
    if (!luckTable) {
        const allItems = await prisma.item.findMany({
            where: {
                bannedFromItemRain: {
                    not: true,
                },
            },
        });
        const rand = Math.floor(Math.random() * allItems.length);
        return allItems[rand];
    }

    const rand = Math.random() * 10000;
    let itemRarity: Rarity = "COMMON";

    if (rand < luckTable.common) {
        itemRarity = "COMMON";
    } else if (rand < luckTable.common + luckTable.uncommon) {
        itemRarity = "UNCOMMON";
    } else if (rand < luckTable.common + luckTable.uncommon + luckTable.rare) {
        itemRarity = "RARE";
    } else if (
        rand <
        luckTable.common + luckTable.uncommon + luckTable.rare + luckTable.epic
    ) {
        itemRarity = "EPIC";
    } else if (
        rand <
        luckTable.common +
            luckTable.uncommon +
            luckTable.rare +
            luckTable.epic +
            luckTable.legendary
    ) {
        itemRarity = "LEGENDARY";
    } else if (
        rand <
        luckTable.common +
            luckTable.uncommon +
            luckTable.rare +
            luckTable.epic +
            luckTable.legendary +
            luckTable.mythical
    ) {
        itemRarity = "MYTHICAL";
    } else {
        itemRarity = "MYTHICAL";
    }

    const fetchedItem = await prisma.item.findMany({
        where: {
            rarity: itemRarity,
            bannedFromItemRain: {
                not: true,
            },
        },
    });

    const item = fetchedItem[Math.floor(Math.random() * fetchedItem.length)];
    return item;
}

export async function getRandomAnyAbility(luckTable: LuckTable) {
    const rand = Math.random() * 10000 - luckTable.mythical;
    let itemRarity: Rarity = "COMMON";

    if (rand < luckTable.common) {
        itemRarity = "COMMON";
    } else if (rand < luckTable.common + luckTable.uncommon) {
        itemRarity = "UNCOMMON";
    } else if (rand < luckTable.common + luckTable.uncommon + luckTable.rare) {
        itemRarity = "RARE";
    } else if (
        rand <
        luckTable.common + luckTable.uncommon + luckTable.rare + luckTable.epic
    ) {
        itemRarity = "EPIC";
    } else if (
        rand <
        luckTable.common +
            luckTable.uncommon +
            luckTable.rare +
            luckTable.epic +
            luckTable.legendary
    ) {
        itemRarity = "LEGENDARY";
    } else if (
        rand <
        luckTable.common +
            luckTable.uncommon +
            luckTable.rare +
            luckTable.epic +
            luckTable.legendary +
            luckTable.mythical
    ) {
        itemRarity = "LEGENDARY";
    } else {
        itemRarity = "LEGENDARY";
    }

    let fetchedAbility = await prisma.ability.findMany({
        where: {
            rarity: itemRarity,
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

    const ability =
        fetchedAbility[Math.floor(Math.random() * fetchedAbility.length)];
    return ability;
}

type RandomRoleQuery = {
    includeInactives?: boolean;
};
export async function getRandomRole(
    alignment?: Alignment,
    query: RandomRoleQuery = {
        includeInactives: false,
    }
) {
    const allRoles = await prisma.role.findMany({
        where: {
            alignment: alignment,
            isActive: query.includeInactives ? undefined : true,
        },
        select: {
            name: true,
        },
    });

    const randomRoleName =
        allRoles[Math.floor(Math.random() * allRoles.length)].name;

    const role = await getRole(randomRoleName);

    return role;
}
