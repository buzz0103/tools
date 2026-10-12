/**
 * 북마크 공유 — Google Apps Script 백엔드
 *
 * 설치: bookmark/README.md 참고
 *  1. 새 Google 시트 → 확장 프로그램 → Apps Script → 이 파일 내용 붙여넣기
 *  2. 배포 → 새 배포 → 웹 앱 (실행: 나 / 액세스: 모든 사용자)
 *  3. 받은 /exec 주소를 bookmark/index.html 의 API_URL 에 넣기
 *
 * 회사 메일(ALLOWED_DOMAINS) 인증을 통과한 사람만 목록 보기·등록·삭제를 할 수 있어요.
 *  - 회사 메일로 인증번호 6자리를 보내고, 맞히면 로그인 토큰(SESSION_DAYS일 유효)을 줘요.
 *  - 토큰은 스크립트 속성에 해시로만 저장해요.
 *
 * 시트 열: id | createdAt | url | title | description | keywords | author | email
 * 대표이미지는 저장하지 않아요. 화면에서 URL로 캡쳐 이미지를 불러와 보여줘요.
 */

const SHEET_NAME = 'bookmarks';
const HEADERS = ['id', 'createdAt', 'url', 'title', 'description', 'keywords', 'author', 'email'];
const KEYWORD_LIMIT = 5;

// 회사 메일 인증
const ALLOWED_DOMAINS = ['ybm.co.kr'];
const CODE_MINUTES = 10;       // 인증번호 유효 시간
const CODE_COOLDOWN_SEC = 60;  // 같은 메일로 다시 보내기까지 기다릴 시간
const CODE_MAX_TRY = 5;        // 인증번호 틀릴 수 있는 횟수
const SESSION_DAYS = 90;       // 한 번 인증하면 이 기간 동안 다시 묻지 않아요
const MAIL_SUBJECT = '[같이 성장 북마크] 인증번호';

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
    } else if (sheet.getRange(1, HEADERS.length).getValue() !== HEADERS[HEADERS.length - 1]) {
        // 인증 기능 전에 만든 시트에는 email 열 머리글을 채워요
        sheet.getRange(1, HEADERS.length).setValue(HEADERS[HEADERS.length - 1]);
    }
    return sheet;
}

function sendJson(data) {
    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// 주소를 브라우저로 바로 열었을 때: 목록은 인증 후 POST로만 줘요
function doGet() {
    return sendJson({ ok: false, code: 'AUTH', message: '회사 메일 인증이 필요해요.' });
}

// 모든 요청: POST (Content-Type text/plain, 본문 JSON)
function doPost(e) {
    try {
        const body = JSON.parse((e.postData && e.postData.contents) || '{}');
        if (body.action === 'requestCode') return sendJson({ ok: true, email: requestCode(body.email) });
        if (body.action === 'verify') return sendJson(Object.assign({ ok: true }, verifyCode(body.email, body.code)));

        const email = getSessionEmail(body.token);
        if (!email) return sendJson({ ok: false, code: 'AUTH', message: '로그인이 만료됐어요. 회사 메일로 다시 인증해 주세요.' });
        if (body.action === 'list') return sendJson({ ok: true, items: listBookmarks(email) });
        if (body.action === 'add') return sendJson({ ok: true, item: addBookmark(body.url, body.author, email) });
        if (body.action === 'delete') return sendJson({ ok: true, id: deleteBookmark(body.id, email) });
        if (body.action === 'logout') return sendJson({ ok: true, done: endSession(body.token) });
        return sendJson({ ok: false, message: '알 수 없는 요청이에요.' });
    } catch (err) {
        return sendJson({ ok: false, message: String(err.message || err) });
    }
}

// ---- 회사 메일 인증 ----
function normalizeEmail(rawEmail) {
    const email = String(rawEmail || '').trim().toLowerCase();
    const domain = email.split('@')[1] || '';
    if (!/^[^\s@]+@[^\s@]+$/.test(email) || !ALLOWED_DOMAINS.includes(domain)) {
        throw new Error('회사 메일(@' + ALLOWED_DOMAINS.join(', @') + ')만 쓸 수 있어요.');
    }
    return email;
}

function hashText(text) {
    return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text));
}

function requestCode(rawEmail) {
    const email = normalizeEmail(rawEmail);
    const cache = CacheService.getScriptCache();
    if (cache.get('cool:' + email)) throw new Error('인증번호를 방금 보냈어요. 1분 뒤에 다시 받을 수 있어요.');
    if (MailApp.getRemainingDailyQuota() < 1) throw new Error('오늘 보낼 수 있는 인증 메일을 다 썼어요. 내일 다시 시도해 주세요.');

    const code = String(Math.floor(100000 + Math.random() * 900000));
    cache.put('code:' + email, JSON.stringify({ hash: hashText(code), tries: 0 }), CODE_MINUTES * 60);
    cache.put('cool:' + email, '1', CODE_COOLDOWN_SEC);
    MailApp.sendEmail({
        to: email,
        subject: MAIL_SUBJECT,
        body: '같이 성장 북마크 인증번호: ' + code + '\n\n' + CODE_MINUTES + '분 안에 입력해 주세요. 직접 요청하지 않았다면 이 메일은 무시하셔도 돼요.',
        name: '같이 성장 북마크'
    });
    return email;
}

