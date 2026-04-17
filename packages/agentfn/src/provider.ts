import type { Provider } from "./types.js";

let _defaultProvider: Provider = "claude";

/** Get the current default provider */
export function getDefaultProvider(): Provider {
  return _defaultProvider;
}

/** Set the default provider used when no provider is specified */
export function setDefaultProvider(provider: Provider): void {
  _defaultProvider = provider;
}
