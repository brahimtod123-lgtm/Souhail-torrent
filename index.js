const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// 1. REAL-DEBRED API من Railway variables
const RD_API = process.env.REAL_DEBRID_API;

// 2. MANIFEST ديال Stremio
app.get('/manifest.json', (req, res) => {
    res.json({
        "id": "com.souhail.stremio",
        "version": "1.0.0",
        "name": "Souhail Streamer",
        "description": "Real-Debrid Torrent Streaming",
        "resources": ["stream"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"]
    });
});

// 3. REDIRECT لـ TORRENTIO
app.get('/stream/:type/:id.json', (req, res) => {
    // مثال: /stream/movie/tt1234567.json
    const { type, id } = req.params;
    
    if (!RD_API) {
        return res.json({ streams: [] });
    }
    
    // توجيه مباشر لـTorrentio مع Real-Debrid
    const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_API}/stream/${type}/${id}.json`;
    
    // إعادة التوجيه
    res.redirect(torrentioUrl);
});

// 4. صفحة البداية
app.get('/', (req, res) => {
    res.send(`
        <h1>souhail-stremio ✅</h1>
        <p>Stremio Addon with Real-Debrid</p>
        <p><strong>Install URL:</strong> <code>http://localhost:${PORT}/manifest.json</code></p>
        <p><strong>Real-Debrid:</strong> ${RD_API ? '✅ Configured' : '❌ Not Configured'}</p>
    `);
});

// 5. بدء السيرفر
app.listen(PORT, () => {
    console.log(`
    ================================
    souhail-stremio
    ================================
    Port: ${PORT}
    URL: http://localhost:${PORT}
    ================================
    `);
});
