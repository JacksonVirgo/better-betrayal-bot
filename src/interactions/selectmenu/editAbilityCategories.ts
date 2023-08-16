import { ActionCategory } from "@prisma/client";
import { SelectMenu } from "../../structures/interactions";
import { formatActionCategory } from "../../util/database";
import { prisma } from "../../database";
import { createChangeLog } from "../../util/logs";
import { EmbedBuilder } from "discord.js";

export default new SelectMenu("edit-ability-category").onExecute(
    async (i, cache) => {
        const role = cache;
        if (!role)
            return i.reply({
                content: "This select menu is invalid",
                ephemeral: true,
            });

        await i.deferReply({ ephemeral: true });

        const categories = i.values;

        const actionCategories: ActionCategory[] = [];

        for (const category of categories) {
            const checkCategory = formatActionCategory(category);
            if (checkCategory) {
                actionCategories.push(category as ActionCategory);
            }
        }

        const ability = await prisma.ability.findUnique({
            where: { name: role },
        });

        if (!ability)
            return i.editReply({ content: `Ability ${role} not found` });

        const updatedAbility = await prisma.ability.update({
            where: { name: role },
            data: {
                categories: {
                    set: actionCategories,
                },
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
            `Set ability [${
                ability.name
            }]'s categories from\n\n\`${ability.categories.join(
                ","
            )}\` \n\n**TO**\n\n\`${actionCategories.join(", ")}\``
        );

        await createChangeLog({
            embeds: [embed],
        });

        return i.editReply({ embeds: [embed] });
    }
);
