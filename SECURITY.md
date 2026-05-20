# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| 0.1.x   | ✅ Yes    |
| < 0.1   | ❌ No     |

## Reporting

If you discover a security issue, please **do not** open a public issue.

Email: **nicolaskaitinnis1991@gmail.com** (subject prefix: `[SECURITY]`)

Include:
- Description of the issue
- Steps to reproduce
- Affected version(s)
- Suggested fix (if any)

## Response SLA

- **Acknowledgement:** within 48 hours
- **Initial assessment:** within 7 days
- **Patch or mitigation:** within 30 days for high/critical severity

## Scope

In scope:
- This MCP server's code (this repository)
- The 2 live tools' interaction with public Airbnb pages

Out of scope (report to Airbnb directly via their official channel):
- Airbnb's platform itself
- The 7 demo tools — they do not make real API calls and cannot leak or write data

## Disclosure Policy

We follow **coordinated disclosure**:

1. Issue reported privately
2. Acknowledged and assessed
3. Patch developed
4. Patch released and advisory published, with credit to the reporter (if desired)
5. Public disclosure ~7 days after patch release

## Recognition

Reporters of valid issues will be credited in the CHANGELOG and, with
consent, in a `SECURITY-HALL-OF-FAME.md` file unless they request anonymity.

## Hardening Notes

This project's design avoids common risk surfaces:

- No login flows, no cookie or session re-use, no captcha bypass
- No PII storage; logs are redacted at sink before write
- HTTPS-only outbound traffic
- Conservative rate limiting (1 req/sec, 60/hr) with polite User-Agent
- All inbound data validated through Zod schemas
- Tagged-union error envelope (no thrown errors crossing module boundaries)
- Distroless Docker base image, non-root runtime user
