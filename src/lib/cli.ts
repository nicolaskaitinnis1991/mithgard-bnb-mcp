// Tiny argv parser — intentionally dependency-free. The flag surface is small
// (--version / --help / --debug), so a hand-rolled match keeps the entry point
// auditable and avoids pulling in commander/yargs just to print one line.

export type CliIntent = { kind: 'version' } | { kind: 'help' } | { kind: 'run'; debug: boolean };

export const USAGE = `mithgard-bnb-mcp — MCP server for Airbnb host workflows

USAGE
  mithgard-bnb-mcp [--version] [--help] [--debug]

DESCRIPTION
  A Model Context Protocol (MCP) server that lets an AI agent (Claude Desktop,
  Claude Code, Cursor, etc.) operate Airbnb workflows the way it already
  operates email or calendar. 2 live tools on public data, 7 demo tools for
  host-side workflows that need Airbnb Partner API access.

FLAGS
  --version, -v   Print version and exit
  --help, -h      Print this usage and exit
  --debug         Verbose logging to stderr (sanitised — no guest PII)

DOCS
  https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp
`;

export const parseArgs = (argv: readonly string[]): CliIntent => {
  // --version / --help win even if combined with other flags — they exit early.
  if (argv.includes('--version') || argv.includes('-v')) return { kind: 'version' };
  if (argv.includes('--help') || argv.includes('-h')) return { kind: 'help' };
  return { kind: 'run', debug: argv.includes('--debug') };
};
