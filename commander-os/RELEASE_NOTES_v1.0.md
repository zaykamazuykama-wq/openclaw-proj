# RELEASE_NOTES_v1.0.md

## Commander Project OS v1.0 Stable — Commander PASS

Date: 2026-05-24

## Release type

Stable operating baseline.

## Summary

This release converts Commander Project OS from audit candidate to stable-ready operating baseline.

## Included systems

- Commander + Agents + Review Loop
- 25x speed execution
- Founder decision protection
- Tool routing and fallback
- Agent safety rules
- Quality gates with evidence requirements
- Context budget policy
- Loop limits and stop rules
- Project brain files
- Execution scoreboard
- Founder daily console
- Session handoff protocol
- Change control policy

## Breaking changes from v0.9 / RC1

- ChatGPT Project chat is now explicitly the canonical Commander runtime.
- Claude/Gemini/Cursor/Codex/Claude Code/Hermes Agent are sub-agents or execution tools.
- Required project brain files are defined only in `SYSTEMS/PROJECT_MEMORY_SYSTEM.md`.
- Founder approval rules are centralized in `SYSTEMS/FOUNDER_DECISION_SYSTEM.md`.
- Agents must follow `SYSTEMS/AGENT_SAFETY_RULES.md`.
- Claims without evidence default to `Revise`.

## Final status

```text
Commander PASS
Founder approval pending
```
