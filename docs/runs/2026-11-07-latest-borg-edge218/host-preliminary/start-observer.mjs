import definition from "./reviewed-mandos.js";
const start = definition.start;
export default { ...definition, async start(mod) {
  const c = mod.engine?.core;
  console.info("MANDOS_EDGE_CORE_PROBE", JSON.stringify({ hasCore: !!c,
    engineVersion: c?.ENGINE_VERSION, hasStartGame: typeof c?.startGame === "function" }));
  return start?.call(definition, mod);
} };
