Deal Architect – Stage 기반 프리세일즈 앱 설계 가이드 (한글)
1. 앱의 핵심 개념 (Core Concept)
이 애플리케이션은 일반적인 CRM이나 Task 관리 도구가 아니다.
본 앱은
 👉 고객 구매 여정(Customer Buying Journey)에 맞춰 프리세일즈 판매 여정(PreSales Selling Journey)을 정렬하는 Stage 기반 의사결정 시스템이다.
핵심 철학은 다음과 같다:
프리세일즈는 고객의 구매 여정 전반에 걸쳐 고객이 겪는 문제, 감정, 행동, 채널의 변화를 해석하고 그에 맞는 판매 전략을 설계해야 한다.

2. Stage 정의 (구매 여정 단계)
앱에는 변하지 않는 4개의 Stage가 존재한다.
인식 (Awareness)
핵심 질문: 👉 이 딜을 더 볼 가치가 있는가?
고려 (Consideration)
핵심 질문: 👉 리소스를 써도 되는가?
평가 (Evaluation)
핵심 질문: 👉 왜 우리가 이길 수 있는가?
구매 (Purchase)
핵심 질문: 👉 어떻게 이길 것인가?
Stage는
작업(Task)이나 페이지가 아니라
판단과 의사결정의 맥락(Context) 을 의미한다.


3. Stage Anchor (단계 표시 방식)
목적
Stage Anchor는
 👉 현재 딜이 어떤 구매 맥락에 있는지를 고정적으로 보여주기 위한 장치다.
규칙
항상 화면에 표시
읽기 전용 (수정정 불가)
네비게이션 역할 ❌
Stage 변경 수단 ❌


위치
Deal Context 바로 아래
모든 기능 메뉴 위
예시
[ 인식 ] → 고려 → 평가 → 구매

Stage Anchor 아래에는 항상 해당 Stage의 핵심 질문을 함께 표시한다.
예:
인식: “이 딜을 더 볼 가치가 있는가?”
고려: “리소스를 써도 되는가?”
평가: “왜 우리가 이길 수 있는가?”
구매: “어떻게 이길 것인가?”


4. 기능 메뉴 구성 (Stage 종속)
기능 메뉴는 Stage가 아니라 실행 도구다. 따라서 현재 Stage에 따라 노출 여부와 권한이 달라진다.
접근 권한 유형
Edit: 입력 및 수정 가능
View: 읽기 전용
Hide: 노출하지 않음


Stage × 기능 매트릭스

| 기능 | 인식 | 고려 | 평가 | 구매 |
|---|---|---|---|---|
| Dashboard | View | View | View | View |
| Discovery | Edit | Edit | Edit | Edit |
| Deal Qualification | Hide | Edit | View | Hide |
| Solution Map | Hide | Edit | Edit | View |
| Competitive Fit | Hide | Hide | Edit | View |
| Win Strategy | Hide | Hide | Edit (Draft) | Edit (Final) |
| Reports | Hide | Hide | Edit | View |




5. Discovery의 특별 규칙 (중요)
Discovery는 모든 Stage에서 Edit 가능하다.
이유
Discovery는 단순한 초기 요구사항 수집이 아니라, 
👉 고객 신호(Customer Signal)를 지속적으로 기록하는 엔진이기 때문이다.
각 Stage마다 고객은 새로운:
고객 문제
고객 감정
고객 행동
고객 접점
 을 겪는다.


구매 단계 Discovery 예시
“제품을 몇 카피 구매해야 하지?”
“구매 승인 프로세스는 어떻게 되지?”
“이 가격이 내부 기준에 맞을까?”


즉, Discovery는 초기 단계용 기능이 아니라, 전 단계 공통 입력 영역이다.


6. Stage 전환 설계 (Trigger)
Stage 전환은 절대 자동으로 발생하지 않는다.
Stage 전환은
 👉 “이 질문에 답했다”고 선언하는 판단 행위다.
공통 원칙
Stage 전환은 아래 3가지가 모두 충족될 때만 가능하다.
해당 Stage의 핵심 질문에 답함
최소한의 판단 근거(Evidence)가 존재
사용자가 명시적으로 전환을 선언


7. Stage별 전환 조건 (결정판)
인식 → 고려
의미: Go / No-Go 판단
최소 조건:
핵심 JTBD 1개 이상 명확
고객이 문제 해결 의지를 표현
Discovery에 문제·감정·행동 기록 존재

고려 → 평가
의미: 리소스 투자 결정
최소 조건:
Deal Qualification 완료
Solution Map 초안 존재

평가 → 구매
의미: 승리 가설 확정
최소 조건:
Competitive Fit 분석 완료
Win Strategy 초안(Draft) 작성
주요 리스크와 대응 논리 정리

구매 → 종료 (Won / Lost)
의미: 최종 결과 선언
최소 조건:
Win Strategy 최종본(Final)
내부 또는 고객 의사결정 완료


