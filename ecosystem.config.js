// Ficheiro: ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "admin-backend",
      script: "./backend/server.js",
      env: {
        NODE_ENV: "production",
        PORT: 3000
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
