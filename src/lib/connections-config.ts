/**
 * Configuração compartilhada para o hub de conexões em /admin/conexoes.
 * Centralizada para reuso futuro em alertas e jobs cron.
 */

/** Limite acima do qual uma conexão é destacada como "muitas falhas seguidas". */
export const CONSECUTIVE_FAILURE_THRESHOLD = 3;
