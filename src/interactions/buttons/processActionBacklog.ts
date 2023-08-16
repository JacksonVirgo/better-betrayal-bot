import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ColorResolvable,
    EmbedBuilder,
} from "discord.js";
import { Button } from "../../structures/interactions";
import { prisma } from "../../database";
import { getActionBacklog } from "../../util/database";
import { getAverageColor } from "fast-average-color-node";
import { formatActionBacklog } from "../../util/embeds";
import setActionHostNotes from "./setActionHostNotes";
import setProcessed from "./setProcessed";
import unsetProcessed from "./unsetProcessed";

export default new Button("process-action-backlog")
    .setButton(
        new ButtonBuilder()
            .setLabel("Set Not Processed")
            .setStyle(ButtonStyle.Secondary)
    )
    .onExecute(async (i, cache) => {
        if (!i.guild)
            return i.reply({
                content: "You need to be in a server to use this button",
                ephemeral: true,
            });

        const backlog = await getActionBacklog(i.channelId);
        if (!backlog)
            return i.reply({ content: "No action found", ephemeral: true });

        await i.guild.channels.fetch();
        await i.guild.members.fetch();

        await i.deferReply({ ephemeral: true });

        const member = i.guild.members.cache.get(i.user.id);
        if (!member)
            return i.reply({
                content: "You need to be in the server to use this command",
                ephemeral: true,
            });

        const actionChannel = i.guild.channels.cache.find(
            (c) => c.name == "action-funnel"
        );
        if (!actionChannel || actionChannel.type != ChannelType.GuildText)
            return i.reply({
                content:
                    "Action funnel channel not found. Please tell the host/s your actions directly instead.",
                ephemeral: true,
            });

        const confessional = i.guild.channels.cache.get(backlog.channelId);
        if (!confessional || confessional.type != ChannelType.GuildText)
            return i.reply({
                content:
                    "Confessional channel not found. Please tell the host/s your actions directly instead.",
                ephemeral: true,
            });

        const { embed } = formatActionBacklog(backlog);

        const avatarURL = member.displayAvatarURL({});
        const displayName = member.displayName;
        const color = await getAverageColor(avatarURL);

        embed.setColor("Grey");
        embed.setColor(color.hex as ColorResolvable);
        embed.setAuthor({
            name: displayName,
            iconURL: avatarURL,
        });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(setProcessed.getCustomID())
                .setLabel("Set Processed")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(unsetProcessed.getCustomID())
                .setLabel("Set Not Processed")
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId(setActionHostNotes.getCustomID())
                .setLabel("Host Notes")
                .setStyle(ButtonStyle.Secondary)
        );

        const hostMessage = await actionChannel.send({
            embeds: [embed],
            components: [row],
        });
        const playerMessage = await confessional.send({ embeds: [embed] });

        const action = await prisma.submittedAction.create({
            data: {
                hostMessageId: hostMessage.id,
                playerMessageId: playerMessage.id,
                inventoryId: backlog.id,
            },
        });

        await i.deleteReply();
    });
