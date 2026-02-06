// Ficheiro: routes/auth.js
// Descrição: Define as rotas públicas de login e recuperação de senha.
// [ATUALIZADO - CORREÇÃO PARA HOTSPOT/FREERADIUS]

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../connection');
const crypto = require('crypto');
const { logAction } = require('../services/auditLogService');
const authMiddleware = require('../middlewares/authMiddleware');
const { sendPasswordResetEmail } = require('../services/emailService');
const emailValidator = require('deep-email-validator'); // [NOVO] Adicionado para o registo do hotspot

const reauthenticate = async (req, res) => {
    const { email, password } = req.body;
    const userId = req.user.userId;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email e senha são obrigatórios." });
    }

    try {
        const userQuery = await pool.query('SELECT * FROM admin_users WHERE id = $1', [userId]);

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ success: false, message: "Utilizador não encontrado." });
        }

        const user = userQuery.rows[0];

        if (user.email !== email) {
            return res.status(401).json({ success: false, message: "Credenciais inválidas." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: "Credenciais inválidas." });
        }

        res.json({ success: true, message: "Autenticação confirmada com sucesso." });

    } catch (error) {
        console.error('Erro na re-autenticação:', error);
        res.status(500).json({ success: false, message: "Erro interno do servidor." });
    }
};

// --- ROTA DE LOGIN (ADMIN - Inalterada) ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    await logAction({
        req,
        action: 'LOGIN_FAILURE',
        status: 'FAILURE',
        description: `Tentativa de login falhou para o email "${email || 'não fornecido'}": campos em falta.`,
        user_email: email
    });
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    const userQuery = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1',
      [email]
    );

    if (userQuery.rows.length === 0) {
      await logAction({
          req,
          action: 'LOGIN_FAILURE',
          status: 'FAILURE',
          description: `Tentativa de login falhou: utilizador "${email}" não encontrado.`,
          user_email: email
      });
      return res.status(401).json({ 
          code: 'USER_NOT_FOUND', 
          message: "Usuário não cadastrado. Para solicitar acesso, entre em contato com ti@rotatransportes.com.br ou solicite pelo suporte." 
      });
    }

    const user = userQuery.rows[0];

    if (!user.is_active) {
        await logAction({
            req,
            action: 'LOGIN_FAILURE',
            status: 'FAILURE',
            description: `Tentativa de login falhou para "${email}": conta inativa.`,
            user_id: user.id,
            user_email: user.email
        });
        return res.status(403).json({ message: "Esta conta de utilizador está desativada." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      await logAction({
          req,
          action: 'LOGIN_FAILURE',
          status: 'FAILURE',
          description: `Tentativa de login falhou para "${email}": senha incorreta.`,
          user_id: user.id,
          user_email: user.email
      });
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    await logAction({
        req,
        action: 'LOGIN_SUCCESS',
        status: 'SUCCESS',
        description: `Utilizador "${user.email}" autenticado com sucesso.`,
        user_id: user.id,
        user_email: user.email
    });

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.must_change_password 
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.status(200).json({
      message: "Login bem-sucedido!",
      token: token,
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});


// --- ROTA DE SOLICITAÇÃO (ADMIN - Inalterada) ---
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "O e-mail é obrigatório." });
    }

    try {
        const userQuery = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);

        if (userQuery.rows.length === 0) {
            return res.status(200).json({ message: "Se um utilizador com este e-mail existir, um link de recuperação foi enviado." });
        }

        const user = userQuery.rows[0];
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000); 
        
        await pool.query(
            'UPDATE admin_users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [token, expires, user.id]
        );

        await sendPasswordResetEmail(user.email, token);

        res.status(200).json({
            message: "Se um utilizador com este e-mail existir, um link de recuperação foi enviado."
        });

    } catch (error) {
        console.error('Erro em forgot-password:', error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});


