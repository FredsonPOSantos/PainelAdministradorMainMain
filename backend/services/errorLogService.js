// Ficheiro: backend/services/errorLogService.js
// Descrição: Serviço centralizado para gravação de erros do sistema.

const { pool, pgConnectionStatus } = require('../connection'); // [MODIFICADO] Importa o status da conexão
const nodemailer = require('nodemailer');
const fs = require('fs'); // [NOVO] Módulo File System para lidar com arquivos
const path = require('path'); // [NOVO] Módulo Path para lidar com caminhos de arquivo
require('dotenv').config();

// [MODIFICADO] O buffer agora é um ficheiro JSON local para persistência
const logFilePath = path.join(__dirname, 'offline_error_log.json');
let isProcessingBuffer = false;
let downtimeStartTime = null;

// [NOVO] Função para ler o buffer do ficheiro
const _readErrorBuffer = () => {
    if (fs.existsSync(logFilePath)) {
        const fileContent = fs.readFileSync(logFilePath, 'utf-8');
        return fileContent ? JSON.parse(fileContent) : [];
    }
    return [];
};

// [NOVO] Função para escrever no buffer do ficheiro
const _writeErrorBuffer = (buffer) => {
    fs.writeFileSync(logFilePath, JSON.stringify(buffer, null, 2), 'utf-8');
};

