// Ficheiro: middlewares/roleMiddleware.js
// [VERSÃO 13.6.1 - PERMISSÕES GRANULARES]
// Descrição: Middleware que verifica se a função (role) do utilizador tem uma permissão específica.

const checkPermission = (permissionKey) => {
  return (req, res, next) => {
    // O middleware authMiddleware deve ter sido executado antes, populando req.user
    if (!req.user || !req.user.permissions || !req.user.role) {
      return res.status(403).json({ message: "Acesso negado. Permissões do utilizador não disponíveis." });
    }

    // Bypass para 'master', exceto para LGPD e LOGS
    const role = req.user.role;
    if (role === 'master') {
      const deniedForMaster = new Set(['logs.read', 'lgpd.read', 'lgpd.update']);
      if (!deniedForMaster.has(permissionKey)) {
        return next();
      }
      // Se for uma permissão negada explicitamente, continua a verificação normal
    }

    const userPermissions = req.user.permissions;
    if (userPermissions[permissionKey]) {
      return next();
    }
    return res.status(403).json({ message: `Acesso negado. Permissão necessária: '${permissionKey}'` });
  };
};

module.exports = checkPermission;