// --- ROTA DE DEFINIÇÃO DE SENHA (ADMIN - Inalterada) ---
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: "O token e a nova senha são obrigatórios." });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    try {
        const userQuery = await pool.query(
            'SELECT * FROM admin_users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
        );

        if (userQuery.rows.length === 0) {
            return res.status(400).json({ message: "Token inválido ou expirado. Por favor, solicite um novo." });
        }

        const user = userQuery.rows[0];
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await pool.query(
            `UPDATE admin_users 
             SET password_hash = $1, 
                 reset_token = NULL, 
                 reset_token_expires = NULL,
                 must_change_password = false 
             WHERE id = $2`,
            [passwordHash, user.id]
        );
        
        res.status(200).json({ message: "Senha atualizada com sucesso!" });

    } catch (error) {
        console.error('Erro em reset-password:', error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});

// --- [CORRIGIDO] Rota para registo de utilizadores do hotspot ---
router.post('/register', async (req, res) => {
    const { nomeCompleto, email, senha, telefone, mac, routerName, terms_accepted, accepts_marketing } = req.body;

    try {
        // Validação dos dados de entrada
        if (!nomeCompleto || !email || !senha || !telefone || !mac || !routerName) {
            return res.status(400).json({ message: 'Por favor, preencha todos os campos.' });
        }

        if (senha.length < 6) {
            return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres.' });
        }

        if (terms_accepted !== true) {
            return res.status(400).json({ message: 'É obrigatório aceitar os Termos e Condições para se registar.' });
        }

        // Validação de E-mail Avançada
        const { valid, reason, validators } = await emailValidator.validate(email);
        if (!valid) {
            let errorMessage = 'O endereço de e-mail fornecido não é válido.';
            if (reason === 'disposable') { errorMessage = 'E-mails temporários não são permitidos.'; }
            else if (reason === 'typo' && validators.typo?.did_you_mean) { errorMessage = `Você quis dizer ${validators.typo.did_you_mean}?`; }
            else if (reason === 'mx') { errorMessage = 'O domínio do e-mail não existe ou não pode receber mensagens.'; }
            
            return res.status(400).json({ message: errorMessage });
        }

        // Verifica se o utilizador (e-mail) já existe na tabela radcheck
        const userExists = await pool.query('SELECT username FROM radcheck WHERE username = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'Este e-mail já está registado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(senha, salt);

        // [MELHORIA] Usa uma transação para garantir que ambas as inserções ocorram ou nenhuma ocorra.
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Insere os dados de autenticação na tabela 'radcheck'
            const radCheckQuery = `
                INSERT INTO radcheck (username, attribute, op, value) 
                VALUES ($1, 'Crypt-Password', ':=', $2)
            `;
            await client.query(radCheckQuery, [email, hashedPassword]);

            // 2. Insere os dados adicionais na tabela 'userdetails'
            const userDetailsQuery = `
                INSERT INTO userdetails (username, nome_completo, telefone, mac_address, router_name, terms_accepted_at, accepts_marketing) 
                VALUES ($1, $2, $3, $4, $5, NOW(), $6)
                RETURNING id;
            `;
            const newUser = await client.query(userDetailsQuery, [email, nomeCompleto, telefone, mac, routerName, !!accepts_marketing]);
            
            await client.query('COMMIT');

            // Log de auditoria (após o commit bem-sucedido)
            await logAction({
                action: 'HOTSPOT_USER_REGISTER',
                status: 'SUCCESS',
                description: `Novo utilizador do hotspot registado: "${email}" no roteador "${routerName}".`,
                target_type: 'hotspot_user',
                target_id: newUser.rows[0].id
            });

            res.status(201).json({
                message: 'Utilizador registado com sucesso!',
            });

        } catch (e) {
            await client.query('ROLLBACK');
            throw e; // Re-lança o erro para ser capturado pelo catch externo
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Erro no registo de utilizador do hotspot:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao processar o registo.' });
    }
});

router.post('/re-authenticate', authMiddleware, reauthenticate);

module.exports = router;
