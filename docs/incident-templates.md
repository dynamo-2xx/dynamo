# Incident communication templates

Copy/paste these into the status page (status.dynamo.today) and `feature_flags.incident_banner.message`. Keep messages short, factual, no speculation.

## 1. Investigating
> We're investigating reports of [symptom — e.g. "users unable to start live sessions"]. We'll post an update within 30 minutes.

## 2. Identified
> We've identified the cause: [one-line cause — e.g. "an upstream provider outage affecting speech-to-text"]. Working on a fix. Next update in ~30 minutes.

## 3. Monitoring
> A fix has been deployed and [symptom] is recovering. We're monitoring closely. Next update in 1 hour or sooner if anything changes.

## 4. Resolved
> The incident is resolved as of [HH:MM UTC]. All systems are operational. A short post-mortem will follow within 5 business days.

## Banner copy (≤120 chars)
- Investigating: `Investigating an issue affecting [area]. Some features may be degraded.`
- Identified:    `Known issue: [area] degraded. Fix in progress.`
- Monitoring:    `Recovering from earlier incident. Monitoring.`
- Resolved:      *(disable the banner — flip `enabled` to false)*

## How to toggle the in-app banner
1. Open Lovable Cloud → `feature_flags` table.
2. Edit the `incident_banner` row's `value` JSON:
   ```json
   { "enabled": true, "message": "Investigating an issue affecting live sessions." }
   ```
3. Save. Banner appears within seconds (Realtime push). Set `enabled: false` when resolved.