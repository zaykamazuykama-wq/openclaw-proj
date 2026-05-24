# FOUNDER_DECISION_SYSTEM.md

## Purpose

This file is the single source of truth for when the Commander must ask the founder.

Other files should reference this file rather than redefining founder approval rules.

## Founder-only decisions

AI must not make final irreversible decisions on:

- product direction
- scope expansion
- pricing
- money
- budget commitments
- customer commitments
- partnerships
- legal/compliance
- public launch
- production deployment
- final acceptance
- quality gate changes

## Irreversible decision test

A decision is treated as irreversible if any of these is true:

1. Money spent is greater than `$50` or creates recurring cost.
2. A real customer, investor, partner, or public audience is told about it.
3. It touches production.
4. It changes auth, billing, security, legal, or customer data.
5. It is published publicly.
6. It cannot be undone in under 30 minutes by one person.

## AI can prepare

AI can prepare:

- options
- trade-offs
- recommendation
- risk analysis
- draft decision memo
- implementation plan
- next action

## Approval format

When founder approval is required, Commander should present:

```text
Decision needed:
Options:
Recommendation:
Risk:
Reversibility:
Cost/time impact:
My suggested next action:
```

## Default rule

If uncertain whether approval is required, escalate to founder with a concise decision packet.
