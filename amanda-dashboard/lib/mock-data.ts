// ════════════════════════════════════════════════════════════
// Amanda AI — Mock Data
// Dados realistas para desenvolvimento. Substituir por API real.
// ════════════════════════════════════════════════════════════

export type ClientStatus = 'novo' | 'aguardando' | 'frio' | 'morno' | 'quente' | 'ativo' | 'pos-venda' | 'vip' | 'pausado' | 'encerrado';
export type Emotion = 'animado' | 'curioso' | 'indeciso' | 'frustrado' | 'satisfeito' | 'urgente' | 'neutro';
export type Intention = 'compra' | 'duvida' | 'reclamacao' | 'pesquisa' | 'troca' | 'pos-venda';

export interface Client {
  id: string;
  nome: string;
  telefone: string;
  foto?: string;
  cidade: string;
  estado: string;
  leadScore: number;
  emocaoDominante: Emotion;
  comportamento: string;
  categoriaFavorita: string;
  ticketMedio: number;
  frequencia: number;
  ultimaInteracao: string;
  status: ClientStatus;
  quantidadeCompras: number;
  valorTotalGasto: number;
  engajamento: number;
  intencaoDominante: Intention;
  tags: string[];
  perfilPsicologico: string;
  probabilidadeCompra: number;
  scoreEmocional: number;
  scoreComportamental: number;
  scoreEngajamento: number;
  intensidadeEmocional: number;
  tempoMedioResposta: number;
}

const nomes = [
  'Mariana Silva', 'Carolina Santos', 'Beatriz Costa', 'Ana Paula Lima', 'Juliana Oliveira',
  'Patrícia Souza', 'Fernanda Almeida', 'Camila Rocha', 'Tatiana Pereira', 'Letícia Martins',
  'Vanessa Carvalho', 'Renata Ferreira', 'Daniela Ribeiro', 'Bruna Mendes', 'Larissa Cardoso',
  'Aline Barbosa', 'Priscila Gomes', 'Roberta Castro', 'Michele Araújo', 'Cristina Nunes',
  'Gabriela Pinto', 'Amanda Reis', 'Natália Dias', 'Simone Moreira', 'Adriana Vieira',
  'Cíntia Correia', 'Mônica Teixeira', 'Sandra Lopes', 'Tatiane Cavalcanti', 'Eliane Freitas',
];

const cidades: Array<[string, string]> = [
  ['São Paulo', 'SP'], ['Rio de Janeiro', 'RJ'], ['Belo Horizonte', 'MG'], ['Curitiba', 'PR'],
  ['Porto Alegre', 'RS'], ['Salvador', 'BA'], ['Brasília', 'DF'], ['Fortaleza', 'CE'],
  ['Recife', 'PE'], ['Goiânia', 'GO'], ['Campinas', 'SP'], ['Florianópolis', 'SC'],
];

const categorias = ['Vestidos', 'Blusas', 'Calças', 'Saias', 'Acessórios', 'Sapatos', 'Bolsas', 'Lingerie', 'Plus Size', 'Festa'];

const comportamentos = ['Impulsivo', 'Analítico', 'Pesquisador', 'Decisivo', 'Indeciso', 'Fiel', 'Caçador de Ofertas', 'Premium'];

const perfis = [
  'Compradora frequente de moda casual, valoriza qualidade e tendências.',
  'Cliente VIP, busca exclusividade e atendimento personalizado.',
  'Indecisa, precisa de orientação clara para fechar compras.',
  'Caçadora de ofertas, sensível a preço e promoções.',
  'Compradora ocasional, ativa em datas comemorativas.',
  'Engajada nas redes sociais, busca peças virais.',
];

const tagsList = ['Frequente', 'VIP', 'Novo', 'Reativada', 'Indicação', 'Aniversariante', 'Black Friday', 'Indecisa', 'Quente', 'Premium'];

