const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

const PORT = process.env.PORT || 8080;
const RD_KEY = process.env.REAL_DEBRID_API;
const TMDB_API = process.env.TMDB_API_KEY; // اختياري

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
});

// 1. MANIFEST
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

// 2. STREAM مع معلومات الفيلم
app.get('/stream/:type/:id.json', async (req, res) => {
    const { type, id } = req.params;
    
    if (!RD_KEY) {
        return res.json({ streams: [] });
    }
    
    try {
        // جلب معلومات الفيلم من TMDB أولاً
        const movieInfo = await getMovieInfo(id);
        
        // جلب التورنتات من Torrentio
        const torrentioUrl = `https://torrentio.strem.fun/realdebrid=${RD_KEY}/stream/${type}/${id}.json`;
        const response = await fetch(torrentioUrl);
        const data = await response.json();
        
        if (!data.streams) {
            return res.json({ streams: [] });
        }
        
        // معالجة كل stream مع معلومات الفيلم
        const processedStreams = data.streams.map((stream) => {
            const originalTitle = stream.name || stream.title || '';
            const isCached = stream.url && stream.url.includes('real-debrid.com');
            
            // استخراج معلومات من عنوان التورنت
            const torrentInfo = extractTorrentInfo(originalTitle);
            
            // جمع كل المعلومات
            const fullInfo = {
                movieTitle: movieInfo.title || 'Unknown Movie',
                movieYear: movieInfo.year || '',
                movieRating: movieInfo.rating || '',
                
                size: torrentInfo.size || 'Unknown',
                quality: torrentInfo.quality || '1080p',
                seeders: torrentInfo.seeders || 0,
                codec: torrentInfo.codec || 'H.264',
                audio: torrentInfo.audio || 'AC3',
                language: torrentInfo.language || 'English',
                subs: torrentInfo.subs || 'EN',
                source: torrentInfo.source || 'WEB-DL',
                site: torrentInfo.site || 'Torrent'
            };
            
            // إنشاء العنوان
            const formattedTitle = createCompleteTitle(fullInfo, isCached);
            
            return {
                title: formattedTitle,
                url: stream.url,
                behaviorHints: stream.behaviorHints || {}
            };
        });
        
        // ترتيب حسب: Cached → حجم → جودة → سيدرز
        const sortedStreams = processedStreams.sort((a, b) => {
            const aCached = a.title.includes('✅');
            const bCached = b.title.includes('✅');
            if (bCached && !aCached) return 1;
            if (aCached && !bCached) return -1;
            
            const aSize = extractSizeValue(a.title);
            const bSize = extractSizeValue(b.title);
            if (bSize !== aSize) return bSize - aSize;
            
            const aQuality = getQualityValue(a.title);
            const bQuality = getQualityValue(b.title);
            if (bQuality !== aQuality) return bQuality - aQuality;
            
            return 0;
        });
        
        res.json({ streams: sortedStreams });
        
    } catch (error) {
        console.error('Error:', error.message);
        res.json({ streams: [] });
    }
});

