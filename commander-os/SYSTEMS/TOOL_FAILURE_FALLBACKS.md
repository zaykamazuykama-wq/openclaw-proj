# TOOL_FAILURE_FALLBACKS.md

## Purpose

Keep execution moving when tools fail, hit limits, or become too expensive.

## Fallback rule

If a tool fails, Commander must:

1. State the failure.
2. Identify impact.
3. Choose fallback.
4. Reduce scope if needed.
5. Log the fallback in the task report.

## Fallback table

| Failure | Fallback |
|---|---|
| Claude Opus quota hit | Claude Sonnet, then ChatGPT, then defer |
| Cursor unavailable | Codex, then ChatGPT debugging plan |
| Codex unavailable | Cursor, then manual patch plan |
| Hermes unavailable | Checklist/manual workflow |
| Build/test command fails | Diagnose, propose minimal fix, do not mark done |
| Deployment blocked | Create deployment checklist and escalation packet |
| Missing docs/API uncertainty | Use official docs or ask for current source |
