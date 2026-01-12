const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

// CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// 1. MANIFEST
app.get('/manifest.json', (req, res) => {
    res.json({
        "id": "com.souhail.streamer.final",
        "version": "1.0.0",
        "name": "Souhail Premium",
        "description": "Real-Debrid Torrent Streaming",
        "logo": "https://cdn-icons-png.flaticon.com/512/3095/3095588.png",
        "resources": ["stream"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"]
    });
});

// 2. STREAM - النسخة النهائية
app.get('/stream/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    
    if (!RD_KEY) {
        return res.json({ streams: [] });
    }
    
    try {
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${type}/${id}.json`;
        const response = await fetch(torrentioUrl);
        const data = await response.json();
        
        if (!data.streams || data.streams.length === 0) {
            return res.json({ streams: [] });
        }
        
        const processedStreams = data.streams.map((stream) => {
            const originalTitle = stream.name || stream.title || '';
            const isCached = stream.url && stream.url.includes('real-debrid.com');
            
            // استخراج منظم بدون عشوائية
            const info = extractInfoSystematically(originalTitle);
            
            return {
                title: formatTitleSystematically(info, isCached),
                url: stream.url,
                behaviorHints: stream.behaviorHints || {},
                _size: info.sizeInBytes || 0,
                _quality: info.qualityValue || 0,
                _seeders: info.seeders || 0,
                _isCached: isCached
            };
        });
        
        // ترتيب ثابت
        const sortedStreams = processedStreams.sort((a, b) => {
            if (b._isCached !== a._isCached) return b._isCached ? 1 : -1;
            if (b._size !== a._size) return b._size - a._size;
            if (b._quality !== a._quality) return b._quality - a._quality;
            return b._seeders - a._seeders;
        });
        
        const finalStreams = sortedStreams.map(stream => ({
            title: stream.title,
            url: stream.url,
            behaviorHints: stream.behaviorHints
        }));
        
        res.json({ streams: finalStreams });
        
    } catch (error) {
        res.json({ streams: [] });
    }
});

// 3. استخراج منظم بشكل منهجي
function extractInfoSystematically(title) {
    const info = {
        cleanTitle: '',
        size: 'Unknown',
        sizeInBytes: 0,
        quality: '1080p',
        qualityValue: 3,
        seeders: 0,
        codec: 'H.264',
        audio: 'AC3',
        language: 'English',
        subs: 'EN'
    };
    
    if (!title || title.trim() === '') return info;
    
    // نسخة للعمل عليها
    let text = title.toLowerCase();
    
    // === 1. الحجم أولاً (الأكثر وضوحاً) ===
    const sizePatterns = [
        /(\d+(\.\d+)?)\s*(gb|gib)/,
        /(\d+(\.\d+)?)\s*(mb|mib)/
    ];
    
    for (const pattern of sizePatterns) {
        const match = text.match(pattern);
        if (match) {
            const num = parseFloat(match[1]);
            const unit = match[3].toLowerCase();
            info.size = `${num} ${unit.includes('g') ? 'GB' : 'MB'}`;
            info.sizeInBytes = unit.includes('g') ? num * 1073741824 : num * 1048576;
            text = text.replace(match[0], ' ');
            break;
        }
    }
    
    // === 2. الجودة ثانياً ===
    const qualityPatterns = [
        ['4k|uhd', '4K', 5],
        ['2160p', '2160p', 4],
        ['1080p|fhd|fullhd', '1080p', 3],
        ['720p|hd', '720p', 2],
        ['480p|sd', '480p', 1]
    ];
    
    for (const [pattern, quality, value] of qualityPatterns) {
        if (text.match(new RegExp(pattern))) {
            info.quality = quality;
            info.qualityValue = value;
            text = text.replace(new RegExp(pattern, 'g'), ' ');
            break;
        }
    }
    
    // === 3. السيدرز ===
    const seedersMatch = text.match(/(\d+)\s*seeds?/) || text.match(/seeds?:?\s*(\d+)/);
    if (seedersMatch) {
        info.seeders = parseInt(seedersMatch[1]);
        text = text.replace(seedersMatch[0], ' ');
    }
    
    // === 4. الكودك ===
    if (text.match(/x265|hevc/)) {
        info.codec = 'HEVC';
        text = text.replace(/x265|hevc/g, ' ');
    } else if (text.match(/av1/)) {
        info.codec = 'AV1';
        text = text.replace(/av1/g, ' ');
    } else if (text.match(/vp9/)) {
        info.codec = 'VP9';
        text = text.replace(/vp9/g, ' ');
    } else if (text.match(/x264/)) {
        info.codec = 'H.264';
        text = text.replace(/x264/g, ' ');
    }
    
    // === 5. الصوت ===
    const audioPatterns = [
        ['ddp5\\.1|dolby digital plus', 'DDP5.1'],
        ['dts-hd|dts-hd ma', 'DTS-HD MA'],
        ['truehd', 'TrueHD'],
        ['ac3|dolby digital', 'AC3'],
        ['aac', 'AAC']
    ];
    
    for (const [pattern, audio] of audioPatterns) {
        if (text.match(new RegExp(pattern))) {
            info.audio = audio;
            text = text.replace(new RegExp(pattern, 'g'), ' ');
            break;
        }
    }
    
    // === 6. اللغة ===
    if (text.match(/arabic|ar|arabe/)) {
        info.language = 'Arabic';
        text = text.replace(/arabic|ar|arabe/g, ' ');
    } else if (text.match(/french|fr|français/)) {
        info.language = 'French';
        text = text.replace(/french|fr|français/g, ' ');
    } else if (text.match(/spanish|es|español/)) {
        info.language = 'Spanish';
        text = text.replace(/spanish|es|español/g, ' ');
    } else if (text.match(/multi/)) {
        info.language = 'Multi';
        text = text.replace(/multi/g, ' ');
    }
    
    // === 7. الترجمة ===
    if (text.match(/arabic subs|ar-subs/)) {
        info.subs = 'AR';
        text = text.replace(/arabic subs|ar-subs/g, ' ');
    } else if (text.match(/french subs|fr-subs/)) {
        info.subs = 'FR';
        text = text.replace(/french subs|fr-subs/g, ' ');
    } else if (text.match(/english subs|en-subs/)) {
        info.subs = 'EN';
        text = text.replace(/english subs|en-subs/g, ' ');
    } else if (text.match(/multi subs/)) {
        info.subs = 'Multi';
        text = text.replace(/multi subs/g, ' ');
    }
    
    // === 8. تنظيف العنوان ===
    info.cleanTitle = cleanTitleProperly(title);
    
    return info;
}

// 4. تنظيف العنوان بشكل صحيح
function cleanTitleProperly(title) {
    if (!title) return '';
    
    // قائمة الكلمات لإزالتها
    const wordsToRemove = [
        // الجودة
        '4k', 'uhd', '2160p', '1080p', 'fhd', 'fullhd', '720p', 'hd', '480p', 'sd',
        // الحجم
        'gb', 'mb', 'gib', 'mib',
        // السيدرز
        'seeders', 'seeds', 'seed',
        // الكودك
        'x265', 'hevc', 'av1', 'vp9', 'x264', 'h264', 'h.264',
        // الصوت
        'ddp5.1', 'dolby digital plus', 'dts-hd', 'dts-hd ma', 'truehd', 'ac3', 'dolby digital', 'aac',
        // الترميز
        'bluray', 'blu-ray', 'bdremux', 'remux', 'web-dl', 'webdl', 'webrip', 'hdtv', 'dvdrip', 'brrip',
        // أخرى
        'xvid', 'divx', 'mp4', 'mkv', 'avi'
    ];
    
    let cleaned = title.toLowerCase();
    
    // إزالة الكلمات
    wordsToRemove.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        cleaned = cleaned.replace(regex, '');
    });
    
    // إزالة الأرقام التي تتبعها GB/MB
    cleaned = cleaned.replace(/\d+(\.\d+)?\s*(gb|mb|gib|mib)/gi, '');
    
    // إزالة الأرقام التي تتبعها Seeders
    cleaned = cleaned.replace(/\d+\s*seeds?/gi, '');
    
    // إزالة الأقواس والمحتويات
    cleaned = cleaned.replace(/\[.*?\]/g, '');
    cleaned = cleaned.replace(/\(.*?\)/g, '');
    
    // تنظيف النهائي
    cleaned = cleaned
        .replace(/\./g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    
    // أخذ أول 50 حرف وإضافة ... إذا كان طويل
    if (cleaned.length > 50) {
        cleaned = cleaned.substring(0, 47) + '...';
    }
    
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// 5. تنسيق العنوان بشكل منهجي
function formatTitleSystematically(info, isCached) {
    const lines = [];
    
    // الخط 1: العنوان النظيف أو بديل
    if (info.cleanTitle && info.cleanTitle.length > 5) {
        lines.push(`💎🎬 ${info.cleanTitle}`);
    } else {
        lines.push(`💎🎬 Media Stream`);
    }
    
    // الخط 2: الحجم (مطلوب)
    lines.push(`💎💾 ${info.size}`);
    
    // الخط 3: الجودة (مطلوب)
    lines.push(`💎📺 ${info.quality}`);
    
    // الخط 4: السيدرز
    lines.push(`💎🧑‍🔧 ${info.seeders > 0 ? info.seeders + ' Seeders' : '?'}`);
    
    // الخط 5: الكودك
    lines.push(`💎🎞️ ${info.codec}`);
    
    // الخط 6: الصوت
    lines.push(`💎🎧 ${info.audio}`);
    
    // الخط 7: اللغة
    lines.push(`💎🔊 ${info.language}`);
    
    // الخط 8: الترجمة
    lines.push(`💎🌐 ${info.subs}`);
    
    // الخط 9: المصدر
    lines.push(isCached ? '💎🧲 RD Cached' : '💎📡 Torrent');
    
    return lines.join('\n');
}

// 6. صفحة Install
app.get('/install', (req, res) => {
    res.send(`
        <html>
        <head><title>Install Souhail Addon</title></head>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>📲 Install Souhail Addon</h1>
            <p>Real-Debrid streaming with systematic details</p>
            
            <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json" 
               style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; font-size: 18px; margin: 20px 0;">
                📲 Click to Install
            </a>
            
            <p>Or copy this URL to Stremio:</p>
            <code style="background: #f4f4f4; padding: 10px; display: block; margin: 10px 0;">
                https://${req.hostname}/manifest.json
            </code>
            
            <p><a href="/">← Back to Home</a></p>
        </body>
        </html>
    `);
});

// 7. الصفحة الرئيسية
app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>Souhail Stremio</title></head>
        <body style="font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h1>🎬 Souhail Stremio Addon</h1>
            <p><a href="/install" style="color: #28a745; font-weight: bold;">📲 Install Addon</a></p>
            
            <h3>📋 Systematic Output Example:</h3>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-size: 14px; line-height: 1.5;">
💎🎬 Inception 2010
💎💾 1.8 GB
💎📺 1080p
💎🧑‍🔧 1500 Seeders
💎🎞️ H.264
💎🎧 DTS-HD
💎🔊 English
💎🌐 EN
💎🧲 RD Cached</pre>
            
            <h3>🔗 Test Links:</h3>
            <ul>
                <li><a href="/stream/movie/tt1375666.json">Inception</a></li>
                <li><a href="/stream/movie/tt0816692.json">Interstellar</a></li>
                <li><a href="/stream/movie/tt0468569.json">The Dark Knight</a></li>
            </ul>
            
            <p><strong>Status:</strong> <span style="color: ${RD_KEY ? 'green' : 'red'}">
                ${RD_KEY ? '✅ Ready' : '❌ Needs Real-Debrid API Key'}
            </span></p>
        </body>
        </html>
    `);
});

// 8. Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        version: '1.0.0',
        systematic_extraction: true,
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
    ========================================
    🎬 SOUHAIL-STREMIO (SYSTEMATIC VERSION)
    ========================================
    📍 Port: ${PORT}
    🌐 URL: http://localhost:${PORT}
    🔗 Install: /install
    📋 Format: Systematic extraction
    ========================================
    `);
});
