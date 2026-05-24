# PRODUCT_SPEC.md

## Product Summary

Commander Project OS v1.0 is a reusable operating system for serious project execution using ChatGPT as Commander and other AI tools as sub-agents.

## User

Solo founder.

## Use Case

Plan, delegate, review, and ship projects while preserving founder-level decisions and reducing operator work.

## Core Features

### Commander Runtime
- Description: ChatGPT Project chat acts as canonical Commander.
- User value: Prevents conflicting plans across tools.
- Acceptance criteria: Runtime stated in README, AI_RULES, Tool Routing.

### Project Brain
- Description: Six core files track project context, spec, rules, tasks, decisions, and changelog.
- User value: Prevents context loss.
- Acceptance criteria: Defined only in PROJECT_MEMORY_SYSTEM.

### Agent Safety
- Description: Code tools follow action guard rules.
- User value: Reduces destructive execution risk.
- Acceptance criteria: AGENT_SAFETY_RULES exists and referenced by tool routing.

## Non-Goals

- Full automation of founder approval.
- Replacing human strategic decisions.
- Hiding tool costs or risks.

## MVP Scope

- Stable package
- Quick start
- Approval packet
- Smoke test report
- v1.1 backlog
