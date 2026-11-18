# Studio publication ingest: retryable transaction conflicts

The publication ingest transaction uses PostgreSQL `Serializable` isolation to prevent two concurrent Studio deliveries from committing out of order.

Prisma reports a serialization/write conflict or deadlock with error code `P2034`. The ingest endpoint now translates only that specific database error into:

- HTTP `409 Conflict`
- JSON error code `retryable_transaction_conflict`
- JSON flag `retryable: true`
- `Retry-After: 1` response header

Other Prisma errors are not classified as retryable conflicts and retain the existing internal-error handling.

## Sender requirement

A sender may retry the **same frozen publication envelope** after this response, using bounded backoff and the same `publication_id`, `variant_id`, `project_version` and checksum. It must not rebuild editorial content or change the Studio-defined price between retries.

This Website change exposes a safe, explicit retry signal. It does not claim that the Studio publisher already retries automatically; sender-side retry handling and PostgreSQL integration tests remain separate validation work.
