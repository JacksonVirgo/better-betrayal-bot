import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import { Button } from '../../structures/interactions';
import { prisma } from '../../database';
import editAbilityCore from '../modals/editAbilityCore';

export default new Button('edit-ability-core')
	.setButton(new ButtonBuilder().setLabel('Edit Rarity').setStyle(ButtonStyle.Secondary))
	.onExecute(async (i, cache) => {
		if (!cache) return i.reply({ content: 'This button is invalid', ephemeral: true });
		if (!i.guild) return i.reply({ content: 'You need to be in a server to use this button', ephemeral: true });

		try {
			const ability = await prisma.ability.findUnique({
				where: { name: cache },
			});
			if (!ability) return i.reply({ content: `Ability ${cache} not found`, ephemeral: true });

			const modal = new ModalBuilder()
				.setTitle(`Edit ${ability.name}`)
				.setCustomId(editAbilityCore.createCustomID(cache))
				.setComponents(
					new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId('name')
							.setLabel('Ability Name')
							.setPlaceholder('Ability Name')
							.setValue(ability.name)
							.setRequired(true)
							.setStyle(TextInputStyle.Short)
					),
					new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId('effect')
							.setLabel('Ability Effect')
							.setPlaceholder('Ability Effect')
							.setValue(ability.effect)
							.setStyle(TextInputStyle.Paragraph)
							.setRequired(true)
					),
					new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
						new TextInputBuilder()
							.setCustomId('charges')
							.setLabel('Ability Charges (INF = Infinite)')
							.setPlaceholder('Ability Charges')
							.setValue(ability.charges == -1 ? 'INF' : ability.charges.toString())
							.setStyle(TextInputStyle.Short)
							.setRequired(true)
					)
				);

			await i.showModal(modal);
		} catch (err) {
			console.log(err);
			await i.reply({ content: 'An error occurred while fetching the ability', ephemeral: true });
		}
	});
