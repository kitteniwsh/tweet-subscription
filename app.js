// app.js
const express = require('express');
const dotenv  = require('dotenv');
dotenv.config();

const app = express();

// parse JSON bodies for webhook
app.use(express.json());

// webhook endpoint – logs whatever Helius (or any) sends
app.post('/webhook', (req, res) => {
  console.log('🌟 webhook payload:', JSON.stringify(req.body, null, 2));
  res.status(200).send('ok');
});

// catch‑all for other routes
app.use((req, res) => {
  res.status(404).send('not found');
});

module.exports = app;
