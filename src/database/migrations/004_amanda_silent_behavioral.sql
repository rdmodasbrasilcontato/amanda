-- ════════════════════════════════════════════════════════════════════════════
-- Amanda AI — Schema Completo: Silent Behavioral AI
-- Migração 004 — Reconstrução total com nomes em português
-- ════════════════════════════════════════════════════════════════════════════

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─────────────────────────────────────────────────────────────────────────────
-- DROP na ordem correta (respeitando FKs)
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS followup_logs CASCADE;
DROP TABLE IF EXISTS followups CASCADE;
DROP TABLE IF EXISTS handoffs CASCADE;
DROP TABLE IF EXISTS emocao_analise CASCADE;
DROP TABLE IF EXISTS eventos CASCADE;
DROP TABLE IF EXISTS customer_behavior_profile CASCADE;
DROP TABLE IF EXISTS lead_scores CASCADE;
DROP TABLE IF EXISTS memoria_longa CASCADE;
DROP TABLE IF EXISTS memoria_curta CASCADE;
DROP TABLE IF EXISTS embeddings CASCADE;
DROP TABLE IF EXISTS documentos_recebidos CASCADE;
DROP TABLE IF EXISTS audios_recebidos CASCADE;
DROP TABLE IF EXISTS imagens_recebidas CASCADE;
DROP TABLE IF EXISTS mensagens CASCADE;
DROP TABLE IF EXISTS conversas CASCADE;
DROP TABLE IF EXISTS campanhas CASCADE;
DROP TABLE IF EXISTS pagamentos_pix CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS carrinhos CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS cliente_tags CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS fila_processamento CASCADE;
DROP TABLE IF EXISTS whatsapp_instances CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS midias CASCADE;

