// Ficheiro: ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "admin-backend",
      script: "./backend/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000,

        // --- [CRÍTICO PARA MIGRAÇÃO] ---
        // URL que o backend usa para gerar links (ex: recuperação de senha).
        // Deve apontar para o IP do servidor onde o frontend está, na porta 8184.
        FRONTEND_BASE_URL: "http://10.0.0.47:8184",

        // --- Base de Dados (Servidor 10.0.0.45) ---
        DB_HOST: "10.0.0.45",
        DB_PORT: 5432,
        DB_USER: "postgres",
        DB_PASSWORD: "Rota1010",
        DB_DATABASE: "radius",
        JWT_SECRET: "Rota1010",

        // --- Configurações de E-mail ---
        EMAIL_HOST: "smtps.uhserver.com",
        EMAIL_PORT: 465,
        EMAIL_SECURE: "true",
        EMAIL_USER: "fredson.santos@rotatransportes.com.br",
        EMAIL_PASS: "Rota1010@",
        EMAIL_FROM: "Fredson Santos <fredson.santos@rotatransportes.com.br>",

        // --- Outras Configurações de Serviços ---
        INFLUXDB_URL: "http://10.0.0.45:8086",
        INFLUXDB_TOKEN: "T6M0gntRz3BX-q_huEoxfe11-raaAG-DKd-Byz1uMioSHw8OPsoPdpH5eY5o7RtgwY_vrhMo56lOVsWm1fVQXA==",
        INFLUXDB_ORG: "RotaHotspot",
        INFLUXDB_BUCKET: "monitor",
        MIKROTIK_USER: "fredson",
        MIKROTIK_PASSWORD: "son810729",
        MIKROTIK_API_PORT: 8797,
        GEMINI_API_KEY: "AIzaSyBSrHRW1CVSQHpTjQL1iGQI80WF9TGtfIU"
      }
    },
    {
      name: "admin-frontend",
      // [CORREÇÃO] Aponta diretamente para o script do http-server local para evitar problemas com npx no Windows
      script: "./node_modules/http-server/bin/http-server",
      // Argumentos: pasta frontend, porta 8184, sem cache (-c-1), habilitar CORS, silencioso (-s)
      args: "./frontend -p 8184 -c-1 --cors", 
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "monitoring-agent",
      script: "./backend/agent.js",
      env: {
        NODE_ENV: "production"
        // As variáveis de ambiente são carregadas pelo dotenv dentro do script
      }
    }
  ]
};
