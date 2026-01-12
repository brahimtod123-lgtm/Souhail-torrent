const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

// مهم: إضافة header لـCORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 1. MANIFEST - تأكد من الإعدادات
app.get('/manifest.json', (req, res) => {
    res.json({
        "id": "com.souhail.streamer.v2",  // غير الـID عشان يتعرف كإضافة جديدة
        "version": "2.0.0",  // زد رقم الإصدار
        "name": "Souhail Premium",
        "description": "Real-Debrid Torrent Streaming with Advanced Sorting",
        "logo": "https://cdn-icons-png.flaticon.com/512/3095/3095588.png",
        "background": "https://images.unsplash.com/photo-1536440136628-849c177e76a1",
        "resources": ["stream"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"],
        "catalogs": []
    });
});

// 2. STREAM - نسخة مبسطة أولاً للتجربة
app.get('/stream/:type/:id.json', async (req, res) => {
    console.log(`📥 Request: ${req.params.type}/${req.params.id}`);
    
    if (!RD_KEY) {
        return res.json({ 
            streams: [],
            error: "Real-Debrid API not configured"
        });
    }
    
    try {
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${req.params.type}/${req.params.id}.json`;
        console.log(`🔗 Fetching: ${torrentioUrl}`);
        
        const response = await fetch(torrentioUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 10000
        });
        
        if (!response.ok) {
            throw new Error(`Torrentio error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Found ${data.streams?.length || 0} streams`);
        
        // إذا ماكانش فيه streams، رجع array فارغ
        if (!data.streams || data.streams.length === 0) {
            return res.json({ streams: [] });
        }
        
        // معالجة بسيطة أولاً للتجربة
        const processedStreams = data.streams.map((stream, index) => {
            const title = stream.name || stream.title || `Stream ${index + 1}`;
            const isCached = stream.url && stream.url.includes('real-debrid.com');
            
            // تنسيق مبسط للتجربة
            const formattedTitle = isCached 
                ? `✅ RD Cached • ${title}`
                : `🔗 Torrent • ${title}`;
            
            return {
                title: formattedTitle,
                url: stream.url,
                behaviorHints: stream.behaviorHints || {}
            };
        });
        
        res.json({ streams: processedStreams });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.json({ 
            streams: [],
            error: error.message
        });
    }
});

// 3. صفحة تجريبية
app.get('/test/:imdb?', async (req, res) => {
    const imdbId = req.params.imdb || 'tt1375666'; // Inception by default
    
    try {
        const testUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/movie/${imdbId}.json`;
        const response = await fetch(testUrl);
        const data = await response.json();
        
        res.send(`
            <h1>🧪 Test Page</h1>
            <p>Testing IMDB: ${imdbId}</p>
            <p>Real-Debrid: ${RD_KEY ? '✅ Configured' : '❌ Missing'}</p>
            <hr>
            <h3>Raw Torrentio Response:</h3>
            <pre>${JSON.stringify(data, null, 2)}</pre>
            <hr>
            <h3>Test Links:</h3>
            <ul>
                <li><a href="/manifest.json">manifest.json</a></li>
                <li><a href="/stream/movie/${imdbId}.json">/stream/movie/${imdbId}.json</a></li>
                <li><a href="/stream/movie/tt0816692.json">Interstellar</a></li>
                <li><a href="/stream/movie/tt0468569.json">The Dark Knight</a></li>
            </ul>
        `);
    } catch (error) {
        res.send(`Error: ${error.message}`);
    }
});

// 4. Homepage
app.get('/', (req, res) => {
    res.send(`
        <h1>🎬 souhail-stremio v2</h1>
        <p><strong>Status:</strong> ${RD_KEY ? '✅ Ready' : '❌ Needs RD Key'}</p>
        <p><strong>Install URL for Stremio:</strong></p>
        <code>https://${req.hostname}/manifest.json</code>
        <hr>
        <h3>Steps:</h3>
        <ol>
            <li>Delete old addon from Stremio</li>
            <li>Install new addon with above URL</li>
            <li>Test with: <a href="/test">Test Page</a></li>
        </ol>
    `);
});

// 5. Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '2.0.0',
        realdebrid: RD_KEY ? 'configured' : 'missing',
        timestamp: new Date().toISOString()
    });
});

// 6. Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ========================================
    🚀 SOUHAIL-STREMIO v2
    ========================================
    📍 Port: ${PORT}
    🌐 URL: https://${process.env.RAILWAY_STATIC_URL || `localhost:${PORT}`}
    🔗 Install URL: /manifest.json
    🔑 Real-Debrid: ${RD_KEY ? '✅ Ready' : '❌ NEEDS API KEY'}
    ========================================
    `);
    
    if (!RD_KEY) {
        console.log(`
    ⚠️  IMPORTANT: Add REAL_DEBRID_API in Railway Variables!
    ⚠️  Get key from: https://real-debrid.com/apitoken
        `);
    }
});
