# ALERTS.md — AidFlow production alerting thresholds

## Critical — immediate response required (PagerDuty)

- API error rate > 1% over 5 minutes
- /health endpoint non-200 for > 30 seconds
- Ledger reconciliation mismatch detected (any amount)
- Database connection pool exhaustion (connections > 90% of max)
- Pending approvals queue > 100 items for > 2 hours

## Warning — investigate within 4 hours (Slack)

- API p95 response time > 2000ms for > 5 minutes
- Failed job queue depth > 50 items
- Redis memory usage > 80%
- Disk usage on DB server > 75%
- More than 5 failed login attempts from same IP in 1 minute

## Info — review at next standup (Slack)

- Nightly reconciliation job completed (with summary)
- New user registration requiring activation
- First deployment of any sprint
