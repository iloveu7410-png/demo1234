# 연차계산기 미래 날짜 조회 기능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 연차계산기에서 "기준일" 입력 필드를 추가해 오늘이 아닌 임의 날짜 기준으로 발생·잔여연차를 확인할 수 있게 한다.

**Architecture:** 단일 HTML 파일(`annual-leave-calculator.html`) 내 CSS·HTML·JS를 순서대로 수정한다. 핵심은 `render()` 내 하드코딩된 `new Date()` 대신 `getBaseDate()` 헬퍼를 호출하도록 교체하는 것이다. UI는 기존 `.doc-header` 하단에 date picker 행을 추가한다.

**Tech Stack:** Vanilla HTML/CSS/JS (no build step, no dependencies)

## Global Constraints

- 파일: `annual-leave-calculator.html` 한 파일만 수정
- 기존 스타일 변수(색상 `#1a237e`, `#3949ab`, font-family 등) 그대로 사용
- 기준일이 오늘과 같을 때는 안내 문구 숨김 — 기존 UX와 동일하게 보여야 함
- 근태시스템 실제 잔여연차 카드(`buildActualCard`)는 수정하지 않음
- `usedDays` 입력값은 기준일 변경과 무관하게 유지

---

### Task 1: CSS — 기준일 입력 행 스타일 추가

**Files:**
- Modify: `annual-leave-calculator.html` (` <style>` 블록 끝 `</style>` 직전)

**Interfaces:**
- Produces: `.base-date-row`, `.base-date-input`, `.btn-today`, `.base-date-notice` 클래스

- [ ] **Step 1: `<style>` 블록 안 마지막 줄(`.link-item .link-desc` 블록 뒤)에 아래 CSS 추가**

`annual-leave-calculator.html` 의 `</style>` 바로 앞에 삽입:

```css
    /* 기준일 입력 행 */
    .base-date-row {
      display: flex; align-items: center; gap: 8px; margin-top: 14px;
      flex-wrap: wrap;
    }
    .base-date-row label {
      font-size: 12px; color: rgba(255,255,255,0.8); white-space: nowrap;
    }
    .base-date-input {
      height: 34px; border: 1.5px solid rgba(255,255,255,0.4);
      border-radius: 6px; background: rgba(255,255,255,0.15);
      color: white; padding: 0 10px; font-size: 13px; font-family: inherit;
      cursor: pointer;
    }
    .base-date-input::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; }
    .base-date-input:focus { outline: none; border-color: rgba(255,255,255,0.8); }
    .btn-today {
      height: 34px; padding: 0 12px; border: 1.5px solid rgba(255,255,255,0.5);
      border-radius: 6px; background: transparent; color: white;
      font-size: 12px; font-family: inherit; cursor: pointer; white-space: nowrap;
      transition: background 0.15s;
    }
    .btn-today:hover { background: rgba(255,255,255,0.15); }
    .base-date-notice {
      display: none; width: 100%; font-size: 12px;
      color: rgba(255,255,255,0.9); margin-top: 4px;
      background: rgba(255,255,255,0.1); border-radius: 4px;
      padding: 4px 10px;
    }
```

- [ ] **Step 2: 브라우저에서 파일 열어 스타일 충돌 없음 확인**

`annual-leave-calculator.html`을 브라우저에서 직접 열거나 로컬 서버로 확인. 기존 레이아웃이 그대로인지 체크.

- [ ] **Step 3: 커밋**

```bash
git add annual-leave-calculator.html
git commit -m "style: 기준일 입력 행 CSS 추가"
```

---

### Task 2: HTML — 헤더에 기준일 입력 행 삽입

**Files:**
- Modify: `annual-leave-calculator.html` (`.doc-header` 블록)

**Interfaces:**
- Consumes: Task 1의 CSS 클래스
- Produces: `id="baseDate"` (date input), `id="baseDateNotice"` (안내 문구 span)

- [ ] **Step 1: `.doc-header` 내 `<p class="law-note">` 바로 뒤에 아래 HTML 삽입**

현재 코드(179번째 줄 근처):
```html
    <p class="law-note">근로기준법 제60조 기준 · 사원번호로 근태시스템에서 사용연차 자동 조회 가능</p>
  </div>
```

변경 후:
```html
    <p class="law-note">근로기준법 제60조 기준 · 사원번호로 근태시스템에서 사용연차 자동 조회 가능</p>
    <div class="base-date-row">
      <label for="baseDate">기준일</label>
      <input type="date" id="baseDate" class="base-date-input" />
      <button class="btn-today" onclick="resetToToday()">오늘</button>
      <span id="baseDateNotice" class="base-date-notice"></span>
    </div>
  </div>
```

- [ ] **Step 2: 브라우저에서 헤더 확인**

헤더 하단에 "기준일 [날짜 입력] [오늘]" 행이 표시되는지 확인. 날짜 선택기가 흰색 텍스트로 헤더 배경 위에 잘 보이는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add annual-leave-calculator.html
git commit -m "feat: 헤더에 기준일 date picker HTML 추가"
```

---

### Task 3: JS — `getBaseDate()` 함수 및 `resetToToday()` 추가, 기본값 초기화

**Files:**
- Modify: `annual-leave-calculator.html` (`<script>` 블록)

**Interfaces:**
- Produces:
  - `getBaseDate(): Date` — baseDate input 값이 유효하면 해당 Date, 아니면 오늘 00:00:00
  - `resetToToday(): void` — baseDate input을 오늘로 리셋 후 render() 호출

- [ ] **Step 1: `// ── 유틸리티 ──` 주석 바로 위에 두 함수 추가**

