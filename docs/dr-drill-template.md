# Disaster Recovery Drill — template

Copy this file to `docs/dr-drill-YYYY-MM-DD.md` each time you run the quarterly drill. Target: **complete end-to-end in <4h** (the §19 RTO).

## Pre-drill
- [ ] Date / operator: __________
- [ ] Confirm Lovable Cloud daily backup ran in the last 24h (screenshot to `docs/dr-evidence/`)
- [ ] Take a fresh manual snapshot (Lovable Cloud UI → Database → Backups → Snapshot)
- [ ] Note snapshot ID: __________

## Restore
- [ ] Restore snapshot into a preview branch / scratch project
- [ ] Record start time: __________
- [ ] Record restore-complete time: __________  (target: <2h)

## Smoke tests on the restored copy
- [ ] Anonymous user can load `/` and `/explore`
- [ ] Sign up with a fresh email succeeds, profile created
- [ ] Create a Debate → publish → join with second account → speak one turn
- [ ] Create a Live Session → record one minute → end → record view loads
- [ ] `/admin/costs` loads for founder account
- [ ] Push notification delivers to a subscribed test device

## Wrap up
- [ ] Total elapsed time: __________  (PASS if <4h)
- [ ] Issues encountered (one-liner each):
  - …
- [ ] Follow-up actions (file as tasks):
  - …
- [ ] Tear down scratch project
- [ ] Commit this file

## Next drill due
- Quarterly. Set calendar reminder: __________