-- Funções antigas
DROP FUNCTION IF EXISTS buscar_memoria_cliente CASCADE;
DROP FUNCTION IF EXISTS buscar_produtos_semantico CASCADE;
DROP FUNCTION IF EXISTS atualizar_temperatura_lead CASCADE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CLIENTES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE clientes (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefone             VARCHAR(20) NOT NULL UNIQUE,
  nome                 VARCHAR(200),
  nome_preferido       VARCHAR(100),
  email                VARCHAR(200),
  instagram            VARCHAR(100),
  cidade               VARCHAR(100),
  estado               VARCHAR(50),
  pais                 VARCHAR(50) DEFAULT 'Brasil',
  data_nascimento      DATE,
  genero               VARCHAR(20),

  -- Histórico de compras
  cliente_desde        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_interacao     TIMESTAMPTZ,
  ultima_compra        TIMESTAMPTZ,
  total_pedidos        INTEGER DEFAULT 0,
  valor_total_gasto    DECIMAL(12,2) DEFAULT 0,
  ticket_medio         DECIMAL(12,2) DEFAULT 0,

  -- Preferências detectadas
  categoria_favorita   VARCHAR(100),
  preferencias         JSONB DEFAULT '{}',
  produtos_citados     TEXT[] DEFAULT '{}',
  objecoes             TEXT[] DEFAULT '{}',
  estilo_detectado     VARCHAR(100),
  tamanho_habitual     VARCHAR(20),

  -- Perfil emocional e comportamental
  emocao_recorrente    VARCHAR(50),
  perfil_emocional     JSONB DEFAULT '{}',
  perfil_psicologico   TEXT,
  nivel_engajamento    VARCHAR(20) DEFAULT 'frio'
                       CHECK (nivel_engajamento IN ('frio','morno','quente','muito_quente','vip')),
  temperatura_lead     INTEGER DEFAULT 0 CHECK (temperatura_lead BETWEEN 0 AND 200),
  etapa_funil          VARCHAR(20) DEFAULT 'topo'
                       CHECK (etapa_funil IN ('topo','meio','fundo','cliente','recompra')),

  -- Horário e padrão de interação
  horario_preferido    VARCHAR(50),
  padrao_interacao     VARCHAR(100),
  frequencia_media     VARCHAR(50),

  -- Status e controle
  status               VARCHAR(20) DEFAULT 'ativo'
                       CHECK (status IN ('ativo','inativo','bloqueado','vip')),
  opt_out              BOOLEAN DEFAULT FALSE,
  opt_out_em           TIMESTAMPTZ,
  bloqueado            BOOLEAN DEFAULT FALSE,
  humano_assumiu       BOOLEAN DEFAULT FALSE,
  ia_ativa             BOOLEAN DEFAULT TRUE,
  observacoes          TEXT,

  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_telefone ON clientes(telefone);
CREATE INDEX idx_clientes_status ON clientes(status);
CREATE INDEX idx_clientes_temperatura ON clientes(temperatura_lead DESC);
CREATE INDEX idx_clientes_ultima_interacao ON clientes(ultima_interacao DESC NULLS LAST);
CREATE INDEX idx_clientes_opt_out ON clientes(opt_out) WHERE opt_out = FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CONVERSAS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE conversas (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id               UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  canal                    VARCHAR(30) DEFAULT 'whatsapp',
  status                   VARCHAR(20) DEFAULT 'ativa'
                           CHECK (status IN ('ativa','encerrada','handoff','opt_out','bloqueada')),

  -- Contexto
  contexto_resumido        TEXT,
  ultima_mensagem          TEXT,
  ultima_mensagem_em       TIMESTAMPTZ,
  quantidade_mensagens     INTEGER DEFAULT 0,

  -- Análise
  emocao_detectada         VARCHAR(50),
  lead_score               INTEGER DEFAULT 0,
  etapa_funil              VARCHAR(20) DEFAULT 'topo',
  intencao_principal       VARCHAR(100),

  -- Handoff
  handoff_ativo            BOOLEAN DEFAULT FALSE,
  handoff_iniciado_em      TIMESTAMPTZ,
  handoff_por              VARCHAR(100),

  -- Follow-up
  followup_ativo           BOOLEAN DEFAULT TRUE,
  proximo_followup_em      TIMESTAMPTZ,
  tentativa_followup       INTEGER DEFAULT 0,

  -- Origem
  origem                   VARCHAR(100),
  metadata                 JSONB DEFAULT '{}',

  criado_em                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversas_cliente_id ON conversas(cliente_id);
CREATE INDEX idx_conversas_status ON conversas(status);
CREATE INDEX idx_conversas_ultima_mensagem_em ON conversas(ultima_mensagem_em DESC NULLS LAST);
CREATE INDEX idx_conversas_handoff ON conversas(handoff_ativo) WHERE handoff_ativo = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. MENSAGENS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE mensagens (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversa_id          UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  cliente_id           UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,

  -- Conteúdo
  tipo                 VARCHAR(30) DEFAULT 'texto'
                       CHECK (tipo IN ('texto','imagem','audio','video','pdf','url','sticker','localizacao')),
  conteudo             TEXT,
  conteudo_original    TEXT,
  conteudo_processado  TEXT,

  -- Direção e origem
  direcao              VARCHAR(10) NOT NULL DEFAULT 'entrada'
                       CHECK (direcao IN ('entrada','saida')),
  origem               VARCHAR(20) DEFAULT 'cliente'
                       CHECK (origem IN ('cliente','ia','humano','sistema')),

  -- Análise da IA
  emocao_detectada     VARCHAR(50),
  intencao_detectada   VARCHAR(100),
  comportamentos       TEXT[] DEFAULT '{}',
  sentimento_score     DECIMAL(4,3),
  spam_score           DECIMAL(4,3) DEFAULT 0,
  pontos_score         INTEGER DEFAULT 0,

  -- Mídia
  arquivo_url          TEXT,
  transcricao_audio    TEXT,
  descricao_imagem     TEXT,
  texto_extraido       TEXT,

  -- Metadados técnicos
  tokens_entrada       INTEGER,
  tokens_saida         INTEGER,
  modelo_usado         VARCHAR(50),
  tempo_processamento  INTEGER,
  zapi_message_id      VARCHAR(200),

  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mensagens_conversa_id ON mensagens(conversa_id);
CREATE INDEX idx_mensagens_cliente_id ON mensagens(cliente_id);
CREATE INDEX idx_mensagens_direcao ON mensagens(direcao);
CREATE INDEX idx_mensagens_criado_em ON mensagens(criado_em DESC);
CREATE UNIQUE INDEX idx_mensagens_zapi_id ON mensagens(zapi_message_id)
  WHERE zapi_message_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LEAD SCORES (histórico de pontuação)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE lead_scores (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id           UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem_id          UUID REFERENCES mensagens(id) ON DELETE SET NULL,

  evento               VARCHAR(100) NOT NULL,
  pontos_adicionados   INTEGER NOT NULL DEFAULT 0,
  score_resultante     INTEGER NOT NULL DEFAULT 0,
  temperatura          VARCHAR(20) NOT NULL DEFAULT 'frio'
                       CHECK (temperatura IN ('frio','morno','quente','muito_quente')),

  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_scores_cliente_id ON lead_scores(cliente_id);
CREATE INDEX idx_lead_scores_criado_em ON lead_scores(criado_em DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. CUSTOMER BEHAVIOR PROFILE (perfil psicológico acumulado)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE customer_behavior_profile (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id               UUID NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,

  -- Perfil psicológico
  perfil_psicologico       TEXT,
  estilo_comunicacao       VARCHAR(100),
  nivel_confianca          VARCHAR(30),
  perfil_decisao           VARCHAR(50),

  -- Padrões de interação
  horario_preferido        VARCHAR(50),
  horarios_ativo           JSONB DEFAULT '{}',
  tempo_resposta_medio     INTEGER,
  frequencia_interacao     VARCHAR(50),
  padrao_mensagens         VARCHAR(100),

  -- Interesses detectados
  categorias_interesse     TEXT[] DEFAULT '{}',
  produtos_citados         TEXT[] DEFAULT '{}',
  ocasioes_mencionadas     TEXT[] DEFAULT '{}',
  estilos_preferidos       TEXT[] DEFAULT '{}',
  tamanhos_citados         TEXT[] DEFAULT '{}',
  cores_preferidas         TEXT[] DEFAULT '{}',
  faixa_preco_interesse    JSONB DEFAULT '{}',

  -- Objeções e barreiras
  objecoes_recorrentes     TEXT[] DEFAULT '{}',
  barreiras_compra         TEXT[] DEFAULT '{}',
  sensibilidade_preco      VARCHAR(30),

  -- Sinais comportamentais
  envia_audios             BOOLEAN DEFAULT FALSE,
  envia_imagens            BOOLEAN DEFAULT FALSE,
  responde_rapido          BOOLEAN DEFAULT FALSE,
  volta_sem_comprar        BOOLEAN DEFAULT FALSE,
  pede_fotos               BOOLEAN DEFAULT FALSE,
  pergunta_tamanho         BOOLEAN DEFAULT FALSE,
  pergunta_preco           BOOLEAN DEFAULT FALSE,
  menciona_urgencia        BOOLEAN DEFAULT FALSE,
  menciona_ocasioes        BOOLEAN DEFAULT FALSE,

  -- Scoring
  ticket_provavel          DECIMAL(12,2),
  probabilidade_compra     DECIMAL(4,3),
  nivel_urgencia           VARCHAR(20),
  intensidade_emocional    DECIMAL(4,3),
  recorrencia              VARCHAR(50),

  total_interacoes         INTEGER DEFAULT 0,
  total_followups          INTEGER DEFAULT 0,
  followups_respondidos    INTEGER DEFAULT 0,

  atualizado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cbp_cliente_id ON customer_behavior_profile(cliente_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. EVENTOS COMPORTAMENTAIS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE eventos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id   UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id  UUID REFERENCES conversas(id) ON DELETE SET NULL,
  mensagem_id  UUID REFERENCES mensagens(id) ON DELETE SET NULL,

  tipo_evento  VARCHAR(100) NOT NULL,
  dados        JSONB DEFAULT '{}',
  pontos_score INTEGER DEFAULT 0,

  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eventos_cliente_id ON eventos(cliente_id);
CREATE INDEX idx_eventos_tipo ON eventos(tipo_evento);
CREATE INDEX idx_eventos_criado_em ON eventos(criado_em DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. ANÁLISE EMOCIONAL (histórico)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE emocao_analise (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id   UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem_id  UUID REFERENCES mensagens(id) ON DELETE SET NULL,

  emocao       VARCHAR(50) NOT NULL,
  intensidade  DECIMAL(4,3) DEFAULT 0.5,
  confianca    DECIMAL(4,3) DEFAULT 0.5,
  contexto     TEXT,

  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emocao_analise_cliente_id ON emocao_analise(cliente_id);
CREATE INDEX idx_emocao_analise_criado_em ON emocao_analise(criado_em DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. MEMÓRIA CURTA (contexto da conversa ativa - cache DB)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE memoria_curta (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id   UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id  UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  mensagem_id  UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  conteudo     TEXT NOT NULL,
  contexto     TEXT,
  relevancia   DECIMAL(4,3) DEFAULT 0.5,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memoria_curta_conversa ON memoria_curta(conversa_id);
CREATE INDEX idx_memoria_curta_cliente ON memoria_curta(cliente_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. MEMÓRIA LONGA (embeddings semânticos)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE memoria_longa (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_memoria      VARCHAR(50) NOT NULL
                    CHECK (tipo_memoria IN (
                      'preferencia','emocao','compra','comportamento',
                      'objecao','estilo','tamanho','historico','interacao','perfil'
                    )),
  conteudo          TEXT NOT NULL,
  resumo            TEXT,
  embedding         vector(1536),
  importancia       DECIMAL(4,3) DEFAULT 0.5,
  ultima_utilizacao TIMESTAMPTZ,
  frequencia        INTEGER DEFAULT 1,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_memoria_longa_cliente ON memoria_longa(cliente_id);
CREATE INDEX idx_memoria_longa_tipo ON memoria_longa(tipo_memoria);
CREATE INDEX idx_memoria_longa_embedding ON memoria_longa
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. EMBEDDINGS (índice global de vetores)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE embeddings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referencia_tipo     VARCHAR(30) NOT NULL
                      CHECK (referencia_tipo IN ('produto','mensagem','memoria','cliente')),
  referencia_id       UUID NOT NULL,
  conteudo_original   TEXT NOT NULL,
  embedding           vector(1536) NOT NULL,
  modelo_embedding    VARCHAR(100) DEFAULT 'text-embedding-3-small',
  criado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_embeddings_referencia ON embeddings(referencia_tipo, referencia_id);
CREATE INDEX idx_embeddings_vector ON embeddings
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. FOLLOWUPS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE followups (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id           UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id          UUID REFERENCES conversas(id) ON DELETE SET NULL,

  tipo                 VARCHAR(50) DEFAULT 'reativacao'
                       CHECK (tipo IN (
                         'reativacao','abandono','pos_venda',
                         'engajamento','carrinho','loop_mensal'
                       )),
  etapa                VARCHAR(20) NOT NULL
                       CHECK (etapa IN (
                         '20_min','3_horas','8_horas','1_dia',
                         '3_dias','7_dias','15_dias','30_dias'
                       )),

  mensagem_gerada      TEXT,
  contexto_utilizado   JSONB DEFAULT '{}',

  status               VARCHAR(20) DEFAULT 'pendente'
                       CHECK (status IN ('pendente','enviado','cancelado','falhou','pausado')),
  motivo_cancelamento  VARCHAR(100),
  opt_out              BOOLEAN DEFAULT FALSE,

  agendado_para        TIMESTAMPTZ NOT NULL,
  enviado_em           TIMESTAMPTZ,
  tentativas           INTEGER DEFAULT 0,

  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followups_cliente_id ON followups(cliente_id);
CREATE INDEX idx_followups_status ON followups(status);
CREATE INDEX idx_followups_agendado ON followups(agendado_para ASC)
  WHERE status = 'pendente';

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. FOLLOWUP LOGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE followup_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  followup_id  UUID NOT NULL REFERENCES followups(id) ON DELETE CASCADE,
  cliente_id   UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem     TEXT,
  status       VARCHAR(30) NOT NULL,
  erro         TEXT,
  zapi_id      VARCHAR(200),
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_followup_logs_followup_id ON followup_logs(followup_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. HANDOFFS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE handoffs (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id           UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id          UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  motivo               TEXT,
  assumido_por         VARCHAR(100),
  ia_pausada           BOOLEAN DEFAULT TRUE,
  reativar_em          TIMESTAMPTZ,
  palavra_desativacao  VARCHAR(100),
  palavra_ativacao     VARCHAR(100),
  contexto_handoff     TEXT,
  status               VARCHAR(20) DEFAULT 'ativo'
                       CHECK (status IN ('ativo','resolvido','expirado')),
  resolvido_em         TIMESTAMPTZ,
  resolvido_por        VARCHAR(100),
  criado_em            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_handoffs_cliente_id ON handoffs(cliente_id);
CREATE INDEX idx_handoffs_status ON handoffs(status) WHERE status = 'ativo';

-- ─────────────────────────────────────────────────────────────────────────────
-- 14. PRODUTOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE categorias (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) NOT NULL UNIQUE,
  descricao     TEXT,
  imagem        TEXT,
  categoria_pai UUID REFERENCES categorias(id),
  ativa         BOOLEAN DEFAULT TRUE,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE produtos (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku                        VARCHAR(100),
  nome                       VARCHAR(300) NOT NULL,
  slug                       VARCHAR(300),
  descricao_curta            TEXT,
  descricao_completa         TEXT,
  descricao_imagem_detalhada TEXT,
  categoria_id               UUID REFERENCES categorias(id),
  marca                      VARCHAR(100),
  colecao                    VARCHAR(100),
  estilo                     VARCHAR(100),
  tecido                     VARCHAR(100),
  cor                        VARCHAR(50),
  cores_secundarias          TEXT[] DEFAULT '{}',
  estampa                    VARCHAR(100),
  modelagem                  VARCHAR(100),
  ocasiao                    TEXT[] DEFAULT '{}',
  tamanhos                   TEXT[] DEFAULT '{}',
  medidas                    JSONB DEFAULT '{}',
  preco                      DECIMAL(12,2) NOT NULL DEFAULT 0,
  preco_promocional          DECIMAL(12,2),
  estoque                    INTEGER DEFAULT 0,
  ativo                      BOOLEAN DEFAULT TRUE,
  destaque                   BOOLEAN DEFAULT FALSE,
  novidade                   BOOLEAN DEFAULT FALSE,
  url_imagem_principal       TEXT,
  galeria_imagens            TEXT[] DEFAULT '{}',
  tags                       TEXT[] DEFAULT '{}',
  palavras_chave             TEXT,
  embedding                  vector(1536),
  score_vendas               INTEGER DEFAULT 0,
  criado_em                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_produtos_ativo ON produtos(ativo) WHERE ativo = TRUE;
CREATE INDEX idx_produtos_embedding ON produtos
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50)
  WHERE embedding IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. MÍDIAS RECEBIDAS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE imagens_recebidas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem_id     UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  imagem_url      TEXT NOT NULL,
  storage_path    TEXT,
  descricao_ia    TEXT,
  ocr_texto       TEXT,
  produto_match   UUID REFERENCES produtos(id),
  similaridade    DECIMAL(4,3),
  embedding       vector(1536),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audios_recebidos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem_id     UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  audio_url       TEXT NOT NULL,
  storage_path    TEXT,
  transcricao     TEXT,
  emocao_detectada VARCHAR(50),
  duracao         INTEGER,
  mime_type       VARCHAR(100),
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE documentos_recebidos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem_id     UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  arquivo_url     TEXT NOT NULL,
  storage_path    TEXT,
  tipo_documento  VARCHAR(50),
  nome_arquivo    VARCHAR(200),
  texto_extraido  TEXT,
  resumo          TEXT,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 16. PEDIDOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE pedidos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id     UUID REFERENCES conversas(id) ON DELETE SET NULL,
  numero_pedido   VARCHAR(50) UNIQUE,
  status          VARCHAR(30) DEFAULT 'pendente'
                  CHECK (status IN ('pendente','pago','cancelado','enviado','entregue')),
  itens           JSONB NOT NULL DEFAULT '[]',
  subtotal        DECIMAL(12,2) DEFAULT 0,
  frete           DECIMAL(12,2) DEFAULT 0,
  desconto        DECIMAL(12,2) DEFAULT 0,
  total           DECIMAL(12,2) DEFAULT 0,
  forma_pagamento VARCHAR(50),
  codigo_pix      TEXT,
  link_pagamento  TEXT,
  rastreamento    VARCHAR(100),
  transportadora  VARCHAR(100),
  observacoes     TEXT,
  metadata        JSONB DEFAULT '{}',
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 17. CAMPANHAS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE campanhas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              VARCHAR(200) NOT NULL,
  descricao         TEXT,
  tipo              VARCHAR(50) DEFAULT 'engajamento'
                    CHECK (tipo IN ('engajamento','promocao','reativacao','lancamento','pos_venda')),
  status            VARCHAR(30) DEFAULT 'rascunho'
                    CHECK (status IN ('rascunho','agendada','ativa','pausada','concluida')),
  mensagem_template TEXT NOT NULL,
  segmento          JSONB DEFAULT '{}',
  agendada_para     TIMESTAMPTZ,
  total_enviados    INTEGER DEFAULT 0,
  total_respondidos INTEGER DEFAULT 0,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 18. ANALYTICS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE analytics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  metrica         VARCHAR(100) NOT NULL,
  valor           DECIMAL(15,4) NOT NULL DEFAULT 0,
  dimensoes       JSONB DEFAULT '{}',
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(data, metrica, dimensoes)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 19. WHATSAPP INSTANCES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE whatsapp_instances (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  instance_id  VARCHAR(200) NOT NULL UNIQUE,
  token        VARCHAR(500) NOT NULL,
  nome         VARCHAR(100),
  telefone     VARCHAR(20),
  status       VARCHAR(30) DEFAULT 'desconectado',
  ativa        BOOLEAN DEFAULT TRUE,
  metadata     JSONB DEFAULT '{}',
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 20. FILA DE PROCESSAMENTO
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE fila_processamento (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_evento    VARCHAR(100) NOT NULL,
  payload        JSONB NOT NULL,
  status         VARCHAR(30) DEFAULT 'pendente'
                 CHECK (status IN ('pendente','processando','concluido','falhou','ignorado')),
  tentativas     INTEGER DEFAULT 0,
  max_tentativas INTEGER DEFAULT 3,
  erro           TEXT,
  processar_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processado_em  TIMESTAMPTZ,
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fila_status ON fila_processamento(status, processar_em)
  WHERE status IN ('pendente','falhou');

-- ─────────────────────────────────────────────────────────────────────────────
-- FUNÇÕES STORED — Busca Vetorial
-- ─────────────────────────────────────────────────────────────────────────────

-- Busca memória por similaridade semântica
CREATE OR REPLACE FUNCTION buscar_memoria_cliente(
  p_cliente_id   UUID,
  p_embedding    vector(1536),
  p_limite       INTEGER DEFAULT 5,
  p_threshold    FLOAT DEFAULT 0.72
)
RETURNS TABLE (
  id             UUID,
  tipo_memoria   TEXT,
  conteudo       TEXT,
  similaridade   FLOAT,
  criado_em      TIMESTAMPTZ
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    tipo_memoria::TEXT,
    conteudo,
    1 - (embedding <=> p_embedding) AS similaridade,
    criado_em
  FROM memoria_longa
  WHERE cliente_id = p_cliente_id
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> p_embedding) >= p_threshold
  ORDER BY embedding <=> p_embedding
  LIMIT p_limite;
$$;

-- Busca produtos por similaridade semântica
CREATE OR REPLACE FUNCTION buscar_produtos_semantico(
  p_embedding  vector(1536),
  p_limite     INTEGER DEFAULT 5,
  p_threshold  FLOAT DEFAULT 0.65
)
RETURNS TABLE (
  id                         UUID,
  nome                       TEXT,
  descricao_curta            TEXT,
  descricao_imagem_detalhada TEXT,
  preco                      DECIMAL,
  tamanhos                   TEXT[],
  url_imagem_principal       TEXT,
  similaridade               FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    nome::TEXT,
    descricao_curta,
    descricao_imagem_detalhada,
    preco,
    tamanhos,
    url_imagem_principal,
    1 - (embedding <=> p_embedding) AS similaridade
  FROM produtos
  WHERE ativo = TRUE
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> p_embedding) >= p_threshold
  ORDER BY embedding <=> p_embedding
  LIMIT p_limite;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS — atualizar atualizado_em automaticamente
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clientes_updated
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trg_conversas_updated
  BEFORE UPDATE ON conversas
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trg_followups_updated
  BEFORE UPDATE ON followups
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trg_handoffs_updated
  BEFORE UPDATE ON handoffs
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();

CREATE TRIGGER trg_produtos_updated
  BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION atualizar_timestamp();
