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

## 2026-09-30 워크트리 변경 시나리오 (승인 전)

- NAME-01: 가입·이름 변경에서 닉네임 1~10자 허용, 초과 입력 거부. 서버 계약과 화면 안내 일치.
- NAME-02: 기존 30자 닉네임은 잘라서 저장하지 않고 모바일 홈·메뉴·설정에서 가로 넘침 없이 표시.
- RETRY-01: 당일 10문항 완료 후 최초 오답만 선택 재도전. 전부 정답이면 재도전 대상 없음.
- RETRY-02: 서버에서 채점·세션 검증·중복 제출 방지. 새로고침 후 재개. 재도전은 최초 답안·점수·완료 시각·정기 복습 일정에 영향 없음.
- RETRY-03: 재도전 재시작은 명시적이며 중복 요청에도 한 세션만 생성. 날짜 변경과 다른 사용자의 세션 접근 거부.
- TRANS-01: 생성한 한국어 문제 해석에 빈칸 표시가 있으면 게시 전 거부. 생성 지시는 완성된 한국어 문장을 요구.
- TRANS-02: 기존 데이터의 잘못된 빈칸 해석은 뜻을 추측해 대체하지 않고 안내로 표시. 기존 학습 기록·게시 세트 원본 보존.
- AUTH-REVIEW: 이름·생년월일 방식 및 복구 코드 제거는 검토 문서만 작성. 인증 동작은 변경하지 않음.
