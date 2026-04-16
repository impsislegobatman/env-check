# env-check

Validate that your `.env` file has every variable defined in `.env.example`.

## Why?

Missing environment variables are one of the most common causes of "works on my machine" bugs. A deploy goes out, a container starts, and three requests later something crashes because `DATABASE_URL` was never set. **env-check** catches that gap before your code ever runs -- in local dev, in CI, or as a pre-deploy gate.

## Install

```bash
npm install -D env-check
```

Or run it directly:

```bash
npx env-check
```

## Usage

```bash
# Default: compare .env against .env.example
env-check

# Custom file paths
env-check --env .env.production --example .env.example

# Strict mode: fail on extra variables too
env-check --strict

# Quiet mode: no output, just exit code (great for CI)
env-check --quiet

# Combine flags
env-check --env .env.staging --strict --quiet
```

## CLI Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--env <path>` | `-e` | Path to the env file (default: `.env`) |
| `--example <path>` | `-x` | Path to the example file (default: `.env.example`) |
| `--strict` | `-s` | Treat extra variables (in `.env` but not in `.env.example`) as errors |
| `--quiet` | `-q` | Suppress all output; only set the exit code |
| `--help` | `-h` | Show help message |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All required variables are present |
| `1` | Missing variables detected (or extras in `--strict` mode) |
| `2` | Invalid usage or file not found |

## CI/CD Integration

### GitHub Actions

```yaml
name: Env Check
on: [push, pull_request]

jobs:
  env-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx env-check --quiet
```

### As a package.json script

```json
{
  "scripts": {
    "prestart": "env-check",
    "prebuild": "env-check --strict"
  }
}
```

## Programmatic API

```typescript
import { checkEnv } from "env-check";

const result = checkEnv(envContent, exampleContent, { strict: true });

if (!result.ok) {
  console.log("Missing:", result.missing);
  console.log("Extra:", result.extra);
}
```

## What it handles

- Comments and blank lines in both files
- `export` prefixes (`export FOO=bar`)
- Single-quoted, double-quoted, and backtick-quoted values
- Multiline values in double quotes
- Inline comments after unquoted values

## License

MIT
