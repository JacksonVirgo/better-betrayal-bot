import { StringSelectMenuBuilder } from "discord.js";
import { SelectMenu } from "../../structures/interactions";

const CUSTOM_ID = "update-inventory";
const options = [
    "Items",
    "Abilities",
    "Perks",
    "Statuses",
    "Immunities",
    "Effects",
    "AAs",
];

export const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(CUSTOM_ID)
    .setPlaceholder("Update your inventory")
    .addOptions(
        options.map((o) => {
            return {
                label: o,
                value: o,
            };
        })
    );

export default new SelectMenu("update-inventory").onExecute(
    async (i, cache) => {
        if (!i.guild)
            return i.reply({
                content: "You need to be in a server to use this select menu",
                ephemeral: true,
            });
        return await i.reply({ content: "Test", ephemeral: true });
    }
);
