const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3002;

const SHEET_ID = "1G01EUM42iPu1xRScAPWV6sF1AaX662Q5Vu9feFFF_p0";

app.get('/api/survey-data', async (req, res) => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0`;
  try {
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csv = await response.text();
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
