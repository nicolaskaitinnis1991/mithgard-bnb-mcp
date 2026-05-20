# Architecture Decision Records

This directory contains the architectural decisions made for `mithgard-bnb-mcp`.

Format: [Michael Nygard ADR](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## Index

| #                                            | Title                              | Status   |
| -------------------------------------------- | ---------------------------------- | -------- |
| [0001](./0001-typescript-not-python.md)      | TypeScript over Python             | Accepted |
| [0002](./0002-modelcontextprotocol-sdk.md)   | Official @modelcontextprotocol/sdk | Accepted |
| [0003](./0003-zod-validation.md)             | Zod for runtime validation         | Accepted |
| [0004](./0004-result-type-not-throw.md)      | Result<T, E> over thrown errors    | Accepted |
| [0005](./0005-mock-vs-live-honesty.md)       | Mock tools clearly labelled        | Accepted |
| [0006](./0006-multi-strategy-parser.md)      | Multi-strategy parser with fallback | Accepted |
| [0007](./0007-stderr-for-logs.md)            | Stderr for logs, stdout for MCP    | Accepted |

## Adding new ADRs

New architectural decisions get a new ADR file. Sequence number is one above the highest existing number.

If you supersede an existing ADR, change its Status to "Superseded by NNNN" and link forward.
