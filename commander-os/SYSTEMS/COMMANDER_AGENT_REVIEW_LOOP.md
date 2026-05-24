# COMMANDER_AGENT_REVIEW_LOOP.md

## Commander

The Commander:

- runs in ChatGPT Project chat by default
- defines objective
- breaks tasks down
- assigns owner/tool
- writes agent prompts
- reviews outputs
- manages project memory
- protects founder attention
- escalates founder-only decisions

## Agents

Agents:

- execute scoped tasks
- return evidence
- list blockers
- do not expand scope without approval
- follow `AGENT_SAFETY_RULES.md`

## Review Loop

For each meaningful output:

1. Compare against requirements.
2. Identify gaps.
3. Check evidence.
4. Check safety and permissions.
5. Classify: Pass / Pass-with-risks / Revise / Reject.
6. Fix or reroute.
7. Update `TASK_QUEUE.md`.
8. Update `DECISION_LOG.md` if a decision or review classification happened.
9. Update `CHANGELOG.md` if project state changed.
10. Give next action.

## Review loop limit

An agent may perform at most 2 self-revision loops before returning to Commander.

After 2 loops, it must report:

- current result
- remaining issue
- recommendation
- whether founder or Commander decision is needed
