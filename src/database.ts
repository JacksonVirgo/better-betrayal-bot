import { PrismaClient } from "@prisma/client";
import { getRole } from "./util/database";
export const prisma = new PrismaClient();

interface Cache {
    abilities: string[];
    perks: string[];
    items: string[];
    roles: string[];

    goodRoles: string[];
    neutralRoles: string[];
    evilRoles: string[];

    statuses: string[];
    lastUpdated: Date;
}

export const cache: Cache = {
    abilities: [],
    perks: [],
    items: [],
    roles: [],
    goodRoles: [],
    neutralRoles: [],
    evilRoles: [],
    statuses: [],
    lastUpdated: new Date(),
};

export async function getRoles() {
    if (cache.roles.length == 0) {
        const roles = await prisma.role.findMany({});

        const goodRoles = roles
            .filter((r) => r.alignment == "GOOD")
            .map((r) => r.name);
        const neutralRoles = roles
            .filter((r) => r.alignment == "NEUTRAL")
            .map((r) => r.name);
        const evilRoles = roles
            .filter((r) => r.alignment == "EVIL")
            .map((r) => r.name);

        cache.roles = [...goodRoles, ...neutralRoles, ...evilRoles];
        cache.goodRoles = goodRoles;
        cache.neutralRoles = neutralRoles;
        cache.evilRoles = evilRoles;
    }

    return {
        all: cache.roles,
        good: cache.goodRoles,
        neutral: cache.neutralRoles,
        evil: cache.evilRoles,
    };
}

export async function updateCache() {
    try {
        const abilityNames = (
            await prisma.ability.findMany({ select: { name: true } })
        ).map((a) => a.name);
        const perkNames = (
            await prisma.perk.findMany({ select: { name: true } })
        ).map((p) => p.name);
        const itemNames = (
            await prisma.item.findMany({ select: { name: true } })
        ).map((i) => i.name);
        const statusNames = (
            await prisma.status.findMany({ select: { name: true } })
        ).map((s) => s.name);

        await getRoles();

        cache.abilities = abilityNames;
        cache.perks = perkNames;
        cache.items = itemNames;
        cache.statuses = statusNames;
        cache.lastUpdated = new Date();
    } catch (err) {
        console.log(err);
    }
}
