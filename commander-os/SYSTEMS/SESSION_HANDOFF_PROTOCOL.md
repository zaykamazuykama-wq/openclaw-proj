# SESSION_HANDOFF_PROTOCOL.md

## Purpose

Prevent context loss when moving between ChatGPT, Claude, Cursor, Codex, Claude Code, Hermes Agent, or a new chat session.

## Handoff packet

Every session handoff should include:

```text
Project:
Current sprint:
Current task:
Source-of-truth files:
Decisions made:
Assumptions:
Files changed:
Commands run:
Evidence:
Risks:
Next action:
```

## Transfer rules

- ChatGPT Project chat remains canonical Commander runtime.
- External tools produce agent reports.
- Agent reports must be imported into Commander before changing the canonical project brain.
- If a tool session ends, update `TASK_QUEUE.md` and add a short handoff note.

## When handoff is required

Handoff is required when:

- switching tools
- switching chats
- pausing a project for more than 48 hours
- handing a task to Codex/Cursor/Claude Code
- returning from an external audit
- before deployment or release review

## Handoff quality gate

A handoff is valid only if another agent can continue the task without asking the founder for operator-level context.
