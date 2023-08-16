import { Ability } from "@prisma/client";
import { SelectMenu } from "../../structures/interactions";
import { prisma } from "../../database";
import { formatAbilityEmbed } from "../../util/embeds";
import { getAbility } from "../../util/database";

export default new SelectMenu("view-full-ability-change").onExecute(
    async (i, cache) => {
        if (!i.guild)
            return i.reply({
                content: "You need to be in a server to use this select menu",
                ephemeral: true,
            });

        const abilityChangeID = i.values[0];
        if (!abilityChangeID)
            return i.reply({
                content: "This select menu is invalid",
                ephemeral: true,
            });

        const id = parseInt(abilityChangeID);
        if (isNaN(id))
            return i.reply({
                content: "This select menu is invalid",
                ephemeral: true,
            });

        await i.deferReply({ ephemeral: true });

        const abilityChange = await prisma.abilityChange.findUnique({
            where: {
                id: id,
            },
            include: {
                ability: true,
            },
        });

        if (!abilityChange)
            return i.editReply({ content: "Ability change not found" });

        const changedAbility = await getAbility(abilityChange.ability.name);
        if (!changedAbility)
            return i.editReply({ content: "Ability not found" });

        const embed = formatAbilityEmbed(i.guild, changedAbility);

        embed.setTitle(
            `${
                abilityChange.changeType == "UPGRADE"
                    ? "Upgraded"
                    : "Downgraded"
            } ${abilityChange.ability.name} - ${abilityChange.name}`
        );

        await i.editReply({ embeds: [embed] });
    }
);
