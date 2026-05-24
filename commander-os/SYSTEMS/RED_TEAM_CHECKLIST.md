# RED_TEAM_CHECKLIST.md

## Purpose

Use this before v1.0 approval, major release, production deployment, investor/customer communication, or architecture pivot.

## Principal AI Systems Architect Review

- [ ] Role separation is clear
- [ ] Commander runtime is canonical
- [ ] Tool routing does not create conflicting plans
- [ ] Sprint has 1–3 active workstreams
- [ ] Source of truth is clear

## Prompt / LLM Context Review

- [ ] No duplicated canonical rules
- [ ] No conflicting instructions
- [ ] Context budget is respected
- [ ] Agent task prompt has clear input/output/acceptance criteria
- [ ] Assumptions are logged

## SecOps Review

- [ ] Protected files are not touched
- [ ] Secrets are not printed or pasted
- [ ] Dangerous commands are not used
- [ ] Production deploy requires founder approval
- [ ] Diff/test evidence exists

## Competitor Review

- [ ] Workflow is not overcomplicated
- [ ] Daily use is simple
- [ ] Output metric is visible
- [ ] Tool dependency is controlled

## Investor Review

- [ ] Execution metric exists
- [ ] Cost is visible
- [ ] Founder bottleneck is reduced
- [ ] System is transferable/repeatable

## Customer Review

- [ ] Output solves a real pain
- [ ] Main user flow is clear
- [ ] Copy is understandable
- [ ] Release risk is acceptable
