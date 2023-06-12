import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Button } from '../../structures/interactions';
import { prisma } from '../../database';
import { categoryMap, formatActionCategory } from '../../util/database';
import { ActionCategory } from '@prisma/client';
import editAbilityCategories from '../selectmenu/editAbilityCategories';

export default new Button('edit-ability-categories')
	.setButton(new ButtonBuilder().setLabel('Edit Categories').setStyle(ButtonStyle.Secondary))
	.onExecute(async (i, cache) => {
		if (!cache) return i.reply({ content: 'This button is invalid', ephemeral: true });
		if (!i.guild) return i.reply({ content: 'You need to be in a server to use this button', ephemeral: true });

		try {
			const ability = await prisma.ability.findUnique({
				where: { name: cache },
			});
			if (!ability) return i.reply({ content: `Ability ${cache} not found`, ephemeral: true });

			const row = new ActionRowBuilder<StringSelectMenuBuilder>();

			const categoryKeys = Object.keys(categoryMap) as ActionCategory[];

			const select = new StringSelectMenuBuilder()
				.setCustomId(editAbilityCategories.createCustomID(cache))
				.setPlaceholder('Select categories')
				.setMinValues(1);

			let fullCount = 0;
			for (let i = 0; i < categoryKeys.length; i++) {
				const categoryKey = categoryKeys[i];
				const categoryText = formatActionCategory(categoryKey);

				if (!categoryText) continue;

				select.addOptions(new StringSelectMenuOptionBuilder().setLabel(categoryText || 'Unknown').setValue(categoryKey));
				fullCount += 1;
			}

			select.setMaxValues(fullCount);

			row.addComponents(select);

			await i.reply({ content: 'Select the categories you want to add this ability to', components: [row], ephemeral: true });
		} catch (err) {
			console.log(err);
			await i.reply({ content: 'An error occurred while fetching the role', ephemeral: true });
		}
	});
