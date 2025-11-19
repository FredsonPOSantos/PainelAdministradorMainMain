// Ficheiro: routes/auth.js
// Descrição: Define as rotas públicas de login e recuperação de senha.
// [ATUALIZADO - FASE 2.2 - PARTE 2]

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../connection');
const crypto = require('crypto');
const { logAction } = require('../services/auditLogService'); // [NOVO] Importa o serviço de log
const authMiddleware = require('../middlewares/authMiddleware');
const { sendPasswordResetEmail } = require('../services/emailService'); // [NOVO] Importa o serviço de e-mail

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

// --- ROTA DE LOGIN (Existente) ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    // [NOVO] Log de tentativa de login falhada (dados em falta)
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
      // [NOVO] Log de utilizador não encontrado
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

    // Verifica se o utilizador está ativo
    if (!user.is_active) {
        // [NOVO] Log de conta inativa
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
      // [NOVO] Log de senha incorreta
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

    // [NOVO] Log de login bem-sucedido
    await logAction({
        req,
        action: 'LOGIN_SUCCESS',
        status: 'SUCCESS',
        description: `Utilizador "${user.email}" autenticado com sucesso.`,
        user_id: user.id,
        user_email: user.email
    });

    // Adiciona a flag 'must_change_password' ao payload
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


// --- ROTA DE SOLICITAÇÃO (Existente) ---
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "O e-mail é obrigatório." });
    }

    try {
        // 1. Encontrar o utilizador
        const userQuery = await pool.query('SELECT * FROM admin_users WHERE email = $1', [email]);

        if (userQuery.rows.length === 0) {
            return res.status(200).json({ message: "Se um utilizador com este e-mail existir, um link de recuperação foi enviado." });
        }

        const user = userQuery.rows[0];
        
        // 2. Gerar um token seguro
        const token = crypto.randomBytes(32).toString('hex');
        
        // 3. Definir um tempo de expiração (1 hora)
        const expires = new Date(Date.now() + 3600000); 
        
        // 4. Salvar o token no utilizador
        await pool.query(
            'UPDATE admin_users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
            [token, expires, user.id]
        );

        // 5. Enviar o e-mail de recuperação
        await sendPasswordResetEmail(user.email, token);

        res.status(200).json({
            message: "Se um utilizador com este e-mail existir, um link de recuperação foi enviado."
        });

    } catch (error) {
        console.error('Erro em forgot-password:', error);
        res.status(500).json({ message: "Erro interno do servidor." });
    }
});


// --- [NOVA ROTA - FASE 2.2] Definição da Nova Senha ---
// Esta é a rota que está a dar 404. Certifique-se de que ela existe no seu ficheiro.
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
        return res.status(400).json({ message: "O token e a nova senha são obrigatórios." });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "A nova senha deve ter pelo menos 6 caracteres." });
    }

    try {
        // 1. Encontrar o utilizador pelo token E verificar se não expirou
        const userQuery = await pool.query(
            'SELECT * FROM admin_users WHERE reset_token = $1 AND reset_token_expires > NOW()',
            [token]
        );

        if (userQuery.rows.length === 0) {
            return res.status(400).json({ message: "Token inválido ou expirado. Por favor, solicite um novo." });
        }

        const user = userQuery.rows[0];

        // 2. Gerar o hash da nova senha
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // 3. Atualizar a senha e limpar os campos de reset
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

// [NOVO] Rota para registo de utilizadores do hotspot
router.post('/register', async (req, res) => {
    const { nomeCompleto, email, telefone, senha, mac, routerName, accepts_marketing, terms_accepted } = req.body;

    // Validação de entrada
    if (!nomeCompleto || !email || !senha || !mac || !routerName) {
        return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }
    if (terms_accepted !== true) {
        return res.status(400).json({ message: 'É necessário aceitar os Termos e Condições.' });
    }

    try {
        // Verifica se o e-mail já está em uso
        const userExists = await pool.query('SELECT id FROM userdetails WHERE username = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(409).json({ message: 'Este e-mail já está cadastrado.' });
        }

        // Criptografa a senha
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(senha, salt);

        // Insere o novo utilizador na base de dados
        const query = `
            INSERT INTO userdetails (username, nome_completo, telefone, password, mac_address, router_name, accepts_marketing, terms_accepted_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING id;
        `;
        const values = [email, nomeCompleto, telefone, passwordHash, mac, routerName, !!accepts_marketing];
        
        const newUser = await pool.query(query, values);

        // Log de auditoria (não precisa de 'req' pois é uma rota pública)
        await logAction({
            action: 'HOTSPOT_USER_REGISTER',
            status: 'SUCCESS',
            description: `Novo utilizador do hotspot registado: "${email}" no roteador "${routerName}".`,
            target_type: 'hotspot_user',
            target_id: newUser.rows[0].id
        });

        res.status(201).json({ message: 'Cadastro realizado com sucesso!' });

    } catch (error) {
        console.error('Erro no registo de utilizador do hotspot:', error);
        res.status(500).json({ message: 'Erro interno do servidor.' });
    }
});

router.post('/re-authenticate', authMiddleware, reauthenticate);


module.exports = router;
