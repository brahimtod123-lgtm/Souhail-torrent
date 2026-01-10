const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

// 1. تعريف الإضافة
const manifest = {
    id: 'org.souhail.stremio',
    version: '1.0.0',
    name: 'SOUHAIL',
    description: 'Torrent Addon for Stremio',
    logo: 'https://i.imgur.com/7VTVVc1.png',
    resources: ['stream'],
    types: ['movie'],
    catalogs: []
};

// 2. بناء الإضافة
const builder = new addonBuilder(manifest);

// 3. معالج الستريمات
builder.defineStreamHandler(function(args) {
    console.log('🔍 Request received for:', args.id);
    
    return Promise.resolve({
        streams: [
            {
                name: 'SOUHAIL',
                title: '✅ Addon is working! Movie: ' + args.id,
                url: ''
            }
        ]
    });
});

// 4. الحصول على الواجهة
const addonInterface = builder.getInterface();

// 5. تشغيل الخادم
const port = process.env.PORT || 3000;
console.log('🚀 Starting SOUHAIL Stremio Addon...');
console.log('📡 Port:', port);
console.log('🔗 Your manifest URL will be:');
console.log(`   http://localhost:${port}/manifest.json`);

serveHTTP(addonInterface, { port: port });
