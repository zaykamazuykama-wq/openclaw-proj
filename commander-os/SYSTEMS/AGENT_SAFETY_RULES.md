# AGENT_SAFETY_RULES.md

## Purpose

This file protects the founder and project when AI agents use code-executing or file-modifying tools such as Cursor, Codex, Claude Code, Hermes Agent, shell scripts, deployment tools, or automation agents.

## Protected files and areas

Agents must not read, modify, print, summarize, or expose the following without explicit founder approval:

- `.env`
- `.env.local`
- `.env.production`
- secret files
- API keys
- access tokens
- credentials
- private keys
- billing settings
- payment logic
- production deployment config
- CI/CD secrets
- database credentials
- customer data
- private user data
- legal/compliance documents

## Dangerous operations requiring founder approval

Agents must not perform these without explicit approval:

- delete files or folders
- run destructive shell commands such as `rm -rf`, `del /s`, `git clean -fd`, or equivalent
- run `git push --force`
- rewrite architecture
- change database schema or migrations
- change auth/security logic
- change billing/payment logic
- change deployment settings
- deploy to production
- install major dependencies
- upgrade framework/runtime versions
- make API calls that spend money
- scrape or process private customer/user data
- expose external endpoints
- change permissions or sharing settings

## Safe default

Agents should prefer:

- read-only inspection first
- small diffs
- branch-based changes
- explicit file allowlist
- protected file denylist
- tests before completion
- diff summary before approval
- rollback notes

## Code-agent task requirement

Every Cursor, Codex, Claude Code, or Hermes Agent task must include:

- allowed files
- protected files
- permitted commands
- forbidden commands
- acceptance criteria
- validation/test plan
- loop limit
- report format

## Secrets handling

Never paste `.env` content, API keys, tokens, or credentials into chat.
Use placeholders such as:

```text
OPENAI_API_KEY=<configured locally>
DATABASE_URL=<configured locally>
```

Agents that need secrets should receive placeholder names, not secret values.
