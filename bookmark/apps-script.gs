/**
 * 북마크 공유 — Google Apps Script 백엔드
 *
 * 설치: bookmark/README.md 참고
 *  1. 새 Google 시트 → 확장 프로그램 → Apps Script → 이 파일 내용 붙여넣기
 *  2. 배포 → 새 배포 → 웹 앱 (실행: 나 / 액세스: 모든 사용자)
 *  3. 받은 /exec 주소를 bookmark/index.html 의 API_URL 에 넣기
 *
 * 시트 열: id | createdAt | url | title | description | keywords | author
 * 대표이미지는 저장하지 않아요. 화면에서 URL로 캡쳐 이미지를 불러와 보여줘요.
 */

const SHEET_NAME = 'bookmarks';
const HEADERS = ['id', 'createdAt', 'url', 'title', 'description', 'keywords', 'author'];
const KEYWORD_LIMIT = 5;

// 키워드에서 뺄 흔한 단어
const STOPWORDS = new Set([
    // 영어
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'you', 'are', 'was', 'were', 'will', 'can',
    'how', 'what', 'why', 'when', 'who', 'all', 'our', 'out', 'not', 'but', 'has', 'have', 'its', 'into',
    'about', 'more', 'new', 'get', 'use', 'using', 'one', 'also', 'any', 'via', 'www', 'com', 'net', 'org',
    'http', 'https', 'html', 'home', 'page', 'site', 'official', 'welcome', 'free', 'best', 'just', 'now',
    'ever', 'without', 'like', 'than', 'them', 'they', 'their', 'been', 'such', 'very', 'over', 'only', 'other', 'which',
    // 한국어
    '그리고', '하지만', '그러나', '또는', '및', '등', '수', '것', '이', '그', '저', '더', '위한', '대한', '통해',
    '있는', '없는', '하는', '되는', '있습니다', '합니다', '입니다', '있어요', '해요', '모든', '가장', '바로',
    '지금', '오늘', '공식', '홈페이지', '사이트', '페이지', '바로가기', '소개', '안내', '이용', '서비스', '제공'
]);

// 한국어 조사·어미 (긴 것부터 떼요)
const KO_SUFFIXES = ['에서는', '으로는', '에게서', '까지', '부터', '에서', '에게', '으로', '이나', '하고',
    '처럼', '보다', '만큼', '이다', '입니다', '합니다', '하는', '하기', '했다', '한다', '은', '는', '이', '가',
    '을', '를', '의', '에', '로', '와', '과', '도', '만', '나', '요'];

function getSheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        sheet.appendRow(HEADERS);
        sheet.setFrozenRows(1);
    }
    return sheet;
}

function sendJson(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// 목록 조회: GET ?action=list
function doGet() {
    try {
        return sendJson({ ok: true, items: listBookmarks() });
    } catch (err) {
        return sendJson({ ok: false, message: String(err.message || err) });
    }
}

// 등록·삭제: POST (Content-Type text/plain, 본문 JSON)
function doPost(e) {
    try {
        const body = JSON.parse((e.postData && e.postData.contents) || '{}');
        if (body.action === 'add') return sendJson({ ok: true, item: addBookmark(body.url, body.author) });
        if (body.action === 'delete') return sendJson({ ok: true, id: deleteBookmark(body.id, body.author) });
        return sendJson({ ok: false, message: '알 수 없는 요청이에요.' });
    } catch (err) {
        return sendJson({ ok: false, message: String(err.message || err) });
    }
}

function listBookmarks() {
    const rows = getSheet().getDataRange().getValues().slice(1);
    return rows
        .filter((row) => row[0])
        .map((row) => ({
            id: String(row[0]),
            createdAt: row[1] instanceof Date ? row[1].toISOString() : String(row[1]),
            url: String(row[2]),
            title: String(row[3]),
            description: String(row[4]),
            keywords: String(row[5]).split(',').map((k) => k.trim()).filter(Boolean),
            author: String(row[6])
        }))
        .reverse();
}

function normalizeUrl(rawUrl) {
    let url = String(rawUrl || '').trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) throw new Error('올바른 URL을 입력해 주세요.');
    return url;
}

function addBookmark(rawUrl, rawAuthor) {
    const url = normalizeUrl(rawUrl);
    const author = String(rawAuthor || '').trim().slice(0, 20);
    if (!author) throw new Error('작성자를 입력해 주세요.');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const sheet = getSheet();
        const urls = sheet.getDataRange().getValues().slice(1).map((row) => String(row[2]).replace(/\/$/, ''));
        if (urls.includes(url.replace(/\/$/, ''))) throw new Error('이미 등록된 링크예요.');

        const meta = fetchMeta(url);
        const item = {
            id: Utilities.getUuid().slice(0, 8),
            createdAt: new Date().toISOString(),
            url: url,
            title: meta.title || new URL_(url).host,
            description: meta.description,
            keywords: extractKeywords(meta, url),
            author: author
        };
        sheet.appendRow([item.id, item.createdAt, item.url, item.title, item.description, item.keywords.join(', '), item.author]);
        return item;
    } finally {
        lock.releaseLock();
    }
}

