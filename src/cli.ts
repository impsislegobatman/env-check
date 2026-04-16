import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { checkEnv, type CheckResult } from "./checker.js";

// ── Color helpers (respects NO_COLOR / TERM=dumb) ──────────────────────────

const supportsColor =
  !process.env.NO_COLOR &&
  process.env.TERM !== "dumb" &&
  (process.stdout.isTTY ?? false);

const fmt = {
  red: (s: string) => (supportsColor ? `\x1b[31m${s}\x1b[0m` : s),
  green: (s: string) => (supportsColor ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s: string) => (supportsColor ? `\x1b[33m${s}\x1b[0m` : s),
  bold: (s: string) => (supportsColor ? `\x1b[1m${s}\x1b[0m` : s),
  dim: (s: string) => (supportsColor ? `\x1b[2m${s}\x1b[0m` : s),
};

// ── Argument parsing ───────────────────────────────────────────────────────

interface CliArgs {
  envPath: string;
  examplePath: string;
  strict: boolean;
  quiet: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    envPath: ".env",
    examplePath: ".env.example",
    strict: false,
    quiet: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    switch (arg) {
      case "--help":
      case "-h":
        args.help = true;
        break;
      case "--strict":
      case "-s":
        args.strict = true;
        break;
      case "--quiet":
      case "-q":
        args.quiet = true;
        break;
      case "--env":
      case "-e":
        i++;
        if (i >= argv.length) {
          console.error(fmt.red("Error: --env requires a file path"));
          process.exit(2);
        }
        args.envPath = argv[i];
        break;
      case "--example":
      case "-x":
        i++;
        if (i >= argv.length) {
          console.error(fmt.red("Error: --example requires a file path"));
          process.exit(2);
        }
        args.examplePath = argv[i];
        break;
      default:
        console.error(fmt.red(`Unknown option: ${arg}`));
        console.error(`Run ${fmt.bold("env-check --help")} for usage.`);
        process.exit(2);
    }
  }

  return args;
}

// ── Help text ──────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`
${fmt.bold("env-check")} - Validate .env against .env.example

${fmt.bold("USAGE")}
  env-check [options]

${fmt.bold("OPTIONS")}
  -e, --env <path>       Path to the env file (default: .env)
  -x, --example <path>   Path to the example file (default: .env.example)
  -s, --strict           Exit with error on extra variables too
  -q, --quiet            Suppress output; only set exit code
  -h, --help             Show this help message

${fmt.bold("EXAMPLES")}
  env-check
  env-check --env .env.production --example .env.example
  env-check --strict --quiet

${fmt.bold("EXIT CODES")}
  0  All required variables are present
  1  Missing variables detected (or extras in --strict mode)
  2  Invalid usage or file not found
`);
}

// ── Output formatting ──────────────────────────────────────────────────────

function printResults(result: CheckResult, strict: boolean): void {
  const { missing, extra, matched, expectedCount } = result;

  console.log();
  console.log(
    fmt.bold(`  env-check  `) +
      fmt.dim(`${expectedCount} expected variable${expectedCount !== 1 ? "s" : ""}`)
  );
  console.log();

  // Matched variables
  if (matched.length > 0) {
    for (const name of matched) {
      console.log(`  ${fmt.green("\u2713")} ${name}`);
    }
  }

  // Missing variables
  if (missing.length > 0) {
    console.log();
    for (const name of missing) {
      console.log(`  ${fmt.red("\u2717")} ${name} ${fmt.red("(missing)")}`);
    }
  }

  // Extra variables
  if (extra.length > 0) {
    console.log();
    for (const name of extra) {
      const label = strict ? fmt.red("(extra)") : fmt.yellow("(extra)");
      const icon = strict ? fmt.red("\u2717") : fmt.yellow("!");
      console.log(`  ${icon} ${name} ${label}`);
    }
  }

  // Summary
  console.log();
  if (result.ok) {
    console.log(fmt.green("  All checks passed."));
  } else {
    const parts: string[] = [];
    if (missing.length > 0) {
      parts.push(fmt.red(`${missing.length} missing`));
    }
    if (strict && extra.length > 0) {
      parts.push(fmt.red(`${extra.length} extra`));
    }
    console.log(`  ${fmt.bold("Failed:")} ${parts.join(", ")}`);
  }
  console.log();
}

// ── Main ───────────────────────────────────────────────────────────────────

function main(): void {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const envPath = resolve(args.envPath);
  const examplePath = resolve(args.examplePath);

  // Check that files exist
  if (!existsSync(examplePath)) {
    if (!args.quiet) {
      console.error(
        fmt.red(`Error: Example file not found: ${args.examplePath}`)
      );
    }
    process.exit(2);
  }

  if (!existsSync(envPath)) {
    if (!args.quiet) {
      console.error(
        fmt.red(`Error: Env file not found: ${args.envPath}`)
      );
      console.error(
        fmt.dim(
          `  Create it from the example: cp ${args.examplePath} ${args.envPath}`
        )
      );
    }
    process.exit(1);
  }

  // Read files
  const envContent = readFileSync(envPath, "utf-8");
  const exampleContent = readFileSync(examplePath, "utf-8");

  // Run check
  const result = checkEnv(envContent, exampleContent, {
    strict: args.strict,
  });

  // Output
  if (!args.quiet) {
    printResults(result, args.strict);
  }

  process.exit(result.ok ? 0 : 1);
}

main();
