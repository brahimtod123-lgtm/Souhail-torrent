const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

// ⭐⭐⭐ مانيفست مصحح ⭐⭐⭐
const manifest = {
    id: 'org.souhail.addon',
    version: '3.0.0',
    name: 'SOUHAIL ARCHIVE',
    description: 'Torrents with Real-Debrid - Souhail Archive',
    logo: 'https://img.icons8.com/color/96/000000/movie.png',
    background: 'https://img.icons8.com/color/480/000000/movie.png',
    resources: ['stream'],
    types: ['movie'],
    idPrefixes: ['tt'],
    behaviorHints: {
        configurable: false,
        configurationRequired: false
    }
};

const builder = new addonBuilder(manifest);

// ⭐⭐⭐ Stream Handler مصحح ⭐⭐⭐
builder.defineStreamHandler(async ({ type, id }) => {
    console.log('\n' + '='.repeat(60));
    console.log('🎬 STREMIو REQUEST:');
    console.log('Type:', type);
    console.log('ID:', id);
    console.log('='.repeat(60));
    
    // ⭐⭐⭐ نتائج مباشرة بدون تعقيد ⭐⭐⭐
    const streams = [
        {
            // ⭐⭐⭐ IMPORTANT: name و title لازم يكونو مختلفين ⭐⭐⭐
            name: 'SOUHAIL ARCHIVE',
            title: `🎬 Addon is WORKING!\n✅ Movie: ${id}\n📊 Quality: 1080p\n💾 Size: 2.5GB\n👤 Seeders: 150\n✨ Status: Active`,
            
            // ⭐⭐⭐ URL مهم باش ماتدورش loading ⭐⭐⭐
            url: 'https://bitmovin-a.akamaihd.net/content/MI201109210084_1/mpds/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.mpd',
            
            // ⭐⭐⭐ BehaviorHints مهمة ⭐⭐⭐
            behaviorHints: {
                notWebReady: false,  // ⭐⭐ مهم: false باش يعمل فالمتصفح
                bingeGroup: 'souhail_movies',
                externalPlayer: {
                    name: 'SOUHAIL PLAYER',
                    supported: true
                }
            },
            
            // ⭐⭐⭐ معلومات إضافية ⭐⭐⭐
            description: 'High quality stream from Souhail Archive',
            genre: ['Action', 'Drama'],
            rating: '8.5/10'
        },
        {
            name: 'SOUHAIL TEST',
            title: '📺 Test Stream - Big Buck Bunny\n✅ Works in browser\n🔗 Direct MP4 link',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            behaviorHints: {
                notWebReady: false,
                bingeGroup: 'test_streams'
            }
        }
    ];
    
    console.log(`✅ Prepared ${streams.length} streams`);
    console.log('='.repeat(60));
    
    return { streams };
});

// ⭐⭐⭐ تشغيل الخادم مع error handling ⭐⭐⭐
try {
    const port = process.env.PORT || 3000;
    const addonInterface = builder.getInterface();
    
    console.log('\n' + '⭐'.repeat(60));
    console.log('🚀 SOUHAIL STREMIO ADDON - READY!');
    console.log(`📡 Port: ${port}`);
    console.log(`🔗 Manifest: http://localhost:${port}/manifest.json`);
    console.log(`🎬 Test: http://localhost:${port}/stream/movie/tt123.json`);
    console.log('⭐'.repeat(60));
    
    serveHTTP(addonInterface, { 
        port: port,
        static: null
    });
    
} catch (error) {
    console.error('❌ FATAL ERROR:', error);
    process.exit(1);
}