// 등록한 사람(같은 작성자 이름)만 지울 수 있어요
function deleteBookmark(id, author) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const sheet = getSheet();
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][0]) !== String(id)) continue;
            if (String(rows[i][6]).trim() !== String(author || '').trim()) throw new Error('등록한 사람만 지울 수 있어요.');
            sheet.deleteRow(i + 1);
            return id;
        }
        throw new Error('이미 지워진 북마크예요.');
    } finally {
        lock.releaseLock();
    }
}

// Apps Script에는 URL 객체가 없어서 호스트만 뽑는 작은 도우미
function URL_(url) {
    const match = String(url).match(/^https?:\/\/([^/?#]+)/i);
    this.host = match ? match[1].replace(/^www\./, '') : url;
}

// 페이지 HTML에서 제목·설명·키워드 메타 읽기
function fetchMeta(url) {
    const empty = { title: '', description: '', metaKeywords: '' };
    let html = '';
    try {
        const res = UrlFetchApp.fetch(url, {
            muteHttpExceptions: true,
            followRedirects: true,
            headers: { 'User-Agent': 'Mozilla/5.0 (bookmark-bot)', 'Accept-Language': 'ko,en;q=0.8' }
        });
        if (res.getResponseCode() >= 400) return empty;
        const blob = res.getBlob();
        // 문자셋: 응답 헤더 → <meta charset> → UTF-8
        const contentType = String(res.getHeaders()['Content-Type'] || '');
        let charset = (contentType.match(/charset=([\w-]+)/i) || [])[1];
        if (!charset) {
            const head = blob.getDataAsString('ISO-8859-1').slice(0, 4000);
            charset = (head.match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1];
        }
        html = blob.getDataAsString(charset || 'UTF-8').slice(0, 300000);
    } catch (err) {
        return empty;
    }

    const getMeta = (name) => {
        const re1 = new RegExp('<meta[^>]+(?:name|property)=["\']' + name + '["\'][^>]*content=["\']([^"\']*)', 'i');
        const re2 = new RegExp('<meta[^>]+content=["\']([^"\']*)["\'][^>]*(?:name|property)=["\']' + name + '["\']', 'i');
        const match = html.match(re1) || html.match(re2);
        return match ? decodeEntities(match[1]) : '';
    };
    const titleTag = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';

    return {
        title: (getMeta('og:title') || decodeEntities(titleTag)).replace(/\s+/g, ' ').trim().slice(0, 200),
        description: (getMeta('og:description') || getMeta('description')).replace(/\s+/g, ' ').trim().slice(0, 300),
        metaKeywords: getMeta('keywords')
    };
}

function decodeEntities(text) {
    return String(text)
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/&#(\d+);/g, (m, code) => String.fromCharCode(Number(code)));
}

function stripKoSuffix(word) {
    if (!/[가-힣]$/.test(word)) return word;
    for (const suffix of KO_SUFFIXES) {
        if (word.length > suffix.length + 1 && word.endsWith(suffix)) return word.slice(0, -suffix.length);
    }
    return word;
}

function tokenize(text) {
    return String(text)
        .toLowerCase()
        .replace(/[^0-9a-z가-힣+#.\s]/g, ' ')
        .split(/\s+/)
        .map((word) => stripKoSuffix(word.replace(/^\.+|\.+$/g, '')))
        .filter((word) => word.length >= 2 && !/^\d+$/.test(word) && !STOPWORDS.has(word));
}

// 키워드 점수: meta keywords 5점, 제목 3점, 설명 1점 → 상위 5개
function extractKeywords(meta, url) {
    const scores = {};
    const add = (words, point) => words.forEach((word) => { scores[word] = (scores[word] || 0) + point; });

    // 사이트 이름(호스트의 첫 단어)은 제목마다 붙는 경우가 많아 빼요
    const siteWord = new URL_(url).host.split('.')[0].toLowerCase();

    String(meta.metaKeywords).split(/[,，|]/).map((k) => k.trim().toLowerCase())
        .filter((k) => k.length >= 2 && k.length <= 20)
        .forEach((k) => { scores[k] = (scores[k] || 0) + 5; });
    add(tokenize(meta.title), 3);
    add(tokenize(meta.description), 1);

    let keywords = Object.keys(scores)
        .filter((word) => word !== siteWord)
        .sort((a, b) => scores[b] - scores[a] || a.length - b.length)
        .slice(0, KEYWORD_LIMIT);

    // 페이지를 못 읽었으면 주소(경로)에서라도 뽑아요
    if (!keywords.length) {
        const path = url.replace(/^https?:\/\/[^/]+/i, '').replace(/[/_\-?=&.]+/g, ' ');
        keywords = tokenize(decodeURIComponent(path)).slice(0, KEYWORD_LIMIT);
    }
    return keywords;
}

// 편집기에서 직접 실행해 보는 테스트 (실행 → 로그 확인)
function testExtract() {
    const url = 'https://tailwindcss.com/';
    const meta = fetchMeta(url);
    Logger.log(meta);
    Logger.log(extractKeywords(meta, url));
}
