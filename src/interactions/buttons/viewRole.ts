import { ButtonBuilder, ButtonStyle } from "discord.js";
import { Button } from "../../structures/interactions";
import { formatRoleEmbed } from "../../util/embeds";
import { prisma } from "../../database";
import { getRole } from "../../util/database";

export default new Button("view-role")
    .setButton(
        new ButtonBuilder()
            .setLabel("View Full Role")
            .setStyle(ButtonStyle.Secondary)
    )
    .onExecute(async (i, cache) => {
        if (!cache)
            return i.reply({
                content: "This button is invalid",
                ephemeral: true,
            });
        if (!i.guild)
            return i.reply({
                content: "You need to be in a server to use this button",
                ephemeral: true,
            });

        try {
            const role = await getRole(cache);
            if (!role)
                return i.reply({
                    content: `Role ${cache} not found`,
                    ephemeral: true,
                });

            const embed = formatRoleEmbed(i.guild, role);
            await i.reply({ embeds: [embed], ephemeral: true });
        } catch (err) {
            console.log(err);
            await i.reply({
                content: "An error occurred while fetching the role",
                ephemeral: true,
            });
        }
    });
