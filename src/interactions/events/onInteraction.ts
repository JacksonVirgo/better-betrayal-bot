import {
    ChatInputCommandInteraction,
    Interaction,
    WebhookClient,
} from "discord.js";
import { contextMenus, slashCommands } from "../../structures/BotClient";
import {
    Button,
    Context,
    Modal,
    SelectMenu,
} from "../../structures/interactions";
import config from "../../config";

export default async function onInteraction(i: Interaction<any>) {
    if (i.isAutocomplete()) {
        const command = slashCommands.get(i.commandName);
        if (!command)
            return console.error(
                `No command matching ${i.commandName} was found.`
            );
        if (!command.autocomplete) return;
        try {
            return command.autocomplete(i);
        } catch (err) {
            console.log(err);
        }
    } else if (i.isChatInputCommand()) {
        const command = slashCommands.get(i.commandName);
        if (!command)
            return console.error(
                `No command matching ${i.commandName} was found.`
            );
        try {
            const inter = i as ChatInputCommandInteraction;

            const wh = new WebhookClient({ url: config.LOGS_WEBHOOK });
            const sub = inter.options.getSubcommand(false);
            const subGroup = inter.options.getSubcommandGroup(false);
            wh.send({
                content: `[COMMAND] **${i.user.username}** executed command **${
                    i.commandName
                }${subGroup ? ` ${subGroup}` : ""}${sub ? ` ${sub}` : ""}**`,
            });

            command.execute(inter);
        } catch (err) {
            console.log(err);
        }
    } else if (i.isContextMenuCommand()) {
        const command = contextMenus.get(i.commandName);
        if (!command)
            return console.error(
                `No command matching ${i.commandName} was found.`
            );

        try {
            const wh = new WebhookClient({ url: config.LOGS_WEBHOOK });
            wh.send({
                content: `[CONTEXT MENU] **${i.user.username}** executed menu **${i.commandName}**`,
            });

            command.execute(i);
        } catch (err) {
            console.log(err);
        }
    } else if (i.isButton()) {
        const [customId, data] = Button.getDataFromCustomID(i.customId);
        if (!customId) return;
        const buttonInteraction = Button.buttons.get(customId);
        if (buttonInteraction) buttonInteraction.execute(i, data);
    } else if (i.isAnySelectMenu()) {
        const [customId, data] = SelectMenu.getDataFromCustomID(i.customId);
        if (!customId) return;
        const selectInteraction = SelectMenu.selectMenus.get(customId);
        if (selectInteraction) selectInteraction.execute(i, data);
    } else if (i.isModalSubmit()) {
        const [customId, data] = Modal.getDataFromCustomID(i.customId);
        if (!customId) return;
        const modalInteraction = Modal.modals.get(customId);
        if (modalInteraction) modalInteraction.execute(i, data);
    }
}
