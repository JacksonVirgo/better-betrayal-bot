import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ColorResolvable,
    EmbedBuilder,
    ModalSubmitInteraction,
} from "discord.js";
import { Modal } from "../../structures/interactions";
import { prisma } from "../../database";
import { getInventory } from "../../util/database";
import { getAverageColor } from "fast-average-color-node";
import setProcessed from "../buttons/setProcessed";
import unsetProcessed from "../buttons/unsetProcessed";
import setActionHostNotes from "../buttons/setActionHostNotes";

export default new Modal("submit-custom-action", "Submit Action").onExecute(
    async (i: ModalSubmitInteraction, cache) => {
        if (!i.guild) return;
        if (!i.channel) return;

        try {
            const inventory = await getInventory(i.user.id);
            if (!inventory)
                return i.reply({
                    content: "You need to be a player to use this command",
                    ephemeral: true,
                });

            const actionData = i.fields.getTextInputValue("actions");
            if (!actionData) return i.reply("Missing fields");

            await i.guild.channels.fetch();
            await i.guild.members.fetch();

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

            const confessional = i.guild.channels.cache.get(
                inventory.channelId
            );
            if (!confessional || confessional.type != ChannelType.GuildText)
                return i.reply({
                    content:
                        "Confessional channel not found. Please tell the host/s your actions directly instead.",
                    ephemeral: true,
                });

            const avatarURL = member.displayAvatarURL({});
            const displayName = member.displayName;
            const color = await getAverageColor(avatarURL);

            const embed = new EmbedBuilder().setTitle("Action Submitted");
            embed.setColor("Grey");
            embed.addFields({ name: `Action - Custom`, value: actionData });
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

            await prisma.submittedAction.create({
                data: {
                    hostMessageId: hostMessage.id,
                    playerMessageId: playerMessage.id,
                    inventoryId: inventory.id,
                },
            });

            return i.reply({
                content: "Action Submitted in your confessional",
                ephemeral: true,
            });
        } catch (err) {
            console.error(err);
            return i.reply({ content: "An error occured", ephemeral: true });
        }
    }
);
