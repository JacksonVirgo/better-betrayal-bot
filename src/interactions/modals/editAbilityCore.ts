import { ModalSubmitInteraction } from 'discord.js';
import { Modal } from '../../structures/interactions';
import { prisma } from '../../database';
import { EmbedBuilder } from 'discord.js';
import { formatAbilityEmbed } from '../../util/embeds';
import { createChangeLog } from '../../util/logs';

export default new Modal('abil-core', 'Ability Core').onExecute(async (i: ModalSubmitInteraction, cache) => {
	if (!i.guild) return;
	try {
		const name = i.fields.getTextInputValue('name');
		const effect = i.fields.getTextInputValue('effect');
		const charges = i.fields.getTextInputValue('charges');

		if (!name || !effect || !charges) return i.reply('Missing fields');

		const chargesNum = charges.toLowerCase() == 'inf' ? -1 : parseInt(charges);
		if (isNaN(chargesNum)) return i.reply('Invalid charges. Must be a number or "INF"');

		const ability = await prisma.ability.findUnique({
			where: { name: cache },
			include: {
				role: {
					select: {
						name: true,
					},
				},
			},
		});

		if (!ability) return i.reply('Ability not found');

		const updated = await prisma.ability.update({
			where: { name: cache },
			data: {
				name,
				effect,
				charges: chargesNum,
			},
		});

		const embed = new EmbedBuilder();
		embed.setTitle(`Ability Changed - ${ability.name}`);
		embed.setColor('White');
		embed.setAuthor({
			name: i.user.username,
			iconURL: i.user.displayAvatarURL({}),
		});
		embed.setDescription(`Changed ability for ${ability.role.name}`);

		const oldEmbed = formatAbilityEmbed(i.guild, ability, true);
		oldEmbed.setTitle(`Old Ability - ${ability.name}`);
		const newEmbed = formatAbilityEmbed(
			i.guild,
			{
				...updated,
				role: ability.role,
			},
			true
		);
		newEmbed.setTitle(`New Ability - ${updated.name}`);

		createChangeLog({ embeds: [embed, oldEmbed, newEmbed] });

		return i.reply({
			embeds: [embed, oldEmbed, newEmbed],
		});
	} catch (err) {
		console.error(err);
		return i.reply({ content: 'An error occured', ephemeral: true });
	}
});
