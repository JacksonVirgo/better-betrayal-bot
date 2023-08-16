import {
    ActionRow,
    ActionRowBuilder,
    ModalBuilder,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle,
} from "discord.js";
import { newSlashCommand } from "../../structures/BotClient";
import { cache, prisma } from "../../database";
import config from "../../config";
import { getActionBacklog, getInventory } from "../../util/database";
import { formatActionBacklog } from "../../util/embeds";

const data = new SlashCommandBuilder()
    .setName("action")
    .setDescription("Submit an action");

data.addSubcommand((sub) =>
    sub
        .setName("custom")
        .setDescription(
            "Submit a custom action, ONLY USE when nothing else works"
        )
        .addStringOption((opt) =>
            opt
                .setName("actions")
                .setDescription("The action/s to submit")
                .setRequired(true)
        )
        .addIntegerOption((opt) =>
            opt
                .setName("timestamp")
                .setDescription(
                    "FOR AUTOS -> Set a timestamp to perform this action"
                )
                .setRequired(false)
        )
);

export default newSlashCommand({
    data,
    mainServer: true,
    execute: async (i) => {
        if (!i.guild)
            return i.reply({
                content: "This command can only be used in a server",
                ephemeral: true,
            });
        if (i.guildId != config.MAIN_SERVER_ID)
            return i.reply({
                content: "This command can only be used in the official server",
                ephemeral: true,
            });

        const subcommand = i.options.getSubcommand(true);

        await i.deferReply({ ephemeral: false });

        const inventory = await getInventory({ channelId: i.channelId });
        if (!inventory)
            return i.editReply({
                content: "You need to be a player to use this command",
            });

        const actionBacklog =
            (await getActionBacklog(i.channelId)) ??
            (await prisma.actionBacklog.create({
                data: {
                    channelId: i.channelId,
                    discordId: i.user.id,
                    inventory: {
                        connect: {
                            id: inventory.id,
                        },
                    },
                },
            }));

        if (subcommand === "custom") {
            const actions = i.options.getString("actions", true);
            const timestamp = i.options.getInteger("timestamp", false);

            await prisma.pendingAction.create({
                data: {
                    actionBacklogId: actionBacklog.id,
                    isPlainText: true,
                    action: actions,
                    actionType: "CUSTOM",
                    timestamp: timestamp
                        ? new Date(timestamp * 1000)
                        : undefined,
                },
            });
        }

        const newBacklog = await getActionBacklog(i.channelId);
        if (!newBacklog) return i.editReply({ content: "An error occured" });
        const { embed, row } = formatActionBacklog(newBacklog);
        await i.editReply({ embeds: [embed], components: [row] });
    },
});
