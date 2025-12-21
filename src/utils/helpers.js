export function stringOrNull(v) {
    if (v === null || v === undefined) return null
    const s = String(v).trim();
    if (s === "") return null;
    return v;
}