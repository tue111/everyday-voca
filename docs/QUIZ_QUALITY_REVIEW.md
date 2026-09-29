# 실제 AI 퀴즈 30문항 품질 검토

검토일: 2026-09-26

별도 로컬 데이터와 검증 계정을 사용했다. OpenAI gpt-6-luna로 10문항씩 3세트를 실제 생성했고, React 화면에서 카드 학습 후 30개 답안을 직접 입력하는 브라우저 자동화를 수행했다. 날짜 2026-09-26~28은 검증용 고정 시계이며 기존 사용자 진도와 운영 DB는 변경하지 않았다.

## 결과

- 실제 생성 3회, 세트별 첫 시도 성공, 예비 콘텐츠 대체 없음.
- 화면 제출 30/30 완료, 입력한 답 30/30 정답 판정.
- 정답 목록을 자동 복사하지 않고 카드 표현과 질문 문맥으로 답안을 작성했다. 첫 답은 대문자와 여분 공백을 사용해 정규화도 확인했다.
- 표현 중복 0개. 단, 30개 표본 통과가 모든 생성 결과의 품질을 보장하지는 않는다.
- 비용 장부 약 $0.0020871: API 응답 사용량과 앱 설정 단가로 계산한 값이며 실제 청구액은 OpenAI 사용량 화면에서 확인해야 한다.

## 발견 사항

1. **출시 전 수정 필요 — 정답 해설의 한국어 번역 10개에 빈칸이 남음.** 세 번째 세트 전체에서 questionTranslation에 ___가 포함됐다. wallet 정답 후에도 “부엌 식탁에 제 ___을 두고 왔어요.”가 표시된다. 생성 지시문에 완성된 문장의 전체 번역을 요구하고, 번역의 빈칸을 검증 단계에서 거부해야 한다.
2. **자연스러움 개선 권장 — take out.** “We usually take out dinner on busy weeknights.”와 “Let’s take out some noodles”는 의도한 미국식 포장 음식 주문 표현으로는 덜 자연스럽고 꺼내거나 밖으로 가져간다는 뜻으로도 읽힐 수 있다. get takeout / order takeout을 우선하는 것이 명확하다.
3. **구성 개선 권장 — appointment와 appointment book.** 같은 세트에 유사 표현이 들어가며 appointment book은 우선 학습할 생활 표현으로서 효용이 상대적으로 낮다. exact string 중복 검증에 더해 의미·어근 겹침을 줄이는 지시가 필요하다.

## 문항별 실사용 결과

| 세트 | 번호 | 학습 표현 | 입력 답안 | 채점 | 번역 빈칸 |
|---|---:|---|---|---|---|
| 2026-09-26 | 1 | make plans | MADE   PLANS | 정답 | 없음 |
| 2026-09-26 | 2 | available | available | 정답 | 없음 |
| 2026-09-26 | 3 | receipt | receipt | 정답 | 없음 |
| 2026-09-26 | 4 | pick up | pick up | 정답 | 없음 |
| 2026-09-26 | 5 | comfortable | comfortable | 정답 | 없음 |
| 2026-09-26 | 6 | appointment | appointment | 정답 | 없음 |
| 2026-09-26 | 7 | borrow | borrow | 정답 | 없음 |
| 2026-09-26 | 8 | quietly | quietly | 정답 | 없음 |
| 2026-09-26 | 9 | take out | take out | 정답 | 없음 |
| 2026-09-26 | 10 | appointment book | appointment book | 정답 | 없음 |
| 2026-09-27 | 1 | run out of | ran out of | 정답 | 없음 |
| 2026-09-27 | 2 | hang out | hang out | 정답 | 없음 |
| 2026-09-27 | 3 | crowded | crowded | 정답 | 없음 |
| 2026-09-27 | 4 | message | message | 정답 | 없음 |
| 2026-09-27 | 5 | decide | decide | 정답 | 없음 |
| 2026-09-27 | 6 | afford | afford | 정답 | 없음 |
| 2026-09-27 | 7 | on sale | on sale | 정답 | 없음 |
| 2026-09-27 | 8 | look forward to | looking forward to | 정답 | 없음 |
| 2026-09-27 | 9 | thirsty | thirsty | 정답 | 없음 |
| 2026-09-27 | 10 | neighborhood | neighborhood | 정답 | 없음 |
| 2026-09-28 | 1 | wallet | wallet | 정답 | 수정 필요 |
| 2026-09-28 | 2 | traffic | traffic | 정답 | 수정 필요 |
| 2026-09-28 | 3 | charger | charger | 정답 | 수정 필요 |
| 2026-09-28 | 4 | recommend | recommend | 정답 | 수정 필요 |
| 2026-09-28 | 5 | cancel | cancel | 정답 | 수정 필요 |
| 2026-09-28 | 6 | convenient | convenient | 정답 | 수정 필요 |
| 2026-09-28 | 7 | nearby | nearby | 정답 | 수정 필요 |
| 2026-09-28 | 8 | turn off | turn off | 정답 | 수정 필요 |
| 2026-09-28 | 9 | fill out | fill out | 정답 | 수정 필요 |
| 2026-09-28 | 10 | get along with | gets along with | 정답 | 수정 필요 |

## 증거

- 원문 데이터: `.test-data/quality-review/questions.json`
- 제출·피드백 로그: `.test-data/quality-review/browser-results.json`
- 각 문항 및 결과 화면: `.test-data/quality-review/YYYY-MM-DD-N.png`, `YYYY-MM-DD-result.png`
- 실행 스크립트: `.test-data/quality-generate.ts`, `.test-data/quality-browser.ts`

이 검토에서는 제품 코드 수정이나 전체 자동 테스트 재실행을 하지 않았다. 새로 발견한 품질 문제는 아직 미해결이다.
