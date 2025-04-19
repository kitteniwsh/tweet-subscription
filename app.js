// project structure:
//
// .env
// app.js
// index.js

// .env (example)
// SUPABASE_URL=https://your.supabase.url
// SUPABASE_SERVICE=your-service-key
// SERVICE_WALLET=YourServiceWalletPublicKeyHere

// app.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// init Express
const app = express();
app.use(express.json());

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

// pricing thresholds (in lamports)
// 1 SOL = 1_000_000_000 lamports
const THRESHOLDS = [
  { amount: 1_000_000, tier: '2' },    // 0.001 SOL
  { amount: 5_000_000, tier: '3' }, // 0.005 SOL
  { amount: 10_000_000, tier: '4' }   // 0.01 SOL
];

app.post('/webhook', async (req, res) => {

  console.log("Recieved crao");
  console.log('🌟 webhook payload:', JSON.stringify(req.body, null, 2));
  try {
    const { nativeTransfers = [] } = req.body;
    
    for (const transfer of nativeTransfers) {
      console.log(transfer);
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

      // compute new expiry one month from now
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 1);
      const expiryISO = expiry.toISOString();

      // update user in Supabase by matching their public key
      const { data, error } = await supabase
        .from('users')
        .update({ tier: tierEntry.tier, subscription_expiry: expiryISO })
        .eq('pubkey', fromUserAccount);

      if (error) {
        console.error('supabase update error:', error);
      } else {
        console.log(`upgraded ${fromUserAccount} to '${tierEntry.tier}' until ${expiryISO}`);
      }
    }
    res.sendStatus(200);
  } catch (err) {
    console.error('webhook handler error:', err);
    res.status(500).send('error');
  }
});

module.exports = app;
