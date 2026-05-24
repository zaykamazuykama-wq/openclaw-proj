# TOOL_ROUTING_SYSTEM.md

## Routing principle

Use the cheapest capable tool first.
Use expensive or limited tools only when their strength is needed.

One primary execution tool per sprint is preferred. Other tools should be used for review, escalation, or specialized tasks.

## Canonical Commander

- ChatGPT Project chat is the canonical Commander runtime.
- Other tools produce agent reports.
- External plans must be imported into Commander for synthesis before execution.

## ChatGPT

Use for:

- Commander orchestration
- planning
- task breakdown
- strategy
- review loops
- writing drafts
- decision support
- explanations
- synthesis across tools

## Claude / Opus-level models

Use only through Commander escalation for:

- deep reasoning
- complex product architecture
- long context synthesis
- high-stakes writing
- ambiguous problem solving

High-stakes means one or more of:

- customer-facing
- investor-facing
- legal/compliance adjacent
- money impact greater than `$50`
- public brand impact
- major architecture impact

## Gemini

Use for:

- broad alternative review
- Google ecosystem workflow ideas
- product-operations critique
- simplification review
- usability audit

## Sonnet / medium models

Use for:

- implementation
- refactoring
- routine coding
- documentation
- agent execution

## Cursor / Claude Code / Codex

Use for:

- repo-level coding
- tests
- debugging
- terminal workflows
- deployment checks

Must follow:

`SYSTEMS/AGENT_SAFETY_RULES.md`

## Hermes Agent / automation agents

Use for:

- repeated workflows
- scheduled checks
- file operations
- monitoring
- multi-step execution

Must follow:

`SYSTEMS/AGENT_SAFETY_RULES.md`

## Tool fallback chain

When a tool is unavailable, rate-limited, too expensive, or fails:

| Primary Tool | Fallback 1 | Fallback 2 | Final Fallback |
|---|---|---|---|
| Claude Opus | Claude Sonnet | ChatGPT | Defer task / reduce scope |
| Claude Sonnet | ChatGPT | Cursor/Codex if code | Defer task |
| Cursor | Codex | ChatGPT debugging plan | Manual checklist |
| Codex | Cursor | ChatGPT task packet | Manual checklist |
| Hermes Agent | Checklist/manual workflow | ChatGPT automation plan | Defer automation |
| Gemini | ChatGPT broad review | Claude review | Skip external review |

Commander must announce fallback in the task report.

## Consistency rule

Route the same kind of task to the same tool across a sprint unless quality, cost, or availability requires a change.
