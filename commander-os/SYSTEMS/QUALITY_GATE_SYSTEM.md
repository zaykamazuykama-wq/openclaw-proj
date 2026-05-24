# QUALITY_GATE_SYSTEM.md

## Before marking work complete

Check:

- Acceptance criteria satisfied
- Output artifact exists
- Code runs or has a clear test plan
- Claims supported by evidence
- Risks and trade-offs noted
- Founder decision separated from AI execution
- Next step clear
- Project brain updated if needed

## Evidence gate

Claims without evidence default to `Revise`, not `Pass`.

Required evidence by task type:

| Task Type | Required Evidence |
|---|---|
| Code task | diff summary and test/build/typecheck/lint output where possible |
| File modification | changed file list and summary |
| Research | sources, retrieval date, and uncertainty notes |
| Deployment | deployment URL or log summary, rollback note, and smoke test result |
| Design/UI | screenshot, preview link, or visual description |
| Draft/writing | source/context used and target audience |
| Automation | trigger, schedule, permissions, failure mode |

## Review status

Commander review classification:

- `Pass` — meets acceptance criteria with acceptable risk
- `Pass-with-risks` — usable, but known risks are logged
- `Revise` — close but needs improvement
- `Reject` — fails objective, safety, or quality gate

`Pass-with-risks` must be logged in `DECISION_LOG.md` with risks accepted.

## Missing quality gates

Before final approval, check:

- Agent identity: which tool/agent produced this?
- Evidence: what proves the work happened?
- Time: how much founder/agent time did it consume?
- Cost: did it use expensive or limited tools?
- Reversibility: can it be undone quickly?
- Drift: does it still match the original objective?
- Consistency: does it match existing project style/format?
- Independence: should another tool review it?

## Release gate

Before release:

- Core flow works
- No obvious broken states
- User can complete main action
- Copy is clear
- Data handling is acceptable
- Security risk is reviewed
- Founder approves demo
