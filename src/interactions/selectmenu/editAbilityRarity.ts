import { Rarity } from "@prisma/client";
import { SelectMenu } from "../../structures/interactions";
import { formatRarity } from "../../util/database";
import { prisma } from "../../database";
import { createChangeLog } from "../../util/logs";
import { EmbedBuilder } from "discord.js";

export default new SelectMenu("edit-ability-rarity").onExecute(
    async (i, cache) => {
        const role = cache;
        if (!role)
            return i.reply({
                content: "This select menu is invalid",
                ephemeral: true,
            });

        await i.deferReply({ ephemeral: true });

        const value = i.values[0];

        const checkRarity = formatRarity(value);
        if (!checkRarity && value != "NOT_AN_AA")
            return i.editReply({ content: `Rarity ${value} not found` });

        const ability = await prisma.ability.findUnique({
            where: { name: role },
        });

        if (!ability)
            return i.editReply({ content: `Ability ${role} not found` });

        const rarity = value == "NOT_AN_AA" ? null : (value as Rarity);

        const updatedAbility = await prisma.ability.update({
            where: { name: role },
            data: {
                rarity,
            },
        });

        if (!updatedAbility)
            return i.editReply({ content: `Failed to update ability ${role}` });

        const embed = new EmbedBuilder();
        embed.setTitle(`Ability Changed - ${updatedAbility.name}`);
        embed.setColor("White");

        embed.setAuthor({
            name: i.user.username,
            iconURL: i.user.displayAvatarURL({}),
        });

        embed.setDescription(
            `Set ${updatedAbility.name}'s rarity from \`${
                ability.rarity ?? "NONE"
            }\` to \`${updatedAbility.rarity ?? "NONE"}\``
        );

        await createChangeLog({
            embeds: [embed],
        });

        return i.editReply({ embeds: [embed] });
    }
);
