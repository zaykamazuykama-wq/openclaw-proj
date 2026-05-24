# PROJECT_MEMORY_SYSTEM.md

## Purpose

This file is the single source of truth for project memory structure.

Other documents should reference this file instead of duplicating the required project brain list.

## Required Project Brain Files

Every serious project maintains exactly these six core files:

1. `PROJECT_CONTEXT.md`
2. `PRODUCT_SPEC.md`
3. `AI_RULES.md`
4. `TASK_QUEUE.md`
5. `DECISION_LOG.md`
6. `CHANGELOG.md`

## Optional Operational Files

Use these when the project needs more control:

- `EXECUTION_SCOREBOARD.md`
- `FOUNDER_DAILY_CONSOLE.md`
- `TOOL_STATE.md`
- `PROJECT_HIBERNATE.md`

Optional files must not replace the six core project brain files.

## Single Source of Truth Rule

- Repo or `/project-brain` is the source of truth for active project state.
- ChatGPT memory is the preference layer.
- Daily check-in is the operational layer.
- External tools provide agent reports, not canonical project memory.

## Context Update Rule

After meaningful project changes, update:

- `TASK_QUEUE.md` for task state
- `DECISION_LOG.md` for founder decisions or Commander review classifications
- `CHANGELOG.md` for project state changes
- `PROJECT_CONTEXT.md` if assumptions, constraints, or status changed

## End-of-conversation update prompt

Энэ ярианаас project memory update гарга:

1. Saved Memory-д нэмэх зүйл байвал тусад нь бич.
2. `PROJECT_CONTEXT.md` update өг.
3. `PRODUCT_SPEC.md` update өг.
4. `AI_RULES.md` update өг.
5. `TASK_QUEUE.md` update өг.
6. `DECISION_LOG.md` update өг.
7. `CHANGELOG.md` update өг.
8. Миний дараагийн хамгийн зөв 3 action-ийг жагсаа.
