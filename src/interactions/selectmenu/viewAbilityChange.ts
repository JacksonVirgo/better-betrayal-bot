import { Ability } from '@prisma/client';
import { SelectMenu } from '../../structures/interactions';
import { prisma } from '../../database';
import { formatAbilityEmbed } from '../../util/embeds';

export default new SelectMenu('view-full-ability-change').onExecute(async (i, cache) => {
	if (!i.guild) return i.reply({ content: 'You need to be in a server to use this select menu', ephemeral: true });

	const abilityChangeID = i.values[0];
	if (!abilityChangeID) return i.reply({ content: 'This select menu is invalid', ephemeral: true });

	const id = parseInt(abilityChangeID);
	if (isNaN(id)) return i.reply({ content: 'This select menu is invalid', ephemeral: true });

	await i.deferReply({ ephemeral: true });

	const abilityChange = await prisma.abilityChange.findUnique({
		where: {
			id: id,
		},
		include: {
			ability: {
				include: {
					role: {
						select: {
							name: true,
						},
					},
				},
			},
		},
	});

	if (!abilityChange) return i.editReply({ content: 'Ability change not found' });

	const changedAbility: Ability & { role: { name: string } } = {
		id: abilityChange.ability.id,
		name: abilityChange.ability.name,
		rarity: abilityChange.ability.rarity,
		effect: abilityChange.effect,
		actionType: abilityChange.ability.actionType,
		categories: abilityChange.ability.categories,
		charges: abilityChange.ability.charges,
		detailedEffect: abilityChange.ability.detailedEffect,
		isAnyAbility: abilityChange.ability.isAnyAbility,
		roleId: abilityChange.ability.roleId,
		updatedAt: abilityChange.ability.updatedAt,
		role: abilityChange.ability.role,
		isRoleSpecific: abilityChange.ability.isRoleSpecific,
	};

	const embed = formatAbilityEmbed(i.guild, changedAbility);
	embed.setTitle(`${abilityChange.changeType == 'UPGRADE' ? 'Upgraded' : 'Downgraded'} ${abilityChange.ability.name} - ${abilityChange.name}`);

	await i.editReply({ embeds: [embed] });
});
