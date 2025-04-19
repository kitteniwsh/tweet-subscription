// index.js
const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`listening on port ${PORT} – POST your webhook to http://localhost:${PORT}/webhook`);
});