// [NOVO] Função interna para escrever um erro no banco de dados
const _writeErrorToDb = async (logObject) => {
    const { errorMessage, stackTrace, requestMethod, requestUrl, requestBody, userEmail } = logObject;
    await pool.query(
        `INSERT INTO system_errors (error_message, stack_trace, request_method, request_url, request_body, user_email)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [errorMessage, stackTrace, requestMethod, requestUrl, requestBody, userEmail]
    );
};

const logError = async (err, req) => {
    const errorMessage = err.message || 'Erro desconhecido';
    const stackTrace = err.stack || null;
    const requestMethod = req ? req.method : null;
    const requestUrl = req ? req.originalUrl : null;
    const requestBody = req && req.body ? JSON.stringify(req.body, (key, value) => key.toLowerCase().includes('password') ? '******' : value) : null;
    const userEmail = req && req.user ? req.user.email : (req && req.body ? req.body.email : null);

    const logObject = {
        errorMessage,
        stackTrace,
        requestMethod,
        requestUrl,
        requestBody,
        userEmail,
        timestamp: new Date() // [NOVO] Adiciona timestamp ao objeto
    };

    // [MODIFICADO] Lógica para decidir se grava no DB ou no buffer
    if (pgConnectionStatus.connected) {
        try {
            await _writeErrorToDb(logObject);
        } catch (dbErr) {
            console.error('CRITICAL: Falha ao gravar no log de erros do sistema (DB supostamente online):', dbErr);
            // Se a gravação falhar mesmo com o DB supostamente online, armazena no buffer como fallback
            if (downtimeStartTime === null) downtimeStartTime = new Date();
            const buffer = _readErrorBuffer();
            buffer.push(logObject);
            _writeErrorBuffer(buffer);
        }
    } else {
        if (downtimeStartTime === null) downtimeStartTime = new Date();
        console.log(`[ERROR-BUFFER] DB offline. Erro armazenado em buffer: ${errorMessage}`);
        const buffer = _readErrorBuffer();
        buffer.push(logObject);
        _writeErrorBuffer(buffer);
    }
};

// [NOVO] Função para processar os logs do buffer quando a conexão voltar
const processOfflineLogs = async () => {
    if (isProcessingBuffer) return;
    isProcessingBuffer = true;

    const logsToProcess = _readErrorBuffer();
    _writeErrorBuffer([]); // Limpa o ficheiro do buffer imediatamente

    console.log(`[ERROR-BUFFER] A processar ${logsToProcess.length} erros que ocorreram durante a inatividade.`);

    try {
        // Grava todos os erros no banco de dados
        for (const log of logsToProcess) {
            await _writeErrorToDb(log);
        }

        // Prepara e envia o e-mail de resumo
        const summary = {
            totalErrors: logsToProcess.length,
            startTime: downtimeStartTime ? downtimeStartTime.toLocaleString('pt-BR') : 'N/A',
            endTime: new Date().toLocaleString('pt-BR'),
            errorMessages: logsToProcess.map(l => `<li>${l.timestamp.toLocaleTimeString('pt-BR')}: ${l.errorMessage}</li>`).join('')
        };

        // Lógica de envio de e-mail
        const settingsResult = await pool.query('SELECT email_host, email_port, email_user, email_pass, email_from, email_secure FROM system_settings WHERE id = 1');
        let emailConfig = {};
        if (settingsResult.rows.length > 0 && settingsResult.rows[0].email_host) {
            const dbSettings = settingsResult.rows[0];
            emailConfig = { host: dbSettings.email_host, port: dbSettings.email_port, secure: dbSettings.email_secure, user: dbSettings.email_user, pass: dbSettings.email_pass, from: dbSettings.email_from };
        } else if (process.env.EMAIL_HOST) {
            emailConfig = { host: process.env.EMAIL_HOST, port: process.env.EMAIL_PORT, secure: process.env.EMAIL_SECURE === 'true', user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS, from: process.env.EMAIL_FROM };
        }

        if (emailConfig.host) {
            const mastersResult = await pool.query("SELECT email FROM admin_users WHERE role = 'master'");
            const recipients = mastersResult.rows.map(u => u.email);

            if (recipients.length > 0) {
                const transporter = nodemailer.createTransport({ host: emailConfig.host, port: emailConfig.port, secure: emailConfig.secure, auth: { user: emailConfig.user, pass: emailConfig.pass } });
                const mailOptions = {
                    from: emailConfig.from || emailConfig.user,
                    to: recipients.join(','),
                    subject: `[RESUMO] ${summary.totalErrors} Erros de Sistema Ocorreram Durante Inatividade`,
                    html: `
                        <div style="font-family: Arial, sans-serif; color: #333;">
                            <h2 style="color: #d9534f;">Resumo de Erros do Sistema</h2>
                            <p>O sistema registou erros enquanto a conexão com a base de dados estava indisponível.</p>
                            <p><strong>Período de inatividade (aproximado):</strong> de ${summary.startTime} até ${summary.endTime}.</p>
                            <p><strong>Total de erros registados:</strong> ${summary.totalErrors}</p>
                            <hr>
                            <h3>Mensagens de Erro:</h3>
                            <ul>
                                ${summary.errorMessages}
                            </ul>
                            <br>
                            <p>Os detalhes completos de cada erro foram guardados nos <strong>Logs de Sistema</strong> e podem ser consultados no painel de administração.</p>
                        </div>
                    `
                };
                await transporter.sendMail(mailOptions);
                console.log(`[ERROR-BUFFER] E-mail de resumo enviado para ${recipients.join(',')}.`);
            }
        }
        
        downtimeStartTime = null; // Reseta o tempo de início da inatividade

    } catch (error) {
        console.error('[ERROR-BUFFER] Falha ao processar logs do buffer. Os logs foram movidos de volta para o buffer.', error);
        // Se a gravação falhar, devolve os logs para o ficheiro para tentar novamente
        _writeErrorBuffer(logsToProcess);
    } finally {
        isProcessingBuffer = false;
    }
};

// [NOVO] Verifica periodicamente se a conexão voltou para processar o buffer
setInterval(() => {
    if (pgConnectionStatus.connected && _readErrorBuffer().length > 0 && !isProcessingBuffer) {
        console.log('[ERROR-SERVICE] Conexão com DB restabelecida. A processar logs em buffer...');
        processOfflineLogs();
    }
}, 15000); // Verifica a cada 15 segundos

module.exports = { logError };