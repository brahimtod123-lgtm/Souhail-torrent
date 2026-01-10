const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

// المانيفست
const manifest = {
    id: 'org.souhail.stremio',
    version: '2.0.0',
    name: 'SOUHAIL / RD',
    description: 'تورنتات مع Real-Debrid - Souhail Archive',
    logo: 'https://i.imgur.com/7VTVVc1.png',
    background: 'https://i.imgur.com/xQkqCzR.png',
    resources: ['stream'],
    types: ['movie', 'series'],
    catalogs: [],
    idPrefixes: ['tt'],
    behaviorHints: {
        configurable: true,
        configurationRequired: false
    }
};

const builder = new addonBuilder(manifest);

// ⭐⭐⭐ ديالوج مهم: كيفاش Stremio كاتبعث البيانات ⭐⭐⭐
builder.defineStreamHandler(async ({ type, id }) => {
    console.log('='.repeat(50));
    console.log('🎬 STREAM REQUEST RECEIVED!');
    console.log('📌 Type:', type);
    console.log('📌 Full ID:', id);
    console.log('='.repeat(50));
    
    // ⭐⭐⭐ استخراج اسم الفيلم من ID ⭐⭐⭐
    let movieName = 'Unknown Movie';
    let year = '';
    
    // Stremio كاتبعث بهذا الشكل: "tt1234567:Movie Name (2024)"
    if (id && id.includes(':')) {
        const parts = id.split(':');
        if (parts.length > 1) {
            const nameWithYear = parts[1];
            // استخراج السنة
            const yearMatch = nameWithYear.match(/\((\d{4})\)/);
            if (yearMatch) {
                year = yearMatch[1];
                movieName = nameWithYear.replace(/\(\d{4}\)/, '').trim();
            } else {
                movieName = nameWithYear.trim();
            }
        }
    } else if (id && id.startsWith('tt')) {
        movieName = `IMDb ID: ${id}`;
    }
    
    console.log(`🔍 Movie extracted: "${movieName}" ${year ? `(${year})` : ''}`);
    
    // ⭐⭐⭐ نتائج تجريبية حقيقية ⭐⭐⭐
    const streams = [
        {
            name: '💎 SOUHAIL / RD',
            title: `✅ SOUHAIL ADDON IS WORKING!\n\n🎬 الفيلم: ${movieName} ${year ? `(${year})` : ''}\n📊 الجودة: 1080p | 💾 الحجم: 2.5 GB\n👤 السيدرز: 150\n✨ Real-Debrid: جاري التطوير\n🔗 السيرفر: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'Railway'}`,
            url: '',
            behaviorHints: {
                notWebReady: false,
                bingeGroup: 'souhail_test'
            }
        },
        {
            name: '📺 Test Video (Working)',
            title: '🎬 Big Buck Bunny\n📊 1080p | 💾 450 MB\n✅ يعمل في جميع الأجهزة',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            behaviorHints: {
                notWebReady: false,
                bingeGroup: 'test_video'
            }
        }
    ];
    
    console.log(`✅ Sending ${streams.length} streams to Stremio`);
    return { streams };
});

// تشغيل الخادم
const port = process.env.PORT || 3000;
console.log('='.repeat(60));
console.log('🚀 SOUHAIL / RD ADDON STARTING...');
console.log('📡 Port:', port);
console.log('🔗 Manifest URL:');
console.log(`   http://localhost:${port}/manifest.json`);
console.log('🎬 Test stream URL:');
console.log(`   http://localhost:${port}/stream/movie/tt1234567:Avatar%20(2009).json`);
console.log('='.repeat(60));

serveHTTP(builder.getInterface(), { port: port });
