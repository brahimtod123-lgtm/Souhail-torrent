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
        "id": "com.souhail.stremio",
        "version": "100.0.0",
        "name": "Souhail Stremio",
        "description": "Real-Debrid Torrent Streaming",
        "logo": "https://cdn-icons-png.flaticon.com/512/3095/3095588.png",
        "resources": ["stream"],
        "types": ["movie", "series"],
        "idPrefixes": ["tt"]
    });
});

// STREAM - هذا الكود كان يعطي ليانات بزاف
app.get('/stream/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    
    if (!RD_KEY) {
        return res.json({ streams: [] });
    }
    
    try {
        // هذا الرابط كان يعطي ليانات بزاف
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/quality=size:desc/stream/${type}/${id}.json`;
        
        const response = await fetch(torrentioUrl);
        const data = await response.json();
        
        if (!data.streams) {
            return res.json({ streams: [] });
        }
        
        // فلترة للحصول على أكبر الأحجام فقط
        const largeStreams = data.streams.filter(stream => {
            const title = stream.name || stream.title || '';
            // تبحث عن أحجام كبيرة (GB)
            return title.match(/GB/i) && !title.match(/MB/i);
        });
        
        // إذا مافي أحجام كبيرة، خذ كلشي
        const streamsToProcess = largeStreams.length > 0 ? largeStreams : data.streams;
        
        const processedStreams = streamsToProcess.map((stream, index) => {
            const originalTitle = stream.name || stream.title || `Stream ${index + 1}`;
            const isCached = stream.url && stream.url.includes('real-debrid.com');
            
            // استخراج المعلومات الأساسية
            const sizeMatch = originalTitle.match(/(\d+(\.\d+)?)\s*(GB|MB)/i);
            const size = sizeMatch ? sizeMatch[0] : 'Unknown';
            
            const quality = originalTitle.match(/4K/i) ? '4K' : 
                           originalTitle.match(/1080p/i) ? '1080p' : 
                           originalTitle.match(/720p/i) ? '720p' : '1080p';
            
            const seedersMatch = originalTitle.match(/(\d+)\s*Seeds?/i);
            const seeders = seedersMatch ? parseInt(seedersMatch[1]) : 0;
            
            const siteMatch = originalTitle.match(/\[(.*?)\]/);
            const site = siteMatch ? siteMatch[1] : 'Torrent';
            
            // تنظيف اسم الفيلم
            let cleanName = originalTitle
                .replace(/\[.*?\]/g, '')
                .replace(/\./g, ' ')
                .replace(/\s+/g, ' ')
                .substring(0, 60)
                .trim();
            
            // التنسيق البسيط اللي كان خدام
            const formattedTitle = 
`🎬 ${cleanName}
💾 ${size} | 📺 ${quality} | 👤 ${seeders || '?'}
🏷️ ${site}
${isCached ? '✅ CACHED' : '🔗 TORRENT'}`;
            
            return {
                title: formattedTitle,
                url: stream.url,
                behaviorHints: stream.behaviorHints || {}
            };
        });
        
        // ترتيب حسب الحجم (الأكبر أولاً)
        const sortedStreams = processedStreams.sort((a, b) => {
            const aSize = extractSizeValue(a.title);
            const bSize = extractSizeValue(b.title);
            return bSize - aSize;
        });
        
        // خذ أول 15 فقط (ليانات بزاف)
        const limitedStreams = sortedStreams.slice(0, 15);
        
        res.json({ streams: limitedStreams });
        
    } catch (error) {
        res.json({ streams: [] });
    }
});

// دالة استخراج قيمة الحجم للمقارنة
function extractSizeValue(title) {
    const sizeMatch = title.match(/(\d+(\.\d+)?)\s*(GB|MB)/i);
    if (!sizeMatch) return 0;
    
    const num = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[3].toUpperCase();
    
    // تحويل كلشي لـMB للمقارنة
    return unit === 'GB' ? num * 1024 : num;
}

// صفحات المساعدة
app.get('/install', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>Souhail Stremio v100</h1>
            <p>Returns many links with large file sizes</p>
            <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json" 
               style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none;">
                Install Now
            </a>
            <p><code>https://${req.hostname}/manifest.json</code></p>
        </body>
        </html>
    `);
});

app.get('/', (req, res) => {
    res.redirect('/install');
});

app.listen(PORT, () => {
    console.log(`Server running - Version 100.0.0`);
});
