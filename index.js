// index.js
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 server up on http://localhost:${PORT}/webhook`);
});
