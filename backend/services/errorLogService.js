// Ficheiro: backend/services/errorLogService.js
// Descrição: Serviço centralizado para gravação de erros do sistema.

const { pool } = require('../connection');
const nodemailer = require('nodemailer'); // [NOVO] Necessário para enviar alertas
require('dotenv').config();

const logError = async (err, req) => {
    try {
        const errorMessage = err.message || 'Erro desconhecido';
        const stackTrace = err.stack || null;
        const requestMethod = req ? req.method : null;
        const requestUrl = req ? req.originalUrl : null;
        // Evita guardar senhas ou dados muito grandes no log
        const requestBody = req && req.body ? JSON.stringify(req.body, (key, value) => key.toLowerCase().includes('password') ? '******' : value) : null;
        const userEmail = req && req.user ? req.user.email : (req && req.body ? req.body.email : null);

        await pool.query(
            `INSERT INTO system_errors (error_message, stack_trace, request_method, request_url, request_body, user_email)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [errorMessage, stackTrace, requestMethod, requestUrl, requestBody, userEmail]
        );

        // [NOVO] Lógica de Envio de Alerta por E-mail
        try {
            // 1. Buscar configurações de SMTP do sistema
            const settingsResult = await pool.query('SELECT email_host, email_port, email_user, email_pass, email_from, email_secure FROM system_settings WHERE id = 1');
            let emailConfig = {};
            
            if (settingsResult.rows.length > 0) {
                const dbSettings = settingsResult.rows[0];
                // Prioriza configurações do banco de dados se estiverem completas
                if (dbSettings.email_host && dbSettings.email_user && dbSettings.email_pass) {
                    emailConfig = {
                        host: dbSettings.email_host,
                        port: dbSettings.email_port,
                        secure: dbSettings.email_secure,
                        user: dbSettings.email_user,
                        pass: dbSettings.email_pass,
                        from: dbSettings.email_from
                    };
                }
            }

            // Se não encontrou no banco, tenta buscar do .env
            if (!emailConfig.host) {
                if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
                    emailConfig = {
                        host: process.env.EMAIL_HOST,
                        port: process.env.EMAIL_PORT,
                        secure: process.env.EMAIL_SECURE === 'true',
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASS,
                        from: process.env.EMAIL_FROM
                    };
                }
            }

            // Verifica se temos uma configuração válida
            if (emailConfig.host && emailConfig.user && emailConfig.pass) {
                
                // 2. Buscar e-mails dos administradores (Master) para receber o alerta
                const mastersResult = await pool.query("SELECT email FROM admin_users WHERE role = 'master'");
                const recipients = mastersResult.rows.map(u => u.email);

                if (recipients.length > 0) {
                    const transporter = nodemailer.createTransport({
                        host: emailConfig.host,
                        port: emailConfig.port,
                        secure: emailConfig.secure, // true para porta 465, false para outras
                        auth: {
                            user: emailConfig.user,
                            pass: emailConfig.pass,
                        },
                    });

                    const mailOptions = {
                        from: emailConfig.from || emailConfig.user,
                        to: recipients.join(','), // Envia para todos os masters
                        subject: `[ALERTA CRÍTICO] Erro no Sistema: ${errorMessage.substring(0, 50)}...`,
                        html: `
                            <div style="font-family: Arial, sans-serif; color: #333;">
                                <h2 style="color: #d9534f;">Erro de Sistema Detetado</h2>
                                <p>Um novo erro foi registado no painel de administração.</p>
                                <hr>
                                <p><strong>Mensagem:</strong> ${errorMessage}</p>
                                <p><strong>Endpoint:</strong> ${requestMethod || 'N/A'} ${requestUrl || 'N/A'}</p>
                                <p><strong>Utilizador:</strong> ${userEmail || 'Anónimo'}</p>
                                <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                                <br>
                                <div style="background-color: #f8f9fa; padding: 10px; border: 1px solid #ddd; overflow-x: auto;">
                                    <strong>Stack Trace:</strong>
                                    <pre style="margin: 0; font-size: 12px;">${stackTrace}</pre>
                                </div>
                                <br>
                                <p style="font-size: 12px; color: #777;">Este é um e-mail automático do sistema de monitorização.</p>
                            </div>
                        `
                    };

                    await transporter.sendMail(mailOptions);
                }
            }
        } catch (emailError) {
            console.error('Falha ao enviar alerta de erro por e-mail:', emailError.message);
            // Não interrompe o fluxo principal se o e-mail falhar, apenas loga o erro do e-mail
        }

    } catch (logErr) {
        console.error('CRITICAL: Falha ao gravar no log de erros do sistema:', logErr);
    }
};

module.exports = { logError };