// ════════════════════════════════════════════════════════
// Amanda AI — Long-Term Memory Service
// ════════════════════════════════════════════════════════

import { query, queryOne } from '../../database/connection';
import { Cliente } from '../../types';
import { logger } from '../../utils/logger';

export async function getOrCreateClient(telefone: string, nome?: string): Promise<Cliente> {
  const existing = await queryOne<Cliente>(
    'SELECT * FROM clientes WHERE telefone = $1',
    [telefone]
  );

  if (existing) {
    if (nome && nome !== existing.nome) {
      await query(
        'UPDATE clientes SET nome = $1, nome_preferido = $2, atualizado_em = NOW() WHERE id = $3',
        [nome, nome.split(' ')[0], existing.id]
      );
      existing.nome = nome;
    }
    return existing;
  }

  const [criado] = await query<Cliente>(
    `INSERT INTO clientes (telefone, nome, nome_preferido)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [telefone, nome ?? null, nome ? nome.split(' ')[0] : null]
  );

  logger.info({ telefone, nome }, 'Novo cliente criado');
  return criado!;
}

export async function updateClientLastContact(clienteId: string): Promise<void> {
  await query(
    'UPDATE clientes SET ultima_interacao = NOW(), atualizado_em = NOW() WHERE id = $1',
    [clienteId]
  );
}

export async function markClientOptOut(clienteId: string): Promise<void> {
  await query(
    `UPDATE clientes
     SET opt_out = TRUE, opt_out_em = NOW(), ia_ativa = FALSE, atualizado_em = NOW()
     WHERE id = $1`,
    [clienteId]
  );
  logger.info({ clienteId }, 'Cliente marcado como opt-out');
}

export async function salvarInteracaoMemoria(
  clienteId: string,
  mensagemCliente: string,
  resumoAnalise: string
): Promise<void> {
  const { saveMemory } = await import('./vector.service');
  const texto = `Cliente: "${mensagemCliente}" | Análise: "${resumoAnalise}"`;
  await saveMemory(clienteId, texto, 'interacao').catch(() => null);
}

export async function getClientSummary(clienteId: string): Promise<string> {
  const cliente = await queryOne<Cliente>(
    'SELECT * FROM clientes WHERE id = $1',
    [clienteId]
  );
  if (!cliente) return '';

  const partes: string[] = [];

  if (cliente.total_pedidos > 0) {
    partes.push(`Cliente com ${cliente.total_pedidos} compra(s) anterior(es).`);
  }

  if (cliente.emocao_recorrente) {
    partes.push(`Emoção predominante: ${cliente.emocao_recorrente}.`);
  }

  if (cliente.produtos_citados?.length) {
    partes.push(`Produtos de interesse: ${cliente.produtos_citados.slice(0, 3).join(', ')}.`);
  }

  if (cliente.perfil_psicologico) {
    partes.push(`Perfil: ${cliente.perfil_psicologico}.`);
  }

  return partes.join(' ');
}
