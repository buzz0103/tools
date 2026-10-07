# DESIGN.md — 월간 배너(월페이퍼) 디자인 규칙

월간 배너 자동 생성기(`index.html`)가 따르는 디자인 기준입니다.
값을 바꿀 때는 이 문서와 `index.html`을 함께 수정하세요.

## 1. 캔버스

| 항목 | 값 |
| --- | --- |
| 캔버스 크기 | **1440 × 900 px** |
| 사이트 노출 | `width: 80vw` (브라우저 크기에 따라 변동, 기본값 80vw) |
| 최대 너비 | `max-width: 1440px` |
| 모서리 | `border-radius: 80px` (캔버스) · 사이트용 PHP는 반응형 `min(80px, 4vw)` — 이미지 너비에 비례하고 최대 80px |
| 배경 이미지 | `src/assets/background/{YYYYMM}.jpg` — 캔버스 비율로 cover 채움. 연/월 목록은 2026~2028년 (코드의 `MONTH_PICKER_YEAR_START/END`) |

## 2. 서체

한글은 Elice DX Neolli, 영문/숫자는 Montserrat을 함께 씁니다.

| 용도 | 폰트 | Light | Medium | Bold |
| --- | --- | --- | --- | --- |
| 한글 · 목차 전체 | Elice DX Neolli OTF (`src/fonts/`) | **300** | **500** | 700 |
| 영문 · 숫자 (타이틀) | Montserrat (Google Fonts) | ExtraLight 200 | SemiBold 600 | Bold 700 |

```css
font-family: 'Montserrat', 'Elice DX Neolli OTF', sans-serif;
```

Montserrat에는 한글 글리프가 없어서, 한글은 자동으로 Elice DX Neolli로 대체됩니다.

- Elice 굵기 숫자: Light 300 / Medium 500 / Bold 700 (`@font-face`의 `font-weight`)
- 타이틀 영문·숫자는 Montserrat 고유 굵기(월 숫자 ExtraLight 200 / 영문 월 SemiBold 600 / 연도 Bold 700)를 그대로 사용
- 추가 텍스트처럼 두 폰트를 같이 쓰는 경우를 위해 Montserrat도 300 / 500을 불러와서 Elice와 같은 숫자로 맞춤

### 굵기 선택 (UI, 추가 텍스트)

- 가늘게 (Light) = 300
- 보통 (Medium) = 500
- 굵게 (Bold) = 700

## 3. 로고

- 파일: `src/assets/Brand_logo.svg` (120 × 33, 가로세로 비율 유지)
- 기본 크기: 가로 120px (슬라이더로 40~600px)
- 기본 위치: 좌측 상단 (좌상단 74, 49), 캔버스에서 드래그로 이동
- 배경 이미지에 로고가 이미 있으면 "로고 표시"를 꺼서 중복을 피합니다.

## 4. 타이틀 (오른쪽 정렬, 기준 X = 630)

색상은 모두 `#6F4AC7`. 각 항목은 사이드바 "2. 타이틀"에서 텍스트와 X/Y를 조절하거나 캔버스에서 드래그합니다.

| 항목 | 예시 | 폰트 | 크기 | 줄간격 | 기본 Y |
| --- | --- | --- | --- | --- | --- |
| 이달의 혜택 | 이달의 혜택 | Elice DX Neolli Medium (500) | 60px | 76px | 237 |
| 월 숫자 | 1 | Montserrat ExtraLight (200) | 152px | 130px | 362 |
| 영문 월 | JANUARY | Montserrat SemiBold (600), 대문자 | 24px | 약 29px | 433 |
| 연도 | 2027 | Montserrat Bold (700) | 24px | 약 29px | 462 |

- 연/월 선택 시 월 숫자 · 영문 월 · 연도가 자동으로 바뀝니다. (월 숫자를 직접 고치면 영문 월도 따라 바뀜)
- 사이트용 PHP 파일명(`wallpaper_{yy}{mm}`)은 연도와 월 숫자 값에서 만듭니다.
- 기본 배경색(배경 이미지가 없을 때): `#F4F3EF`

