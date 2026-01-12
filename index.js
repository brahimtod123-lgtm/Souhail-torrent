const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// MANIFEST
app.get('/manifest.json', (req, res) => {
    res.json({
        "id": "com.souhail.streamer.clean",
        "version": "1.0.0",
        "name": "Souhail Premium",
        "description": "Real-Debrid Torrent Streaming",
        "logo": "https://cdn-icons-png.flaticon.com/512/3095/3095588.png",
        "resources": ["stream"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"]
    });
});

// STREAM
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
            const info = extractCleanInfo(originalTitle);
            const isCached = stream.url && stream.url.includes('real-debrid.com');
            
            return {
                title: formatOnePerLine(info, isCached, originalTitle),
                url: stream.url,
                behaviorHints: stream.behaviorHints || {},
                _size: info.sizeInBytes || 0,
                _quality: info.qualityValue || 0,
                _seeders: info.seeders || 0,
                _isCached: isCached
            };
        });
        
        // الترتيب
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

// كل تفصيل على سطر خاص
function formatOnePerLine(info, isCached, originalTitle) {
    const lines = [];
    
    // سطر 1: اسم الفيلم
    const cleanTitle = cleanTitleString(originalTitle);
    lines.push(`💎🎬 ${cleanTitle || 'Movie Stream'}`);
    
    // سطر 2: حجم الفيلم
    lines.push(`💎💾 ${info.size}`);
    
    // سطر 3: جودة الصورة
    lines.push(`💎📺 ${info.quality}`);
    
    // سطر 4: السيدرز
    lines.push(`💎🧑‍🔧 ${info.seeders > 0 ? info.seeders : '?'}`);
    
    // سطر 5: الكودك
    lines.push(`💎🎞️ ${info.codec}`);
    
    // سطر 6: الصوت
    lines.push(`💎🎧 ${info.audio}`);
    
    // سطر 7: لغة الفيلم
    lines.push(`💎🔊 ${info.language}`);
    
    // سطر 8: لغة الترجمة
    lines.push(`💎🌐 ${info.subs}`);
    
    // سطر 9: النوع
    lines.push(isCached ? '💎🧲 RD Cached' : '💎📡 Torrent');
    
    return lines.join('\n');
}

// تنظيف العنوان
function cleanTitleString(title) {
    if (!title) return '';
    
    // إزالة الأشياء غير المرغوبة
    return title
        .replace(/\[.*?\]/g, '')
        .replace(/\./g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/(\d+(\.\d+)?)\s*(GB|MB)/gi, '')
        .replace(/(\d+)\s*Seeds?/gi, '')
        .replace(/4K|2160p|1080p|720p|480p/gi, '')
        .replace(/x265|x264|HEVC|AV1|VP9/gi, '')
        .replace(/DDP5\.1|DTS-HD|TrueHD|AC3|AAC/gi, '')
        .trim()
        .substring(0, 60);
}

// استخراج المعلومات
function extractCleanInfo(title) {
    const info = {
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
    
    if (!title) return info;
    
    // الحجم
    const sizeMatch = title.match(/(\d+(\.\d+)?)\s*(GB|MB)/i);
    if (sizeMatch) {
        const num = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[3].toUpperCase();
        info.size = `${num} ${unit}`;
        info.sizeInBytes = unit === 'GB' ? num * 1073741824 : num * 1048576;
    }
    
    // الجودة
    if (title.match(/4K/i)) {
        info.quality = '4K';
        info.qualityValue = 5;
    } else if (title.match(/2160p/i)) {
        info.quality = '2160p';
        info.qualityValue = 4;
    } else if (title.match(/1080p/i)) {
        info.quality = '1080p';
        info.qualityValue = 3;
    } else if (title.match(/720p/i)) {
        info.quality = '720p';
        info.qualityValue = 2;
    } else if (title.match(/480p/i)) {
        info.quality = '480p';
        info.qualityValue = 1;
    }
    
    // السيدرز
    const seedersMatch = title.match(/(\d+)\s*Seeds?/i);
    if (seedersMatch) info.seeders = parseInt(seedersMatch[1]);
    
    // الكودك
    if (title.match(/x265|HEVC/i)) info.codec = 'HEVC';
    else if (title.match(/AV1/i)) info.codec = 'AV1';
    else if (title.match(/VP9/i)) info.codec = 'VP9';
    
    // الصوت
    if (title.match(/DDP5\.1|Dolby Digital Plus/i)) info.audio = 'DDP5.1';
    else if (title.match(/DTS-HD|DTS-HD MA/i)) info.audio = 'DTS-HD MA';
    else if (title.match(/TrueHD/i)) info.audio = 'TrueHD';
    else if (title.match(/AC3|Dolby Digital/i)) info.audio = 'AC3';
    else if (title.match(/AAC/i)) info.audio = 'AAC';
    
    // اللغة
    if (title.match(/Arabic|AR|Arabe/i)) info.language = 'Arabic';
    else if (title.match(/French|FR|Français/i)) info.language = 'French';
    else if (title.match(/Spanish|ES|Español/i)) info.language = 'Spanish';
    else if (title.match(/Multi/i)) info.language = 'Multi';
    
    // الترجمة
    if (title.match(/Arabic Subs|AR-Subs/i)) info.subs = 'AR';
    else if (title.match(/French Subs|FR-Subs/i)) info.subs = 'FR';
    else if (title.match(/English Subs|EN-Subs/i)) info.subs = 'EN';
    else if (title.match(/Spanish Subs|ES-Subs/i)) info.subs = 'ES';
    else if (title.match(/Multi Subs/i)) info.subs = 'Multi';
    
    return info;
}

// صفحة Install
app.get('/install', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>📲 Install Souhail Addon</h1>
            <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json" 
               style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
                Install Now
            </a>
            <p>Or copy:</p>
            <code style="background: #f4f4f4; padding: 10px; display: block;">https://${req.hostname}/manifest.json</code>
            <p><a href="/">← Home</a></p>
        </body>
        </html>
    `);
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto;">
            <h1>🎬 Souhail Stremio</h1>
            <p><a href="/install">📲 Install Addon</a></p>
            
            <h3>📋 Format Preview:</h3>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-size: 14px; line-height: 1.6;">
💎🎬 Inception 2010 BluRay
💎💾 1.8 GB
💎📺 1080p
💎🧑‍🔧 1500
💎🎞️ H.264
💎🎧 DTS-HD
💎🔊 English
💎🌐 EN
💎🧲 RD Cached</pre>
            
            <h3>🔗 Test:</h3>
            <ul>
                <li><a href="/stream/movie/tt1375666.json">Inception</a></li>
                <li><a href="/stream/movie/tt0816692.json">Interstellar</a></li>
                <li><a href="/stream/movie/tt0468569.json">The Dark Knight</a></li>
            </ul>
        </body>
        </html>
    `);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
