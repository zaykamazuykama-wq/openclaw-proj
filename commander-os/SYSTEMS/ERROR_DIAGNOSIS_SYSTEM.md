# ERROR_DIAGNOSIS_SYSTEM.md

## Error diagnosis flow

1. Identify exact error.
2. Identify system boundary:
   - code
   - dependency
   - environment
   - API
   - deployment
   - data
   - permissions
3. Check versions and current docs if API/tool may have changed.
4. Reproduce or define reproduction steps.
5. Propose smallest safe fix.
6. Define test.
7. Update changelog if fixed.

## Safety rule

Do not fix by deleting files, disabling security, changing secrets, or rewriting architecture without founder approval.

## Output format

- Error summary
- Likely cause
- Evidence
- Fix
- Test plan
- Risk
- Next action
