import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';
import { Button } from '../../structures/interactions';
import { prisma } from '../../database';
import { formatRarity, rarityMap } from '../../util/database';
import { Rarity } from '@prisma/client';
import editAbilityRarity from '../selectmenu/editAbilityRarity';

export default new Button('edit-ability-rarity')
	.setButton(new ButtonBuilder().setLabel('Edit Rarity').setStyle(ButtonStyle.Secondary))
	.onExecute(async (i, cache) => {
		if (!cache) return i.reply({ content: 'This button is invalid', ephemeral: true });
		if (!i.guild) return i.reply({ content: 'You need to be in a server to use this button', ephemeral: true });

		try {
			const ability = await prisma.ability.findUnique({
				where: { name: cache },
			});
			if (!ability) return i.reply({ content: `Ability ${cache} not found`, ephemeral: true });

			const row = new ActionRowBuilder<StringSelectMenuBuilder>();

			const keys = Object.keys(rarityMap) as Rarity[];

			const select = new StringSelectMenuBuilder()
				.setCustomId(editAbilityRarity.createCustomID(cache))
				.setPlaceholder('Select rarity')
				.setMaxValues(1)
				.setMinValues(1);

			for (let i = 0; i < keys.length; i++) {
				const newKey = keys[i];
				const value = formatRarity(newKey);

				console.log(newKey, value);
				if (!value) continue;

				select.addOptions(new StringSelectMenuOptionBuilder().setLabel(value).setValue(newKey));
			}

			select.addOptions(new StringSelectMenuOptionBuilder().setLabel('Not an AA').setValue('NOT_AN_AA'));

			row.addComponents(select);

			await i.reply({ content: 'Select the rarity this ability is.', components: [row], ephemeral: true });
		} catch (err) {
			console.log(err);
			await i.reply({ content: 'An error occurred while fetching the ability', ephemeral: true });
		}
	});
