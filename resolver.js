const axios = require('axios');

async function resolveTorrents(torrents, apiKey) {
    console.log(`🔗 معالجة ${torrents.length} تورنت مع Real-Debrid...`);
    
    if (!apiKey || apiKey.length < 20) {
        console.log('⚠️ مفتاح Real-Debrid غير صالح');
        return torrents.map(t => ({ ...t, cached: false }));
    }
    
    const resolved = [];
    
    for (const torrent of torrents) {
        try {
            // محاكاة للاختبار - في الإصدار النهائي هنا كود Real-Debrid الحقيقي
            const isCached = Math.random() > 0.3; // 70% cached للاختبار
            
            resolved.push({
                ...torrent,
                cached: isCached,
                streamUrl: isCached ? 'https://example.com/stream.mpd' : null,
                magnet: torrent.magnet || generateMagnet(torrent.title)
            });
            
        } catch (error) {
            console.log(`⚠️ خطأ في ${torrent.title.substring(0, 30)}...: ${error.message}`);
            resolved.push({ ...torrent, cached: false });
        }
    }
    
    return resolved;
}

function generateMagnet(title) {
    const hash = Array(40).fill(0).map(() => 
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(title)}`;
}

// ⭐⭐⭐ كود Real-Debrid الحقيقي (لاحقاً) ⭐⭐⭐
async function realDebridResolve(magnet, apiKey) {
    try {
        // 1. إضافة المغناطيس
        const addRes = await axios.post(
            'https://api.real-debrid.com/rest/1.0/torrents/addMagnet',
            `magnet=${encodeURIComponent(magnet)}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        
        const torrentId = addRes.data.id;
        
        // 2. التحقق من الكاش
        const infoRes = await axios.get(
            `https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`,
            {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            }
        );
        
        if (infoRes.data.status === 'downloaded') {
            // 3. الحصول على رابط التحميل
            const unrestrictRes = await axios.post(
                'https://api.real-debrid.com/rest/1.0/unrestrict/link',
                `link=${encodeURIComponent(infoRes.data.links[0])}`,
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                }
            );
            
            return unrestrictRes.data.download;
        }
        
        return null;
        
    } catch (error) {
        console.error('Real-Debrid error:', error.response?.data || error.message);
        return null;
    }
}

module.exports = { resolveTorrents };
