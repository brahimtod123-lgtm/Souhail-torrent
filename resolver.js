const { searchTorrentGalaxy } = require('./scraper');

// ⭐⭐⭐ دالة Real-Debrid ⭐⭐⭐
async function getRealDebridStream(magnet, apiKey) {
    try {
        console.log(`🔗 معالجة مع Real-Debrid...`);
        
        // 1. فحص الكاش السريع
        const cachedUrl = await checkInstantCache(magnet, apiKey);
        if (cachedUrl) {
            console.log(`⚡ موجود في الكاش!`);
            return {
                streamUrl: cachedUrl,
                cached: true,
                instant: true
            };
        }
        
        // 2. إضافة المغناطيس
        const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `magnet=${encodeURIComponent(magnet)}`,
            signal: AbortSignal.timeout(15000)
        });
        
        if (!addRes.ok) {
            console.log(`❌ فشل إضافة المغناطيس: ${addRes.status}`);
            return null;
        }
        
        const addData = await addRes.json();
        const torrentId = addData.id;
        console.log(`📥 تمت الإضافة: ${torrentId}`);
        
        // 3. اختيار جميع الملفات
        await fetch(`https://api.real-debrid.com/rest/1.0/torrents/selectFiles/${torrentId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'files=all'
        });
        
        // 4. انتظر 3 ثواني
        console.log(`⏳ انتظار المعالجة...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 5. الحصول على معلومات التورنت
        const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(10000)
        });
        
        if (!infoRes.ok) {
            await deleteRD(torrentId, apiKey);
            return null;
        }
        
        const infoData = await infoRes.json();
        
        // 6. إذا كان جاهزاً، احصل على الرابط
        if (infoData.status === 'downloaded' && infoData.links && infoData.links.length > 0) {
            console.log(`✅ محمل على RD! جاري الحصول على الرابط...`);
            
            const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `link=${encodeURIComponent(infoData.links[0])}`,
                signal: AbortSignal.timeout(10000)
            });
            
            if (unrestrictRes.ok) {
                const unrestrictData = await unrestrictRes.json();
                
                // تنظيف
                await deleteRD(torrentId, apiKey);
                
                return {
                    streamUrl: unrestrictData.download,
                    filename: infoData.filename,
                    size: infoData.bytes,
                    cached: true,
                    instant: false
                };
            }
        }
        
        // 7. تنظيف إذا لم يكن جاهزاً
        await deleteRD(torrentId, apiKey);
        console.log(`❌ غير موجود في الكاش`);
        return { cached: false };
        
    } catch (error) {
        console.error(`🔥 خطأ RD: ${error.message}`);
        return null;
    }
}

// ⭐⭐⭐ فحص الكاش الفوري ⭐⭐⭐
async function checkInstantCache(magnet, apiKey) {
    try {
        const addRes = await fetch('https://api.real-debrid.com/rest/1.0/torrents/addMagnet', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `magnet=${encodeURIComponent(magnet)}`,
            signal: AbortSignal.timeout(8000)
        });
        
        if (!addRes.ok) return null;
        
        const addData = await addRes.json();
        const torrentId = addData.id;
        
        const infoRes = await fetch(`https://api.real-debrid.com/rest/1.0/torrents/info/${torrentId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(8000)
        });
        
        if (infoRes.ok) {
            const infoData = await infoRes.json();
            
            if (infoData.status === 'downloaded' && infoData.links?.length > 0) {
                const unrestrictRes = await fetch('https://api.real-debrid.com/rest/1.0/unrestrict/link', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `link=${encodeURIComponent(infoData.links[0])}`,
                    signal: AbortSignal.timeout(8000)
                });
                
                if (unrestrictRes.ok) {
                    const unrestrictData = await unrestrictRes.json();
                    await deleteRD(torrentId, apiKey);
                    return unrestrictData.download;
                }
            }
        }
        
        await deleteRD(torrentId, apiKey);
        return null;
        
    } catch (error) {
        return null;
    }
}

// ⭐⭐⭐ حذف من RD ⭐⭐⭐
async function deleteRD(torrentId, apiKey) {
    try {
        await fetch(`https://api.real-debrid.com/rest/1.0/torrents/delete/${torrentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(5000)
        });
    } catch (error) {
        // تجاهل
    }
}

// ⭐⭐⭐ معالجة التورنتات ⭐⭐⭐
async function processTorrents(torrents, apiKey, maxProcess = 12) {
    const streams = [];
    
    // معالجة أول N تورنت
    const toProcess = torrents.slice(0, maxProcess);
    
    console.log(`🔄 معالجة ${toProcess.length} تورنت من أصل ${torrents.length}`);
    
    for (let i = 0; i < toProcess.length; i++) {
        const torrent = toProcess[i];
        
        try {
            console.log(`📦 [${i+1}/${toProcess.length}] ${torrent.title.substring(0, 40)}...`);
            
            const rdResult = await getRealDebridStream(torrent.magnet, apiKey);
            
            if (rdResult && rdResult.cached) {
                // Real-Debrid cached
                const qualityEmoji = torrent.quality.includes('4K') ? '🔥' : '💎';
                const instantEmoji = rdResult.instant ? '⚡' : '✅';
                
                streams.push({
                    name: `${qualityEmoji} REAL-DEBRID`,
                    title: `🎬 ${torrent.title}\n📊 ${torrent.quality} | 💾 ${torrent.size} | 👤 ${torrent.seeders} seeders\n${instantEmoji} DIRECT STREAM READY`,
                    url: rdResult.streamUrl,
                    behaviorHints: {
                        notWebReady: false,
                        bingeGroup: `rd_${i}`
                    }
                });
                
                console.log(`✅ تمت المعالجة: ${torrent.quality}`);
                
            } else {
                // Torrent فقط
                const qualityEmoji = torrent.quality.includes('4K') ? '🎯' : '🧲';
                
                streams.push({
                    name: `${qualityEmoji} TORRENT`,
                    title: `🎬 ${torrent.title}\n📊 ${torrent.quality} | 💾 ${torrent.size} | 👤 ${torrent.seeders} seeders\n⚠️ أضف إلى Real-Debrid للبث`,
                    infoHash: extractInfoHash(torrent.magnet),
                    fileIdx: 0,
                    behaviorHints: {
                        notWebReady: true,
                        bingeGroup: `torrent_${i}`
                    }
                });
                
                console.log(`⚠️ تورنت فقط`);
            }
            
        } catch (error) {
            console.log(`❌ فشل معالجة التورنت: ${error.message}`);
        }
        
        // انتظر قليلاً بين المعالجات
        if (i < toProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    return streams;
}

// ⭐⭐⭐ استخراج الهايش ⭐⭐⭐
function extractInfoHash(magnet) {
    const match = magnet.match(/btih:([a-fA-F0-9]{40})/);
    if (match) return match[1].toLowerCase();
    
    // إنشاء هايش عشوائي
    return Array.from({length: 40}, () => 
        Math.floor(Math.random() * 16).toString(16)
    ).join('');
}

// ⭐⭐⭐ تصدير الدوال ⭐⭐⭐
module.exports = {
    getRealDebridStream,
    processTorrents,
    checkInstantCache,
    deleteRD,
    extractInfoHash
};
