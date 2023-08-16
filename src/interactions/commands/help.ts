import {
    APIApplicationCommandOptionChoice,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { newSlashCommand } from "../../structures/BotClient";
import { capitalize } from "../../util/string";

const topics: string[] = ["events"];
const topicChoices: APIApplicationCommandOptionChoice<string>[] = topics.map(
    (t) => {
        return { name: capitalize(t), value: t };
    }
);

const data = new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get help on a variety of topics");
data.addStringOption((opt) =>
    opt
        .setName("topic")
        .setDescription("The topic to get help on")
        .setRequired(true)
        .addChoices(...topicChoices)
);

data.addBooleanOption((opt) =>
    opt.setName("hidden").setDescription("To make this for only you to see")
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

        const topic = i.options.getString("topic", true);
        const hidden = i.options.getBoolean("hidden", false) ?? false;

        const embed = new EmbedBuilder();
        embed.setColor("#FFFFFF");

        switch (topic) {
            case "events":
                embed.setTitle("Game Events");
                embed.setDescription(
                    "The daily events on a normal mode are predetermined, however, extra bonus events may trigger based on role ability uses or secret pre-planned events determined by the hosts. At the very least, however, you can expect the following:"
                );
                embed.addFields({
                    name: "Game Events",
                    value: "Day 1: Carepackage\nDay 2: Optional game\nDay 3: Item Rain\nDay 4: Power Drop\nDay 5: RPS Tournament\nDay 6: Item Rain\nDay 7: Power Drop, Money Heaven\nDay 8: Valentines Day\nDay 9: Item Rain\nDay 10: Power Drop\nDay 11: Nothing\nDay 12: Item Rain\nDay 13: Power Drop, Money Heaven\nDay 14: Duels",
                });
                return i.reply({ embeds: [embed], ephemeral: hidden });
            default:
                return i.reply({ content: "Invalid topic", ephemeral: true });
        }
    },
    autocomplete: async (i) => {},
});
