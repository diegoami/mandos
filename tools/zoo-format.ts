/** Shared measurement bytes, independent of controller policy. */
/** Sorted object keys, JSON scalars/arrays, UTF-8 at the stream boundary. */
export function canonicalJson(value: unknown): string {
  const encode = (v: unknown): string => {
    if (v === null || typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
    if (typeof v === "number") {
      if (!Number.isFinite(v)) throw new Error("Command numbers must be finite");
      return JSON.stringify(v);
    }
    if (Array.isArray(v)) return "[" + Array.from(v, item => item === undefined ? "null" : encode(item)).join(",") + "]";
    if (typeof v === "object" && v !== null && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)) {
      return "{" + Object.keys(v).sort().filter(key => (v as Record<string, unknown>)[key] !== undefined)
        .map(key => JSON.stringify(key) + ":" + encode((v as Record<string, unknown>)[key])).join(",") + "}";
    }
    throw new Error(`Unsupported command value: ${typeof v}`);
  };
  return encode(value);
}

export function commandLine(event: unknown): string { return canonicalJson(event) + "\n"; }