const emocoes: Emotion[] = ['animado', 'curioso', 'indeciso', 'frustrado', 'satisfeito', 'urgente', 'neutro'];
const intencoes: Intention[] = ['compra', 'duvida', 'reclamacao', 'pesquisa', 'troca', 'pos-venda'];
const statusList: ClientStatus[] = ['novo', 'aguardando', 'frio', 'morno', 'quente', 'ativo', 'pos-venda', 'vip', 'pausado', 'encerrado'];

function seedRandom(seed: number) {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

export function generateClients(count = 60): Client[] {
  const rand = seedRandom(42);
  return Array.from({ length: count }, (_, i) => {
    const nome = nomes[i % nomes.length] + (i >= nomes.length ? ` ${Math.floor(i / nomes.length) + 1}` : '');
    const [cidade, estado] = cidades[Math.floor(rand() * cidades.length)];
    const status = statusList[Math.floor(rand() * statusList.length)];
    const leadScore = Math.floor(rand() * 100);
    const quantidadeCompras = Math.floor(rand() * 20);
    const ticketMedio = Math.floor(rand() * 800) + 100;
    return {
      id: `cli-${String(i + 1).padStart(4, '0')}`,
      nome,
      telefone: `+55 11 9${Math.floor(rand() * 9000 + 1000)}-${Math.floor(rand() * 9000 + 1000)}`,
      foto: undefined,
      cidade,
      estado,
      leadScore,
      emocaoDominante: emocoes[Math.floor(rand() * emocoes.length)],
      comportamento: comportamentos[Math.floor(rand() * comportamentos.length)],
      categoriaFavorita: categorias[Math.floor(rand() * categorias.length)],
      ticketMedio,
      frequencia: Math.floor(rand() * 30),
      ultimaInteracao: new Date(Date.now() - rand() * 30 * 86400 * 1000).toISOString(),
      status,
      quantidadeCompras,
      valorTotalGasto: ticketMedio * quantidadeCompras,
      engajamento: Math.floor(rand() * 100),
      intencaoDominante: intencoes[Math.floor(rand() * intencoes.length)],
      tags: Array.from({ length: Math.floor(rand() * 3) + 1 }, () => tagsList[Math.floor(rand() * tagsList.length)]),
      perfilPsicologico: perfis[Math.floor(rand() * perfis.length)],
      probabilidadeCompra: Math.floor(rand() * 100),
      scoreEmocional: Math.floor(rand() * 100),
      scoreComportamental: Math.floor(rand() * 100),
      scoreEngajamento: Math.floor(rand() * 100),
      intensidadeEmocional: Math.floor(rand() * 100),
      tempoMedioResposta: Math.floor(rand() * 600) + 30,
    };
  });
}

export const clients = generateClients();

// ── KPIs do Dashboard ───────────────────────────────────────
export const dashboardKpis = {
  totalClientes: { value: clients.length, change: 12.4 },
  totalLeads: { value: 247, change: 8.1 },
  totalMensagens: { value: 18421, change: 23.7 },
  totalFollowups: { value: 384, change: -3.2 },
  taxaResposta: { value: 73.4, change: 5.8 },
  taxaReativacao: { value: 28.6, change: 11.2 },
  scoreMedio: { value: 68, change: 4.1 },
  ticketMedio: { value: 287.5, change: 6.7 },
  clientesAtivos: { value: 412, change: 9.3 },
  clientesQuentes: { value: 89, change: 18.5 },
  clientesMornos: { value: 156, change: 2.1 },
  clientesFrios: { value: 167, change: -4.7 },
  agentesAtivos: { value: 3, change: 0 },
  numerosConectados: { value: 2, change: 0 },
};

// ── Time-series para gráficos de linha ──────────────────────
export const growthSeries = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(Date.now() - (29 - i) * 86400 * 1000);
  return {
    date: date.toISOString().slice(5, 10),
    clientes: Math.floor(50 + i * 1.8 + Math.sin(i / 3) * 8),
    mensagens: Math.floor(200 + i * 8 + Math.cos(i / 2) * 30),
    conversoes: Math.floor(10 + i * 0.5 + Math.sin(i / 4) * 4),
    engajamento: Math.floor(40 + i * 0.8 + Math.cos(i / 3) * 10),
  };
});

