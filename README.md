# 도구 모음

매달 반복하는 배너·이벤트 작업을 처리하는 내부 마법사 모음입니다.

- 주소(배포 후): https://buzz0103.github.io/tools/

## 구조

```
tools/
├── index.html        ← 도구 모음(카드 목록·검색)
├── wallpaper/        ← 월간 배너 자동 생성기 (디자인 규칙: wallpaper/DESIGN.md)
└── event-php/        ← 이벤트 PHP 생성기
```

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
