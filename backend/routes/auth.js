// Ficheiro: routes/auth.js
// Descrição: Define as rotas públicas de login e recuperação de senha.
// [ATUALIZADO - FASE 2.2 - PARTE 2]

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../connection');
const crypto = require('crypto');

// --- ROTA DE LOGIN (Existente) ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email e senha são obrigatórios." });
  }

  try {
    const userQuery = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1',
      [email]
    );

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

    const user = userQuery.rows[0];

    // Verifica se o utilizador está ativo
    if (!user.is_active) {
        return res.status(403).json({ message: "Esta conta de utilizador está desativada." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Credenciais inválidas." });
    }

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

        // 5. Enviar o e-mail (Simulação)
        // (O seu serviço de e-mail enviaria o link: `http://SEU_FRONTEND/admin_reset_password.html?token=${token}`)
        
        res.status(200).json({
            message: `[SIMULAÇÃO] E-mail enviado. O link de recuperação conteria este token (copie-o para testar): ${token}`
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


module.exports = router;

