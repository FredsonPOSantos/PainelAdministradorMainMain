// Ficheiro: backend/routes/dashboard.js

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middlewares/authMiddleware');
const checkPermission = require('../middlewares/roleMiddleware');
const pool = require('../connection'); // [NOVO] Importa a conexão com o DB
const radius = require('radius'); // [NOVO] Para verificar o status do FreeRADIUS
const dgram = require('dgram'); // [NOVO] Dependência do pacote radius
const serverModule = require('../server'); // [NOVO] Importa o tempo de início

router.get(
  '/stats',
  [authMiddleware, checkPermission('dashboard.read')],
  dashboardController.getDashboardStats
);

// [ATUALIZADO] Rota para buscar os dados do Dashboard Analítico
router.get(
  '/analytics',
  [authMiddleware, checkPermission('analytics.read')], // [CORREÇÃO] Usa a nova permissão específica.
  async (req, res) => {
    console.log('[ANALYTICS] Rota /api/dashboard/analytics acionada.');
    try {
      const queries = {
        logins: `SELECT status, COUNT(*) FROM audit_logs WHERE action IN ('LOGIN_SUCCESS', 'LOGIN_FAILURE') GROUP BY status;`,
        hotspotUsers: `SELECT COUNT(*) AS total, COUNT(CASE WHEN accepts_marketing = true THEN 1 END) AS marketing FROM userdetails;`,
        routers: `SELECT status, COUNT(*) FROM routers GROUP BY status;`,
        tickets: `SELECT status, COUNT(*) FROM tickets GROUP BY status;`,
        lgpd: `SELECT status, COUNT(*) FROM data_exclusion_requests GROUP BY status;`,
        // [NOVO] Consulta para o card de Atividade dos Administradores
        adminActivity: `SELECT user_email, COUNT(*) as action_count FROM audit_logs WHERE timestamp >= NOW() - INTERVAL '24 hours' AND user_email IS NOT NULL GROUP BY user_email ORDER BY action_count DESC;`,
        // [NOVO] Consultas para o card de Performance de Sorteios
        activeRaffles: `SELECT COUNT(*) FROM raffles WHERE winner_id IS NULL;`,
        raffleParticipants: `SELECT COUNT(DISTINCT user_id) FROM raffle_participants WHERE created_at >= NOW() - INTERVAL '30 days';`,
        // [NOVO] Consultas para o card de Engajamento com Campanhas
        campaigns: `SELECT COUNT(*) AS active_count, SUM(view_count) AS total_views FROM campaigns WHERE is_active = true AND CURRENT_DATE BETWEEN start_date AND end_date;`
      };

      // [NOVO] Função para verificar o status do RADIUS
      const checkRadiusStatus = () => new Promise((resolve) => {
        const packet = {
            code: 'Status-Server',
            secret: process.env.RADIUS_SECRET || 'testing123', // Use a sua secret do FreeRADIUS
            identifier: 0,
            attributes: []
        };

        const client = dgram.createSocket("udp4");
        const encodedPacket = radius.encode(packet);
        const radiusHost = process.env.RADIUS_HOST || '127.0.0.1';
        const radiusPort = process.env.RADIUS_PORT || 1812;

        client.on('error', () => resolve({ status: 'offline' }));
        client.on('message', () => resolve({ status: 'online' }));

        client.send(encodedPacket, 0, encodedPacket.length, radiusPort, radiusHost, (err) => {
            if (err) resolve({ status: 'offline' });
        });

        setTimeout(() => resolve({ status: 'offline' }), 2000); // Timeout de 2 segundos
      });

      console.log('[ANALYTICS] A executar consultas em paralelo...');
      const results = await Promise.all(
        [
        ...Object.entries(queries).map(async ([key, query]) => {
          return pool.query(query).catch(err => ({ error: true, queryKey: key, message: err.message, stack: err.stack }));
        }),
        checkRadiusStatus() // [CORREÇÃO] A verificação do RADIUS agora é parte do Promise.all
        ]
      );
      const [
        loginsResult,
        hotspotUsersResult,
        routersResult,
        ticketsResult,
        lgpdResult,
        adminActivityResult, // [NOVO]
        activeRafflesResult, // [NOVO]
        raffleParticipantsResult, // [NOVO]
        campaignsResult, // [NOVO]
        radiusResult // [NOVO]
      ] = results;

      console.log('[ANALYTICS] Consultas concluídas. A processar resultados...');

      // [NOVO] Log detalhado para cada resultado
      results.forEach((result, index) => {
        const queryKey = Object.keys(queries)[index];
        if (result && result.error) {
          console.error(`[ANALYTICS] ERRO na consulta '${queryKey}':`, result.message);
        } else {
          // [CORREÇÃO] Verifica se o resultado tem a propriedade 'rows' antes de tentar aceder a 'length'.
          // Isso evita o erro com o resultado da verificação do RADIUS, que não tem 'rows'.
          if (result && result.rows) {
            console.log(`[ANALYTICS] SUCESSO na consulta '${queryKey}'. Linhas retornadas: ${result.rows.length}`);
          }
        }
      });

      // Verifica se alguma consulta essencial falhou
      const criticalError = results.find(r => r && r.error);
      if (criticalError) {
        throw new Error(`Falha na consulta '${criticalError.queryKey}': ${criticalError.message}`);
      }

      const parseCount = (result, key, value) => result.rows.find(r => r[key] === value)?.count || 0;

      const responseData = {
        logins: {
          success: parseCount(loginsResult, 'status', 'SUCCESS'),
          failure: parseCount(loginsResult, 'status', 'FAILURE')
        },
        hotspotUsers: {
          total: hotspotUsersResult.rows[0]?.total || 0,
          marketing: hotspotUsersResult.rows[0]?.marketing || 0
        },
        routers: {
          online: parseCount(routersResult, 'status', 'online'),
          offline: parseCount(routersResult, 'status', 'offline')
        },
        tickets: {
          open: parseCount(ticketsResult, 'status', 'open'),
          total: ticketsResult.rows.reduce((acc, row) => acc + parseInt(row.count, 10), 0) || 0
        },
        lgpd: {
          pending: parseCount(lgpdResult, 'status', 'pending'),
          completed: parseCount(lgpdResult, 'status', 'completed')
        },
        // [NOVO] Processa os dados de atividade do admin
        adminActivity: {
            actionsLast24h: adminActivityResult.rows.reduce((acc, row) => acc + parseInt(row.action_count, 10), 0),
            mostActiveAdmin: adminActivityResult.rows[0]?.user_email || 'N/A',
            mostActiveAdminCount: adminActivityResult.rows[0]?.action_count || 0
        },
        // [NOVO] Processa os dados de sorteios
        raffles: {
            active: activeRafflesResult.rows[0]?.count || 0,
            participantsLast30d: raffleParticipantsResult.rows[0]?.count || 0
        },
        // [NOVO] Processa os dados de campanhas
        campaigns: {
            active: campaignsResult.rows[0]?.active_count || 0,
            totalViews: campaignsResult.rows[0]?.total_views || 0
        },
        // [NOVO] Processa os dados de saúde do servidor
        serverHealth: {
            uptime: Date.now() - serverModule.serverStartTime.getTime(),
            radiusStatus: radiusResult.status
        }
      };

      console.log('[ANALYTICS] Dados processados com sucesso. A enviar resposta.');
      res.json({ success: true, data: responseData });

    } catch (error) {
      console.error('Erro ao buscar dados para o dashboard analítico:', error);
      res.status(500).json({ success: false, message: 'Erro interno do servidor.', data: null });
    }
  }
);

module.exports = router;