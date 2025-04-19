// project structure:
// .env
// app.js
// index.js

// .env (example)
// SUPABASE_URL=https://your.supabase.url
// SUPABASE_SERVICE=your-service-key
// SERVICE_WALLET=YourServiceWalletPublicKeyHere

// app.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// init Express
const app = express();
// parse JSON bodies
app.use(express.json());

// setup logging: write all POST request bodies to requests.log
const logStream = fs.createWriteStream(
  path.join(__dirname, 'requests.log'),
  { flags: 'a' }
);
app.use((req, res, next) => {
  if (req.method === 'POST') {
    // dump entire body as JSON string
    const entry = `[${new Date().toISOString()}] ${req.originalUrl}\n` +
                  JSON.stringify(req.body, null, 2) + '\n';
    logStream.write(entry);
    console.log(entry);  // also print to stdout for Railway logs
  }
  next();
});

// init Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE
);
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE in .env');
}

// your service's receiving wallet
const SERVICE_WALLET = process.env.SERVICE_WALLET;
if (!SERVICE_WALLET) {
  throw new Error('Missing SERVICE_WALLET in .env');
}

// pricing thresholds (in lamports) with numeric tiers matching smallint column
const THRESHOLDS = [
  { amount: 1_000_000, tierValue: 1, label: 'low' },    // 0.001 SOL
  { amount: 5_000_000, tierValue: 2, label: 'medium' }, // 0.005 SOL
  { amount: 10_000_000, tierValue: 3, label: 'high' }   // 0.01 SOL
];

app.post('/webhook', async (req, res) => {
  try {
    // support payloads where req.body is an array or single object
    const payloads = Array.isArray(req.body) ? req.body : [req.body];
    for (const item of payloads) {
      const nativeTransfers = item.nativeTransfers || [];
      for (const transfer of nativeTransfers) {
        const { amount, fromUserAccount, toUserAccount } = transfer;
        // only process payments into your service wallet
        if (toUserAccount !== SERVICE_WALLET) continue;

        // find the highest threshold <= amount
        const tierEntry = THRESHOLDS
          .filter(t => amount >= t.amount)
          .sort((a, b) => b.amount - a.amount)[0];

        if (!tierEntry) {
          console.log(`received ${amount} lamports from ${fromUserAccount} (below minimum)`);
          continue;
        }

        const { tierValue, label } = tierEntry;
        // compute new expiry one month from now
        const expiry = new Date();
        expiry.setMonth(expiry.getMonth() + 1);
        const expiryISO = expiry.toISOString();

        // update user in Supabase by matching their public key
        const { data, error } = await supabase
          .from('users')
          .update({ tier: tierValue, subscription_expiry: expiryISO })
          .eq('pubkey', fromUserAccount);

        if (error) {
          console.error(`supabase update error for ${fromUserAccount}:`, error);
        } else {
          console.log(`upgraded ${fromUserAccount} to tier ${tierValue} (${label}) until ${expiryISO}`);
        }
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('webhook handler error:', err);
    res.status(500).send('error');
  }
});

module.exports = app;

