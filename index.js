const express = require('express');
const fetch = require('node-fetch');
const app = express();

// =====================
// CONFIG
// =====================
const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

console.log(`Starting with PORT: ${PORT}, RD_KEY: ${RD_KEY ? 'yes' : 'no'}`);

// =====================
// STREAM SORTING (FINITION)
// =====================
function sortStreams(streams) {
  return streams.sort((a, b) => {

    // 1️⃣ RD Cached فوق
    const aCached = a.title?.includes('RD Cached') ? 1 : 0;
    const bCached = b.title?.includes('RD Cached') ? 1 : 0;
    if (aCached !== bCached) return bCached - aCached;

    // 2️⃣ الجودة
    const rank = (t = '') => {
      if (t.includes('2160') || t.includes('4K')) return 4;
      if (t.includes('1080')) return 3;
      if (t.includes('720')) return 2;
      return 1;
    };
    const qA = rank(a.title);
    const qB = rank(b.title);
    if (qA !== qB) return qB - qA;

    // 3️⃣ الحجم
    const sizeA = a.size || 0;
    const sizeB = b.size || 0;
    if (sizeA !== sizeB) return sizeB - sizeA;

    return 0;
  });
}

// =====================
// MANIFEST
// =====================
app.get('/manifest.json', (req, res) => {
  res.json({
    id: "com.souhail.rd.premium.v2",
    version: "2.0.0",
    name: "SOUHAIL / RD",
    description: "Real-Debrid Premium Streams",
    resources: ["stream"],
    types: ["movie", "series", "anime"],
    idPrefixes: ["tt"]
  });
});

// =====================
// STREAM
// =====================
app.get('/stream/:type/:id.json', async (req, res) => {
  console.log(`🎬 Stream: ${req.params.type}/${req.params.id}`);

  if (!RD_KEY) {
    console.log('❌ No RD key');
    return res.json({ streams: [] });
  }

  try {
    const torrentioUrl =
      `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${req.params.type}/${req.params.id}.json`;

    console.log(`🔗 Fetching: ${torrentioUrl}`);

    const response = await fetch(torrentioUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const data = await response.json();

    if (data.streams && data.streams.length) {
      data.streams = sortStreams(data.streams);
    }

    console.log(`✅ Streams returned: ${data.streams?.length || 0}`);
    res.json(data);

  } catch (err) {
    console.log('❌ Error:', err.message);
    res.json({ streams: [] });
  }
});

// =====================
// INSTALL PAGE
// =====================
app.get('/install', (req, res) => {
  const baseUrl = `https://${req.hostname}`;
  res.send(`
    <h2>Install SOUHAIL / RD</h2>
    <p><a href="${baseUrl}/manifest.json">Install Addon</a></p>
    <p><a href="${baseUrl}/stream/movie/tt1375666.json">Test Stream</a></p>
  `);
});

app.get('/', (req, res) => {
  res.redirect('/install');
});

// =====================
// START SERVER
// =====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
