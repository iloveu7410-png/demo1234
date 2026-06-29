const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3002;

const SHEET_ID = "1G01EUM42iPu1xRScAPWV6sF1AaX662Q5Vu9feFFF_p0";

async function fetchSheetCSV() {
  const urls = [
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`,
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/pub?output=csv&gid=0`,
  ];

  for (const url of urls) {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) continue;

    const contentType = response.headers.get('content-type') || '';
    // Google이 로그인 페이지(HTML)를 200으로 반환하는 경우 건너뜀
    if (contentType.includes('text/html')) continue;

    const csv = await response.text();
    // 내용이 HTML인지 추가 확인 (content-type 미설정 케이스)
    if (csv.trimStart().startsWith('<!')) continue;

    return csv;
  }

  throw new Error(
    '구글 시트에 접근할 수 없습니다. ' +
    '시트를 [파일 → 공유 → 웹에 게시 → CSV]로 게시하거나, ' +
    '"링크가 있는 모든 사용자" 보기 권한으로 공유해 주세요.'
  );
}

app.get('/api/survey-data', async (req, res) => {
  try {
    const csv = await fetchSheetCSV();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(csv);
  } catch (err) {
    console.error('구글 시트 fetch 실패:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/exit-interview-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'exit-interview-dashboard.html'));
});
app.get('/exit-interview-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'exit-interview-dashboard.html'));
});
app.get('/', (req, res) => {
  res.redirect('/exit-interview-dashboard');
});

app.listen(PORT, () => console.log(`exit-interview server running on port ${PORT}`));
