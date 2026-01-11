const axios = require('axios');

// ⭐⭐⭐ دالة البحث الحقيقية - تعمل على Railway ⭐⭐⭐
async function searchTorrentGalaxy(query) {
    console.log(`🔍 جاري البحث الحقيقي عن: "${query}"`);
    
    try {
        // استخدم TorrentAPI الرسمي (يعمل على Railway)
        const response = await axios.get(
            `https://torrentapi.org/pubapi_v2.php?app_id=stremio_souhail&mode=search&search_string=${encodeURIComponent(query)}&format=json_extended&sort=seeders`,
            {
                timeout: 10000,
                headers: {
                    'User-Agent': 'stremio-addon-souhail/1.0'
                }
            }
        );
        
        if (response.data && response.data.torrent_results) {
            const results = response.data.torrent_results.slice(0, 25).map(torrent => ({
                title: cleanTitle(torrent.title),
                magnet: `magnet:?xt=urn:btih:${torrent.info_hash}&dn=${encodeURIComponent(torrent.title)}`,
                source: 'RARBG',
                quality: detectQuality(torrent.title),
                size: formatBytes(torrent.size),
                seeders: torrent.seeders || 50,
                year: detectYear(torrent.title),
                info_hash: torrent.info_hash
            }));
            
            console.log(`✅ تم العثور على ${results.length} نتيجة حقيقية`);
            return results;
        }
        
        console.log('⚠️ لم توجد نتائج من RARBG');
        return [];
        
    } catch (error) {
        console.log(`❌ خطأ في RARBG: ${error.message}`);
        
        // جرب مصدر بديل
        try {
            console.log('🌐 جرب مصدر بديل...');
            const fallbackResults = await searchFallback(query);
            return fallbackResults;
        } catch (fallbackError) {
            console.log(`❌ جميع المصادر فشلت`);
            return []; // أرجع مصفوفة فارغة
        }
    }
}

// ⭐⭐⭐ مصدر بديل ⭐⭐⭐
async function searchFallback(query) {
    try {
        // استخدم BitSearch بدون proxy
        const response = await axios.get(
            `https://bitsearch.to/search?q=${encodeURIComponent(query)}&sort=seeders`,
            {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            }
        );
        
        const results = [];
        const html = response.data;
        
        // استخراج النتائج
        const regex = /<li class="search-result view-box">([\s\S]*?)<\/li>/g;
        let match;
        
        while ((match = regex.exec(html)) !== null && results.length < 20) {
            const torrentHtml = match[1];
            
            // استخراج العنوان
            const titleMatch = torrentHtml.match(/<h5[^>]*>([^<]+)</);
            if (!titleMatch) continue;
            
            const title = cleanTitle(titleMatch[1]);
            
            // استخراج المغناطيس
            const magnetMatch = torrentHtml.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/);
            if (!magnetMatch) continue;
            
            // استخراج الحجم
            let size = 'Unknown';
            const sizeMatch = torrentHtml.match(/(\d+\.?\d*)\s*(GB|MB)/i);
            if (sizeMatch) {
                size = `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}`;
            }
            
            results.push({
                title: title,
                magnet: magnetMatch[1],
                source: 'BitSearch',
                quality: detectQuality(title),
                size: size,
                seeders: 100,
                year: detectYear(title)
            });
        }
        
        return results;
        
    } catch (error) {
        throw new Error('Fallback search failed');
    }
}

// ⭐⭐⭐ دوال مساعدة ⭐⭐⭐
function cleanTitle(title) {
    return title
        .replace(/\./g, ' ')
        .replace(/_/g, ' ')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function detectQuality(title) {
    const lower = title.toLowerCase();
    if (lower.includes('2160p') || lower.includes('4k') || lower.includes('uhd')) return '4K';
    if (lower.includes('1080p') || lower.includes('fhd')) return '1080p';
    if (lower.includes('720p') || lower.includes('hd')) return '720p';
    if (lower.includes('bluray') || lower.includes('blu-ray')) return 'BluRay';
    if (lower.includes('web-dl') || lower.includes('webdl')) return 'WEB-DL';
    return 'HD';
}

function detectYear(title) {
    const match = title.match(/(19|20)\d{2}/);
    return match ? match[0] : '';
}

function formatBytes(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ⭐⭐⭐ تصدير ⭐⭐⭐
module.exports = {
    searchTorrentGalaxy,
    detectQuality,
    cleanTitle,
    detectYear
};
