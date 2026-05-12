-- ═══════════════════════════════════════════════════════════════════
-- Amanda AI — Migration 003: Schema Completo (30 tabelas)
-- ⚠️  Execute ESTE arquivo no lugar dos anteriores (001 e 002)
--     se ainda não rodou nenhuma migration.
--     Se já rodou 001 e 002, este arquivo também é seguro (IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────────────────────────────
-- 1. CONFIGURACOES
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracoes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chave       VARCHAR(100) UNIQUE NOT NULL,
  valor       TEXT,
  descricao   TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO configuracoes (chave, valor, descricao) VALUES
  ('amanda_ativa',        'true',   'Liga/desliga a Amanda globalmente'),
  ('handoff_keyword',     'humano,atendente,vendedor,gerente', 'Palavras que ativam handoff'),
  ('reactivate_keyword',  'liberar,voltar,ia,retomar,amanda',  'Palavras que reativam a IA'),
  ('followup_ativo',      'true',   'Liga/desliga sistema de follow-up'),
  ('audio_reply_prob',    '0.15',   'Probabilidade de responder em áudio (0-1)'),
  ('debounce_ms',         '8000',   'Tempo de debounce de mensagens em ms'),
  ('typing_min_ms',       '1200',   'Delay mínimo de digitação em ms'),
  ('typing_max_ms',       '3800',   'Delay máximo de digitação em ms')
ON CONFLICT (chave) DO NOTHING;

-- ────────────────────────────────────────────────────────────────────
-- 2. USUARIOS_DASHBOARD
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios_dashboard (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome          VARCHAR(200) NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  senha_hash    VARCHAR(500) NOT NULL,
  nivel_acesso  VARCHAR(20) NOT NULL DEFAULT 'operador'
                  CHECK (nivel_acesso IN ('admin','gerente','operador','visualizador')),
  ativo         BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_login  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios_dashboard(email);

-- ────────────────────────────────────────────────────────────────────
-- 3. CATEGORIAS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categorias (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            VARCHAR(150) NOT NULL,
  slug            VARCHAR(150) UNIQUE NOT NULL,
  descricao       TEXT,
  imagem          TEXT,
  categoria_pai   UUID REFERENCES categorias(id) ON DELETE SET NULL,
  ativa           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categorias_slug ON categorias(slug);
CREATE INDEX IF NOT EXISTS idx_categorias_pai ON categorias(categoria_pai);

-- ────────────────────────────────────────────────────────────────────
-- 4. CLIENTES
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                  VARCHAR(200),
  telefone              VARCHAR(20) UNIQUE NOT NULL,
  email                 VARCHAR(200),
  instagram             VARCHAR(100),
  cidade                VARCHAR(100),
  estado                VARCHAR(50),
  pais                  VARCHAR(50) DEFAULT 'Brasil',
  data_nascimento       DATE,
  genero                VARCHAR(20) CHECK (genero IN ('feminino','masculino','outro','nao_informado')),
  cliente_desde         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultima_interacao      TIMESTAMPTZ,
  ultima_compra         TIMESTAMPTZ,
  total_pedidos         INTEGER NOT NULL DEFAULT 0,
  valor_total_gasto     DECIMAL(12,2) NOT NULL DEFAULT 0,
  ticket_medio          DECIMAL(10,2) NOT NULL DEFAULT 0,
  categoria_favorita    VARCHAR(100),
  preferencias          JSONB NOT NULL DEFAULT '{}',
  observacoes           TEXT,
  emocao_recorrente     VARCHAR(30),
  nivel_engajamento     VARCHAR(20) NOT NULL DEFAULT 'frio'
                          CHECK (nivel_engajamento IN ('frio','morno','quente','vip')),
  temperatura_lead      FLOAT NOT NULL DEFAULT 0,
  status_cliente        VARCHAR(20) NOT NULL DEFAULT 'ativo'
                          CHECK (status_cliente IN ('ativo','inativo','bloqueado','vip')),
  opt_out               BOOLEAN NOT NULL DEFAULT FALSE,
  opt_out_at            TIMESTAMPTZ,
  bloqueado             BOOLEAN NOT NULL DEFAULT FALSE,
  humano_assumiu        BOOLEAN NOT NULL DEFAULT FALSE,
  ia_ativa              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_telefone ON clientes(telefone);
CREATE INDEX IF NOT EXISTS idx_clientes_opt_out ON clientes(opt_out) WHERE opt_out = FALSE;
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status_cliente);
CREATE INDEX IF NOT EXISTS idx_clientes_ultima_interacao ON clientes(ultima_interacao DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_clientes_nivel ON clientes(nivel_engajamento);

-- ────────────────────────────────────────────────────────────────────
-- 5. BLACKLIST
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blacklist (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telefone    VARCHAR(20) UNIQUE NOT NULL,
  cliente_id  UUID REFERENCES clientes(id) ON DELETE SET NULL,
  motivo      TEXT,
  bloqueado_por VARCHAR(100),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blacklist_telefone ON blacklist(telefone);

-- ────────────────────────────────────────────────────────────────────
-- 6. OPT_OUT
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS opt_out (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  motivo            TEXT,
  palavra_detectada VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opt_out_cliente ON opt_out(cliente_id);

-- ────────────────────────────────────────────────────────────────────
-- 7. SPAM_RISK
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spam_risk (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  score_risco     FLOAT NOT NULL DEFAULT 0,
  motivo          TEXT,
  bloqueado       BOOLEAN NOT NULL DEFAULT FALSE,
  ultima_analise  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spam_risk_cliente ON spam_risk(cliente_id);
CREATE INDEX IF NOT EXISTS idx_spam_risk_score ON spam_risk(score_risco DESC);

-- ────────────────────────────────────────────────────────────────────
-- 8. PRODUTOS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produtos (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku                         VARCHAR(100) UNIQUE,
  nome                        VARCHAR(300) NOT NULL,
  slug                        VARCHAR(300),
  descricao_curta             TEXT,
  descricao_completa          TEXT,
  descricao_imagem_detalhada  TEXT,
  categoria_id                UUID REFERENCES categorias(id) ON DELETE SET NULL,
  marca                       VARCHAR(100),
  colecao                     VARCHAR(100),
  estilo                      VARCHAR(100),
  tecido                      VARCHAR(100),
  cor                         VARCHAR(50),
  cores_secundarias           TEXT[],
  estampa                     VARCHAR(100),
  modelagem                   VARCHAR(100),
  ocasiao                     TEXT[] DEFAULT '{}',
  tamanhos                    TEXT[] DEFAULT '{}',
  medidas                     JSONB DEFAULT '{}',
  preco                       DECIMAL(10,2) NOT NULL,
  preco_promocional           DECIMAL(10,2),
  custo                       DECIMAL(10,2),
  estoque                     INTEGER NOT NULL DEFAULT 0,
  ativo                       BOOLEAN NOT NULL DEFAULT TRUE,
  destaque                    BOOLEAN NOT NULL DEFAULT FALSE,
  novidade                    BOOLEAN NOT NULL DEFAULT FALSE,
  peso                        DECIMAL(8,3),
  altura                      DECIMAL(8,2),
  largura                     DECIMAL(8,2),
  comprimento                 DECIMAL(8,2),
  url_produto                 TEXT,
  url_imagem_principal        TEXT,
  galeria_imagens             TEXT[] DEFAULT '{}',
  tags                        TEXT[] DEFAULT '{}',
  palavras_chave              TEXT,
  seo_title                   VARCHAR(200),
  seo_description             TEXT,
  embedding                   vector(1536),
  score_vendas                FLOAT DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_produtos_ativo ON produtos(ativo) WHERE ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_produtos_destaque ON produtos(destaque) WHERE destaque = TRUE;
CREATE INDEX IF NOT EXISTS idx_produtos_nome_trgm ON produtos USING GIN(nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_produtos_embedding ON produtos USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- ────────────────────────────────────────────────────────────────────
-- 9. CONVERSAS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversas (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id              UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  canal                   VARCHAR(30) NOT NULL DEFAULT 'whatsapp'
                            CHECK (canal IN ('whatsapp','instagram','telegram','site')),
  status                  VARCHAR(20) NOT NULL DEFAULT 'ativa'
                            CHECK (status IN ('ativa','encerrada','handoff','opt_out','bloqueada')),
  contexto_resumido       TEXT,
  ultima_mensagem         TEXT,
  ultima_resposta_ia      TIMESTAMPTZ,
  ultima_resposta_humano  TIMESTAMPTZ,
  ultima_interacao        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quantidade_mensagens    INTEGER NOT NULL DEFAULT 0,
  emocao_detectada        VARCHAR(30),
  lead_score              FLOAT NOT NULL DEFAULT 0,
  etapa_funil             VARCHAR(30) NOT NULL DEFAULT 'topo'
                            CHECK (etapa_funil IN ('topo','meio','fundo','cliente','recompra')),
  handoff_ativo           BOOLEAN NOT NULL DEFAULT FALSE,
  handoff_iniciado_em     TIMESTAMPTZ,
  handoff_por             VARCHAR(200),
  followup_ativo          BOOLEAN NOT NULL DEFAULT FALSE,
  origem                  VARCHAR(50),
  metadata                JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversas_cliente ON conversas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_conversas_status ON conversas(status);
CREATE INDEX IF NOT EXISTS idx_conversas_ultima_interacao ON conversas(ultima_interacao DESC);
CREATE INDEX IF NOT EXISTS idx_conversas_handoff ON conversas(handoff_ativo) WHERE handoff_ativo = TRUE;
CREATE INDEX IF NOT EXISTS idx_conversas_funil ON conversas(etapa_funil);

-- ────────────────────────────────────────────────────────────────────
-- 10. MENSAGENS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mensagens (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversa_id           UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  cliente_id            UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo                  VARCHAR(20) NOT NULL DEFAULT 'texto'
                          CHECK (tipo IN ('texto','imagem','audio','video','pdf','url','sticker','localizacao')),
  mensagem              TEXT,
  mensagem_original     TEXT,
  mensagem_processada   TEXT,
  direcao               VARCHAR(10) NOT NULL DEFAULT 'entrada'
                          CHECK (direcao IN ('entrada','saida')),
  origem                VARCHAR(20) NOT NULL DEFAULT 'cliente'
                          CHECK (origem IN ('ia','humano','cliente','sistema')),
  emocao_detectada      VARCHAR(30),
  intencao_detectada    VARCHAR(100),
  sentimento_score      FLOAT,
  spam_score            FLOAT DEFAULT 0,
  embedding_id          UUID,
  arquivo_url           TEXT,
  media_url             TEXT,
  transcricao_audio     TEXT,
  ocr_texto             TEXT,
  descricao_imagem      TEXT,
  tokens_input          INTEGER,
  tokens_output         INTEGER,
  modelo_usado          VARCHAR(50),
  tempo_resposta        INTEGER,
  zapi_message_id       VARCHAR(100),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_cliente ON mensagens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_created ON mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_direcao ON mensagens(direcao);
CREATE INDEX IF NOT EXISTS idx_mensagens_zapi ON mensagens(zapi_message_id) WHERE zapi_message_id IS NOT NULL;

-- ────────────────────────────────────────────────────────────────────
-- 11. MEMORIA_CURTA
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memoria_curta (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id   UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  mensagem_id   UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  conteudo      TEXT NOT NULL,
  contexto      TEXT,
  relevancia    FLOAT NOT NULL DEFAULT 1.0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memoria_curta_cliente ON memoria_curta(cliente_id);
CREATE INDEX IF NOT EXISTS idx_memoria_curta_conversa ON memoria_curta(conversa_id);
CREATE INDEX IF NOT EXISTS idx_memoria_curta_created ON memoria_curta(created_at DESC);

-- ────────────────────────────────────────────────────────────────────
-- 12. MEMORIA_LONGA
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memoria_longa (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id          UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo_memoria        VARCHAR(30) NOT NULL
                        CHECK (tipo_memoria IN ('preferencia','emocao','compra','comportamento','objecao','estilo','tamanho','historico')),
  conteudo            TEXT NOT NULL,
  resumo              TEXT,
  embedding           vector(1536),
  importancia         FLOAT NOT NULL DEFAULT 1.0,
  ultima_utilizacao   TIMESTAMPTZ,
  frequencia          INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memoria_longa_cliente ON memoria_longa(cliente_id);
CREATE INDEX IF NOT EXISTS idx_memoria_longa_tipo ON memoria_longa(tipo_memoria);
CREATE INDEX IF NOT EXISTS idx_memoria_longa_importancia ON memoria_longa(importancia DESC);
CREATE INDEX IF NOT EXISTS idx_memoria_longa_embedding
  ON memoria_longa USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ────────────────────────────────────────────────────────────────────
-- 13. EMBEDDINGS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS embeddings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referencia_tipo     VARCHAR(30) NOT NULL
                        CHECK (referencia_tipo IN ('produto','mensagem','memoria','cliente')),
  referencia_id       UUID NOT NULL,
  conteudo_original   TEXT NOT NULL,
  embedding           vector(1536) NOT NULL,
  modelo_embedding    VARCHAR(50) NOT NULL DEFAULT 'text-embedding-3-small',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_referencia ON embeddings(referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector
  ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ────────────────────────────────────────────────────────────────────
-- 14. PEDIDOS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pedidos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id      UUID REFERENCES conversas(id) ON DELETE SET NULL,
  numero_pedido    VARCHAR(50) UNIQUE NOT NULL DEFAULT 'PED-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8),
  status           VARCHAR(20) NOT NULL DEFAULT 'pendente'
                     CHECK (status IN ('pendente','pago','cancelado','enviado','entregue')),
  itens            JSONB NOT NULL DEFAULT '[]',
  subtotal         DECIMAL(10,2) NOT NULL DEFAULT 0,
  frete            DECIMAL(10,2) NOT NULL DEFAULT 0,
  desconto         DECIMAL(10,2) NOT NULL DEFAULT 0,
  total            DECIMAL(10,2) NOT NULL DEFAULT 0,
  forma_pagamento  VARCHAR(30),
  codigo_pix       TEXT,
  qr_code_pix      TEXT,
  link_pagamento   TEXT,
  rastreamento     VARCHAR(100),
  transportadora   VARCHAR(100),
  observacoes      TEXT,
  metadata         JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero ON pedidos(numero_pedido);

-- ────────────────────────────────────────────────────────────────────
-- 15. CARRINHOS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS carrinhos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id          UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  produtos            JSONB NOT NULL DEFAULT '[]',
  valor_total         DECIMAL(10,2) NOT NULL DEFAULT 0,
  abandonado          BOOLEAN NOT NULL DEFAULT FALSE,
  ultima_interacao    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  followup_enviado    BOOLEAN NOT NULL DEFAULT FALSE,
  followup_enviado_em TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carrinhos_cliente ON carrinhos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_carrinhos_abandonado ON carrinhos(abandonado) WHERE abandonado = TRUE;

-- ────────────────────────────────────────────────────────────────────
-- 16. FOLLOWUPS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followups (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id       UUID REFERENCES conversas(id) ON DELETE SET NULL,
  tipo              VARCHAR(30) NOT NULL DEFAULT 'abandono'
                      CHECK (tipo IN ('abandono','reativacao','pos_venda','engajamento','carrinho')),
  etapa             VARCHAR(20) NOT NULL DEFAULT '20_min'
                      CHECK (etapa IN ('20_min','3_horas','8_horas','1_dia','3_dias','7_dias','15_dias','30_dias')),
  mensagem          TEXT,
  mensagem_gerada   TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'pendente'
                      CHECK (status IN ('pendente','enviado','cancelado','falhou')),
  respondido        BOOLEAN NOT NULL DEFAULT FALSE,
  opt_out           BOOLEAN NOT NULL DEFAULT FALSE,
  agendado_para     TIMESTAMPTZ NOT NULL,
  enviado_em        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followups_cliente ON followups(cliente_id);
CREATE INDEX IF NOT EXISTS idx_followups_agendado ON followups(agendado_para) WHERE status = 'pendente';
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);

-- ────────────────────────────────────────────────────────────────────
-- 17. FOLLOWUP_LOGS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS followup_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  followup_id   UUID NOT NULL REFERENCES followups(id) ON DELETE CASCADE,
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem      TEXT,
  status        VARCHAR(20) NOT NULL,
  erro          TEXT,
  tempo_envio   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_followup_logs_followup ON followup_logs(followup_id);
CREATE INDEX IF NOT EXISTS idx_followup_logs_cliente ON followup_logs(cliente_id);

-- ────────────────────────────────────────────────────────────────────
-- 18. HANDOFFS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handoffs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id          UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id         UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
  motivo              TEXT,
  assumido_por        VARCHAR(200),
  ia_pausada          BOOLEAN NOT NULL DEFAULT TRUE,
  reativar_em         TIMESTAMPTZ,
  palavra_desativacao VARCHAR(100),
  palavra_ativacao    VARCHAR(100),
  contexto_handoff    TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'ativo'
                        CHECK (status IN ('ativo','resolvido','expirado')),
  resolvido_em        TIMESTAMPTZ,
  resolvido_por       VARCHAR(200),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handoffs_cliente ON handoffs(cliente_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_conversa ON handoffs(conversa_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_status ON handoffs(status) WHERE status = 'ativo';

-- ────────────────────────────────────────────────────────────────────
-- 19. EMOCAO_ANALISE
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emocao_analise (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id    UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem_id   UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  emocao        VARCHAR(30) NOT NULL
                  CHECK (emocao IN ('feliz','triste','ansiosa','irritada','indecisa','empolgada','insegura','neutra')),
  intensidade   FLOAT NOT NULL DEFAULT 0.5,
  contexto      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emocao_cliente ON emocao_analise(cliente_id);
CREATE INDEX IF NOT EXISTS idx_emocao_tipo ON emocao_analise(emocao);
CREATE INDEX IF NOT EXISTS idx_emocao_created ON emocao_analise(created_at DESC);

-- ────────────────────────────────────────────────────────────────────
-- 20. ATENDIMENTO_STATUS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS atendimento_status (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  conversa_id     UUID REFERENCES conversas(id) ON DELETE SET NULL,
  status          VARCHAR(30) NOT NULL,
  ia_respondendo  BOOLEAN NOT NULL DEFAULT TRUE,
  ultimo_evento   VARCHAR(100),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_atendimento_cliente ON atendimento_status(cliente_id);

-- ────────────────────────────────────────────────────────────────────
-- 21. IMAGENS_RECEBIDAS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imagens_recebidas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem_id     UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  imagem_url      TEXT NOT NULL,
  storage_path    TEXT,
  descricao_ia    TEXT,
  ocr_texto       TEXT,
  produto_match   UUID REFERENCES produtos(id) ON DELETE SET NULL,
  similaridade    FLOAT,
  embedding       vector(1536),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imagens_cliente ON imagens_recebidas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_imagens_produto ON imagens_recebidas(produto_match);

-- ────────────────────────────────────────────────────────────────────
-- 22. AUDIOS_RECEBIDOS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audios_recebidos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id        UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem_id       UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  audio_url         TEXT NOT NULL,
  storage_path      TEXT,
  transcricao       TEXT,
  emocao_detectada  VARCHAR(30),
  duracao           INTEGER,
  mime_type         VARCHAR(50),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audios_cliente ON audios_recebidos(cliente_id);

-- ────────────────────────────────────────────────────────────────────
-- 23. DOCUMENTOS_RECEBIDOS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos_recebidos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem_id     UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  arquivo_url     TEXT NOT NULL,
  storage_path    TEXT,
  tipo_documento  VARCHAR(50),
  nome_arquivo    VARCHAR(300),
  texto_extraido  TEXT,
  resumo          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_cliente ON documentos_recebidos(cliente_id);

-- ────────────────────────────────────────────────────────────────────
-- 24. URLS_RECEBIDAS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS urls_recebidas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id          UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  mensagem_id         UUID REFERENCES mensagens(id) ON DELETE SET NULL,
  url                 TEXT NOT NULL,
  titulo              VARCHAR(500),
  descricao           TEXT,
  conteudo_extraido   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_urls_cliente ON urls_recebidas(cliente_id);

-- ────────────────────────────────────────────────────────────────────
-- 25. ANALYTICS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id              UUID REFERENCES clientes(id) ON DELETE SET NULL,
  data_referencia         DATE NOT NULL DEFAULT CURRENT_DATE,
  tempo_resposta_medio    INTEGER,
  taxa_resposta           FLOAT,
  taxa_conversao          FLOAT,
  mensagens_enviadas      INTEGER NOT NULL DEFAULT 0,
  mensagens_recebidas     INTEGER NOT NULL DEFAULT 0,
  followups_convertidos   INTEGER NOT NULL DEFAULT 0,
  valor_vendido           DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_cliente ON analytics(cliente_id);
CREATE INDEX IF NOT EXISTS idx_analytics_data ON analytics(data_referencia DESC);

-- ────────────────────────────────────────────────────────────────────
-- 26. EVENTOS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS eventos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id      UUID REFERENCES clientes(id) ON DELETE SET NULL,
  conversa_id     UUID REFERENCES conversas(id) ON DELETE SET NULL,
  tipo_evento     VARCHAR(100) NOT NULL,
  dados           JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_cliente ON eventos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_eventos_created ON eventos(created_at DESC);

-- ────────────────────────────────────────────────────────────────────
-- 27. FILA_PROCESSAMENTO
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fila_processamento (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo_evento   VARCHAR(100) NOT NULL,
  payload       JSONB NOT NULL DEFAULT '{}',
  status        VARCHAR(20) NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente','processando','concluido','falhou')),
  tentativas    INTEGER NOT NULL DEFAULT 0,
  erro          TEXT,
  processar_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processado_em TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fila_status ON fila_processamento(status, processar_em)
  WHERE status IN ('pendente','falhou');

-- ────────────────────────────────────────────────────────────────────
-- 28. PAGAMENTOS_PIX
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagamentos_pix (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id   UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  cliente_id  UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  valor       DECIMAL(10,2) NOT NULL,
  codigo_pix  TEXT NOT NULL,
  qr_code     TEXT,
  status      VARCHAR(20) NOT NULL DEFAULT 'pendente'
                CHECK (status IN ('pendente','pago','expirado','cancelado')),
  expira_em   TIMESTAMPTZ,
  pago_em     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pix_pedido ON pagamentos_pix(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pix_cliente ON pagamentos_pix(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pix_status ON pagamentos_pix(status);

-- ────────────────────────────────────────────────────────────────────
-- 29. CAMPANHAS
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campanhas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              VARCHAR(200) NOT NULL,
  descricao         TEXT,
  tipo              VARCHAR(30) NOT NULL DEFAULT 'engajamento'
                      CHECK (tipo IN ('engajamento','promocao','reativacao','lancamento','pos_venda')),
  status            VARCHAR(20) NOT NULL DEFAULT 'rascunho'
                      CHECK (status IN ('rascunho','agendada','ativa','pausada','encerrada')),
  mensagem_template TEXT NOT NULL,
  segmento          JSONB NOT NULL DEFAULT '{}',
  agendada_para     TIMESTAMPTZ,
  iniciada_em       TIMESTAMPTZ,
  encerrada_em      TIMESTAMPTZ,
  total_enviados    INTEGER NOT NULL DEFAULT 0,
  total_respondidos INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campanhas_status ON campanhas(status);

-- ────────────────────────────────────────────────────────────────────
-- 30. LOGS_SISTEMA
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS logs_sistema (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo      VARCHAR(20) NOT NULL CHECK (tipo IN ('info','warn','error','debug')),
  origem    VARCHAR(100),
  mensagem  TEXT NOT NULL,
  erro      TEXT,
  stack     TEXT,
  metadata  JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_tipo ON logs_sistema(tipo);
CREATE INDEX IF NOT EXISTS idx_logs_created ON logs_sistema(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_origem ON logs_sistema(origem);

-- ════════════════════════════════════════════════════════════════════
-- TRIGGERS updated_at
-- ════════════════════════════════════════════════════════════════════
DO $$ BEGIN
  CREATE TRIGGER trg_clientes_upd BEFORE UPDATE ON clientes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_conversas_upd BEFORE UPDATE ON conversas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_produtos_upd BEFORE UPDATE ON produtos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_pedidos_upd BEFORE UPDATE ON pedidos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_followups_upd BEFORE UPDATE ON followups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_handoffs_upd BEFORE UPDATE ON handoffs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_carrinhos_upd BEFORE UPDATE ON carrinhos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_campanhas_upd BEFORE UPDATE ON campanhas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_memoria_longa_upd BEFORE UPDATE ON memoria_longa FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_usuarios_upd BEFORE UPDATE ON usuarios_dashboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ════════════════════════════════════════════════════════════════════
-- FUNÇÕES DE BUSCA VETORIAL
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION buscar_memoria_cliente(
  p_cliente_id  UUID,
  p_embedding   vector(1536),
  p_limit       INT DEFAULT 5,
  p_threshold   FLOAT DEFAULT 0.72
)
RETURNS TABLE (
  id            UUID,
  conteudo      TEXT,
  tipo_memoria  VARCHAR,
  similaridade  FLOAT,
  created_at    TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT ml.id, ml.conteudo, ml.tipo_memoria,
         1 - (ml.embedding <=> p_embedding) AS similaridade,
         ml.created_at
  FROM memoria_longa ml
  WHERE ml.cliente_id = p_cliente_id
    AND ml.embedding IS NOT NULL
    AND 1 - (ml.embedding <=> p_embedding) >= p_threshold
  ORDER BY ml.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION buscar_produtos_semantico(
  p_embedding   vector(1536),
  p_limit       INT DEFAULT 5,
  p_threshold   FLOAT DEFAULT 0.68
)
RETURNS TABLE (
  id                         UUID,
  nome                       VARCHAR,
  descricao_curta            TEXT,
  descricao_imagem_detalhada TEXT,
  preco                      DECIMAL,
  categoria_id               UUID,
  tamanhos                   TEXT[],
  url_imagem_principal       TEXT,
  similaridade               FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.nome, p.descricao_curta, p.descricao_imagem_detalhada,
         p.preco, p.categoria_id, p.tamanhos, p.url_imagem_principal,
         1 - (p.embedding <=> p_embedding) AS similaridade
  FROM produtos p
  WHERE p.ativo = TRUE
    AND p.embedding IS NOT NULL
    AND 1 - (p.embedding <=> p_embedding) >= p_threshold
  ORDER BY p.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION buscar_embeddings_genericos(
  p_tipo        VARCHAR,
  p_embedding   vector(1536),
  p_limit       INT DEFAULT 5,
  p_threshold   FLOAT DEFAULT 0.70
)
RETURNS TABLE (
  id              UUID,
  referencia_id   UUID,
  conteudo_original TEXT,
  similaridade    FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.referencia_id, e.conteudo_original,
         1 - (e.embedding <=> p_embedding) AS similaridade
  FROM embeddings e
  WHERE e.referencia_tipo = p_tipo
    AND 1 - (e.embedding <=> p_embedding) >= p_threshold
  ORDER BY e.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
