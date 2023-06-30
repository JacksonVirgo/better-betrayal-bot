import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalActionRowComponentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Button } from '../../structures/interactions';
import { prisma } from '../../database';
import addUpgrade from '../modals/addUpgrade';

export default new Button('add-update-button').setButton(new ButtonBuilder().setLabel('Add Upgrade/Downgrade').setStyle(ButtonStyle.Secondary)).onExecute(async (i, cache) => {
	if (!cache) return i.reply({ content: 'This button is invalid', ephemeral: true });
	if (!i.guild) return i.reply({ content: 'You need to be in a server to use this button', ephemeral: true });

	try {
		const upgrade = cache.startsWith('U');
		cache = cache.slice(1);

		const ability = await prisma.ability.findUnique({
			where: { name: cache },
		});
		if (!ability) return i.reply({ content: `Ability ${cache} not found`, ephemeral: true });

		const modalTitle = upgrade ? 'Add Upgrade' : 'Add Downgrade';
		const customID = `add-upgrade_${cache}${upgrade ? 'U' : 'D'}`;
		const modal = new ModalBuilder()
			.setTitle(modalTitle)
			.setCustomId(customID)
			.setComponents(
				new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
					new TextInputBuilder().setCustomId('name').setLabel('Upgrade Name').setPlaceholder('Upgrade Name').setRequired(true).setStyle(TextInputStyle.Short)
				),
				new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
					new TextInputBuilder()
						.setCustomId('effect')
						.setLabel('Changed Ability Effect')
						.setPlaceholder('Ability Effect')
						.setValue(ability.effect)
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(true)
				),
				new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
					new TextInputBuilder().setCustomId('changes').setLabel('Changes').setPlaceholder('Write out just the changes').setStyle(TextInputStyle.Paragraph).setMinLength(1).setRequired(true)
				)
			);

		await i.showModal(modal);
	} catch (err) {
		console.log(err);
		await i.reply({ content: 'An error occurred while fetching the ability', ephemeral: true });
	}
});
