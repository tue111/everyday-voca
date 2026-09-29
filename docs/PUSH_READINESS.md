# 푸시 전 점검 (2026-09-29)

## 점검 결과

- 실제 Git 저장소는 아직 초기화되지 않았으며 커밋·푸시·배포는 수행하지 않았다. 제외된 `.test-data/` 안의 임시 Git 메타데이터로 현재 `.gitignore`의 파일 선택 결과를 확인했다. 기존 원격 저장소나 커밋 이력은 점검 대상에 포함되지 않는다.
- 문서 작성 전 푸시 후보 74개 파일에서 현재 `.env`의 비밀값과 알려진 API 토큰·인증 포함 MongoDB URI·개인키 패턴을 검사하여 발견 0건. 이는 지정한 값과 패턴에 대한 검사이며 모든 종류의 비밀정보 부재를 보증하는 검사는 아니다.
- `.gitignore`의 `.env`/`.env.local` 한정 규칙을 `.env*`로 확대하고 `.env.example`만 예외로 허용했다. 환경 설정 백업, 로그, PEM/KEY 파일도 제외한다. `.vercelignore`에도 동일한 민감 파일 제외 범위를 적용했다.
- 환경파일 변형·백업·데이터·캐시·보고서 등 17개 제외 경로와 템플릿·소스·lockfile·아이콘·문서 5개 포함 경로를 Git check-ignore로 확인했다.

## 환경변수와 코드 내 주소

- OpenAI API 키: 서버의 `OPENAI_API_KEY`에서 주입.
- MongoDB 연결 문자열/DB 이름: 서버의 `MONGODB_URI`/`MONGODB_DATABASE`에서 주입.
- 운영 서비스 주소: `APP_URL` 사용. 운영 모드는 HTTPS 주소가 없으면 실행을 거부한다.
- 예약 작업 인증 및 Web Push: `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` 사용.
- 브라우저는 같은 출처의 `/api/app`, `/api/speech`를 사용한다. 브라우저 코드에 서버 비밀 환경변수 참조나 실제 키/URI 하드코딩은 발견되지 않았다.
- 코드에 남은 localhost/127.0.0.1 주소는 로컬 개발 기본값, 테스트 주소, URL 파싱용 기준 주소다. 푸시 제공자 도메인 목록은 보안 허용 목록이며 문서 링크는 공개 참고 주소다. 이들은 운영 자격 증명이나 환경별 배포 주소가 아니므로 유지했다. OpenAI 접속 주소는 SDK 기본값을 사용한다.
- Vitest 설정에서 테스트 모드를 모듈 import 전에 적용하도록 수정했다. 따라서 로컬 `.env`가 있는 상태에서도 기본 검증 명령이 실제 제공자 설정을 로드하지 않는다. 이미 프로세스에 들어 있는 실제 자격 증명을 거부하는 런타임 조건은 유지했다.

## 파일 구분

| 구분 | 파일/폴더 | 이유 |
|---|---|---|
| 푸시 대상 | `src/`, `server/`, `api/`, `shared/`, `public/`, `scripts/`, `tests/` | 제품 소스, 공개 정적 파일, 테스트 |
| 푸시 대상 | `docs/`, `README.md`, `AGENTS.md` | 요구사항, 하네스, 진행 및 검증 기록 |
| 푸시 대상 | `package.json`, `package-lock.json`, `index.html`, 각종 TS/Vite/Vitest/Playwright/ESLint 설정, `vercel.json` | 재현 가능한 설치·빌드·실행 |
| 푸시 대상 | `.gitignore`, `.vercelignore`, `.env.example` | 제외 규칙 및 실제 비밀값 없는 설정 양식 |
| 푸시 금지 | `.env`, `.env*` 변형과 `.env-backup-local/` (단 `.env.example` 제외) | 실제 API 키, DB 자격 증명, 백업 |
| 푸시 금지 | `.data/`, `.test-data/` | 사용자 상태, 세션 관련 데이터, 음원, 환경 설정 백업, 임시 검증 자료 |
| 푸시 제외 | `.vercel/`, `*.pem`, `*.key`, `*.log` | 로컬 연결 정보, 개인키, 민감 내용이 포함될 수 있는 로그 |
| 푸시 제외 | `node_modules/`, `dist/`, `.npm-cache/`, `coverage/`, `playwright-report/`, `test-results/`, `*.tsbuildinfo` | 재생성 가능한 의존성·캐시·빌드 및 테스트 산출물 |

`.gitignore`는 이미 추적 중인 파일을 제거하지 않는다. 향후 다른 기존 저장소에 옮겨 푸시하는 경우 그 저장소의 스테이징 목록과 커밋 이력도 별도로 확인해야 한다. 강제 추가(`git add -f`)로 제외 규칙을 우회하지 않는다.

이 점검은 푸시 대상과 비밀정보 분리 점검이다. 기존 AI 콘텐츠 품질 개선 및 운영 배포 준비의 완료를 뜻하지 않는다. 실제 API 호출, 운영 DB 접속, 원격 설정 변경은 수행하지 않았다.

## 수정 후 검증

기본 `npm run verify` 종료 코드 0. 별도 APP_MODE 지정 없이 타입 검사·ESLint·단위/컴포넌트/HTTP 35개·격리 MongoDB 통합 7개·브라우저 7개 및 운영 빌드 통과. 실제 유료 API나 운영 DB를 사용하는 검증은 수행하지 않았다.
