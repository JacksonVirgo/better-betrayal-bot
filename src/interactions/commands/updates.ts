import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { findBestMatch } from 'string-similarity';
import { prisma } from '../../database';
import { formatAbilityEmbed } from '../../util/embeds';
import viewChangesButton from '../buttons/viewChanges';
import viewRoleButton from '../buttons/viewRole';
import addUpdate from '../buttons/addUpdate';
import { getAbility } from '../../util/database';

const data = new SlashCommandBuilder().setName('updates').setDescription('Add an upgrade/downgrade to an ability');
data.addStringOption((opt) => opt.setName('name').setDescription('The ability to add an upgrade/downgrade to').setRequired(true));

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });

		try {
			if (!i.guild) return;
			const name = i.options.getString('name', true);
			await i.deferReply({ ephemeral: false });
			const allAbilities = await prisma.ability.findMany({ where: {}, select: { name: true } });
			const allAbilityNames = allAbilities.map((a) => a.name);
			const spellCheck = findBestMatch(name, allAbilityNames);
			const bestMatch = spellCheck.bestMatch.target;

			const ability = await getAbility(bestMatch);

			if (!ability) return i.reply({ content: `Ability ${name} not found`, ephemeral: true });
			const embed = formatAbilityEmbed(i.guild, ability);
			const row = new ActionRowBuilder<ButtonBuilder>();
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(addUpdate.createCustomID('U' + ability.name))
					.setLabel('Add Upgrade')
					.setStyle(ButtonStyle.Secondary)
			);
			row.addComponents(
				new ButtonBuilder()
					.setCustomId(addUpdate.createCustomID('D' + ability.name))
					.setLabel('Add Downgrade')
					.setStyle(ButtonStyle.Secondary)
			);

			row.addComponents(new ButtonBuilder().setCustomId(viewChangesButton.createCustomID(ability.name)).setLabel('View Upgrades/Downgrades').setStyle(ButtonStyle.Secondary));

			return await i.editReply({
				content: bestMatch.toLowerCase() != name.toLowerCase() ? `Did you mean __${bestMatch}__?` : undefined,
				embeds: [embed],
				components: [row],
			});
		} catch (err) {
			console.log(`[ERROR UPDATES COMMAND]`, err);
		}
	},
});
