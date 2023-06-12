import { AttachmentBuilder, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { prisma } from '../../database';

const data = new SlashCommandBuilder().setName('backup').setDescription('Back up the database.');
export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });

		await i.reply({ content: 'Backing up the database...', ephemeral: true });

		const itemBuffer = await toBuffer(await prisma.item.findMany());
		await i.followUp({ content: 'Backing up items...', files: [new AttachmentBuilder(itemBuffer).setName('items.json')] });

		const perkBuffer = await toBuffer(await prisma.perk.findMany());
		await i.followUp({ content: 'Backing up perks...', files: [new AttachmentBuilder(perkBuffer).setName('perks.json')] });

		const abilityBuffer = await toBuffer(await prisma.ability.findMany());
		await i.followUp({ content: 'Backing up abilities...', files: [new AttachmentBuilder(abilityBuffer).setName('abilities.json')] });

		const roleBuffer = await toBuffer(await prisma.role.findMany());
		await i.followUp({ content: 'Backing up roles...', files: [new AttachmentBuilder(roleBuffer).setName('roles.json')] });

		const statusBuffer = await toBuffer(await prisma.status.findMany());
		await i.followUp({ content: 'Backing up statuses...', files: [new AttachmentBuilder(statusBuffer).setName('statuses.json')] });
	},
});

async function toBuffer<T>(data: T) {
	const json = JSON.stringify(data);
	const buffer = Buffer.from(json);
	return buffer;
}
