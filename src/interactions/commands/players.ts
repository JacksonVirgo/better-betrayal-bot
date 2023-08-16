import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    Colors,
    EmbedBuilder,
    SlashCommandBuilder,
    UserSelectMenuBuilder,
} from "discord.js";
import { newSlashCommand } from "../../structures/BotClient";
import {
    getLuckTable,
    getRandomAnyAbility,
    getRandomItem,
} from "../../util/luck";
import { prisma } from "../../database";
import { findBestMatch } from "string-similarity";
import { formatAbilityEmbed, formatItemEmbed } from "../../util/embeds";
import config from "../../config";

const data = new SlashCommandBuilder()
    .setName("player")
    .setDescription("Manage the players in your game");

data.addSubcommand((sub) =>
    sub
        .setName("list")
        .setDescription("View the list of all players")
        .addBooleanOption((opt) =>
            opt
                .setName("keep-updated")
                .setDescription("Keep the list updated with new players")
                .setRequired(false)
        )
        .addBooleanOption((opt) =>
            opt
                .setName("hidden")
                .setDescription("To make this for only you to see")
                .setRequired(false)
        )
);

export default newSlashCommand({
    data,
    execute: async (i) => {
        if (!i.guild) return;

        try {
            const subcommand = i.options.getSubcommand(true);

            switch (subcommand) {
                case "list":
                    return showPlayerList(i);
                default:
                    return i.reply({
                        content: "Invalid subcommand",
                        ephemeral: true,
                    });
            }
        } catch (err) {
            console.log(`[ERROR PLAYERS COMMAND]`, err);
        }
    },
});

async function showPlayerList(i: ChatInputCommandInteraction) {
    const keepUpdated = i.options.getBoolean("keep-updated", false) ?? false;
    const hidden = i.options.getBoolean("hidden", false) ?? false;

    if (!i.guild) return;

    await i.guild.roles.fetch();
    await i.guild.members.fetch();

    const aliveRole = i.guild.roles.cache.get(config.ALIVE_ROLE_ID);
    const deadRole = i.guild.roles.cache.get(config.DEAD_ROLE_ID);
    if (!aliveRole || !deadRole)
        return i.reply({
            content: "Invalid alive or dead role",
            ephemeral: true,
        });

    let value = `${aliveRole.members
        .map((v) => `<@&${aliveRole.id}> <@${v.id}>`)
        .join("\n")}`;
    value += `\n${deadRole.members
        .map((v) => `<@&${deadRole.id}> <@${v.id}>`)
        .join("\n")}`;

    value += `\n\`\`\`${aliveRole.members.size} Remain\`\`\``;

    return i.reply({
        content: value,
        ephemeral: true,
        options: {
            allowedMentions: {
                users: [],
                roles: [],
            },
        },
    });
}
