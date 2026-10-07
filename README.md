# 도구 모음

매달 반복하는 배너·이벤트 작업을 처리하는 내부 마법사 모음입니다.

- 주소(배포 후): https://buzz0103.github.io/tools/

## 구조

```
tools/
├── index.html        ← 도구 모음(카드 목록·검색)
├── wallpaper/        ← 월간 배너 자동 생성기 (디자인 규칙: wallpaper/DESIGN.md)
├── event-php/        ← 이벤트 PHP 생성기
├── banner-editor/    ← 배너 에디터 (빌드 결과물 — 직접 고치지 말 것)
└── _src/
    └── banner-editor/ ← 배너 에디터 원본 코드 (React + Vite)
```

## 배너 에디터 수정하기

배너 에디터는 React로 만들어서 다른 마법사와 달리 **빌드**가 필요해요.
`_src/`는 `_`로 시작해서 GitHub Pages에 공개되지 않아요.

1. `_src/banner-editor/src/` 안의 코드를 고쳐요.
2. 개발 중 미리보기: `npm --prefix _src/banner-editor run dev`
3. 빌드: `npm --prefix _src/banner-editor run build` → `banner-editor/`가 새로 만들어져요.
4. `_src/`와 `banner-editor/`를 함께 커밋·푸시해요. (빌드를 빼먹으면 사이트에 반영되지 않아요)

처음 받은 PC에서는 빌드 전에 `npm --prefix _src/banner-editor ci`로 패키지를 설치해요.

## 새 마법사 추가하기

1. `tools/새-폴더/index.html` 로 마법사를 만들어요.
2. 헤더 제목 왼쪽에 돌아가기 링크를 넣어요: `<a class="hdr_home" href="../">도구 모음</a>`
3. 루트 `index.html`의 `TOOLS` 목록에 한 항목을 추가해요.

```js
{
    id: 'new-tool',
    name: '새 마법사 이름',
    desc: '무엇을 넣으면 무엇이 나오는지 한두 문장으로',
    href: 'new-tool/',
    tags: ['매월', 'PHP'],
    thumb: 'new-tool/thumb.jpg'   // 없으면 code: ['미리보기 코드 줄', ...]
}
```

## 디자인

모든 화면은 LINE 디자인 기준(`wallpaper/DESIGN.md` 7번)을 따라요.
포인트 `#1775F0`, 입력창 `#F5F5F5`·높이 40px·모서리 5px, 상태는 opacity(hover 70% / pressed 50%).

## 로컬에서 보기

```bash
python -m http.server 8765
```
