const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3002;

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
