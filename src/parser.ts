/**
 * Parses .env-style files and extracts variable names.
 *
 * Handles:
 * - Comments (lines starting with #)
 * - Blank lines
 * - Inline comments (after unquoted values)
 * - Single-quoted, double-quoted, and backtick-quoted values
 * - Multiline values (double-quoted with newlines or backslash continuations)
 * - export prefix (e.g. `export FOO=bar`)
 */

export interface ParsedVariable {
  name: string;
  value: string;
  line: number;
}

export interface ParseResult {
  variables: ParsedVariable[];
  names: Set<string>;
}

export function parseEnvContent(content: string): ParseResult {
  const variables: ParsedVariable[] = [];
  const names = new Set<string>();
  const lines = content.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip blank lines and comments
    if (trimmed === "" || trimmed.startsWith("#")) {
      i++;
      continue;
    }

    // Match variable assignment: optional "export", then KEY=VALUE
    const match = trimmed.match(
      /^(?:export\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.*)/
    );
    if (!match) {
      i++;
      continue;
    }

    const name = match[1];
    let rawValue = match[2];
    const lineNumber = i + 1;

    // Parse the value, handling quotes and multiline
    let value: string;

    if (rawValue.startsWith('"')) {
      // Double-quoted value -- may span multiple lines
      const result = parseDoubleQuoted(rawValue, lines, i);
      value = result.value;
      i = result.endLine + 1;
    } else if (rawValue.startsWith("'")) {
      // Single-quoted value -- no interpolation, no multiline
      const closing = rawValue.indexOf("'", 1);
      if (closing === -1) {
        value = rawValue.slice(1);
      } else {
        value = rawValue.slice(1, closing);
      }
      i++;
    } else if (rawValue.startsWith("`")) {
      // Backtick-quoted value
      const closing = rawValue.indexOf("`", 1);
      if (closing === -1) {
        value = rawValue.slice(1);
      } else {
        value = rawValue.slice(1, closing);
      }
      i++;
    } else {
      // Unquoted value -- strip inline comments
      value = rawValue.replace(/\s+#.*$/, "").trim();
      i++;
    }

    variables.push({ name, value, line: lineNumber });
    names.add(name);
  }

  return { variables, names };
}

function parseDoubleQuoted(
  rawValue: string,
  lines: string[],
  startLine: number
): { value: string; endLine: number } {
  // Remove opening quote
  let content = rawValue.slice(1);
  let currentLine = startLine;

  // Look for the closing double quote
  const closingIndex = findClosingQuote(content);
  if (closingIndex !== -1) {
    return {
      value: unescapeDoubleQuoted(content.slice(0, closingIndex)),
      endLine: currentLine,
    };
  }

  // Multiline: keep reading until we find the closing quote
  const parts: string[] = [content];
  currentLine++;

  while (currentLine < lines.length) {
    const nextLine = lines[currentLine];
    const idx = findClosingQuote(nextLine);
    if (idx !== -1) {
      parts.push(nextLine.slice(0, idx));
      return {
        value: unescapeDoubleQuoted(parts.join("\n")),
        endLine: currentLine,
      };
    }
    parts.push(nextLine);
    currentLine++;
  }

  // No closing quote found -- use everything collected
  return {
    value: unescapeDoubleQuoted(parts.join("\n")),
    endLine: currentLine - 1,
  };
}

function findClosingQuote(s: string): number {
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\\" && i + 1 < s.length) {
      i += 2; // skip escaped character
      continue;
    }
    if (s[i] === '"') {
      return i;
    }
    i++;
  }
  return -1;
}

function unescapeDoubleQuoted(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}
