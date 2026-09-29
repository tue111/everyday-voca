# 틈 · everyday English

React + Vite 기반의 일상 영어 학습 PWA입니다. 하루 공통 표현 10개를 카드와 문장 빈칸 퀴즈로 학습하고 선택 복습으로 기억을 확인합니다.

## 로컬 실행

Node.js 24 LTS를 사용합니다.

```sh
npm ci
npm run dev
```

http://127.0.0.1:5173 에 접속합니다. 기본 실행은 API 키 없이 준비된 콘텐츠, 로컬 JSON 저장소, 가짜 AI·푸시를 사용합니다. 이름을 입력하고 발급된 복구 코드를 보관하세요. 로컬 학습 기록은 .data/state.json에 저장됩니다.

## 하네스

```sh
npx playwright install chromium
npm run check
npm run test:integration
npm run test:e2e
npm run verify
```

- 통합 테스트는 mongodb-memory-server가 별도의 실제 MongoDB를 실행합니다. 첫 실행에는 바이너리 다운로드가 필요합니다.
- 브라우저 테스트는 별도 로컬 서버와 .test-data의 고유 파일을 사용합니다. 기존 개발 서버를 재사용하지 않습니다. 포트 3001과 5180이 필요합니다.
- 기본 테스트에는 유료 AI 호출 및 실제 푸시 발송이 없습니다. 테스트 모드는 실제 서비스 자격 증명을 거부합니다.
- 실패 시 test-results의 화면·실행 추적과 playwright-report를 확인하세요.
- 의도적 실패 검출: HARNESS_PROBE=1을 설정하고 tests/harness.test.ts를 실행하면 종료 코드 1이 나와야 합니다.
- Windows 제한 실행 환경에서 esbuild의 상위 폴더 읽기가 차단되면 일반 터미널에서 동일 검사를 실행하세요.

## 운영 구성

.env.example을 참고해 로컬 .env 또는 Vercel 환경변수를 설정합니다. 비밀 값은 저장소에 커밋하지 않습니다.

필수: MONGODB_URI, MONGODB_DATABASE, APP_URL(HTTPS), CRON_SECRET(32자 이상).
AI 자동 생성: OPENAI_API_KEY, OPENAI_MODEL, 단가 및 월 예산 설정.
푸시: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT. 키는 `npx web-push generate-vapid-keys`로 생성합니다.

Vercel 프로젝트는 Vite preset, `npm run build`, 출력 dist를 사용합니다. API는 루트 api 폴더의 Node Functions이며 동일 도메인의 /api로 호출합니다. APP_URL에는 정확한 배포 도메인을 넣습니다. Preview 배포에는 Preview 전용 DB와 APP_URL을 설정하고 운영 자격 증명을 공유하지 않습니다.

예약 실행은 한국 시간 전날 22시대 콘텐츠 생성, 당일 09시대·21시대 알림입니다. 무료 Vercel Cron은 분 단위 정확성을 보장하지 않습니다. cron 요청은 Bearer CRON_SECRET으로 보호합니다. 공개 화면이나 사용자 요청으로 유료 생성을 실행할 수 없습니다.

AI가 없거나 실패한 경우 준비된 예비 콘텐츠를 제공합니다. 예비 묶음은 30개 표현을 순환하므로 장기간 새 표현 공급에는 AI 설정이 필요합니다. 실제 AI 내용은 출시 전에 정확성과 자연스러움을 검토해야 합니다.

## 데이터와 한계

1~2명 사용을 위해 MongoDB의 단일 버전 상태 문서를 원자적 compare-and-swap으로 갱신합니다. 12 MiB 안전 한도 초과 시 쓰기를 거부하므로 사용 규모나 기간이 커지면 사용자·학습·작업별 컬렉션으로 분리해야 합니다. 개인정보가 포함된 상태 파일과 DB 백업은 비공개로 보관합니다.

이름은 인증 수단이 아닙니다. 무작위 세션과 복구 코드의 해시만 저장합니다. 복구 코드 재발급 시 이전 코드는 무효화되며, 이미 로그인된 기기의 세션은 로그아웃 또는 만료 전까지 유지됩니다.

PWA는 개인 학습 API를 캐시하지 않으며 완전한 오프라인 학습은 지원하지 않습니다. 아이폰 푸시는 홈 화면 설치 후 허용해야 합니다. 실제 휴대폰의 알림·발음과 2주 학습 효과는 자동 테스트로 대체할 수 없습니다.

상세 검증 설계: docs/HARNESS.md · 요구사항: docs/REQUIREMENTS.md · 진행 현황: docs/PROGRESS.md.
## 미국식 발음 듣기

학습 카드에서 표현과 예문을 각각 재생합니다. OpenAI `gpt-4o-mini-tts` / `marin`으로 미국식 영어를 생성하고 서버에 공유 저장합니다. `1.0×`가 기본이며 `0.85×`는 같은 음원을 음높이를 유지하며 재생합니다. 생성 음성은 화면에 명시하며 ChatGPT 앱의 음성과 동일하다고 보장하지 않습니다.

로컬 `.env`에 `OPENAI_API_KEY`를 설정하고 개발 서버를 재시작해야 실제 음성이 생성됩니다. 키는 브라우저나 저장소에 넣지 않습니다. 키가 없으면 설정 안내와 사용자가 선택할 수 있는 기기 음성 대안을 제공합니다. 자동 테스트는 **무음 WAV**를 사용하므로 자연스러운 발음을 검증한 것으로 간주하지 않습니다.

`TTS_MONTHLY_BUDGET_USD=1`은 기존 콘텐츠 생성 예산과 별도의 보수적 사용량 허용치입니다. 호출 전 `0.0002 + (본문 문자 수 + 문맥 문자 수 × 0.05) × 0.00003` 달러를 장부에 기록하며 성공·시간 초과 모두 차감합니다. 이는 공식 단가나 제공자가 강제하는 청구 한도가 아닙니다. 실제 청구 사용량을 돌려주지 않는 Speech API 특성상 운영 계정 사용량·환율·저장 비용을 별도로 확인하고 월 1만 원 목표에 맞춰 조정해야 합니다. 한도 소진 후에도 캐시 음원은 재생됩니다.

예약 생성 뒤 최대 240초의 전체 작업 시간 내에서 음원을 순차 준비합니다. 미완료·기존 콘텐츠는 첫 클릭에서 준비하며 실패는 음원별 최대 2회 시도합니다. MP3는 MongoDB `speech_audio` 컬렉션에 별도로 저장하며 마지막 서버 접근 후 30일 TTL을 적용합니다. 로컬 파일은 `<DATA_FILE>.speech`에 저장하고 읽을 때 만료를 검사합니다. 음성 관련 장부는 기존 상태 문서의 `speech:` 작업과 `tts:YYYY-MM` 예산을 사용하므로 기존 사용자 데이터 마이그레이션은 필요하지 않습니다.

`POST /api/speech`는 세션·Origin을 검사하고 `{date,itemId,target}`만 받습니다. `target`은 `expression` 또는 `example`이며 임의 텍스트는 거부합니다. 성공은 오디오, 동시 생성 중은 202, 예산 제한은 429, 미설정·실패는 503입니다. 오디오 응답 역시 `no-store`이며 서비스 워커에 개인 학습 자료를 캐시하지 않습니다.
