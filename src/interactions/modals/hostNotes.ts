import { ActionRowBuilder, ModalActionRowComponentBuilder, ModalBuilder, ModalSubmitInteraction, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Modal } from '../../structures/interactions';
import { prisma } from '../../database';
import { formatAbilityChanges } from '../../util/embeds';
import { getInventory } from '../../util/database';
import { capitalize } from '../../util/string';

export function getModal(username: string, discordId: string, currentNotes: string = '') {
	const modal = new ModalBuilder()
		.setTitle(`Host Notes for ${capitalize(username)}`)
		.setCustomId(`host-notes_${discordId}`)
		.setComponents(
			new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId('host-notes')
					.setLabel('Host Notes')
					.setPlaceholder('Add whatever notes here')
					.setValue(currentNotes)
					.setStyle(TextInputStyle.Paragraph)
					.setRequired(false)
			)
		);
}

export default new Modal('host-notes', 'Viewing/Editing Host Notes').onExecute(async (i: ModalSubmitInteraction, cache) => {
	if (!i.guild) return;
	if (!cache) return i.reply({ content: 'This modal is invalid', ephemeral: true });

	try {
		const hostNotesValue = i.fields.getTextInputValue('host-notes');
		const inventory = await getInventory(cache);
		if (!inventory) return i.reply({ content: `Inventory ${cache} not found`, ephemeral: true });

		if (!inventory.hostNotes) inventory.hostNotes = '';

		await prisma.inventory.update({
			where: { id: inventory.id },
			data: { hostNotes: hostNotesValue ?? '' },
		});
	} catch (err) {
		console.error(err);
		return i.reply({ content: 'An error occured', ephemeral: true });
	}
});
