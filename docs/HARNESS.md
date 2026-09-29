# Harness design (H1)

## Boundaries

React calls same-origin /api. Shared Zod schemas define data and request contracts. A transport-independent service owns business rules. Clock, Store, Generator and PushSender are injectable. Vercel and local HTTP adapters call the same service.

The local/test clock can be fixed. The production clock cannot be changed through an API. Fake generation and push are explicitly selected by local/test configuration; production requires MongoDB and provider configuration.

## Verification

- Vitest: grading, Korean calendar dates, spaced review, budget reservations, authorization, persistence and job idempotency.
- React Testing Library: actionable errors and answer preservation.
- Integration: disposable real MongoDB, compare-and-swap concurrency, indexes, durable recovery. No connection string from production is accepted by the integration suite.
- Playwright: real local HTTP API + file persistence + fake providers; fresh isolated test data directory per run. Trace, screenshot and report on failure.
- npm run check: TypeScript + ESLint + unit/component tests.
- npm run test:integration: real ephemeral MongoDB integration tests.
- npm run test:e2e: browser flows.
- npm run verify: all of the above + production build (including server type checking).

## Harness acceptance

The harness must detect an intentionally inverted expectation and pass after it is restored. Test runtime blocks unexpected network access; permitted local MongoDB/browser traffic is explicit. Controlled fixture clocks cover midnight without sleeps. External side effects are captured as test records.

## Failure evidence

Vitest failure output, Playwright HTML report, trace and screenshots are retained in ignored artifact directories. Requirements map to executable scenarios. Each feature milestone records results in PROGRESS.md.

## Storage and deployment

For this 1-2 person application, store a versioned state document atomically. Local JSON uses a serialized mutation queue and atomic rename. MongoDB uses an optimistic revision compare-and-swap; unique state ID prevents competing initializations. State contains users/sessions, immutable daily lessons, progress, reviews, job leases and cost/delivery ledgers. Network side effects never run inside a retryable state mutation. Mongo size has a checked ceiling; larger deployments require splitting aggregates into collections.

## Speech extension

Inject SpeechGenerator and AudioStore. Default tests use playable silent WAV fixtures, never OpenAI. Scenarios: shared cache reuse across users, exclusive generation lease, at most two attempts, conservative budget debit before external work (including uncertain failures), cache expiration, unauthorized requests, and cancellation when leaving a card. Audio bytes live outside the application state document. Actual American accent quality and mobile playback require separate live checks.

## Manual boundary

Real iOS installation, actual push delivery, system speech voices, AI semantic accuracy and production credentials cannot be proved by browser emulation. They are separate release checklist items.
