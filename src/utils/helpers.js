export function stringOrNull(v) {
    if (v === null || v === undefined) return null
    const s = String(v).trim();
    if (s === "") return null;
    return v;
}

export function floatOrNull(v) {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

export function stringOrNull(v) {
    if (v === null || v === undefined) return null
    const s = String(v).trim();
    if (s === "") return null;
    return v;
}