# 연차계산기 미래 날짜 조회 기능 설계

**Date:** 2026-06-24  
**File:** `annual-leave-calculator.html`  
**Status:** Approved

---

## 요약

연차계산기에서 "오늘 기준"으로 고정되어 있던 발생연차·잔여연차 계산을, 사용자가 지정한 임의 날짜 기준으로도 확인할 수 있도록 기준일(base date) 입력 기능을 추가한다.

---

## 기능 요구사항

1. 헤더(`.doc-header`) 하단에 **기준일 입력 행** 추가
2. `<input type="date">` 사용, 기본값은 오늘 날짜
3. 기준일이 오늘과 다를 때 헤더 내 안내 문구 표시: `"📅 YYYY.MM.DD 기준으로 조회 중"`
4. **오늘** 버튼 클릭 시 기준일을 오늘로 리셋
5. 사용 연차(usedDays)는 기준일 변경과 무관하게 현재 입력값 유지
6. 근태시스템 실제 잔여연차 카드는 기준일 영향 없음 (HR 조회값 그대로)

---

## UI 레이아웃

```
┌─────────────────────────────────────────────┐
│  연차 계산기                                  │  ← .doc-header
│  입사일자를 입력하면 ...                       │
│  근로기준법 제60조 기준 ...                    │
│                                              │
│  기준일: [2026-06-24 ▾]  [오늘]              │  ← 추가
│  📅 2026.12.31 기준으로 조회 중               │  ← 오늘 아닐 때만 표시
└─────────────────────────────────────────────┘
```

헤더 스타일(흰색 텍스트 on 인디고 그라디언트)과 어울리도록 date picker·버튼 스타일 추가.

---

## 로직 변경

### `getBaseDate()` 함수 신규 추가

```js
function getBaseDate() {
  const val = document.getElementById('baseDate').value; // "YYYY-MM-DD"
  if (val) {
    const d = new Date(val + 'T00:00:00');
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
```

### `render()` 수정

```js
// 변경 전
const today = new Date(); today.setHours(0, 0, 0, 0);

// 변경 후
const today = getBaseDate();
```

### 헤더 안내 문구 토글

`render()` 내에서 기준일 vs 실제 오늘 비교 후 `#baseDateNotice` 요소의 표시/숨김 처리.

### 근속 현황 카드

"오늘" 레이블을 기준일로 교체 (`formatDate(today)`).

### 이벤트 바인딩

```js
document.getElementById('baseDate').addEventListener('change', render);
```

---

## 영향 범위

| 영역 | 변경 여부 | 비고 |
|------|-----------|------|
| 회계년도 기준 발생·잔여연차 | ✅ 재계산 | `today` 파라미터 교체 |
| 입사일자 기준 발생·잔여연차 | ✅ 재계산 | `today` 파라미터 교체 |
| 근속 현황 카드 | ✅ 레이블 변경 | "오늘" → 기준일 |
| 근속연수별 기준표 하이라이트 | ✅ 재계산 | `totalMonths` 기준일 기반 |
| 근태시스템 실제 잔여연차 카드 | ❌ 영향 없음 | HR 조회값 그대로 |
| `usedDays` 입력값 | ❌ 영향 없음 | 기준일 변경과 무관 |

---

## 엣지 케이스

- **기준일 < 입사일**: 입사 전 날짜 → 계산 불가, 기존 "입사일자가 오늘 이후입니다" 에러 로직이 자연스럽게 처리
- **기준일 = 오늘**: 안내 문구 숨김, 기존과 동일한 동작
- **기준일 = 미래**: 정상 계산 (발생연차는 그 시점 기준으로 산출)
- **date picker 빈 값**: `getBaseDate()`가 오늘로 폴백

---

## 구현 범위 (단일 파일)

`annual-leave-calculator.html` 한 파일 내 변경:
1. `<style>` — 기준일 행 스타일 추가
2. `.doc-header` HTML — 기준일 입력 행 삽입
3. `<script>` — `getBaseDate()` 추가, `render()` 수정, 이벤트 바인딩 추가
