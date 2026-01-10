// Ficheiro: backend/services/cacheService.js
const redis = require('redis');

let client;
let isRedisAvailable = false;
const memoryCache = new Map(); // Fallback em memória

(async () => {
    try {
        client = redis.createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                reconnectStrategy: (retries) => {
                    if (retries > 3) {
                        console.warn('⚠️ [REDIS] Desistindo de reconectar após 3 tentativas. Usando cache em memória.');
                        return new Error('Redis connection failed');
                    }
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        client.on('error', (err) => {
            // Suprime logs excessivos de conexão recusada se já sabemos que falhou
            if (!isRedisAvailable && (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET')) return;
            console.error('❌ [REDIS] Erro no cliente Redis:', err.message);
            isRedisAvailable = false;
        });

        client.on('connect', () => {
            console.log('✅ [REDIS] Conectado ao Redis');
            isRedisAvailable = true;
        });

        await client.connect();
    } catch (e) {
        console.warn('⚠️ [REDIS] Não foi possível conectar. Usando cache em memória (fallback).');
        isRedisAvailable = false;
    }
})();

const get = async (key) => {
    if (isRedisAvailable && client) {
    try {
        const data = await client.get(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error(`[REDIS] Erro ao obter chave ${key}:`, e);
        return null;
    }
    }
    // Fallback: Memória
    const cached = memoryCache.get(key);
    if (cached && cached.expiry > Date.now()) return cached.value;
    return null;
};

const set = async (key, value, durationSeconds = 300) => {
    if (isRedisAvailable && client) {
    try {
            await client.set(key, JSON.stringify(value), { EX: durationSeconds });
    } catch (e) {
        console.error(`[REDIS] Erro ao definir chave ${key}:`, e);
    }
    } else {
        // Fallback: Memória
        memoryCache.set(key, { value, expiry: Date.now() + (durationSeconds * 1000) });
    }
};

module.exports = { get, set };