8. Stage 전환 UX 규칙
Stage 전환은 항상 명시적 버튼으로만 가능
버튼 활성화 전:


왜 전환 가능한지
어떤 근거가 있는지를 사용자에게 보여줘야 함


Stage 하향 조정은 가능하되, 사유 기록 필수


예:
✔ JTBD 확인됨
✔ Qualification 완료
✔ 솔루션 방향 정의됨

[ 평가 단계로 이동 ]



9. 반드시 피해야 할 것
Stage를 탭처럼 사용 ❌
메뉴 클릭으로 Stage 변경 ❌
점수 기반 자동 Stage 전환 ❌
모든 기능을 모든 Stage에서 노출 ❌


10. 요약 (AI에게 주는 핵심 지침)
이 앱은 작업 흐름이 아니라 판단 흐름을 우선한다.
Stage는 “왜 행동하는가”를 정의하고,
기능은 “어떻게 행동하는가”를 정의한다.
Stage 전환은 자동이 아니라 의사결정 선언이다.



UI, 로직, 컴포넌트를 생성할 때는 항상 다음을 준수하라:
1) Stage Anchor의 위계
2) Stage 기반 기능 접근 매트릭스
3) 명시적 Stage 전환 트리거



11. Competitive Fit ↔ Win Strategy 역할 분리 규칙 (중요)

본 애플리케이션에서 Competitive Fit과 Win Strategy는
명확히 다른 목적과 책임을 가지며,
두 기능의 역할은 절대 혼합되지 않는다.

이는 구현 옵션이 아니라
앱의 핵심 설계 규칙(Core Design Rule)이다.

────────────────────────
11-1. Competitive Fit (분석 전용 단계)
────────────────────────

Competitive Fit의 목적은
👉 “이 딜에서 승부가 갈리는 기준이 무엇이며,
우리는 그 기준에서 어디에 서 있는가”를
객관적으로 분석하고 정렬하는 것이다.

Competitive Fit에서 AI가 수행할 수 있는 작업은
다음으로 엄격히 제한된다.

허용되는 작업:
- Key Requirements(KR) 추출
  · 정의: 이 딜에서 고객이 승자를 판단할 때 사용하는 핵심 기준
  · Outcome / 성공 조건 중심
  · 가격, ROI, TCO, 메시지, 협상 요소는 포함하지 않음

- Key Functional Requirements(KFR) 추출
  · 정의: 고객이 PoC 또는 RFP에서 실제로 평가하는 핵심 기능 요건
  · 구현 여부를 검증할 수 있는 기능 중심 항목

- KR/KFR 기준의 경쟁 비교
  · ⭕ / △ / ❌ 와 같은 사실 기반 지표 사용

- 경쟁 상황에 대한 짧은 사실 요약(Factual Summary)

Competitive Fit 단계에서 AI는
다음 작업을 수행해서는 안 된다.

금지되는 작업:
- 핵심 메시지(Winning Message) 생성
- 대응 방안, PoC 전략, 포지셔닝 제안
- 설득적·의견 중심 서술
- 가격, 할인, ROI, TCO 관련 내용 생성

Competitive Fit의 출력은
👉 ‘전략 문서’가 아니라
👉 ‘Win Strategy를 위한 분석 데이터’로 취급한다.

────────────────────────
11-2. Win Strategy (전략 생성 단계)
────────────────────────

Win Strategy는
Competitive Fit 분석이 완료된 이후에만 수행된다.

Win Strategy의 목적은
👉 Competitive Fit에서 정리된 승부 기준(KR)과
👉 기능 충족도(KFR)를 바탕으로
👉 “이 딜을 어떻게 이길 것인가”를 설계하는 것이다.

Win Strategy에서 AI가 수행할 수 있는 작업은 다음과 같다.

허용되는 작업:
- 이 딜에서 승리하기 위한 핵심 메시지(Winning Narrative) 생성
- 경쟁사 대비 대응 방안 설계
- PoC / Proof 전략 제안
- KR/KFR 충족도 차이를 활용한 포지셔닝 설계
- 주요 리스크에 대한 완화 및 설득 전략 제안

Win Strategy 단계에서는
설득적 표현, 의견 제시, 실행 중심 전략 생성을 허용한다.

────────────────────────
11-3. 핵심 원칙 요약
────────────────────────

Competitive Fit은 다음 질문에 답한다.
👉 “이 딜에서 승부가 갈리는 기준은 무엇이며, 우리는 어디에 서 있는가?”

Win Strategy는 다음 질문에 답한다.
👉 “이 기준을 바탕으로, 우리는 어떻게 이길 것인가?”

이 두 단계의 역할과 책임은
UI, 로직, AI 프롬프트, API 호출 설계 전반에서
절대 혼합되어서는 안 된다.



12. 
