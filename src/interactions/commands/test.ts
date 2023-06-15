import { SlashCommandBuilder } from 'discord.js';
import { newSlashCommand } from '../../structures/BotClient';
import { array } from 'zod';

const data = new SlashCommandBuilder().setName('test').setDescription('Development only. Command to test');

export default newSlashCommand({
	data,
	execute: async (i) => {
		if (!i.guild) return i.reply({ content: 'This command can only be used in a server', ephemeral: true });

		const players: Record<number, number[]> = {};
		const playerCount = 22;

		for (let i = 0; i < playerCount; i++) {
			for (let j = 0; j < playerCount; j++) {
				if (i === j) continue;
				if (!players[i]) players[i] = [];
				const arr = players[i];
				if (arr.includes(j)) continue;
				arr.push(j);
				players[i] = arr;
			}
		}

		const total = Object.values(players).reduce((acc, val) => acc + val.length, 0);

		return i.reply({ content: `With ${playerCount} players, you need ${total} channels`, ephemeral: true });
	},
});
