# VERSIONING_POLICY.md

## Versions

- `v0.9` = Audit Candidate
- `v1.0 RC1` = Stable candidate with audit fixes applied
- `v1.0 Stable — Commander PASS` = Stable-ready operating baseline after Commander finalization
- `v1.0 Stable — Founder Approved` = Final founder-approved operating baseline
- `v1.1` = Improvements after live project use
- `v2.0` = Major architecture change

## Tagging rule

`v1.0 Stable — Commander PASS` requires:

1. Must-fix audit items applied.
2. Smoke test performed.
3. Friction points captured as v1.1 backlog.
4. Final approval packet generated.

`v1.0 Stable — Founder Approved` requires:

1. Founder explicitly approves the stable baseline.
2. No unresolved safety-critical issues remain.

## Change policy

- Minor wording fixes may go into v1.0.x.
- New workflows go into v1.1 unless they fix a safety issue.
- Major role/tool architecture changes require v2.0.
