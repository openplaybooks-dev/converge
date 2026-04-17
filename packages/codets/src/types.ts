/** Specifier shape for `addImport()`. */
export interface ImportSpec {
  default?: string;
  named?: string[];
  types?: string[];
}

/** Options for `fn()` declarations. */
export interface FnOptions {
  exported?: boolean;
  default?: boolean;
  async?: boolean;
  returnType?: string;
}