export const emotionPie = [
  { name: 'Animado', value: 28, color: 'hsl(252 87% 67%)' },
  { name: 'Curioso', value: 22, color: 'hsl(199 89% 48%)' },
  { name: 'Indeciso', value: 18, color: 'hsl(38 92% 50%)' },
  { name: 'Satisfeito', value: 16, color: 'hsl(142 71% 45%)' },
  { name: 'Urgente', value: 9, color: 'hsl(0 84% 60%)' },
  { name: 'Frustrado', value: 7, color: 'hsl(280 70% 55%)' },
];

export const categoryPie = [
  { name: 'Vestidos', value: 32, color: 'hsl(252 87% 67%)' },
  { name: 'Blusas', value: 24, color: 'hsl(199 89% 48%)' },
  { name: 'Calças', value: 18, color: 'hsl(173 80% 50%)' },
  { name: 'Acessórios', value: 14, color: 'hsl(38 92% 50%)' },
  { name: 'Sapatos', value: 12, color: 'hsl(280 70% 55%)' },
];

export const leadStatusPie = [
  { name: 'Quentes', value: 89, color: 'hsl(0 84% 60%)' },
  { name: 'Mornos', value: 156, color: 'hsl(38 92% 50%)' },
  { name: 'Frios', value: 167, color: 'hsl(199 89% 48%)' },
  { name: 'Novos', value: 47, color: 'hsl(252 87% 67%)' },
];

export const intentionPie = [
  { name: 'Compra', value: 42, color: 'hsl(142 71% 45%)' },
  { name: 'Dúvida', value: 28, color: 'hsl(199 89% 48%)' },
  { name: 'Pesquisa', value: 18, color: 'hsl(252 87% 67%)' },
  { name: 'Troca', value: 7, color: 'hsl(38 92% 50%)' },
  { name: 'Reclamação', value: 5, color: 'hsl(0 84% 60%)' },
];

export const behaviorPie = [
  { name: 'Impulsivo', value: 24, color: 'hsl(0 84% 60%)' },
  { name: 'Analítico', value: 28, color: 'hsl(199 89% 48%)' },
  { name: 'Pesquisador', value: 20, color: 'hsl(252 87% 67%)' },
  { name: 'Fiel', value: 18, color: 'hsl(142 71% 45%)' },
  { name: 'Caçador', value: 10, color: 'hsl(38 92% 50%)' },
];

export const followupBars = [
  { dia: 'Seg', enviados: 48, respondidos: 31 },
  { dia: 'Ter', enviados: 56, respondidos: 38 },
  { dia: 'Qua', enviados: 62, respondidos: 47 },
  { dia: 'Qui', enviados: 71, respondidos: 49 },
  { dia: 'Sex', enviados: 84, respondidos: 64 },
  { dia: 'Sáb', enviados: 38, respondidos: 22 },
  { dia: 'Dom', enviados: 19, respondidos: 11 },
];

export const productBars = [
  { produto: 'Vestido Midi Floral', vistos: 248, citados: 187 },
  { produto: 'Blusa Cropped Tricô', vistos: 221, citados: 165 },
  { produto: 'Calça Wide Leg', vistos: 198, citados: 142 },
  { produto: 'Saia Plissada', vistos: 174, citados: 121 },
  { produto: 'Conjunto Linho', vistos: 156, citados: 108 },
];

export const hourlyActivity = Array.from({ length: 24 }, (_, h) => ({
  hora: `${String(h).padStart(2, '0')}h`,
  interacoes: Math.floor(
    h >= 9 && h <= 20
      ? 30 + Math.sin((h - 9) / 11 * Math.PI) * 80 + Math.random() * 20
      : 5 + Math.random() * 10
  ),
}));

