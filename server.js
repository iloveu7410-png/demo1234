const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

function initData() {
  if (!fs.existsSync(DATA_FILE)) {
    const now = new Date().toISOString();
    const welcomeId = uuidv4();
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      notebooks: [
        { id: 'default', name: '내 노트북', createdAt: now }
      ],
      notes: [
        {
          id: welcomeId,
          notebookId: 'default',
          title: '메모장에 오신 것을 환영합니다!',
          content: '<h2>메모장에 오신 것을 환영합니다 👋</h2><p>이곳에 자유롭게 노트를 작성해보세요.</p><p></p><h3>주요 기능</h3><ul><li><p>노트 생성 및 편집</p></li><li><p>노트북으로 노트 구성</p></li><li><p>제목, 본문 전체 검색</p></li><li><p>풍부한 텍스트 서식 (굵게, 기울임, 목록, 코드 등)</p></li><li><p>자동 저장</p></li></ul><p></p><blockquote><p>새 노트를 만들려면 왼쪽 패널의 <strong>+ 새 노트</strong> 버튼을 클릭하세요.</p></blockquote>',
          contentText: '메모장에 오신 것을 환영합니다. 이곳에 자유롭게 노트를 작성해보세요.',
          tags: [],
          createdAt: now,
          updatedAt: now
        }
      ]
    }, null, 2));
  }
}

function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

initData();

// Notebooks
app.get('/api/notebooks', (req, res) => {
  const data = readData();
  const result = data.notebooks.map(nb => ({
    ...nb,
    noteCount: data.notes.filter(n => n.notebookId === nb.id).length
  }));
  res.json(result);
});

app.post('/api/notebooks', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: '노트북 이름이 필요합니다' });
  const data = readData();
  const notebook = { id: uuidv4(), name: name.trim(), createdAt: new Date().toISOString() };
  data.notebooks.push(notebook);
  writeData(data);
  res.json({ ...notebook, noteCount: 0 });
});

app.put('/api/notebooks/:id', (req, res) => {
  const data = readData();
  const nb = data.notebooks.find(n => n.id === req.params.id);
  if (!nb) return res.status(404).json({ error: '노트북을 찾을 수 없습니다' });
  nb.name = req.body.name.trim();
  writeData(data);
  res.json(nb);
});

app.delete('/api/notebooks/:id', (req, res) => {
  const { id } = req.params;
  if (id === 'default') return res.status(400).json({ error: '기본 노트북은 삭제할 수 없습니다' });
  const data = readData();
  data.notes.forEach(n => { if (n.notebookId === id) n.notebookId = 'default'; });
  data.notebooks = data.notebooks.filter(n => n.id !== id);
  writeData(data);
  res.json({ success: true });
});

// Notes
app.get('/api/notes', (req, res) => {
  const data = readData();
  let notes = [...data.notes];

  if (req.query.notebookId) {
    notes = notes.filter(n => n.notebookId === req.query.notebookId);
  }
  if (req.query.q) {
    const q = req.query.q.toLowerCase();
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      (n.contentText || '').toLowerCase().includes(q)
    );
  }

  notes.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(notes);
});

app.post('/api/notes', (req, res) => {
  const data = readData();
  const now = new Date().toISOString();
  const note = {
    id: uuidv4(),
    notebookId: req.body.notebookId || data.notebooks[0]?.id || 'default',
    title: req.body.title || '제목 없는 노트',
    content: req.body.content || '',
    contentText: req.body.contentText || '',
    tags: req.body.tags || [],
    createdAt: now,
    updatedAt: now
  };
  data.notes.unshift(note);
  writeData(data);
  res.json(note);
});

app.put('/api/notes/:id', (req, res) => {
  const data = readData();
  const note = data.notes.find(n => n.id === req.params.id);
  if (!note) return res.status(404).json({ error: '노트를 찾을 수 없습니다' });
  if (req.body.title !== undefined) note.title = req.body.title;
  if (req.body.content !== undefined) note.content = req.body.content;
  if (req.body.contentText !== undefined) note.contentText = req.body.contentText;
  if (req.body.tags !== undefined) note.tags = req.body.tags;
  if (req.body.notebookId !== undefined) note.notebookId = req.body.notebookId;
  note.updatedAt = new Date().toISOString();
  writeData(data);
  res.json(note);
});

app.delete('/api/notes/:id', (req, res) => {
  const data = readData();
  data.notes = data.notes.filter(n => n.id !== req.params.id);
  writeData(data);
  res.json({ success: true });
});

// Serve built React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
