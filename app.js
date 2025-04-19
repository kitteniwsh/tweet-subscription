import express from "express";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
    try {
      const { signature, amount, to } = req.body; // shape depends on provider
      console.log(`incoming payment of ${amount} lamports to ${to}`);
      // you can optionally verify signature or secret header here
  
      // now update Supabase: e.g., record the payment or bump tier
      const { data, error } = await supabase
        .from("payments")
        .insert([{ signature, amount, to, received_at: new Date().toISOString() }]);
  
      if (error) throw error;
  
      res.status(200).send({ status: "ok" });
    } catch (err) {
      console.error("webhook error:", err);
      res.status(500).send({ error: err.message });
    }
  });



const PORT = process.env.PORT || 3000;
