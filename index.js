const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// 1. HEALTH CHECK - ضيفها أول حاجة
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        version: '10.0.0',
        addon: 'Souhail Torrent Master v10',
        package: 'souhail-torrent-master@10.0.0',
        realdebrid: RD_KEY ? 'configured' : 'not_configured',
        timestamp: new Date().toISOString(),
        endpoints: [
            '/manifest.json',
            '/stream/:type/:id.json',
            '/install',
            '/test',
            '/'
        ]
    });
});

// 2. MANIFEST
app.get('/manifest.json', (req, res) => {
    console.log('📄 Manifest requested - Version 10.0.0');
    
    res.json({
        "id": "org.souhail.torrent.master.v10",
        "version": "10.0.0",
        "name": "Souhail Torrent Master v10",
        "description": "Complete torrent information display with Real-Debrid",
        "logo": "https://cdn-icons-png.flaticon.com/512/3095/3095588.png",
        "background": "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c",
        "resources": ["stream"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"],
        "behaviorHints": {
            "configurable": true,
            "configurationRequired": false
        },
        "contactEmail": "souhail@torrent-master.com"
    });
});

// 3. STREAM
app.get('/stream/:type/:id.json', async (req, res) => {
    console.log(`🎬 Stream request: ${req.params.type}/${req.params.id}`);
    
    if (!RD_KEY) {
        return res.json({ streams: [] });
    }
    
    try {
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${req.params.type}/${req.params.id}.json`;
        console.log(`🔗 Fetching from: ${torrentioUrl}`);
        
        const response = await fetch(torrentioUrl);
        const data = await response.json();
        
        if (!data.streams) {
            return res.json({ streams: [] });
        }
        
        console.log(`✅ Found ${data.streams.length} streams`);
        
        const processedStreams = data.streams.map((stream, index) => {
            const originalTitle = stream.name || stream.title || `Stream ${index + 1}`;
            const isCached = stream.url && stream.url.includes('real-debrid.com');
            
            const info = analyzeTitle(originalTitle);
            const formattedTitle = createTitle(info, isCached);
            
            return {
                title: formattedTitle,
                url: stream.url,
                behaviorHints: stream.behaviorHints || {}
            };
        });
        
        res.json({ streams: processedStreams });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.json({ streams: [] });
    }
});

// 4. دوال المساعدة
function analyzeTitle(title) {
    return {
        cleanName: getCleanName(title),
        size: getSize(title) || 'Unknown',
        quality: getQuality(title),
        seeders: getSeeders(title),
        codec: getCodec(title),
        audio: getAudio(title),
        language: getLanguage(title),
        subs: getSubtitles(title),
        source: getSource(title),
        site: getSite(title),
        year: getYear(title)
    };
}

function getCleanName(title) {
    let clean = title
        .replace(/\[.*?\]/g, '')
        .replace(/\./g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/(\d+(\.\d+)?)\s*(GB|MB)/gi, '')
        .replace(/(\d+)\s*Seeds?/gi, '')
        .replace(/4K|1080p|720p|480p/gi, '')
        .replace(/x265|x264|HEVC|AV1/gi, '')
        .replace(/DDP5\.1|DTS-HD|TrueHD|AC3|AAC/gi, '')
        .replace(/BluRay|WEB-DL|WEBRip|HDTV|DVD/gi, '')
        .trim();
    
    return clean.substring(0, 60) || 'Movie/TV Show';
}

function getSize(title) {
    const match = title.match(/(\d+(\.\d+)?)\s*(GB|MB)/i);
    return match ? match[0] : null;
}

function getQuality(title) {
    if (title.match(/4K/i)) return '4K';
    if (title.match(/1080p/i)) return '1080p';
    if (title.match(/720p/i)) return '720p';
    return '1080p';
}

function getSeeders(title) {
    const match = title.match(/(\d+)\s*Seeds?/i);
    return match ? parseInt(match[1]) : 0;
}

function getCodec(title) {
    return title.match(/x265|HEVC/i) ? 'HEVC' : 'H.264';
}

function getAudio(title) {
    return title.match(/DTS-HD/i) ? 'DTS-HD' : 
           title.match(/AC3/i) ? 'AC3' : 'AAC';
}

function getLanguage(title) {
    return title.match(/Arabic/i) ? 'Arabic' : 
           title.match(/French/i) ? 'French' : 'English';
}

function getSubtitles(title) {
    return title.match(/AR-Subs/i) ? 'AR' : 
           title.match(/FR-Subs/i) ? 'FR' : 'EN';
}

function getSource(title) {
    return title.match(/BluRay/i) ? 'BluRay' : 'WEB-DL';
}

function getSite(title) {
    const match = title.match(/\[(.*?)\]/);
    return match ? match[1] : 'Torrent';
}

function getYear(title) {
    const match = title.match(/(19|20)\d{2}/);
    return match ? match[0] : '';
}

function createTitle(info, isCached) {
    const lines = [];
    
    lines.push(`🎬 ${info.cleanName}${info.year ? ` (${info.year})` : ''}`);
    lines.push(`💾 ${info.size}  |  📺 ${info.quality}  |  👤 ${info.seeders || '?'}`);
    lines.push(`🎞️ ${info.codec}  |  🔊 ${info.audio}  |  📦 ${info.source}`);
    lines.push(`🌍 ${info.language}  |  📝 ${info.subs}  |  🏷️ ${info.site}`);
    lines.push(isCached ? '✅ REAL-DEBRID CACHED' : '🔗 TORRENT STREAM');
    
    return lines.join('\n');
}

// 5. INSTALL PAGE
app.get('/install', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Souhail Torrent Master v10 - Install</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    text-align: center;
                    max-width: 600px;
                    margin: 0 auto;
                }
                .version {
                    background: #28a745;
                    color: white;
                    padding: 5px 10px;
                    border-radius: 3px;
                    font-weight: bold;
                }
                .install-btn {
                    display: inline-block;
                    background: #007bff;
                    color: white;
                    padding: 15px 30px;
                    border-radius: 5px;
                    text-decoration: none;
                    font-size: 18px;
                    margin: 20px 0;
                }
                .url-box {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    text-align: left;
                }
                code {
                    background: #e9ecef;
                    padding: 5px;
                    border-radius: 3px;
                    font-family: monospace;
                }
            </style>
        </head>
        <body>
            <h1>🎬 Souhail Torrent Master</h1>
            <p>Version: <span class="version">10.0.0</span></p>
            <p>Addon ID: <code>org.souhail.torrent.master.v10</code></p>
            
            <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json" 
               class="install-btn">
                📲 Install Now
            </a>
            
            <div class="url-box">
                <p><strong>Manual Installation:</strong></p>
                <p>Copy this URL and paste in Stremio:</p>
                <code>https://${req.hostname}/manifest.json</code>
            </div>
            
            <div style="margin-top: 30px;">
                <h3>✅ Status Check:</h3>
                <ul style="text-align: left;">
                    <li><a href="/health">/health</a> - Server status</li>
                    <li><a href="/manifest.json">/manifest.json</a> - Addon manifest</li>
                    <li><a href="/test">/test</a> - Test page</li>
                    <li><a href="/stream/movie/tt1375666.json">/stream/movie/tt1375666.json</a> - Test stream</li>
                </ul>
            </div>
            
            <p style="margin-top: 30px; color: #666;">
                Real-Debrid Status: <strong>${RD_KEY ? '✅ Configured' : '❌ Not Configured'}</strong>
            </p>
        </body>
        </html>
    `);
});

// 6. TEST PAGE
app.get('/test', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test - Souhail v10</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                .example { background: #f8f9fa; padding: 15px; border-radius: 5px; }
                pre { white-space: pre-wrap; font-family: monospace; }
                a { color: #007bff; text-decoration: none; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h1>🧪 Test Page - v10.0.0</h1>
            <p><a href="/install">← Back to Install</a></p>
            
            <div class="example">
                <h3>📋 Expected Output:</h3>
                <pre>
🎬 Inception (2010)
💾 1.8 GB  |  📺 1080p  |  👤 1500
🎞️ H.264  |  🔊 DTS-HD  |  📦 BluRay
🌍 English  |  📝 EN  |  🏷️ YTS
✅ REAL-DEBRID CACHED</pre>
            </div>
            
            <h3>🔗 Test Links:</h3>
            <ul>
                <li><a href="/manifest.json" target="_blank">manifest.json</a></li>
                <li><a href="/stream/movie/tt1375666.json" target="_blank">Inception (tt1375666)</a></li>
                <li><a href="/stream/movie/tt0816692.json" target="_blank">Interstellar (tt0816692)</a></li>
                <li><a href="/stream/movie/tt0468569.json" target="_blank">The Dark Knight (tt0468569)</a></li>
                <li><a href="/stream/series/tt0944947.json" target="_blank">Game of Thrones (tt0944947)</a></li>
            </ul>
            
            <h3>📊 Server Info:</h3>
            <ul>
                <li><a href="/health" target="_blank">/health</a> - Health check</li>
                <li>Package: souhail-torrent-master@10.0.0</li>
                <li>ID: org.souhail.torrent.master.v10</li>
                <li>Real-Debrid: ${RD_KEY ? '✅' : '❌'}</li>
            </ul>
        </body>
        </html>
    `);
});

// 7. HOME PAGE - Redirect to install
app.get('/', (req, res) => {
    res.redirect('/install');
});

// 8. ERROR HANDLER
app.use((req, res) => {
    res.status(404).send(`
        <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>404 - Page Not Found</h1>
            <p>The requested URL ${req.url} was not found.</p>
            <p><a href="/">Go to Home</a> | <a href="/install">Go to Install</a></p>
        </body>
        </html>
    `);
});

// 9. START SERVER
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ============================================
    🚀 SOUHAIL TORRENT MASTER v10.0.0
    ============================================
    📍 Port: ${PORT}
    🌐 URL: http://localhost:${PORT}
    🔗 Install Page: /install
    📊 Health Check: /health
    🧪 Test Page: /test
    🆔 Addon ID: org.souhail.torrent.master.v10
    📦 Package: souhail-torrent-master@10.0.0
    ============================================
    `);
    
    console.log('✅ Endpoints available:');
    console.log('  - GET /health');
    console.log('  - GET /manifest.json');
    console.log('  - GET /install');
    console.log('  - GET /test');
    console.log('  - GET /stream/:type/:id.json');
});
