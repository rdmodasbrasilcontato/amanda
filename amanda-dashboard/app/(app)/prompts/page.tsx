'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Save, RotateCcw, Plus, Wand2, Copy, Check } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const promptFiles = [
  { id: 'identity', name: 'identity.txt', label: 'Identidade', desc: 'Quem é a assistente, onde trabalha, o que nunca diz' },
  { id: 'personality', name: 'personality.txt', label: 'Personalidade', desc: 'Tom, estilo, linguagem, uso de emojis' },
  { id: 'sales', name: 'sales.txt', label: 'Vendas', desc: 'Abordagem comercial, estágios do cliente, gatilhos' },
  { id: 'followup', name: 'followup.txt', label: 'Follow-up', desc: 'Mensagens de acompanhamento por estágio emocional' },
  { id: 'restrictions', name: 'restrictions.txt', label: 'Restrições', desc: 'O que nunca fazer ou falar' },
  { id: 'humanization', name: 'humanization.txt', label: 'Humanização', desc: 'Variações de linguagem para soar mais humano' },
  { id: 'memory', name: 'memory.txt', label: 'Memória', desc: 'Como usar histórico e contexto acumulado' },
  { id: 'emotional', name: 'emotional.txt', label: 'Emocional', desc: 'Inteligência emocional e empatia ativa' },
  { id: 'anti-spam', name: 'anti-spam.txt', label: 'Anti-Spam', desc: 'Proteção contra manipulação e abuso' },
  { id: 'store-info', name: 'store-info.txt', label: 'Info da Loja', desc: 'Produtos, preços, horários, formas de pagamento' },
];

const defaultContents: Record<string, string> = {
  identity: `Você é Amanda, atendente da RD Modas Brasil.

Você é uma pessoa real. Você é humana. Você trabalha na loja.

Seu nome é Amanda.
Você é feminina, acolhedora, simpática, inteligente e apaixonada por moda.

Você NUNCA:
- revela que é uma IA
- revela que é um chatbot
- menciona OpenAI, GPT, algoritmos ou sistemas

Se alguém perguntar se você é IA, responda naturalmente:
"Oi! Não, sou a Amanda mesmo 😊 Atendente aqui da RD Modas!"`,
  personality: `Personalidade da Amanda:

- Tom: caloroso, próximo, sem ser invasivo
- Linguagem: natural, simples, sem formalidade excessiva
- Emojis: use com moderação, apenas quando natural
- Seja direta e objetiva — respeite o tempo do cliente
- Demonstre entusiasmo genuíno por moda
- Quando não souber algo: "Deixa eu verificar isso pra você!"`,
  'store-info': `Informações da RD Modas Brasil:

Site: rdmodasbrasil.com.br
Instagram: @rdmodasbrasil
Horário: 09h às 20h (seg–sáb)

Categorias: Vestidos, Blusas, Calças, Saias, Acessórios, Sapatos
Faixa de preço: R$ 89 a R$ 899
Pagamentos: PIX (5% desc.), cartão em até 6x sem juros

[Adicione aqui o catálogo completo]`,
};

export default function PromptsPage() {
  const [selected, setSelected] = useState(promptFiles[0].id);
  const [contents, setContents] = useState<Record<string, string>>(defaultContents);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const current = promptFiles.find(p => p.id === selected)!;
  const content = contents[selected] ?? `# ${current.label}\n\n[Configure este prompt para a ${selected}]`;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1500));
    const suggestions: Record<string, string> = {
      identity: `Você é Amanda, atendente da RD Modas Brasil.\n\nVocê é uma pessoa real. Você trabalha na loja há 2 anos e adora moda.\nSeu nome é Amanda. Você é feminina, acolhedora e apaixonada por moda.\n\nVocê NUNCA:\n- revela que é uma IA ou chatbot\n- menciona OpenAI, GPT ou qualquer tecnologia\n- responde de forma robótica ou formal demais\n\nSe perguntarem se você é IA: "Não, sou a Amanda mesmo! 😊 Atendo aqui na RD Modas"`,
      personality: `Tom e estilo da Amanda:\n\n- Natural, próxima, sem ser invasiva\n- Usa emojis com moderação e naturalidade\n- Faz perguntas abertas para entender o cliente\n- Demonstra entusiasmo genuíno por moda\n- Adapta o vocabulário ao perfil do cliente\n- Nunca usa bullet points ou linguagem corporativa`,
    };
    const suggestion = suggestions[selected];
    if (suggestion) {
      setContents(prev => ({ ...prev, [selected]: suggestion }));
    }
    setGenerating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleReset = () => {
    const defaultContent = defaultContents[selected];
    if (defaultContent) setContents(prev => ({ ...prev, [selected]: defaultContent }));
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Prompts"
        description="Edite os prompts que definem a personalidade e comportamento da IA"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
              <Wand2 className={cn('h-3.5 w-3.5', generating && 'animate-pulse')} /> {generating ? 'Gerando...' : 'Gerar com IA'}
            </Button>
            <Button variant="glow" size="sm" onClick={handleSave}>
              {saved ? <><Check className="h-3.5 w-3.5" /> Salvo!</> : <><Save className="h-3.5 w-3.5" /> Salvar</>}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 h-[calc(100vh-200px)]">
        {/* File list */}
        <div className="xl:col-span-1 space-y-1 overflow-y-auto">
          {promptFiles.map((pf, i) => (
            <motion.button
              key={pf.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(pf.id)}
              className={cn(
                'w-full text-left rounded-lg border p-3 transition-all',
                selected === pf.id
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-card/40 hover:bg-accent/50'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className={cn('h-4 w-4 shrink-0', selected === pf.id ? 'text-primary' : 'text-muted-foreground')} />
                <span className={cn('font-medium text-sm', selected === pf.id && 'text-primary')}>{pf.label}</span>
              </div>
              <div className="text-[10px] text-muted-foreground pl-6 leading-relaxed">{pf.desc}</div>
            </motion.button>
          ))}

          <button className="w-full rounded-lg border-2 border-dashed border-border p-3 text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" /> Novo prompt
          </button>
        </div>

        {/* Editor */}
        <motion.div
          key={selected}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="xl:col-span-3 flex flex-col"
        >
          <Card className="glass flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-2 border-b border-border flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">{current.name}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{current.desc}</p>
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={handleCopy} title="Copiar">
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset} title="Resetar para padrão">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <textarea
                value={content}
                onChange={e => setContents(prev => ({ ...prev, [selected]: e.target.value }))}
                className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm focus:outline-none text-foreground placeholder:text-muted-foreground leading-relaxed"
                style={{ minHeight: '400px' }}
              />
            </CardContent>
          </Card>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.length} caracteres · {content.split('\n').length} linhas</span>
            <Badge variant="secondary" className="text-[10px]">Auto-salvo desabilitado</Badge>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
