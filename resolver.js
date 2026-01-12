const axios = require('axios');

class RealDebridResolver {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.real-debrid.com/rest/1.0';
        this.headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        };
    }
    
    async addMagnet(magnet) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/torrents/addMagnet`,
                { magnet: magnet },
                { headers: this.headers }
            );
            return response.data;
        } catch (error) {
            console.error('Real-Debrid Error:', error.response?.data || error.message);
            throw error;
        }
    }
    
    async getStream(magnet) {
        console.log(`🔄 Processing magnet with Real-Debrid: ${magnet.substring(0, 50)}...`);
        
        if (!this.apiKey) {
            return {
                error: 'Real-Debrid API key is missing',
                magnet: magnet,
                status: 'failed'
            };
        }
        
        // محاكاة الاستجابة
        return {
            success: true,
            magnet: magnet,
            streamUrl: `http://localhost:3000/proxy/${Buffer.from(magnet).toString('base64')}`,
            directUrl: 'https://real-debrid.com/stream/example',
            filename: 'movie.1080p.mp4',
            size: '1.8GB',
            status: 'ready'
        };
    }
    
    async unrestrictLink(link) {
        const response = await axios.post(
            `${this.baseUrl}/unrestrict/link`,
            { link: link },
            { headers: this.headers }
        );
        return response.data;
    }
}

module.exports = RealDebridResolver;
