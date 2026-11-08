/** Types for the diagnostic Node build shim; no runtime policy. */
export type DiagnosticVariant = "inherited" | "prototype";
export const EXPECTED_SELECTOR_SHA256: string;
export const INHERITED: string;
export const PROTOTYPE: string;
export interface CompiledFixture {
  originalSha256: string;
  selectorSha256: string;
  compiledModuleSha256: string;
  overlaySha256: string | null;
  bundleSha256: string;
  inputs: string[];
  esbuild: string;
}
export function diagnosticSource(source: string, variant: DiagnosticVariant): string;
export function compileFixture(variant: DiagnosticVariant, outfile: string): Promise<CompiledFixture>;
