// Ficheiro: backend/services/emailService.js
// Descrição: Serviço centralizado para envio de e-mails.

const nodemailer = require('nodemailer');

// Configuração do transporter do Nodemailer usando as variáveis de ambiente
const transporter = nodemailer.createTransport({
    name: process.env.EMAIL_HOST, // [NOVO] Ajuda na identificação com alguns provedores
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true', // true para 465, false para outras portas
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        // [NOVO] Não rejeita certificados auto-assinados ou com problemas de cadeia
        rejectUnauthorized: false
    }
});

/**
 * Envia um e-mail de recuperação de senha.
 * @param {string} to - O e-mail do destinatário.
 * @param {string} token - O token de reset de senha.
 */
const sendPasswordResetEmail = async (to, token) => {
    // Assume que o frontend está a correr na porta 8184
    const frontendBaseUrl = `http://127.0.0.1:8184`; 
    const resetUrl = `${frontendBaseUrl}/admin_reset_password.html?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: to,
        subject: 'Recuperação de Senha - Painel Rota Hotspot',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Recuperação de Senha</h2>
                <p>Recebemos um pedido para redefinir a sua senha no Painel de Administração Rota Hotspot.</p>
                <p>Por favor, clique no link abaixo para criar uma nova senha. Este link é válido por 1 hora.</p>
                <p style="margin: 20px 0;">
                    <a href="${resetUrl}" style="background-color: #4299e1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                        Redefinir Minha Senha
                    </a>
                </p>
                <p>Se não solicitou esta alteração, pode ignorar este e-mail com segurança.</p>
                <hr>
                <p style="font-size: 0.8em; color: #777;">Este é um e-mail automático, por favor não responda.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] E-mail de recuperação enviado para: ${to}`);
    } catch (error) {
        console.error(`[EmailService] Falha ao enviar e-mail para ${to}:`, error);
        // Não lançamos o erro para não expor falhas internas ao utilizador final
    }
};

/**
 * Envia um e-mail de notificação sobre um novo pedido de exclusão de dados.
 * @param {object} requesterInfo - Informações do solicitante.
 * @param {string} requesterInfo.name - Nome completo do solicitante.
 * @param {string} requesterInfo.email - E-mail do solicitante.
 */
const sendExclusionRequestNotificationEmail = async (requesterInfo) => {
    // O e-mail do DPO ou da equipa de TI pode ser movido para as variáveis de ambiente no futuro.
    const notificationRecipient = 'ti@rotatransportes.com.br';

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: notificationRecipient,
        subject: 'Novo Pedido de Exclusão de Dados (LGPD)',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <h2>Novo Pedido de Exclusão de Dados</h2>
                <p>Um utilizador solicitou a exclusão dos seus dados do sistema Rota Hotspot.</p>
                <ul>
                    <li><strong>Nome Completo:</strong> ${requesterInfo.name}</li>
                    <li><strong>E-mail:</strong> ${requesterInfo.email}</li>
                </ul>
                <p><strong>O utilizador declarou estar ciente dos termos da exclusão.</strong></p>
                <p>Por favor, aceda à área de "Gestão de Dados" no painel de administração para processar este pedido.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail, sendExclusionRequestNotificationEmail };