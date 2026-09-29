# Requirements / test scenarios

| ID | Requirement | Verification |
|---|---|---|
| H-01 | deterministic harness rejects a defect | harness smoke + deliberate failure probe |
| AUTH-01 | names are display-only; isolated users | service + browser |
| AUTH-02 | hashed sessions and recovery; rotation invalidates old code | service + integration |
| DAY-01 | same Korean-day lesson, independent progress | clock/service |
| CARD-01 | save and resume card location | browser |
| QUIZ-01 | alternate sentence, optional hint, accepted forms | unit + browser |
| QUIZ-02 | submit exactly once; 10 attempts complete | service + Mongo concurrency |
| QUIZ-03 | preserve input on network error | component |
| REVIEW-01 | 1/3/7/14 day schedule; wrong answers tomorrow | clock/service |
| REVIEW-02 | optional review, max 10, resume | service + browser |
| AI-01 | strict validated 10-item content | contract/service |
| AI-02 | max 3 attempts, reserve budget, fallback | service |
| JOB-01 | exclusive generation lease, immutable publication | service + integration |
| PUSH-01 | complete users excluded, no repeated delivery | service |
| PUSH-02 | expired subscriptions removed; uncertain delivery logged | service |
| PWA-01 | installable shell; no private API caching | browser/build + manual devices |
| OPS-01 | server-only secrets, protected cron, origin checks | HTTP + build |

## Fixed product decisions

Speech: General American English, OpenAI gpt-4o-mini-tts / marin; expression and example audio; normal speed by default and 0.85x pitch-preserving playback. Server-generated shared cache, 30 days since last access. AI voice label and explicit device-voice fallback. SPEECH-01 cache/leases/budget, SPEECH-02 authentication/server-selected text, SPEECH-03 playback/cancellation/failure UI; test these before release.

Korean UI, Asia/Seoul dates; daily common 10 expressions, everyday nouns/verbs/phrasal verbs. Cards before quiz; quiz uses a different sentence, only prepared answers accepted. Wrong answers reveal answer and translation, no forced retries. All ten attempted means complete. Missed days do not accumulate. Optional review uses stored quiz sentences, at most ten per session. Recovery is bearer-secret based, not name based. No social, paid plans or offline learning.

## Sequence

H1-H5 harness; F1 identity; F2 recovery/settings; F3 date/content; F4 home; F5 cards; F6 quiz; F7 persistence/idempotency; F8 results; F9 scheduling; F10 review UI; F11 generation; F12 cron/budget/fallback; F13 PWA/speech; F14 subscriptions; F15 reminders; F16 release verification.