// 3. جلب معلومات الفيلم من TMDB أو IMDB
async function getMovieInfo(imdbId) {
    try {
        // إذا عندك TMDB API
        if (TMDB_API && imdbId.startsWith('tt')) {
            const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API}&external_source=imdb_id`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.movie_results && data.movie_results.length > 0) {
                const movie = data.movie_results[0];
                return {
                    title: movie.title,
                    year: movie.release_date ? movie.release_date.substring(0, 4) : '',
                    rating: movie.vote_average ? movie.vote_average.toFixed(1) : '',
                    overview: movie.overview || ''
                };
            }
        }
        
        // إذا ماكاينش TMDB، استعمل المعلومات الأساسية
        return {
            title: imdbId.startsWith('tt') ? `Movie (${imdbId})` : 'Movie',
            year: '',
            rating: '',
            overview: ''
        };
        
    } catch (error) {
        return {
            title: 'Movie',
            year: '',
            rating: '',
            overview: ''
        };
    }
}

// 4. استخراج معلومات التورنت من العنوان
function extractTorrentInfo(title) {
    const info = {
        size: 'Unknown',
        quality: '1080p',
        seeders: 0,
        codec: 'H.264',
        audio: 'AC3',
        language: 'English',
        subs: 'EN',
        source: 'WEB-DL',
        site: 'Torrent'
    };
    
    if (!title) return info;
    
    // الحجم (الأهم)
    const sizeMatch = title.match(/(\d+(\.\d+)?)\s*(GB|MB|GiB|MiB)/i);
    if (sizeMatch) {
        info.size = sizeMatch[0];
    }
    
    // الجودة
    const qualityOrder = ['4K', '2160p', '1080p', '720p', '480p'];
    for (const quality of qualityOrder) {
        if (title.includes(quality)) {
            info.quality = quality;
            break;
        }
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
    else if (title.match(/DTS-HD|DTS-HD MA/i)) info.audio = 'DTS-HD';
    else if (title.match(/TrueHD/i)) info.audio = 'TrueHD';
    else if (title.match(/AC3|Dolby Digital/i)) info.audio = 'AC3';
    else if (title.match(/AAC/i)) info.audio = 'AAC';
    
    // الموقع (من الأقواس)
    const siteMatch = title.match(/\[(.*?)\]/);
    if (siteMatch) info.site = siteMatch[1];
    
    // المصدر
    if (title.match(/BluRay|Blu-Ray|BD/i)) info.source = 'BluRay';
    else if (title.match(/WEB-DL|WEB/i)) info.source = 'WEB-DL';
    else if (title.match(/WEBRip/i)) info.source = 'WEBRip';
    else if (title.match(/HDTV/i)) info.source = 'HDTV';
    else if (title.match(/DVD/i)) info.source = 'DVD';
    
    return info;
}

// 5. إنشاء العنوان الكامل
function createCompleteTitle(info, isCached) {
    const lines = [];
    
    // سطر 1: اسم الفيلم + السنة + التقييم
    let titleLine = `🎬 ${info.movieTitle}`;
    if (info.movieYear) titleLine += ` (${info.movieYear})`;
    if (info.movieRating) titleLine += ` ⭐ ${info.movieRating}`;
    lines.push(titleLine);
    
    // سطر 2: الحجم + الجودة + السيدرز
    lines.push(`💾 ${info.size}  |  📺 ${info.quality}  |  👤 ${info.seeders || '?'}`);
    
    // سطر 3: التقنية
    lines.push(`🎞️ ${info.codec}  |  🔊 ${info.audio}  |  📦 ${info.source}`);
    
    // سطر 4: الموقع
    lines.push(`🏷️ ${info.site}  |  🌍 ${info.language}  |  📝 ${info.subs}`);
    
    // سطر 5: النوع
    lines.push(isCached ? '✅ REAL-DEBRID CACHED' : '🔗 TORRENT STREAM');
    
    return lines.join('\n');
}

// 6. دوال المساعدة للترتيب
function extractSizeValue(title) {
    const sizeMatch = title.match(/(\d+(\.\d+)?)\s*(GB|MB)/i);
    if (!sizeMatch) return 0;
    
    const num = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[3].toUpperCase();
    
    // تحويل لـMB للمقارنة
    return unit === 'GB' ? num * 1024 : num;
}

function getQualityValue(title) {
    if (title.includes('4K')) return 5;
    if (title.includes('2160p')) return 4;
    if (title.includes('1080p')) return 3;
    if (title.includes('720p')) return 2;
    if (title.includes('480p')) return 1;
    return 0;
}

// 7. صفحة Install
app.get('/install', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px; text-align: center;">
            <h1>🎬 Souhail Stremio v100</h1>
            <p>Complete torrent information with movie details</p>
            
            <a href="stremio://stremio.xyz/app/${req.hostname}/manifest.json" 
               style="display: inline-block; background: #28a745; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; margin: 20px 0;">
                📲 Install Now
            </a>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Copy to Stremio:</strong></p>
                <code>https://${req.hostname}/manifest.json</code>
            </div>
            
            <p><a href="/test">Test Page</a> | <a href="/health">Health</a></p>
        </body>
        </html>
    `);
});

app.get('/test', (req, res) => {
    res.send(`
        <html>
        <body style="font-family: Arial; padding: 20px;">
            <h1>Test v100.0.0</h1>
            <pre style="background: #f8f9fa; padding: 15px;">
🎬 Inception (2010) ⭐ 8.8
💾 1.8 GB  |  📺 1080p  |  👤 1500
🎞️ H.264  |  🔊 DTS-HD  |  📦 BluRay
🏷️ YTS  |  🌍 English  |  📝 EN
✅ REAL-DEBRID CACHED</pre>
            <p><a href="/stream/movie/tt1375666.json">Test Inception</a></p>
        </body>
        </html>
    `);
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '100.0.0',
        features: [
            'Movie title from TMDB/IMDB',
            'Complete torrent information',
            'Size, quality, seeders display',
            'Cached vs Torrent sorting',
            'Codec, audio, source info'
        ],
        tmdb: TMDB_API ? 'enabled' : 'disabled'
    });
});

app.get('/', (req, res) => {
    res.redirect('/install');
});

app.listen(PORT, () => {
    console.log(`
    ========================================
    🎬 Souhail Stremio v100.0.0
    ========================================
    📍 Port: ${PORT}
    🎥 Movie Info: ${TMDB_API ? 'TMDB Enabled' : 'Basic Info'}
    🔗 Install: http://localhost:${PORT}/install
    ========================================
    `);
});
