-- ════════════════════════════════════════════════════════
-- Amanda AI — Fix Schema v2
-- Execute este SQL no Supabase SQL Editor
-- Adiciona colunas que faltam nas tabelas existentes
-- ════════════════════════════════════════════════════════

-- ── Tabela clientes: colunas faltando ─────────────────────
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nome_preferido TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estado TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS pais TEXT DEFAULT 'BR';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS genero TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cliente_desde TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultima_interacao TIMESTAMPTZ;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultima_compra TIMESTAMPTZ;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS total_pedidos INTEGER DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS valor_total_gasto NUMERIC(10,2) DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ticket_medio NUMERIC(10,2) DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS categoria_favorita TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS preferencias JSONB DEFAULT '{}';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS produtos_citados TEXT[] DEFAULT '{}';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS objecoes TEXT[] DEFAULT '{}';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS estilo_detectado TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tamanho_habitual TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS emocao_recorrente TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS perfil_emocional JSONB DEFAULT '{}';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS perfil_psicologico TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS nivel_engajamento TEXT DEFAULT 'frio';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS temperatura_lead INTEGER DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS etapa_funil TEXT DEFAULT 'topo';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS horario_preferido TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS padrao_interacao TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS frequencia_media TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS opt_out BOOLEAN DEFAULT FALSE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS opt_out_em TIMESTAMPTZ;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT FALSE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS humano_assumiu BOOLEAN DEFAULT FALSE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ia_ativa BOOLEAN DEFAULT TRUE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

-- ── Tabela conversas: colunas faltando ───────────────────
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS canal TEXT DEFAULT 'whatsapp';
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativa';
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS contexto_resumido TEXT;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS ultima_mensagem TEXT;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS ultima_mensagem_em TIMESTAMPTZ;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS quantidade_mensagens INTEGER DEFAULT 0;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS emocao_detectada TEXT;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS intencao_principal TEXT;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS handoff_ativo BOOLEAN DEFAULT FALSE;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS handoff_iniciado_em TIMESTAMPTZ;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS handoff_por TEXT;
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE conversas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

-- ── Tabela mensagens: colunas faltando ───────────────────
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS conversa_id UUID;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS cliente_id UUID;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'texto';
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS conteudo TEXT;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS conteudo_processado TEXT;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS direcao TEXT DEFAULT 'entrada';
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'cliente';
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS emocao_detectada TEXT;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS intencao_detectada TEXT;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS comportamentos TEXT[] DEFAULT '{}';
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS sentimento_score NUMERIC(3,2);
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS zapi_message_id TEXT UNIQUE;
ALTER TABLE mensagens ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();

-- ── Tabela followups: colunas faltando ────────────────────
ALTER TABLE followups ADD COLUMN IF NOT EXISTS cliente_id UUID;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS conversa_id UUID;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'reativacao';
ALTER TABLE followups ADD COLUMN IF NOT EXISTS etapa TEXT DEFAULT '20_min';
ALTER TABLE followups ADD COLUMN IF NOT EXISTS contexto_utilizado JSONB DEFAULT '{}';
ALTER TABLE followups ADD COLUMN IF NOT EXISTS agendado_para TIMESTAMPTZ;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendente';
ALTER TABLE followups ADD COLUMN IF NOT EXISTS tentativas INTEGER DEFAULT 0;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS cancelado_por TEXT;
ALTER TABLE followups ADD COLUMN IF NOT EXISTS criado_em TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE followups ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

-- ── Tabela followup_logs: garantir existência ─────────────
CREATE TABLE IF NOT EXISTS followup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  followup_id UUID,
  cliente_id UUID,
  mensagem TEXT,
  status TEXT DEFAULT 'enviado',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela lead_scores: garantir existência ───────────────
CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  mensagem_id UUID,
  tipo_evento TEXT NOT NULL,
  pontos INTEGER NOT NULL DEFAULT 0,
  score_anterior INTEGER DEFAULT 0,
  score_resultante INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela eventos: garantir existência ───────────────────
CREATE TABLE IF NOT EXISTS eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID,
  conversa_id UUID,
  mensagem_id UUID,
  tipo_evento TEXT NOT NULL,
  dados JSONB DEFAULT '{}',
  pontos_score INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela emocao_analise: garantir existência ────────────
CREATE TABLE IF NOT EXISTS emocao_analise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID,
  conversa_id UUID,
  mensagem_id UUID,
  emocao TEXT NOT NULL,
  intensidade NUMERIC(3,2) DEFAULT 0.5,
  confianca NUMERIC(3,2) DEFAULT 0.5,
  contexto TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela customer_behavior_profile: garantir existência ─
CREATE TABLE IF NOT EXISTS customer_behavior_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID UNIQUE NOT NULL,
  horarios_ativo INTEGER[] DEFAULT '{}',
  categorias_interesse TEXT[] DEFAULT '{}',
  produtos_citados TEXT[] DEFAULT '{}',
  tamanhos_citados TEXT[] DEFAULT '{}',
  objecoes_recorrentes TEXT[] DEFAULT '{}',
  usa_audio BOOLEAN DEFAULT FALSE,
  envia_imagens BOOLEAN DEFAULT FALSE,
  responde_rapido BOOLEAN DEFAULT FALSE,
  comprou_antes BOOLEAN DEFAULT FALSE,
  total_interacoes INTEGER DEFAULT 0,
  sessoes_distintas INTEGER DEFAULT 0,
  ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela handoffs: garantir existência ─────────────────
CREATE TABLE IF NOT EXISTS handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID,
  cliente_id UUID,
  motivo TEXT,
  status TEXT DEFAULT 'ativo',
  assumido_por TEXT,
  resolvido_em TIMESTAMPTZ,
  resolvido_por TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela memoria_curta: garantir existência ────────────
CREATE TABLE IF NOT EXISTS memoria_curta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL,
  cliente_id UUID,
  conteudo TEXT NOT NULL,
  direcao TEXT DEFAULT 'entrada',
  tipo TEXT DEFAULT 'texto',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Tabela memoria_longa: garantir existência ────────────
CREATE TABLE IF NOT EXISTS memoria_longa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT DEFAULT 'interacao',
  relevancia NUMERIC(3,2) DEFAULT 0.5,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes úteis ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_opt_out ON clientes(opt_out);
CREATE INDEX IF NOT EXISTS idx_conversas_cliente ON conversas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_status ON conversas(status);
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_zapi ON mensagens(zapi_message_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_agendado ON followups(agendado_para);
CREATE INDEX IF NOT EXISTS idx_followups_cliente ON followups(cliente_id);
CREATE INDEX IF NOT EXISTS idx_eventos_cliente ON eventos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_emocao_cliente ON emocao_analise(cliente_id);
CREATE INDEX IF NOT EXISTS idx_memoria_curta_conversa ON memoria_curta(conversa_id);
CREATE INDEX IF NOT EXISTS idx_memoria_longa_cliente ON memoria_longa(cliente_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_cliente ON lead_scores(cliente_id);

SELECT 'Schema v2 aplicado com sucesso!' AS resultado;

-- ── Expandir coluna telefone para suportar números mais longos ──
ALTER TABLE clientes ALTER COLUMN telefone TYPE VARCHAR(50);
