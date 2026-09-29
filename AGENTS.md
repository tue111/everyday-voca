# Development contract

- Stack: React, Vite, TypeScript, Tailwind, Node/Vercel Functions, MongoDB.
- Read docs/HARNESS.md and docs/REQUIREMENTS.md before product changes.
- Complete the harness before feature work. For each feature: scenario -> implementation -> relevant tests -> full verify -> evidence in docs/PROGRESS.md.
- Browser code must not import server code or contain credentials. Shared contracts are in shared/.
- Authentication, grading, dates, completion, review scheduling, spending and delivery decisions belong on the server.
- Inject Clock, Generator, PushSender and Store. Default automated tests may not call external AI, push or production databases.
- Preserve submitted answers on failures. Use idempotent operations for submissions and scheduled jobs.
- Commands: npm run dev, npm run check, npm run test:integration, npm run test:e2e, npm run verify.
- Never weaken assertions merely to make tests pass. Record failures and resolutions.
- Live deployments, device tests and real-provider checks must be distinguished from simulated checks.
