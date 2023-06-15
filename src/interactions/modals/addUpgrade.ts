import { ModalSubmitInteraction } from 'discord.js';
import { Modal } from '../../structures/interactions';
import { prisma } from '../../database';
import { formatAbilityChanges } from '../../util/embeds';

export default new Modal('add-upgrade', 'Add Upgrade/Downgrade').onExecute(async (i: ModalSubmitInteraction, cache) => {
	if (!i.guild) return;
	if (!cache) return i.reply({ content: 'This modal is invalid', ephemeral: true });
	try {
		const name = i.fields.getTextInputValue('name');
		const effect = i.fields.getTextInputValue('effect');
		const changes = i.fields.getTextInputValue('changes');
		if (!name || !effect || !changes) return i.reply('Missing fields');

		const isUpgrade = cache.endsWith('U');
		cache = cache.slice(0, -1);

		const ability = await prisma.ability.findUnique({
			where: { name: cache },
			include: {
				changes: true,
			},
		});

		if (!ability) return i.reply({ content: `Ability ${cache} not found`, ephemeral: true });

		const upgrade = await prisma.abilityChange.create({
			data: {
				name: name,
				effect: effect,
				changes: changes,
				abilityId: ability.id,
				changeType: isUpgrade ? 'UPGRADE' : 'DOWNGRADE',
			},
		});

		const fetchedAbility = ability;
		fetchedAbility.changes.push(upgrade);

		const { embed, components } = formatAbilityChanges(i.guild, fetchedAbility);
		return i.reply({ embeds: [embed], components: [components], ephemeral: true });
	} catch (err) {
		console.error(err);
		return i.reply({ content: 'An error occured', ephemeral: true });
	}
});
