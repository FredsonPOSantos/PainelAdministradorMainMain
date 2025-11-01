// Importa a biblioteca de criptografia que já instalámos
const bcrypt = require('bcrypt');

// --- IMPORTANTE: MODIFIQUE AQUI ---
// 1. Defina a senha que você deseja usar para o utilizador master.
const senhaPlana = 'R0T@2468'; // Troque para uma senha forte de sua escolha

// O "salt rounds" é o custo do processamento. 10 é um valor padrão e seguro.
const saltRounds = 10;

// Gera o hash da senha de forma síncrona
const hash = bcrypt.hashSync(senhaPlana, saltRounds);

// Exibe o resultado no terminal
console.log('--- SENHA CRIPTOGRAFADA (HASH) ---');
console.log(hash);
console.log('------------------------------------');
console.log('Copie a linha de cima (o hash) para usar no próximo passo.');