export const emotionScatter = clients.slice(0, 40).map(c => ({
  emocao: c.scoreEmocional,
  engajamento: c.scoreEngajamento,
  comportamento: c.scoreComportamental,
  conversao: c.probabilidadeCompra,
  score: c.leadScore,
  ticket: c.ticketMedio,
  frequencia: c.frequencia,
  compras: c.quantidadeCompras,
}));

export const salesBars = Array.from({ length: 12 }, (_, m) => ({
  mes: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m],
  vendas: Math.floor(40 + Math.random() * 80 + m * 4),
  meta: 100,
}));

export const emotionalEvolution = Array.from({ length: 14 }, (_, i) => ({
  dia: `D-${14 - i}`,
  animado: 20 + Math.floor(Math.random() * 15),
  curioso: 18 + Math.floor(Math.random() * 12),
  satisfeito: 12 + Math.floor(Math.random() * 10),
  frustrado: 4 + Math.floor(Math.random() * 6),
}));

// ── Follow-ups ──────────────────────────────────────────────
export interface Followup {
  id: string;
  clienteId: string;
  clienteNome: string;
  mensagem: string;
  emocao: Emotion;
  scoreContexto: number;
  contexto: string;
  horarioProgramado: string;
  status: 'ativo' | 'enviado' | 'respondido' | 'cancelado';
  taxaResposta?: number;
}

export const followups: Followup[] = clients.slice(0, 25).map((c, i) => ({
  id: `fu-${String(i + 1).padStart(4, '0')}`,
  clienteId: c.id,
  clienteNome: c.nome,
  mensagem: [
    'Oi! Vi que você estava interessada no vestido midi. Ainda tá pensando?',
    'Oii! Acabou de chegar uma novidade que combina com seu estilo, quer ver?',
    'Olá! Tem promoção especial na categoria que você curte. Te interessa?',
    'Oi! Fico à disposição quando quiser, é só me chamar 💜',
  ][i % 4],
  emocao: c.emocaoDominante,
  scoreContexto: c.leadScore,
  contexto: c.perfilPsicologico,
  horarioProgramado: new Date(Date.now() + (i - 8) * 3600 * 1000).toISOString(),
  status: (['ativo', 'enviado', 'respondido', 'cancelado'] as const)[i % 4],
  taxaResposta: Math.floor(40 + Math.random() * 50),
}));

// ── Agentes ─────────────────────────────────────────────────
export interface Agent {
  id: string;
  nome: string;
  personalidade: string;
  modelo: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'grok' | 'local';
  status: 'ativo' | 'pausado';
  prompts: number;
  conversas: number;
  temperatura: number;
  descricao: string;
}

export const agents: Agent[] = [
  { id: 'ag-1', nome: 'Amanda', personalidade: 'Acolhedora, simpática, especialista em moda feminina', modelo: 'gpt-4o', provider: 'openai', status: 'ativo', prompts: 10, conversas: 1247, temperatura: 0.7, descricao: 'Assistente principal da RD Modas — vendas e atendimento.' },
  { id: 'ag-2', nome: 'Sofia', personalidade: 'Consultora premium, refinada e estratégica', modelo: 'claude-sonnet-4-6', provider: 'anthropic', status: 'ativo', prompts: 8, conversas: 432, temperatura: 0.6, descricao: 'Atendimento VIP e clientes premium.' },
  { id: 'ag-3', nome: 'Júlia', personalidade: 'Energética, jovem, focada em redes sociais', modelo: 'gemini-1.5-pro', provider: 'gemini', status: 'pausado', prompts: 6, conversas: 187, temperatura: 0.8, descricao: 'Engajamento com público jovem.' },
];

// ── WhatsApp ────────────────────────────────────────────────
export interface WhatsappInstance {
  id: string;
  nome: string;
  numero: string;
  provider: 'z-api' | 'evolution' | 'meta' | 'ultramsg';
  status: 'conectado' | 'desconectado' | 'pareando';
  ultimaConexao: string;
  mensagensHoje: number;
  agenteAtribuido: string;
}