## 5. 목차

- 기본 위치: x 700, y 405 (왼쪽 정렬), 크기 22px, 줄간격 2.3배 — 목차 블록의 세로 중심이 캔버스 높이의 45% 지점 (900 × 0.45). 목차 카드의 X/Y 입력으로 조절
- 항목 최대 **14개**, 순서대로 번호가 붙습니다.
- 번호: Elice DX Neolli Bold(700) / 내용: Elice DX Neolli Medium(500) — 번호와 내용 모두 Elice로 통일해서 글줄 높이를 맞춤.
- **번호와 내용은 같은 크기**이고, 크기 값을 키우면 함께 커집니다.
- 번호 칸은 고정 너비라서 한 자리/두 자리 번호도 내용 시작 위치가 같습니다.
- 인라인 서식
  - `**강조**` → 강조 색상 + `글자 강조` 토글(기본 꺼짐: Medium 500 / 켜면 Bold 700)
  - `!주석!` → 15px, 기본 `#767676`, 글자 끝에 붙여서 표시 (큰 글자와 아랫선(baseline) 정렬)
- **doc에서 복사해서 붙여넣기**: Word·구글 문서에서 복사하면 서식을 읽어 자동 변환 (확인 후 `적용`)
  - 빨간색 등 색 있는 글자 · 굵은 글자 → `**강조**`
  - 본문보다 작은 글자(본문 크기의 88% 미만, 예: 본문 10pt → 8pt) · 회색 글자 → `!주석!`. 같은 크기의 `(내용)`은 일반 글자로 유지
  - 앞의 번호/글머리표(`1.`, `①`, `-` 등)는 제거 (번호는 자동으로 붙음)
- 배경 박스: 색상 · 투명도(0~100%) · 패딩(0~100px) · 모서리(0~100px)

## 6. 추가 텍스트

- 그 외 배너 문구 레이어: 기본 x 720, y 780, 48px, Bold, 가운데 정렬

## 7. 도구 UI 스타일 (LINE 디자인 시스템 기준)

`.claude/design-systems/line.md`를 따릅니다. 배너(캔버스) 디자인과는 별개로 **도구 화면**에만 적용됩니다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `--primary` | `#1775F0` | 주요 버튼, 선택 표시 |
| `--ink` | `#000000` | 제목 · 본문 강조 |
| `--body` | `#777777` | 보조 텍스트 (gray-600) |
| `--inactive` | `#949494` | 도움말 (gray-500) |
| `--bg` | `#F5F5F5` | 작업 영역 · 입력창 배경 (gray-150) |
| `--surface` | `#FFFFFF` | 패널 |
| `--line` | `#EFEFEF` | 구분선 (gray-200) |
| `--border` | `#DFDFDF` | 기본 보더 (gray-300) |
| `--placeholder` | `#C8C8C8` | placeholder (gray-350) |
| `--disabled` | `#E4E4E4` | 비활성 |
| `--error` | `#E8332E` | 오류 |

- 서체: LINE Seed KR → Pretendard → 시스템 sans-serif (Pretendard는 CDN 로드)
- 상태: 색 변경 없이 opacity만 조정 — Hover 70% / Pressed 50% / Disabled `#E4E4E4`
- 입력창: 배경 `#F5F5F5`, 보더 없음, 포커스 시 `1px solid #1775F0`
- 버튼 · 입력창 높이 40px (저장 버튼 48px), 모서리 5px (카드 7px)
- 아코디언은 구분선 방식, 간격은 4/8/12/16px 단위, 그라데이션 · 장식 없음

## 8. 저장 규칙

