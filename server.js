require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@libsql/client');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 로컬: TURSO_DATABASE_URL 없으면 로컬 SQLite 파일 사용
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS leave_plans (
      id          TEXT PRIMARY KEY,
      emp_no      TEXT NOT NULL DEFAULT '',
      name        TEXT NOT NULL,
      dept        TEXT NOT NULL DEFAULT '',
      title       TEXT NOT NULL DEFAULT '',
      dates       TEXT NOT NULL DEFAULT '[]',
      signature   TEXT NOT NULL DEFAULT '',
      submittedAt TEXT NOT NULL
    )
  `);

  // 기존 테이블에 emp_no 컬럼 추가 (이미 있으면 무시)
  try {
    await db.execute(`ALTER TABLE leave_plans ADD COLUMN emp_no TEXT NOT NULL DEFAULT ''`);
  } catch (_) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS notes (
      id          TEXT PRIMARY KEY,
      notebookId  TEXT NOT NULL,
      title       TEXT NOT NULL DEFAULT '',
      content     TEXT NOT NULL DEFAULT '',
      contentText TEXT NOT NULL DEFAULT '',
      tags        TEXT NOT NULL DEFAULT '[]',
      createdAt   TEXT NOT NULL,
      updatedAt   TEXT NOT NULL
    )
  `);

  // 최초 실행 시 샘플 데이터 삽입
  const { rows } = await db.execute('SELECT COUNT(*) as count FROM notebooks');
  if (Number(rows[0].count) === 0) {
    const now = new Date().toISOString();
    await db.execute({
      sql: 'INSERT INTO notebooks (id, name, createdAt) VALUES (?, ?, ?)',
      args: ['default', '내 노트북', now]
    });
    await db.execute({
      sql: `INSERT INTO notes (id, notebookId, title, content, contentText, tags, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        uuidv4(), 'default',
        '메모장에 오신 것을 환영합니다!',
        '<h2>메모장에 오신 것을 환영합니다 👋</h2><p>이곳에 자유롭게 노트를 작성해보세요.</p><p></p><h3>주요 기능</h3><ul><li><p>노트 생성 및 편집</p></li><li><p>노트북으로 노트 구성</p></li><li><p>제목, 본문 전체 검색</p></li><li><p>풍부한 텍스트 서식 (굵게, 기울임, 목록, 코드 등)</p></li><li><p>자동 저장</p></li></ul><p></p><blockquote><p>새 노트를 만들려면 왼쪽 패널의 <strong>+ 새 노트</strong> 버튼을 클릭하세요.</p></blockquote>',
        '메모장에 오신 것을 환영합니다. 이곳에 자유롭게 노트를 작성해보세요.',
        '[]', now, now
      ]
    });
  }
}

// ── Notebooks ────────────────────────────────────────────────────────

app.get('/api/notebooks', async (req, res) => {
  try {
    const { rows: nbs } = await db.execute('SELECT * FROM notebooks ORDER BY createdAt ASC');
    const { rows: counts } = await db.execute(
      'SELECT notebookId, COUNT(*) as count FROM notes GROUP BY notebookId'
    );
    const countMap = Object.fromEntries(counts.map(r => [r.notebookId, Number(r.count)]));
    res.json(nbs.map(nb => ({ ...nb, noteCount: countMap[nb.id] || 0 })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notebooks', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: '노트북 이름이 필요합니다' });
  try {
    const nb = { id: uuidv4(), name: name.trim(), createdAt: new Date().toISOString() };
    await db.execute({
      sql: 'INSERT INTO notebooks (id, name, createdAt) VALUES (?, ?, ?)',
      args: [nb.id, nb.name, nb.createdAt]
    });
    res.json({ ...nb, noteCount: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notebooks/:id', async (req, res) => {
  try {
    await db.execute({
      sql: 'UPDATE notebooks SET name = ? WHERE id = ?',
      args: [req.body.name.trim(), req.params.id]
    });
    const { rows } = await db.execute({
      sql: 'SELECT * FROM notebooks WHERE id = ?',
      args: [req.params.id]
    });
    if (!rows[0]) return res.status(404).json({ error: '노트북을 찾을 수 없습니다' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notebooks/:id', async (req, res) => {
  const { id } = req.params;
  if (id === 'default') return res.status(400).json({ error: '기본 노트북은 삭제할 수 없습니다' });
  try {
    await db.execute({ sql: 'UPDATE notes SET notebookId = ? WHERE notebookId = ?', args: ['default', id] });
    await db.execute({ sql: 'DELETE FROM notebooks WHERE id = ?', args: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Notes ─────────────────────────────────────────────────────────────

app.get('/api/notes', async (req, res) => {
  try {
    let sql = 'SELECT * FROM notes WHERE 1=1';
    const args = [];
    if (req.query.notebookId) { sql += ' AND notebookId = ?'; args.push(req.query.notebookId); }
    if (req.query.q) {
      sql += ' AND (title LIKE ? OR contentText LIKE ?)';
      args.push(`%${req.query.q}%`, `%${req.query.q}%`);
    }
    sql += ' ORDER BY updatedAt DESC';
    const { rows } = await db.execute({ sql, args });
    res.json(rows.map(r => ({ ...r, tags: JSON.parse(r.tags || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const note = {
      id: uuidv4(),
      notebookId: req.body.notebookId || 'default',
      title: req.body.title || '제목 없는 노트',
      content: req.body.content || '',
      contentText: req.body.contentText || '',
      tags: JSON.stringify(req.body.tags || []),
      createdAt: now,
      updatedAt: now
    };
    await db.execute({
      sql: `INSERT INTO notes (id, notebookId, title, content, contentText, tags, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [note.id, note.notebookId, note.title, note.content, note.contentText, note.tags, note.createdAt, note.updatedAt]
    });
    res.json({ ...note, tags: JSON.parse(note.tags) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:id', async (req, res) => {
  try {
    const allowed = ['title', 'content', 'contentText', 'notebookId', 'tags'];
    const fields = [];
    const args = [];
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      fields.push(`${key} = ?`);
      args.push(key === 'tags' ? JSON.stringify(req.body[key]) : req.body[key]);
    }
    if (fields.length === 0) return res.status(400).json({ error: '변경 내용이 없습니다' });
    fields.push('updatedAt = ?');
    args.push(new Date().toISOString(), req.params.id);
    await db.execute({ sql: `UPDATE notes SET ${fields.join(', ')} WHERE id = ?`, args });
    const { rows } = await db.execute({ sql: 'SELECT * FROM notes WHERE id = ?', args: [req.params.id] });
    if (!rows[0]) return res.status(404).json({ error: '노트를 찾을 수 없습니다' });
    res.json({ ...rows[0], tags: JSON.parse(rows[0].tags || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM notes WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── 근태시스템 연동 ───────────────────────────────────────────────────

const DUALL_API = 'https://atdapi.duallmaster.com';

async function duallFetch(path, params = {}) {
  const token = process.env.DUALL_TOKEN;
  if (!token) throw new Error('DUALL_TOKEN이 설정되지 않았습니다.');
  const url = new URL(DUALL_API + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`근태시스템 오류 (${res.status})`);
  return res.json();
}

function calcTotalLeaveDays(hireDateStr) {
  if (!hireDateStr) return 15;
  const hire = new Date(hireDateStr);
  const now = new Date();
  const yearsWorked = (now - hire) / (365.25 * 24 * 60 * 60 * 1000);
  if (yearsWorked < 1) return Math.min(Math.floor(yearsWorked * 12), 11);
  return Math.min(15 + Math.floor((yearsWorked - 1) / 2), 25);
}

app.get('/api/employee-info/:empNo', async (req, res) => {
  try {
    const { empNo } = req.params;
    const year = new Date().getFullYear();

    const [employees, leaves, locations] = await Promise.all([
      duallFetch('/employee/all'),
      duallFetch('/leave/all', { from: `${year}-01-01`, to: `${year}-12-31` }),
      duallFetch('/location/all'),
    ]);

    const emp = employees.find(e => e.employee_number === empNo && e.active);
    if (!emp) return res.status(404).json({ error: '사원번호를 찾을 수 없습니다.' });

    const loc = locations.find(l => l.location_code === emp.main_location_code);
    const dept = loc ? loc.name : (emp.main_location_code || '');

    const annualLeaves = leaves.filter(l =>
      l.employee_number === empNo && l.display_name.includes('연차')
    );
    const usedDays = annualLeaves.reduce((s, l) => s + (Number(l.deduction_amount) || 0), 0);
    const totalDays = calcTotalLeaveDays(emp.date_of_employement);
    const remainingDays = Math.max(0, totalDays - usedDays);

    res.json({
      employee_number: emp.employee_number,
      name: emp.first_name,
      dept,
      position: emp.main_position_name || '',
      totalDays,
      usedDays: Math.round(usedDays * 10) / 10,
      remainingDays: Math.round(remainingDays * 10) / 10,
    });
  } catch (err) {
    console.error('[employee-info]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── 연차촉진 사용계획서 ──────────────────────────────────────────────

app.get('/annual-leave', (req, res) => {
  res.sendFile(path.join(__dirname, 'annual-leave-plan.html'));
});

app.get('/annual-leave-plan.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'annual-leave-plan.html'));
});

app.get('/annual-leave/submissions', (req, res) => {
  res.sendFile(path.join(__dirname, 'annual-leave-submissions.html'));
});

app.post('/api/leave-plans', async (req, res) => {
  try {
    const { emp_no, name, dept, title, dates, signature } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: '성명이 필요합니다' });
    const plan = {
      id: uuidv4(),
      emp_no: (emp_no || '').trim(),
      name: name.trim(),
      dept: (dept || '').trim(),
      title: (title || '').trim(),
      dates: JSON.stringify(dates || []),
      signature: signature || '',
      submittedAt: new Date().toISOString(),
    };
    await db.execute({
      sql: `INSERT INTO leave_plans (id, emp_no, name, dept, title, dates, signature, submittedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [plan.id, plan.emp_no, plan.name, plan.dept, plan.title, plan.dates, plan.signature, plan.submittedAt],
    });
    res.json({ id: plan.id, submittedAt: plan.submittedAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leave-plans', async (req, res) => {
  try {
    const { rows } = await db.execute('SELECT * FROM leave_plans ORDER BY submittedAt DESC');
    res.json(rows.map(r => ({ ...r, dates: JSON.parse(r.dates || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/leave-plans/:id', async (req, res) => {
  try {
    await db.execute({ sql: 'DELETE FROM leave_plans WHERE id = ?', args: [req.params.id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Production: React 정적 파일 서빙 ────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  });
}

// ── 서버 시작 ────────────────────────────────────────────────────────

initDb()
  .then(() => app.listen(PORT, () => console.log(`서버 실행 중: http://localhost:${PORT}`)))
  .catch(err => { console.error('DB 초기화 실패:', err); process.exit(1); });