export const whatsappInstances: WhatsappInstance[] = [
  { id: 'wa-1', nome: 'RD Modas Principal', numero: '+55 11 99999-0001', provider: 'z-api', status: 'conectado', ultimaConexao: new Date().toISOString(), mensagensHoje: 247, agenteAtribuido: 'Amanda' },
  { id: 'wa-2', nome: 'RD Modas VIP', numero: '+55 11 99999-0002', provider: 'evolution', status: 'conectado', ultimaConexao: new Date().toISOString(), mensagensHoje: 84, agenteAtribuido: 'Sofia' },
  { id: 'wa-3', nome: 'RD Modas Marketing', numero: '+55 11 99999-0003', provider: 'meta', status: 'desconectado', ultimaConexao: new Date(Date.now() - 86400000).toISOString(), mensagensHoje: 0, agenteAtribuido: 'Júlia' },
];

// ── Conversas ───────────────────────────────────────────────
export interface Message {
  id: string;
  from: 'cliente' | 'amanda';
  texto: string;
  timestamp: string;
  emocao?: Emotion;
  tipo: 'texto' | 'audio' | 'imagem' | 'pdf' | 'url';
}

export const conversaExemplo: Message[] = [
  { id: 'm1', from: 'cliente', texto: 'Oi! Vi um vestido lindo no Instagram de vocês', timestamp: new Date(Date.now() - 3600000).toISOString(), emocao: 'curioso', tipo: 'texto' },
  { id: 'm2', from: 'amanda', texto: 'Oii! Que ótimo 😊 Você lembra qual era o vestido?', timestamp: new Date(Date.now() - 3590000).toISOString(), tipo: 'texto' },
  { id: 'm3', from: 'cliente', texto: 'Era um midi floral, tom rosê', timestamp: new Date(Date.now() - 3580000).toISOString(), emocao: 'animado', tipo: 'texto' },
  { id: 'm4', from: 'amanda', texto: 'Perfeito! Esse é nosso campeão de vendas. Temos nos tamanhos P, M e G. Qual você usa?', timestamp: new Date(Date.now() - 3570000).toISOString(), tipo: 'texto' },
  { id: 'm5', from: 'cliente', texto: 'M! Quanto custa?', timestamp: new Date(Date.now() - 3560000).toISOString(), emocao: 'urgente', tipo: 'texto' },
  { id: 'm6', from: 'amanda', texto: 'R$ 289 no PIX ou parcelado em 3x sem juros no cartão. Posso reservar pra você?', timestamp: new Date(Date.now() - 3550000).toISOString(), tipo: 'texto' },
];

// ── Produtos ────────────────────────────────────────────────
export interface Product {
  id: string;
  nome: string;
  categoria: string;
  preco: number;
  estoque: number;
  vistos: number;
  citados: number;
  vendidos: number;
}

export const products: Product[] = [
  { id: 'p1', nome: 'Vestido Midi Floral Rosê', categoria: 'Vestidos', preco: 289, estoque: 12, vistos: 248, citados: 187, vendidos: 42 },
  { id: 'p2', nome: 'Blusa Cropped Tricô', categoria: 'Blusas', preco: 159, estoque: 28, vistos: 221, citados: 165, vendidos: 38 },
  { id: 'p3', nome: 'Calça Wide Leg Linho', categoria: 'Calças', preco: 219, estoque: 18, vistos: 198, citados: 142, vendidos: 31 },
  { id: 'p4', nome: 'Saia Plissada Midi', categoria: 'Saias', preco: 179, estoque: 22, vistos: 174, citados: 121, vendidos: 27 },
  { id: 'p5', nome: 'Conjunto Linho 2 peças', categoria: 'Conjuntos', preco: 349, estoque: 8, vistos: 156, citados: 108, vendidos: 19 },
  { id: 'p6', nome: 'Bolsa Couro Caramelo', categoria: 'Acessórios', preco: 269, estoque: 14, vistos: 142, citados: 89, vendidos: 16 },
];
