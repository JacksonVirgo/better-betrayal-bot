import {
    ActionRowBuilder,
    AutocompleteInteraction,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
} from "discord.js";
import { newSlashCommand } from "../../structures/BotClient";
import {
    formatAbilityEmbed,
    formatInventory,
    formatItemEmbed,
    formatPerkEmbed,
    formatRoleEmbed,
    formatRolePlainText,
    formatStatusEmbed,
} from "../../util/embeds";
import viewRoleButton from "../buttons/viewRole";
import { cache, prisma } from "../../database";
import { findBestMatch } from "string-similarity";
import {
    formatStatus,
    getAbility,
    getClosestItem,
    getClosestStatusName,
    getInventory,
    getPerk,
    getRole,
    getStatus,
    getStatusLinks,
} from "../../util/database";

const data = new SlashCommandBuilder()
    .setName("view")
    .setDescription("View information about Betrayal");

let loadedAbilityNames: string[] | undefined;

data.addSubcommand((sub) =>
    sub
        .setName("role")
        .setDescription("View a role")
        .addStringOption((opt) =>
            opt
                .setName("name")
                .setDescription("The role to view")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addBooleanOption((opt) =>
            opt
                .setName("hidden")
                .setDescription("To make this for only you to see")
        )
        .addBooleanOption((opt) =>
            opt
                .setName("plaintext")
                .setDescription("View the role in plaintext")
        )
);

data.addSubcommand((sub) =>
    sub
        .setName("activeroles")
        .setDescription("View all active roles")
        .addBooleanOption((opt) =>
            opt
                .setName("hidden")
                .setDescription("To make this for only you to see")
        )
);

data.addSubcommand((sub) =>
    sub
        .setName("ability")
        .setDescription("View an ability")
        .addStringOption((opt) =>
            opt
                .setName("name")
                .setDescription("The ability to view")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addBooleanOption((opt) =>
            opt
                .setName("hidden")
                .setDescription("To make this for only you to see")
        )
);
data.addSubcommand((sub) =>
    sub
        .setName("perk")
        .setDescription("View a perk")
        .addStringOption((opt) =>
            opt
                .setName("name")
                .setDescription("The perk to view")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addBooleanOption((opt) =>
            opt
                .setName("hidden")
                .setDescription("To make this for only you to see")
        )
);
data.addSubcommand((sub) =>
    sub
        .setName("item")
        .setDescription("View an item")
        .addStringOption((opt) =>
            opt
                .setName("name")
                .setDescription("The item to view")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addBooleanOption((opt) =>
            opt
                .setName("hidden")
                .setDescription("To make this for only you to see")
        )
);
data.addSubcommand((sub) =>
    sub
        .setName("status")
        .setDescription("View a specific status")
        .addStringOption((opt) =>
            opt
                .setName("name")
                .setDescription("The status to view")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addBooleanOption((opt) =>
            opt
                .setName("hidden")
                .setDescription("To make this for only you to see")
        )
);
data.addSubcommand((sub) =>
    sub
        .setName("inventory")
        .setDescription(
            "View your inventory (defaults to hidden outside of you channel)"
        )
        .addBooleanOption((opt) =>
            opt
                .setName("hidden")
                .setDescription("To make this for only you to see")
        )
);

export default newSlashCommand({
    data,
    execute: async (i) => {
        if (!i.guild) return;

        try {
            const subcommand = i.options.getSubcommand(true);
            switch (subcommand) {
                case "role":
                    return await viewRole(i);
                case "ability":
                    return await viewAbility(i);
                case "perk":
                    return await viewPerk(i);
                case "item":
                    return await viewItem(i);
                case "status":
                    return await viewStatus(i);
                case "inventory":
                    return await viewInventory(i);
                case "activeroles":
                    const activeRoleHidden =
                        i.options.getBoolean("hidden") ?? false;
                    const allRoles = await prisma.role.findMany({
                        where: { isActive: true },
                        select: { name: true, alignment: true },
                    });

                    const goodRoles = allRoles.filter(
                        (r) => r.alignment == "GOOD"
                    );
                    const evilRoles = allRoles.filter(
                        (r) => r.alignment == "EVIL"
                    );
                    const neutralRoles = allRoles.filter(
                        (r) => r.alignment == "NEUTRAL"
                    );

                    const activeRoleEmbed = new EmbedBuilder();
                    activeRoleEmbed.setTitle("All Current Roles");
                    activeRoleEmbed.setColor("White");
                    activeRoleEmbed.addFields({
                        name: `Goods (${goodRoles.length})`,
                        value: goodRoles
                            .map((r, i) => `${i + 1}. ${r.name}`)
                            .join("\n"),
                        inline: true,
                    });
                    activeRoleEmbed.addFields({
                        name: `Neutrals (${neutralRoles.length})`,
                        value: neutralRoles
                            .map((r, i) => `${i + 1}. ${r.name}`)
                            .join("\n"),
                        inline: true,
                    });

                    activeRoleEmbed.addFields({
                        name: `Evils (${evilRoles.length})`,
                        value: evilRoles
                            .map((r, i) => `${i + 1}. ${r.name}`)
                            .join("\n"),
                        inline: true,
                    });

                    return i.reply({
                        embeds: [activeRoleEmbed],
                        ephemeral: activeRoleHidden,
                    });

                default:
                    return await i.reply({
                        content: "Invalid subcommand",
                        ephemeral: true,
                    });
            }
        } catch (err) {
            console.log(`[ERROR VIEW COMMAND]`, err);
        }
    },
    autocomplete: async (i: AutocompleteInteraction) => {
        const focusedValue = i.options.getFocused();
        const subcommand = i.options.getSubcommand(false);
        if (!subcommand) return await i.respond([]);

        switch (subcommand) {
            case "role":
                let allMatchingRoles = cache.roles.filter((role) =>
                    role.toLowerCase().startsWith(focusedValue.toLowerCase())
                );
                allMatchingRoles = allMatchingRoles.splice(
                    0,
                    Math.min(allMatchingRoles.length, 25)
                );
                return await i.respond(
                    allMatchingRoles.map((match) => ({
                        name: match,
                        value: match,
                    }))
                );

            case "ability":
                let allMatchingAbilities = cache.abilities.filter((ability) =>
                    ability.toLowerCase().startsWith(focusedValue.toLowerCase())
                );
                allMatchingAbilities = allMatchingAbilities.splice(
                    0,
                    Math.min(allMatchingAbilities.length, 25)
                );
                return await i.respond(
                    allMatchingAbilities.map((match) => ({
                        name: match,
                        value: match,
                    }))
                );
            case "perk":
                let allMatchingPerks = cache.perks.filter((perk) =>
                    perk.toLowerCase().startsWith(focusedValue.toLowerCase())
                );
                allMatchingPerks = allMatchingPerks.splice(
                    0,
                    Math.min(allMatchingPerks.length, 25)
                );
                return await i.respond(
                    allMatchingPerks.map((match) => ({
                        name: match,
                        value: match,
                    }))
                );
            case "item":
                let allMatchingItems = cache.items.filter((item) =>
                    item.toLowerCase().startsWith(focusedValue.toLowerCase())
                );
                allMatchingItems = allMatchingItems.splice(
                    0,
                    Math.min(allMatchingItems.length, 25)
                );
                return await i.respond(
                    allMatchingItems.map((match) => ({
                        name: match,
                        value: match,
                    }))
                );
            case "status":
                let allMatchingStatuses = cache.statuses.filter((status) =>
                    status.toLowerCase().startsWith(focusedValue.toLowerCase())
                );
                allMatchingStatuses = allMatchingStatuses.splice(
                    0,
                    Math.min(allMatchingStatuses.length, 25)
                );
                return await i.respond(
                    allMatchingStatuses.map((match) => ({
                        name: match,
                        value: match,
                    }))
                );
            default:
                return await i.respond([]);
        }
    },
});

async function viewRole(i: ChatInputCommandInteraction) {
    if (!i.guild) return;
    const name = i.options.getString("name", true);
    const hidden = i.options.getBoolean("hidden") ?? false;
    const plaintext = i.options.getBoolean("plaintext") ?? false;
    await i.deferReply({ ephemeral: hidden });

    const allRoles = await prisma.role.findMany({
        where: {},
        select: { name: true },
    });
    const allRoleNames = allRoles.map((r) => r.name);
    const spellCheck = findBestMatch(name, allRoleNames);
    const bestMatch = spellCheck.bestMatch.target;

    const fetchedRole = await getRole(bestMatch);

    if (!fetchedRole)
        return i.reply({ content: `Role ${name} not found`, ephemeral: true });

    const correctionString =
        bestMatch.toLowerCase() != name.toLowerCase()
            ? `Did you mean __${bestMatch}__?`
            : undefined;

    if (!plaintext) {
        const embed = formatRoleEmbed(i.guild, fetchedRole);
        return await i.editReply({
            content: correctionString,
            embeds: [embed],
        });
    }

    const plaintextRolecard = formatRolePlainText(i.guild, fetchedRole);
    return await i.editReply({
        content: correctionString
            ? correctionString + "\n" + plaintextRolecard
            : plaintextRolecard,
    });
}

async function viewAbility(i: ChatInputCommandInteraction) {
    if (!i.guild) return;
    const name = i.options.getString("name", true);
    const hidden = i.options.getBoolean("hidden") ?? false;
    await i.deferReply({ ephemeral: hidden });

    const allAbilities = await prisma.ability.findMany({
        where: {},
        select: { name: true },
    });
    const allAbilityNames = allAbilities.map((a) => a.name);
    const spellCheck = findBestMatch(name, allAbilityNames);
    const bestMatch = spellCheck.bestMatch.target;

    console.log(bestMatch + " bm");

    const ability = await getAbility(bestMatch);

    if (!ability)
        return i.reply({
            content: `Ability ${name} not found`,
            ephemeral: true,
        });

    const embed = formatAbilityEmbed(i.guild, ability);
    const row = new ActionRowBuilder<ButtonBuilder>();
    const attachments = ability.abilityAttachments;

    if (attachments) {
        for (const role of attachments.roles) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(viewRoleButton.createCustomID(role.name))
                    .setLabel(`View ${role.name}`)
                    .setStyle(ButtonStyle.Secondary)
            );
        }
    }

    return await i.editReply({
        content:
            bestMatch.toLowerCase() != name.toLowerCase()
                ? `Did you mean __${bestMatch}__?`
                : undefined,
        embeds: [embed],
        components: row.components.length > 0 ? [row] : undefined,
    });
}

async function viewPerk(i: ChatInputCommandInteraction) {
    if (!i.guild) return;
    const name = i.options.getString("name", true);
    const hidden = i.options.getBoolean("hidden") ?? false;
    await i.deferReply({ ephemeral: hidden });

    const allPerks = await prisma.perk.findMany({
        where: {},
        select: { name: true },
    });
    const allPerkNames = allPerks.map((p) => p.name);
    const spellCheck = findBestMatch(name, allPerkNames);
    const bestMatch = spellCheck.bestMatch.target;

    const perk = await getPerk(bestMatch);
    if (!perk)
        return i.reply({ content: `Perk ${name} not found`, ephemeral: true });
    const attachment = perk.perkAttachments;

    const embed = formatPerkEmbed(i.guild, perk);

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (attachment) {
        for (const role of attachment.roles) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(viewRoleButton.createCustomID(role.name))
                    .setLabel(`View ${role.name}`)
                    .setStyle(ButtonStyle.Secondary)
            );
        }
    }

    return i.editReply({
        content:
            bestMatch.toLowerCase() != name.toLowerCase()
                ? `Did you mean __${bestMatch}__?`
                : undefined,
        embeds: [embed],
        components: [row],
    });
}

async function viewItem(i: ChatInputCommandInteraction) {
    if (!i.guild) return;
    const name = i.options.getString("name", true);
    const hidden = i.options.getBoolean("hidden") ?? false;
    await i.deferReply({ ephemeral: hidden });

    const { item, correctedName } = await getClosestItem(name);

    if (!item)
        return i.reply({ content: `Item ${name} not found`, ephemeral: true });

    const embed = formatItemEmbed(i.guild, item);

    return i.editReply({
        content:
            correctedName.toLowerCase() != name.toLowerCase()
                ? `Did you mean __${correctedName}__?`
                : undefined,
        embeds: [embed],
    });
}

async function viewStatus(i: ChatInputCommandInteraction) {
    if (!i.guild) return;
    const name = i.options.getString("name", true);
    const hidden = i.options.getBoolean("hidden") ?? false;
    await i.deferReply({ ephemeral: hidden });

    const bestMatch = await getClosestStatusName(name);
    const fetchedStatus = await getStatus(bestMatch);

    if (!fetchedStatus)
        return i.reply({
            content: `Status ${name} not found`,
            ephemeral: true,
        });

    const statusLinkName = formatStatus(fetchedStatus.name);
    const statusLinks = statusLinkName
        ? await getStatusLinks(statusLinkName)
        : [];
    const { embed, row } = formatStatusEmbed(
        i.guild,
        fetchedStatus,
        statusLinks
    );

    return i.editReply({
        content:
            bestMatch.toLowerCase() != name.toLowerCase()
                ? `Did you mean __${bestMatch}__?`
                : undefined,
        embeds: [embed],
        components: [row],
    });
}

async function viewInventory(i: ChatInputCommandInteraction) {
    const hidden = i.options.getBoolean("hidden") ?? false;
    const inventory = await getInventory(i.user.id);
    if (!inventory)
        return i.reply({
            content: "You do not have an inventory",
            ephemeral: true,
        });

    if (!i.channelId)
        return i.reply({
            content: "This command can only be used in a channel",
            ephemeral: true,
        });

    const designatedChannel = i.channelId == inventory.channelId;

    await i.deferReply({ ephemeral: designatedChannel ? hidden : true });
    const { embed } = formatInventory(inventory);
    return i.editReply({ embeds: [embed] });
}