- PNG / JPG: 선택 테두리 없이 1440 × 900으로 저장 (배너 JPG 품질 100, 코드의 `JPG_QUALITY = 1` / 블러 배경 JPG는 품질 95, `BG_JPG_QUALITY = 0.95`)
- 사이트용 세트는 **ZIP 하나**(`wallpaper_{yy}{mm}.zip`)로 저장: `wallpaper.php` + `wallpaper/wallpaper_{yy}{mm}.jpg` + `wallpaper/wallpaper_bg_{yy}{mm}.jpg`(블러 배경). PHP 안의 이미지 경로도 `wallpaper/…`라서 압축을 풀어 그대로 올리면 됨. 폴더명은 코드의 `IMG_DIR = 'wallpaper/'`. ZIP은 외부 라이브러리 없이 코드 안의 최소 ZIP 생성기(무압축)로 만듦
- **전환 날짜 (선택)**: 배경 카드의 `선택한 달 내용으로 전환할 날짜·시각`(시각 기본 08:00)을 고르면 PHP 본문에 `<?php if (strtotime("now") > strtotime('YYYY-MM-DD HH:MM:SS') ) { ?>` … `<?php } else { ?>` … `<?php } ?>`가 들어가서, 그 시각 전에는 이전 달 블록(`wrap_ev_bg_{이전달}`, `wallpaper/wallpaper_{이전달}.jpg`)이, 지난 뒤에는 선택한 달 블록이 나옴. 예: 11월 선택 → 전환 시각 전까지 10월, 이후 11월. `<style>`은 한 번만 쓰고 이전 달·선택한 달 CSS가 모두 들어감. 날짜를 비우면 선택한 달만 나오는 기존 PHP. 1월 선택 시 이전 달은 전년 12월. 시각은 서버 시간대 기준. **이전 달 이미지 파일(`wallpaper_*.jpg`, `wallpaper_bg_*.jpg`)은 이미 서버에 있다고 가정(같이 생성되지 않음)**
- 블러 배경 CSS: `::before { width:120%; height:120%; background-size:cover; filter:blur(10px) }` (부모 `overflow:hidden`)

## 8-0. 화면 레이아웃

- 상단 헤더: 왼쪽 제목, **오른쪽 위 저장 버튼 2개** — `JPG로 저장`(테두리), `사이트용 파일 저장(ZIP)`(채움)
- 왼쪽: 컨트롤 패널(흰 카드), 오른쪽: 캔버스 영역 (각각 따로 스크롤)
- 캔버스 위 도구줄: 축소(−) · 현재 배율(%) · 확대(+) · **맞춤** — 10% 단위, 20~300%, `Ctrl + 마우스 휠`로도 확대/축소. 맞춤은 캔버스가 영역 안에 다 들어오는 배율(최대 100%)이고, 창 크기가 바뀌면 맞춤 상태에서 자동으로 다시 맞춰져요.
- PNG 저장, "저장 후 다음 달로" 버튼은 없어요.

## 8-1. 컨트롤 패널 (왼쪽 메뉴)

접고 펼 수 있는 카드(아코디언) 형식이고, 순서는 아래와 같습니다. 캔버스에서 요소를 클릭하면 해당 카드가 열립니다.

1. 배경 — 연/월 선택, 배경 이미지 등록 (1440×900 권장)
2. 타이틀 — 이달의 혜택 / 월 숫자 / 영문 월 / 연도 (글자, X, Y, 색상)
3. 목차 — 항목, 색상, 크기, 배경 박스
4. 로고 — 표시 여부, 가로 크기
5. 추가 텍스트 — 그 외 문구 레이어 추가/편집

## 9. 파일 구조

```
index.html
DESIGN.md
src/
  assets/
    Brand_logo.svg
    background/{YYYYMM}.jpg
  fonts/
    EliceDXNeolliOTF-Light.woff2   (300)
    EliceDXNeolliOTF-Medium.woff2  (500)
    EliceDXNeolliOTF-Bold.woff2    (700)
```