```js
// ── 기준일 ────────────────────────────────────────────────
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

function resetToToday() {
  const today = new Date();
  document.getElementById('baseDate').value =
    `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  render();
}
```

- [ ] **Step 2: 연도 드롭다운 초기화 IIFE(`(function() {`) 안에 baseDate 기본값 초기화 추가**

현재 코드(788번째 줄 근처):
```js
(function() {
  const sel = document.getElementById('lookupYear');
  const cur = new Date().getFullYear();
  for (let y = cur; y >= cur - 3; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `${y}년`;
    sel.appendChild(opt);
  }
})();
```

변경 후:
```js
(function() {
  const sel = document.getElementById('lookupYear');
  const cur = new Date().getFullYear();
  for (let y = cur; y >= cur - 3; y--) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `${y}년`;
    sel.appendChild(opt);
  }

  // 기준일 기본값: 오늘
  const today = new Date();
  document.getElementById('baseDate').value =
    `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
})();
```

- [ ] **Step 3: 이벤트 바인딩 블록에 baseDate change 이벤트 추가**

현재 코드(801번째 줄 근처):
```js
document.getElementById('hireDate').addEventListener('input', render);
document.getElementById('usedDays').addEventListener('input', render);
document.getElementById('empNo').addEventListener('keydown', e => { if (e.key === 'Enter') lookupEmployee(); });
```

변경 후:
```js
document.getElementById('hireDate').addEventListener('input', render);
document.getElementById('usedDays').addEventListener('input', render);
document.getElementById('baseDate').addEventListener('change', render);
document.getElementById('empNo').addEventListener('keydown', e => { if (e.key === 'Enter') lookupEmployee(); });
```

- [ ] **Step 4: 브라우저에서 확인**

페이지 로드 시 기준일 필드에 오늘 날짜가 자동 입력되는지 확인. "오늘" 버튼 클릭 시 콘솔 에러 없는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add annual-leave-calculator.html
git commit -m "feat: getBaseDate/resetToToday 함수 추가 및 이벤트 바인딩"
```

---

### Task 4: JS — `render()` 수정: `today` 교체 및 헤더 안내 문구 토글

**Files:**
- Modify: `annual-leave-calculator.html` (`render()` 함수)

**Interfaces:**
- Consumes: `getBaseDate(): Date` (Task 3), `id="baseDateNotice"` (Task 2)

- [ ] **Step 1: `render()` 내 `today` 선언 교체**

현재 코드(422번째 줄 근처):
```js
  const hireDate = parseDate(hireDateRaw);
  const today = new Date(); today.setHours(0, 0, 0, 0);
```

변경 후:
```js
  const hireDate = parseDate(hireDateRaw);
  const today = getBaseDate();
```

- [ ] **Step 2: `render()` 상단(hireDateRaw 파싱 직후, hireDate 검증 전)에 기준일 안내 문구 토글 로직 추가**

`input.style.borderColor = '';` 바로 위(빈 hireDateRaw 처리 블록 전)에는 추가하지 않고, 유효한 입사일 확인(`input.style.borderColor = '#2e7d32'`) 이후 줄에 추가:

현재 코드(441번째 줄 근처):
```js
  input.style.borderColor = '#2e7d32';
  hint.textContent = `✓ ${formatDate(hireDate)}`;
  hint.style.color = '#2e7d32';

  const fiscal = calcFiscalYearBasis(hireDate, today);
```

변경 후:
```js
  input.style.borderColor = '#2e7d32';
  hint.textContent = `✓ ${formatDate(hireDate)}`;
  hint.style.color = '#2e7d32';

  // 기준일 안내 문구
  const realToday = new Date(); realToday.setHours(0, 0, 0, 0);
  const notice = document.getElementById('baseDateNotice');
  if (today.getTime() !== realToday.getTime()) {
    notice.textContent = `📅 ${formatDate(today)} 기준으로 조회 중`;
    notice.style.display = 'block';
  } else {
    notice.style.display = 'none';
  }

  const fiscal = calcFiscalYearBasis(hireDate, today);
```

- [ ] **Step 3: `render()` 내 근속 현황 카드 "오늘" 레이블을 기준일로 교체**

현재 코드(495번째 줄 근처):
```html
        <div><div style="font-size:11px;color:#888;margin-bottom:4px;">오늘</div><div style="font-size:16px;font-weight:700;">${formatDate(today)}</div></div>
```

변경 후 (`today`가 이미 `getBaseDate()` 반환값이므로 레이블만 변경):
```html
        <div><div style="font-size:11px;color:#888;margin-bottom:4px;">${today.getTime() !== realToday.getTime() ? '기준일' : '오늘'}</div><div style="font-size:16px;font-weight:700;">${formatDate(today)}</div></div>
```

단, `realToday`는 위 Step 2에서 이미 선언되어 있으므로 추가 선언 불필요.

- [ ] **Step 4: 브라우저에서 기능 검증**

1. 입사일 입력 후 기준일을 미래 날짜(예: 오늘로부터 6개월 후)로 변경
2. 발생 연차가 재계산되는지 확인
3. 헤더에 "📅 YYYY.MM.DD 기준으로 조회 중" 안내 문구 표시 확인
4. 근속 현황 카드에서 "기준일" 레이블과 해당 날짜 표시 확인
5. 사용 연차 입력값이 그대로 유지되는지 확인
6. "오늘" 버튼 클릭 시 안내 문구가 사라지고 기존 계산값으로 복귀하는지 확인
7. 근태시스템 조회 카드가 영향받지 않는지 확인 (사번 조회 후 기준일 변경 테스트)

- [ ] **Step 5: 커밋**

```bash
git add annual-leave-calculator.html
git commit -m "feat: 기준일 기반 연차 재계산 및 헤더 안내 문구 토글"
```
