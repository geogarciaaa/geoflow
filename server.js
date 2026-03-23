require('dotenv').config();
const express = require('express');
const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  BUSINESS_NAME = 'GeoFlow Demo',
  AUTO_TEXT = "Hey, this is GeoFlow Demo — sorry we missed your call! We're helping another customer right now. Reply here with your name and what you need and we'll get back to you ASAP 🔨",
  AUTO_REPLY = "Got it! Thanks for reaching out to GeoFlow Demo. We got your message and will follow up very soon.",
  PORT = 3030,
} = process.env;

const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
const LEADS_FILE = path.join(__dirname, 'leads.json');

// ── LEADS STORE ───────────────────────────────────────────────────────────
function loadLeads() {
  try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch { return []; }
}
function saveLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
}
function addLead(lead) {
  const leads = loadLeads();
  const existing = leads.find(l => l.phone === lead.phone);
  if (existing) {
    if (lead.message) existing.messages = [...(existing.messages||[]), lead.message];
    existing.updatedAt = new Date().toISOString();
  } else {
    leads.unshift({ ...lead, id: Date.now(), createdAt: new Date().toISOString(), messages: lead.message ? [lead.message] : [] });
  }
  saveLeads(leads);
}

const repliedNumbers = new Set();
const recentlyTexted = new Map();

function shouldText(number) {
  const last = recentlyTexted.get(number);
  const now = Date.now();
  if (!last || now - last > 10 * 60 * 1000) {
    recentlyTexted.set(number, now);
    return true;
  }
  return false;
}

// ── VOICE WEBHOOK ─────────────────────────────────────────────────────────
app.post('/voice', async (req, res) => {
  const from = req.body.From || '';
  const twiml = new twilio.twiml.VoiceResponse();

  if (from && shouldText(from)) {
    try {
      await client.messages.create({ body: AUTO_TEXT, from: TWILIO_PHONE_NUMBER, to: from });
      console.log(`[CALL] Auto-text sent → ${from}`);
      addLead({ phone: from, source: 'missed_call', status: 'texted' });
    } catch (err) {
      console.error(`[CALL] SMS failed: ${err.message}`);
      addLead({ phone: from, source: 'missed_call', status: 'text_failed' });
    }
  }

  twiml.say({ voice: 'alice' }, `Hi, you've reached ${BUSINESS_NAME}. Sorry we missed your call! Please text us what you need and we'll get right back to you.`);
  twiml.hangup();
  res.type('text/xml').send(twiml.toString());
});

// ── SMS WEBHOOK ───────────────────────────────────────────────────────────
app.post('/sms', async (req, res) => {
  const from = req.body.From || '';
  const body = req.body.Body || '';
  const twiml = new twilio.twiml.MessagingResponse();

  console.log(`[SMS] From ${from}: ${body}`);
  addLead({ phone: from, source: 'sms', status: 'replied', message: body });

  if (from && !repliedNumbers.has(from)) {
    twiml.message(AUTO_REPLY);
    repliedNumbers.add(from);
  }

  res.type('text/xml').send(twiml.toString());
});

// ── DASHBOARD ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  const leads = loadLeads();
  const rows = leads.map(l => {
    const msgs = (l.messages || []).map(m => `<div class="msg">💬 ${m}</div>`).join('');
    const statusColor = { texted: '#22c55e', replied: '#3b82f6', text_failed: '#ef4444' }[l.status] || '#888';
    return `
      <tr>
        <td>${l.phone}</td>
        <td><span class="badge" style="background:${statusColor}">${l.status}</span></td>
        <td>${l.source === 'missed_call' ? '📞 Missed Call' : '💬 Inbound SMS'}</td>
        <td class="msgs">${msgs || '<span class="none">—</span>'}</td>
        <td>${new Date(l.createdAt).toLocaleString()}</td>
      </tr>`;
  }).join('');

  res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${BUSINESS_NAME} — Leads</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    header { background: #1e293b; border-bottom: 1px solid #334155; padding: 20px 32px; display: flex; align-items: center; gap: 16px; }
    header h1 { font-size: 1.4rem; font-weight: 700; }
    header .logo { font-size: 1.8rem; }
    .stats { display: flex; gap: 16px; padding: 24px 32px; flex-wrap: wrap; }
    .stat { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px 24px; min-width: 140px; }
    .stat .num { font-size: 2rem; font-weight: 800; color: #38bdf8; }
    .stat .label { font-size: 0.8rem; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    .table-wrap { padding: 0 32px 32px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 12px; overflow: hidden; border: 1px solid #334155; }
    th { background: #0f172a; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 16px; text-align: left; }
    td { padding: 14px 16px; border-top: 1px solid #334155; font-size: 0.9rem; vertical-align: top; }
    tr:hover td { background: #263548; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 600; color: #fff; }
    .msg { background: #0f172a; border-radius: 6px; padding: 6px 10px; margin-top: 4px; font-size: 0.85rem; color: #cbd5e1; }
    .none { color: #475569; font-style: italic; }
    .empty { text-align: center; padding: 48px; color: #475569; }
    .refresh { margin-left: auto; background: #3b82f6; color: #fff; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-size: 0.85rem; }
    .refresh:hover { background: #2563eb; }
  </style>
  <script>setTimeout(()=>location.reload(), 15000)</script>
</head>
<body>
  <header>
    <span class="logo">🦞</span>
    <h1>${BUSINESS_NAME} — Lead Dashboard</h1>
    <button class="refresh" onclick="location.reload()">↻ Refresh</button>
  </header>
  <div class="stats">
    <div class="stat"><div class="num">${leads.length}</div><div class="label">Total Leads</div></div>
    <div class="stat"><div class="num">${leads.filter(l=>l.source==='missed_call').length}</div><div class="label">Missed Calls</div></div>
    <div class="stat"><div class="num">${leads.filter(l=>l.messages&&l.messages.length>0).length}</div><div class="label">Replied</div></div>
    <div class="stat"><div class="num">${leads.filter(l=>l.createdAt>new Date(Date.now()-86400000).toISOString()).length}</div><div class="label">Today</div></div>
  </div>
  <div class="table-wrap">
    ${leads.length === 0
      ? '<div class="empty">No leads yet. Call or text the demo number to get started.</div>'
      : `<table>
          <thead><tr><th>Phone</th><th>Status</th><th>Source</th><th>Messages</th><th>Time</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
    }
  </div>
</body>
</html>`);
});

app.get('/api/leads', (req, res) => res.json(loadLeads()));

app.listen(PORT, () => {
  console.log(`🟢 ${BUSINESS_NAME} running on port ${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}`);
  console.log(`   Voice:     POST /voice`);
  console.log(`   SMS:       POST /sms`);
});
