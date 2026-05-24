# DEPLOYMENT_CHECK_SYSTEM.md

## Deployment Gate

Before any production deployment:

- [ ] Founder approval obtained
- [ ] Environment variables verified locally without exposing values
- [ ] Build passes
- [ ] Tests or smoke checks pass
- [ ] Rollback path exists
- [ ] Data migration risk reviewed
- [ ] Security-sensitive changes reviewed
- [ ] Changelog updated

## Secrets handling

Never paste `.env` content into chat.
Reference secrets by variable name only.

## Deployment report format

```text
Deployment target:
Build command:
Test command:
Smoke test:
Risk:
Rollback:
Founder approval:
```
