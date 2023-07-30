import { ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { Button } from '../../structures/interactions';
import { formatRoleEmbed } from '../../util/embeds';
import { prisma } from '../../database';
import { formatStatus, getRole } from '../../util/database';

export default new Button('view-status-link')
	.setButton(new ButtonBuilder().setLabel('View Status Link').setStyle(ButtonStyle.Secondary))
	.onExecute(async (i, cache) => {
		if (!cache) return i.reply({ content: 'This button is invalid', ephemeral: true });
		if (!i.guild) return i.reply({ content: 'You need to be in a server to use this button', ephemeral: true });

		await i.deferReply({ ephemeral: true });

		try {
			const split = cache.split('-');
			const [type, id] = split;

			if (!type) return i.editReply({ content: 'This button is invalid' });
			if (!id) return i.editReply({ content: 'This button is invalid' });
			if (!(type === 'inflict' || type === 'cure')) return i.editReply({ content: 'This button is invalid' });

			const statusName = formatStatus(id);
			if (!statusName) return i.editReply({ content: 'This button is invalid' });

			const statusLinks = await prisma.statusLink.findMany({
				where: {
					statuses: {
						has: statusName,
					},
					linkType: type === 'inflict' ? 'INFLICTION' : 'CURE',
				},
				include: {
					ability: true,
					item: true,
					perk: true,
				},
			});

			if (!statusLinks) return i.editReply({ content: 'This button is invalid' });
			const embed = new EmbedBuilder();
			embed.setTitle(`${statusName} ${type === 'inflict' ? 'Inflictions' : 'Cures'}`);
			embed.setColor('#8964CE');

			let items: string[] = [];
			let abilities: string[] = [];
			let perks: string[] = [];

			for (const statusLink of statusLinks) {
				const { ability, item, perk } = statusLink;
				if (!ability && !item && !perk) continue;
				if (ability) abilities.push(ability.name);
				if (item) items.push(item.name);
				if (perk) perks.push(perk.name);
			}

			embed.addFields(
				{
					name: `Abilities`,
					value: abilities.length > 0 ? abilities.map((val, index) => `${index}. ${val}`).join('\n') : 'None',
				},
				{
					name: `Items`,
					value: items.length > 0 ? items.map((val, index) => `${index}. ${val}`).join('\n') : 'None',
				},
				{
					name: `Perks`,
					value: perks.length > 0 ? perks.map((val, index) => `${index}. ${val}`).join('\n') : 'None',
				}
			);

			await i.editReply({ embeds: [embed] });
		} catch (err) {
			console.log(err);
			await i.editReply({ content: 'An error occurred while fetching the role' });
		}
	});
