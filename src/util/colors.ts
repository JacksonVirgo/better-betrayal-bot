import { Rarity } from "@prisma/client";
import { ColorResolvable } from "discord.js";

export enum RarityColors {
    COMMON = "#00FF00",
    UNCOMMON = "#00FFFF",
    RARE = "#00008B",
    EPIC = "#FF00FF",
    LEGENDARY = "#FF0000",
    MYTHICAL = "#9F2B68",
    UNIQUE = "#FFFFFF",
}

export function rarityToColor(rarity: Rarity): ColorResolvable {
    switch (rarity) {
        case Rarity.COMMON:
            return RarityColors.COMMON;
        case Rarity.UNCOMMON:
            return RarityColors.UNCOMMON;
        case Rarity.RARE:
            return RarityColors.RARE;
        case Rarity.EPIC:
            return RarityColors.EPIC;
        case Rarity.LEGENDARY:
            return RarityColors.LEGENDARY;
        case Rarity.MYTHICAL:
            return RarityColors.MYTHICAL;
        case Rarity.UNIQUE:
            return RarityColors.UNIQUE;
        default:
            return "#FFFFFF";
    }
}
