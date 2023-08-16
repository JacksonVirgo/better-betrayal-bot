import {
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    EmbedBuilder,
    EmbedData,
} from "discord.js";
import { Button } from "../../structures/interactions";
import { prisma } from "../../database";
import { getSubmittedAction } from "../../util/database";

export default new Button("set-processed")
    .setButton(
        new ButtonBuilder()
            .setLabel("Set Processed")
            .setStyle(ButtonStyle.Secondary)
    )
    .onExecute(async (i, cache) => {
        if (!i.guild)
            return i.reply({
                content: "You need to be in a server to use this button",
                ephemeral: true,
            });

        const embeds = i.message.embeds;
        if (embeds.length == 0)
            return i.reply({ content: "No embeds found", ephemeral: true });

        const storedAction = await getSubmittedAction(i.message.id);
        if (!storedAction)
            return i.reply({ content: "No action found", ephemeral: true });

        await i.guild.channels.fetch();
        await i.guild.members.fetch();

        const confessional = i.guild.channels.cache.get(
            storedAction.inventory.channelId
        );
        if (confessional?.type != ChannelType.GuildText)
            return i.reply({
                content: "Confessional channel not found",
                ephemeral: true,
            });

        const playerMessage = await confessional.messages.fetch(
            storedAction.playerMessageId
        );

        const rawEmbed = embeds[0];
        const embed = new EmbedBuilder(rawEmbed.data);
        const playerEmbed = playerMessage
            ? new EmbedBuilder(playerMessage.embeds[0].data)
            : null;

        const changeEmbed = (e: EmbedBuilder) => {
            e.setTitle("Action Processed");
            e.setFooter({
                text: "Processed by " + i.user.username,
                iconURL: i.user.displayAvatarURL({}),
            });
            e.setTimestamp(new Date());
            e.setColor("#00FF00");
        };

        changeEmbed(embed);
        if (playerEmbed) changeEmbed(playerEmbed);

        try {
            if (playerMessage && playerEmbed)
                await playerMessage.edit({ embeds: [playerEmbed] });
            await i.message.edit({ embeds: [embed] });
            await i.deferReply({ ephemeral: true });
            await i.deleteReply();
        } catch (err) {
            console.log(err);
            await i.reply({
                content: "An error occurred while fetching the role",
                ephemeral: true,
            });
        }
    });