function verifyCode(rawEmail, rawCode) {
    const email = normalizeEmail(rawEmail);
    const cache = CacheService.getScriptCache();
    const saved = JSON.parse(cache.get('code:' + email) || 'null');
    if (!saved) throw new Error('인증번호가 만료됐어요. 다시 받아 주세요.');
    if (saved.hash !== hashText(String(rawCode || '').trim())) {
        saved.tries += 1;
        if (saved.tries >= CODE_MAX_TRY) {
            cache.remove('code:' + email);
            throw new Error('인증번호를 ' + CODE_MAX_TRY + '번 틀렸어요. 다시 받아 주세요.');
        }
        cache.put('code:' + email, JSON.stringify(saved), CODE_MINUTES * 60);
        throw new Error('인증번호가 맞지 않아요. (' + (CODE_MAX_TRY - saved.tries) + '번 남음)');
    }
    cache.remove('code:' + email);

    const token = Utilities.getUuid() + Utilities.getUuid();
    const props = PropertiesService.getScriptProperties();
    removeExpiredSessions(props);
    props.setProperty('tok:' + hashText(token), JSON.stringify({ email: email, exp: Date.now() + SESSION_DAYS * 86400000 }));
    return { token: token, email: email };
}

function getSessionEmail(token) {
    if (!token) return '';
    const raw = PropertiesService.getScriptProperties().getProperty('tok:' + hashText(String(token)));
    const session = raw ? JSON.parse(raw) : null;
    return session && session.exp > Date.now() ? session.email : '';
}

function endSession(token) {
    PropertiesService.getScriptProperties().deleteProperty('tok:' + hashText(String(token || '')));
    return true;
}

function removeExpiredSessions(props) {
    const all = props.getProperties();
    Object.keys(all).forEach((key) => {
        if (key.indexOf('tok:') === 0 && JSON.parse(all[key]).exp < Date.now()) props.deleteProperty(key);
    });
}

// 퇴사자 등 특정 사람을 바로 내보낼 때: 아래 메일 주소를 바꾸고 편집기에서 revokeEmail 실행
const REVOKE_TARGET = 'someone@ybm.co.kr';
function revokeEmail() {
    const target = REVOKE_TARGET.trim().toLowerCase();
    const props = PropertiesService.getScriptProperties();
    const all = props.getProperties();
    Object.keys(all).forEach((key) => {
        if (key.indexOf('tok:') === 0 && JSON.parse(all[key]).email === target) props.deleteProperty(key);
    });
}

// 메일 주소는 화면에 내려주지 않고, 내 글인지(mine)만 알려줘요
function listBookmarks(email) {
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
            author: String(row[6]),
            mine: String(row[7] || '').toLowerCase() === email
        }))
        .reverse();
}

function normalizeUrl(rawUrl) {
    let url = String(rawUrl || '').trim();
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
    if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url)) throw new Error('올바른 URL을 입력해 주세요.');
    return url;
}

function addBookmark(rawUrl, rawAuthor, email) {
    const url = normalizeUrl(rawUrl);
    const author = String(rawAuthor || '').trim().slice(0, 20);
    if (!author) throw new Error('작성자를 입력해 주세요.');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const sheet = getSheet();
        const urls = sheet.getDataRange().getValues().slice(1).map((row) => String(row[2]).replace(/\/$/, ''));
        if (urls.includes(url.replace(/\/$/, ''))) throw new Error('이미 등록된 링크예요.');

        const meta = fetchYoutubeMeta(url) || fetchMeta(url);
        const item = {
            id: Utilities.getUuid().slice(0, 8),
            createdAt: new Date().toISOString(),
            url: url,
            title: meta.title || new URL_(url).host,
            description: meta.description,
            keywords: extractKeywords(meta, url),
            author: author,
            mine: true
        };
        sheet.appendRow([item.id, item.createdAt, item.url, item.title, item.description, item.keywords.join(', '), item.author, email]);
        return item;
    } finally {
        lock.releaseLock();
    }
}

// 등록한 사람(같은 회사 메일)만 지울 수 있어요
function deleteBookmark(id, email) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
        const sheet = getSheet();
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
            if (String(rows[i][0]) !== String(id)) continue;
            if (String(rows[i][7] || '').toLowerCase() !== email) throw new Error('등록한 사람만 지울 수 있어요.');
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

// 유튜브는 페이지 대신 oEmbed로 영상 제목·채널명을 받아요 (페이지는 동의 화면이 와서 제목이 틀려요)
function fetchYoutubeMeta(url) {
    if (!/^https?:\/\/(?:[\w-]+\.)?(?:youtube\.com|youtu\.be)\//i.test(url)) return null;
    try {
        const res = UrlFetchApp.fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(url), { muteHttpExceptions: true });
        if (res.getResponseCode() >= 400) return null;
        const data = JSON.parse(res.getContentText());
        if (!data.title) return null;
        return {
            title: String(data.title).replace(/\s+/g, ' ').trim().slice(0, 200),
            description: data.author_name ? 'YouTube · ' + data.author_name : '',
            metaKeywords: data.author_name || ''
        };
    } catch (err) {
        return null;
    }
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

// 처음 한 번 편집기에서 실행해 메일 보내기 권한을 허용해요 (실행 → 권한 검토 → 허용)
function authorizeMail() {
    Logger.log('오늘 남은 메일: ' + MailApp.getRemainingDailyQuota());
}

// 편집기에서 직접 실행해 보는 테스트 (실행 → 로그 확인)
function testExtract() {
    const url = 'https://tailwindcss.com/';
    const meta = fetchMeta(url);
    Logger.log(meta);
    Logger.log(extractKeywords(meta, url));
}
