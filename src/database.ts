import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();

interface Cache {
	abilities: string[];
	perks: string[];
	items: string[];
	roles: string[];
	statuses: string[];
	lastUpdated: Date;
}

export const cache: Cache = {
	abilities: [],
	perks: [],
	items: [],
	roles: [],
	statuses: [],
	lastUpdated: new Date(),
};

export async function updateCache() {
	try {
		const abilityNames = (await prisma.ability.findMany({ select: { name: true } })).map((a) => a.name);
		const perkNames = (await prisma.perk.findMany({ select: { name: true } })).map((p) => p.name);
		const itemNames = (await prisma.item.findMany({ select: { name: true } })).map((i) => i.name);
		const roleNames = (await prisma.role.findMany({ select: { name: true } })).map((r) => r.name);
		const statusNames = (await prisma.status.findMany({ select: { name: true } })).map((s) => s.name);

		cache.abilities = abilityNames;
		cache.perks = perkNames;
		cache.items = itemNames;
		cache.roles = roleNames;
		cache.statuses = statusNames;
		cache.lastUpdated = new Date();
	} catch (err) {
		console.log(err);
	}
}
