const express = require('express');
const fetch = require('node-fetch');
const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

// ================= MANIFEST =================
app.get('/manifest.json', (req, res) => {
  res.json({
    id: "com.souhail.stremio",
    version: "1.0.0",
    name: "Souhail Premium",
    description: "Real-Debrid Torrent Streaming",
    resources: ["stream"],
    types: ["movie", "series"]
  });
});

// ================= STREAM =================
app.get('/stream/:type/:id.json', async (req, res) => {

  if (!RD_KEY) {
    return res.json({ streams: [] });
  }

  try {
    const torrentioUrl =
      `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${req.params.type}/${req.params.id}.json`;

    const response = await fetch(torrentioUrl);
    const data = await response.json();

    // 🔥 هنا الفينيصيون
    const streams = (data.streams || []).map(s => ({
      ...s,

      name: "🟢 SOUHAIL / RD",

      title: `
🎬 ${s.title?.split("\n")[0] || "Unknown title"}
📺 ${extract(s.title, /2160p|1080p|720p/) || "1080p"}
🎞️ ${extract(s.title, /H\.265|H\.264|x265|x264/) || "H.264"}
🔊 ${extract(s.title, /DDP5\.1|Atmos|AAC|AC3/) || "Audio"}
💾 ${extract(s.title, /\d+(\.\d+)?\s?(GB|MB)/) || "Size"}
🧑‍🔧 ${extract(s.title, /\d+\s+seeders?/i) || "Seeders"}
🌍 EN / AR
⚡ RD Cached
🔗 ${extract(s.title, /YTS|RARBG|thepiratebay/i) || "Torrent"}
      `.trim()
    }));

    res.json({ streams });

  } catch (err) {
    res.json({ streams: [] });
  }
});

// ================= INSTALL =================
app.get('/install', (req, res) => {
  const baseUrl = `https://${req.hostname}`;
  res.send(`
    <h2>Install Souhail Premium</h2>
    <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json">
      Install Addon
    </a>
    <p>${baseUrl}/manifest.json</p>
  `);
});

// ================= UTILS =================
function extract(text = "", regex) {
  const m = text.match(regex);
  return m ? m[0] : null;
}

// ================= START =================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Running on port ${PORT}`);
});
