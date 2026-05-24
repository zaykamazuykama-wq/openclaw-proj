# CHANGE_CONTROL_POLICY.md

## Purpose

Protect the stable operating baseline from casual drift.

## Version control rule

- `v1.0 Stable` is the default operating baseline.
- Small typo/clarity fixes may become `v1.0.1`.
- New workflows or optional systems go to `v1.1`.
- Role/tool architecture changes require `v2.0`.

## Change request format

Every proposed OS change must include:

```text
Change:
Reason:
Affected files:
Risk:
Backward compatibility:
Founder approval needed:
Recommended version:
```

## Safety-critical exception

Security, privacy, destructive action, deployment, auth, billing, or secret-handling fixes may bypass v1.1 backlog and patch immediately.

## Source-of-truth protection

Do not duplicate canonical rules.

Canonical files:

- Required project brain files: `SYSTEMS/PROJECT_MEMORY_SYSTEM.md`
- Founder approval rules: `SYSTEMS/FOUNDER_DECISION_SYSTEM.md`
- Agent safety rules: `SYSTEMS/AGENT_SAFETY_RULES.md`
- Tool routing: `SYSTEMS/TOOL_ROUTING_SYSTEM.md`
- Quality gate: `SYSTEMS/QUALITY_GATE_SYSTEM.md`
- 25x execution: `SYSTEMS/25X_SPEED_SYSTEM.md`

## Review before merge

Before changing the base OS:

- identify duplicate rule risk
- check instruction conflict
- verify context budget
- update release notes
- update integrity manifest
