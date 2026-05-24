# LOOP_LIMITS_AND_STOP_RULES.md

## Purpose

Prevent infinite loops, silent drift, and over-polishing.

## Agent loop limit

An agent may do at most 2 self-revision loops before returning to Commander.

## Commander stop conditions

Commander must pause and escalate when:

- founder-only decision is required
- safety or permission risk appears
- quality gate cannot be met without trade-off
- assumptions have drifted
- tool limit/failure changes the execution plan
- project scope is expanding beyond current sprint
- irreversible decision test is triggered

## Output after stop

When stopping, Commander must return:

```text
Stop reason:
Current state:
Options:
Recommendation:
Founder decision needed:
Next safe action:
```
