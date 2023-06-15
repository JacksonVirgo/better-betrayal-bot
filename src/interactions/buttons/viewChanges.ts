import { ButtonBuilder, ButtonStyle } from 'discord.js';
import { Button } from '../../structures/interactions';
import { formatAbilityChanges, formatRoleEmbed } from '../../util/embeds';
import { prisma } from '../../database';

export default new Button('view-changes')
	.setButton(new ButtonBuilder().setLabel('View Upgrades/Downgrades').setStyle(ButtonStyle.Secondary))
	.onExecute(async (i, cache) => {
		if (!cache) return i.reply({ content: 'This button is invalid', ephemeral: true });
		if (!i.guild) return i.reply({ content: 'You need to be in a server to use this button', ephemeral: true });

		try {
			const fetchedAbility = await prisma.ability.findUnique({
				where: {
					name: cache,
				},
				include: {
					changes: true,
				},
			});

			if (!fetchedAbility) return i.reply({ content: 'Ability not found', ephemeral: true });
			if (fetchedAbility.changes.length == 0) return i.reply({ content: 'No upgrades or downgrades found', ephemeral: true });
			const { embed, components } = formatAbilityChanges(i.guild, fetchedAbility);
			return i.reply({ embeds: [embed], components: [components] });
		} catch (err) {
			console.log(err);
			await i.reply({ content: 'An error occurred while fetching the role', ephemeral: true });
		}
	});
