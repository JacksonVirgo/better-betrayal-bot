import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Message, MessagePayload, SlashCommandBuilder, TextChannel } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { prisma } from '../../database';
import { formatItemEmbed } from '../../util/embeds';
import { fetchOrCreateWebhook } from '../../util/webhook';
import { REST } from 'discord.js';
import { client } from '../..';

const data = new SlashCommandBuilder().setName('test').setDescription('Development only. Command to test');

data.addStringOption((opt) => opt.setName('replyto').setDescription('Message ID to reply to').setRequired(true));

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });

		try {
			const channel = i.channel as TextChannel;
			const webhook = await fetchOrCreateWebhook(channel);

			const replyTo = i.options.getString('replyto', true);
			const fetchMessage = await channel.messages.fetch(replyTo);

			await i.deferReply({ ephemeral: true });

			const embed = new EmbedBuilder();
			embed.setAuthor({
				name: 'Op. Sexy',
				iconURL:
					'https://images-ext-2.discordapp.net/external/cVfxtMcYPo97Xwx-IicNT0r56bfkgxXqvuReBXb7wEU/%3Fsize%3D4096/https/cdn.discordapp.com/avatars/416757703516356628/122ab9ad62ce3ef0d3a667e3098e0f08.png?width=1404&height=1404',
			});

			embed.setDescription("Oh hey. I'm the Juggernaut, bitch");

			const row = new ActionRowBuilder<ButtonBuilder>();
			row.addComponents(new ButtonBuilder().setCustomId('reply').setLabel('Respond').setStyle(ButtonStyle.Secondary));

			const data = new MessagePayload(fetchMessage, {
				content: 'TEST',
				reply: {
					messageReference: fetchMessage,
					failIfNotExists: true,
				},
				components: [row],
				embeds: [embed],
			});

			fetchMessage.channel.send(data);

			await i.deleteReply();
		} catch (err) {}
	},
});
