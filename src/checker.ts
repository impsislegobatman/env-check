import { parseEnvContent, type ParseResult } from "./parser.js";

export interface CheckResult {
  /** Variables in .env.example but missing from .env */
  missing: string[];
  /** Variables in .env but not in .env.example */
  extra: string[];
  /** Variables present in both files */
  matched: string[];
  /** Total expected variables (from .env.example) */
  expectedCount: number;
  /** Total actual variables (from .env) */
  actualCount: number;
  /** Whether the check passed (no missing variables) */
  ok: boolean;
}

export interface CheckOptions {
  /** Treat extra variables as errors (default: false) */
  strict?: boolean;
}

export function checkEnv(
  envContent: string,
  exampleContent: string,
  options: CheckOptions = {}
): CheckResult {
  const env: ParseResult = parseEnvContent(envContent);
  const example: ParseResult = parseEnvContent(exampleContent);

  const missing: string[] = [];
  const matched: string[] = [];
  const extra: string[] = [];

  // Find missing and matched variables
  for (const name of example.names) {
    if (env.names.has(name)) {
      matched.push(name);
    } else {
      missing.push(name);
    }
  }

  // Find extra variables
  for (const name of env.names) {
    if (!example.names.has(name)) {
      extra.push(name);
    }
  }

  // Sort for consistent output
  missing.sort();
  extra.sort();
  matched.sort();

  const ok = missing.length === 0 && (!options.strict || extra.length === 0);

  return {
    missing,
    extra,
    matched,
    expectedCount: example.names.size,
    actualCount: env.names.size,
    ok,
  };
}
