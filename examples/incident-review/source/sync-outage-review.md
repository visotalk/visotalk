<!-- FICTION NOTICE: Nook, its team and this outage are invented as sample input for a VisoTalk example. No real company, service or incident is described. -->

# Post-incident review: notes stopped syncing for 47 minutes

**Date of incident:** Tuesday 14 October · **Severity:** 2 · **Author:** Platform team · **Status:** actions in progress

## Summary

From 09:12 to 09:59, Nook could not sync notes between devices. People could still read and edit what was already on their phone or laptop, but nothing they changed reached their other devices, and shared notebooks stopped updating. About 12% of people who opened Nook in that window, roughly 38,000 accounts, saw the "Couldn't sync" banner. No notes were lost: every change was kept on the device and synced once the service came back.

## What happened

The sync service talks to the storage cluster over TLS. The certificate it presents expired at 09:12. It had been issued by hand a year earlier, outside the system that renews our other certificates, so nothing renewed it and nothing warned us.

## Timeline

| Time | What happened |
| --- | --- |
| 09:12 | The certificate expires. Sync requests start failing. |
| 09:16 | The error-rate alert fires (4 minutes after the start). |
| 09:23 | The on-call engineer rules out the last deploy. |
| 09:41 | The expired certificate is found in the sync service's logs. |
| 09:52 | A new certificate is issued and rolled out. |
| 09:59 | Sync is back for everyone; the queued changes drain in 6 minutes. |

Detection took 4 minutes. Finding the cause took 25 more, because the logs said "connection reset" and not "certificate expired".

## What went well

- No data was lost. Keeping every edit on the device until it syncs did exactly what it was designed to do.
- The alert fired quickly, and the status page was updated at 09:20.

## What went badly

- One certificate lived outside automatic renewal, and no one knew.
- The error message hid the cause for 25 minutes.

## Actions

1. **Move every certificate into automatic renewal**, and fail the build when one is found outside it. Owner: Platform. Due: 31 October.
2. **Alert 30 days before any certificate expires.** Owner: Platform. Due: 24 October.
3. **Log TLS failures with their reason** ("expired", "unknown issuer") instead of a bare reset. Owner: Sync. Due: 7 November.

The first action matters most: with it, this outage could not have happened.
