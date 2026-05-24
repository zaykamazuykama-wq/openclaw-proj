# CONTEXT_BUDGET_POLICY.md

## Purpose

Prevent context window waste and instruction drift.

## Rule

Do not load every system file by default.

Use only relevant files:

- `PROJECT_CONTEXT.md` for project background
- `TASK_QUEUE.md` for current work
- `AI_RULES.md` for project-specific operating rules
- `DECISION_LOG.md` only when decisions or review statuses are involved
- `CHANGELOG.md` only when changes need tracking
- `PRODUCT_SPEC.md` only for product or feature scope

## Summary rule

Summarize old context before adding new context.

## Duplicate rule

Do not duplicate canonical lists across documents. Use cross-references.

Canonical references:

- Required project brain files → `PROJECT_MEMORY_SYSTEM.md`
- Founder decision rules → `FOUNDER_DECISION_SYSTEM.md`
- 25x execution → `25X_SPEED_SYSTEM.md`
- Tool routing → `TOOL_ROUTING_SYSTEM.md`
- Agent safety → `AGENT_SAFETY_RULES.md`
