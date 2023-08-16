export function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function levenshtein(a: string, b: string): number {
    if (a.length == 0) return b.length;
    if (b.length == 0) return a.length;

    if (a[0] == b[0]) return levenshtein(a.substring(1), b.substring(1));

    return (
        1 +
        Math.min(
            levenshtein(a, b.substring(1)),
            levenshtein(a.substring(1), b),
            levenshtein(a.substring(1), b.substring(1))
        )
    );
}

export function levenshteinArray(a: string, array: string[]) {
    let lowest: number = Infinity;
    let currentSelection = "";

    for (const item of array) {
        const distance = levenshtein(a, item);
        if (distance < lowest) {
            lowest = distance;
            currentSelection = item;
        }
    }

    return { target: currentSelection, distance: lowest };
}

export function replaceAll(str: string, find: string, replace: string) {
    return str.split(find).join(replace);
}

export function bulkReplaceAll(str: string, data: [string, string][]) {
    for (const [find, replace] of data) {
        str = replaceAll(str, find, replace);
    }
    return str;
}

export function fixWhitespace(str: string) {
    return replaceAll(str, "\\n", "\n");
}
