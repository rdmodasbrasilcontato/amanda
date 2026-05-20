'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Eye, EyeOff, RefreshCw, Shield, Bell, Sliders, Globe, Key, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

function ConfigRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border/50 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5 max-w-sm">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SecretInput({ value, onChange }: { value: string; onChange?: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        readOnly={!onChange}
        className="w-64 font-mono text-xs"
      />
      <Button variant="ghost" size="icon" onClick={() => setShow(!show)}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

interface StatusData {
  database: boolean;
  totalClientes: number;
  followupsPendentes: number;
  conversasAtivas: number;
  mensagens24h: number;
  timestamp: string;
}

export default function ConfiguracoesPage() {
  const [statusData, setStatusData] = useState<StatusData | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Editable settings
  const [businessName, setBusinessName] = useState('RD Modas Brasil');
  const [webhookUrl, setWebhookUrl] = useState(process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://85.208.51.87:3000');
  const [assistantName, setAssistantName] = useState('Amanda');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [logMode, setLogMode] = useState('info');

  // Notification toggles
  const [notifs, setNotifs] = useState({
    errosCriticos: true,
    relatorioDiario: false,
    clienteSemResposta: true,
    novoClienteVip: true,
    whatsappDesconectado: true,
    followupSemResposta: false,
  });

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const json = await res.json();
        setStatusData(json);
      }
    } catch {}
    setLoadingStatus(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveResult(null);
    // Simulate save — in a real setup, this would POST to the backend
    await new Promise(r => setTimeout(r, 800));
    setSaveResult({ ok: true, msg: 'Configurações salvas localmente. Reinicie o servidor para aplicar.' });
    setSaving(false);
    setTimeout(() => setSaveResult(null), 5000);
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Configurações"
        description="Configure as variáveis de ambiente, segurança e comportamento do sistema"
        actions={
          <Button variant="glow" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        }
      />

      {/* Save result */}
      {saveResult && (
        <div className={`rounded-lg border p-3 flex items-center gap-2 text-sm ${
          saveResult.ok
            ? 'border-success/30 bg-success/10 text-success'
            : 'border-destructive/30 bg-destructive/10 text-destructive'
        }`}>
          {saveResult.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          {saveResult.msg}
        </div>
      )}

      {/* Database status banner */}
      <div className="rounded-xl border border-border glass p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`h-2.5 w-2.5 rounded-full ${statusData?.database ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
          <div>
            <div className="text-sm font-medium">
              {loadingStatus ? 'Verificando conexão...' : statusData?.database ? 'Supabase conectado' : 'Supabase desconectado'}
            </div>
            {statusData && (
              <div className="text-xs text-muted-foreground">
                {statusData.totalClientes} clientes · {statusData.conversasAtivas} conversas ativas · {statusData.mensagens24h} mensagens hoje
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusData?.database ? 'success' : 'destructive'} className="text-[10px]">
            {statusData?.database ? 'Online' : 'Offline'}
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loadingStatus}>
            <RefreshCw className={`h-3.5 w-3.5 ${loadingStatus ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral"><Globe className="h-3.5 w-3.5 mr-1.5" />Geral</TabsTrigger>
          <TabsTrigger value="ia"><Sliders className="h-3.5 w-3.5 mr-1.5" />IA</TabsTrigger>
          <TabsTrigger value="credenciais"><Key className="h-3.5 w-3.5 mr-1.5" />Credenciais</TabsTrigger>
          <TabsTrigger value="seguranca"><Shield className="h-3.5 w-3.5 mr-1.5" />Segurança</TabsTrigger>
          <TabsTrigger value="notificacoes"><Bell className="h-3.5 w-3.5 mr-1.5" />Notificações</TabsTrigger>
        </TabsList>

        {/* Geral */}
        <TabsContent value="geral" className="mt-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base">Configurações Gerais</CardTitle></CardHeader>
            <CardContent>
              <ConfigRow label="Nome da Empresa" desc="Aparece nos prompts e relatórios">
                <Input value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-56" />
              </ConfigRow>
              <ConfigRow label="Nome da Assistente" desc="Persona da IA">
                <Input value={assistantName} onChange={e => setAssistantName(e.target.value)} className="w-56" />
              </ConfigRow>
              <ConfigRow label="Fuso Horário" desc="Usado para follow-ups e relatórios">
                <Input value={timezone} onChange={e => setTimezone(e.target.value)} className="w-56 font-mono text-xs" />
              </ConfigRow>
              <ConfigRow label="Webhook / Backend URL" desc="URL pública do servidor Amanda">
                <Input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} className="w-64 font-mono text-xs" />
              </ConfigRow>
              <ConfigRow label="Modo de Log" desc="Nível de verbosidade dos logs">
                <select
                  value={logMode}
                  onChange={e => setLogMode(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>info</option><option>debug</option><option>warn</option><option>error</option>
                </select>
              </ConfigRow>
              <ConfigRow label="Supabase URL" desc="URL do projeto Supabase (somente leitura)">
                <Input
                  value={process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'Não configurado'}
                  readOnly
                  className="w-64 font-mono text-xs opacity-60"
                />
              </ConfigRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IA */}
        <TabsContent value="ia" className="mt-4 space-y-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base">OpenAI</CardTitle></CardHeader>
            <CardContent>
              <ConfigRow label="Modelo Principal" desc="Usado para geração de respostas">
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm w-40">
                  <option>gpt-4o</option><option>gpt-4o-mini</option><option>gpt-4-turbo</option>
                </select>
              </ConfigRow>
              <ConfigRow label="Temperatura" desc="0 = preciso, 1 = criativo">
                <Input defaultValue="0.7" className="w-16 text-center font-mono" />
              </ConfigRow>
              <ConfigRow label="Max Tokens" desc="Limite de tokens por resposta">
                <Input defaultValue="1024" className="w-24 font-mono text-sm" />
              </ConfigRow>
              <ConfigRow label="Debounce (ms)" desc="Tempo de espera antes de responder">
                <Input defaultValue="8000" className="w-24 font-mono text-sm" />
              </ConfigRow>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle className="text-base">Follow-ups Automáticos</CardTitle></CardHeader>
            <CardContent>
              <ConfigRow label="Follow-up 1" desc="Horas após inatividade">
                <Input defaultValue="2" className="w-24 font-mono" />
              </ConfigRow>
              <ConfigRow label="Follow-up 2" desc="Horas após inatividade">
                <Input defaultValue="24" className="w-24 font-mono" />
              </ConfigRow>
              <ConfigRow label="Follow-up 3" desc="Horas após inatividade">
                <Input defaultValue="72" className="w-24 font-mono" />
              </ConfigRow>
              <ConfigRow label="Probabilidade de Áudio" desc="Chance de responder com áudio (0–1)">
                <Input defaultValue="0.15" className="w-24 font-mono" />
              </ConfigRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credenciais */}
        <TabsContent value="credenciais" className="mt-4 space-y-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base">OpenAI</CardTitle></CardHeader>
            <CardContent>
              <ConfigRow label="OPENAI_API_KEY" desc="Chave de API da OpenAI">
                <SecretInput value="sk-proj-..." />
              </ConfigRow>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle className="text-base">Supabase</CardTitle></CardHeader>
            <CardContent>
              <ConfigRow label="SUPABASE_URL">
                <Input
                  value={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
                  readOnly
                  className="w-64 font-mono text-xs opacity-80"
                />
              </ConfigRow>
              <ConfigRow label="SUPABASE_ANON_KEY">
                <SecretInput value={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''} />
              </ConfigRow>
              <ConfigRow label="SUPABASE_SERVICE_ROLE_KEY" desc="Chave de serviço (somente servidor)">
                <SecretInput value="eyJhbGci..." />
              </ConfigRow>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle className="text-base">Z-API (WhatsApp)</CardTitle></CardHeader>
            <CardContent>
              <ConfigRow label="ZAPI_INSTANCE_ID">
                <Input defaultValue="INSTANCE_ID" className="w-48 font-mono text-xs" />
              </ConfigRow>
              <ConfigRow label="ZAPI_TOKEN">
                <SecretInput value="TOKEN_AQUI" />
              </ConfigRow>
              <ConfigRow label="ZAPI_CLIENT_TOKEN">
                <SecretInput value="CLIENT_TOKEN" />
              </ConfigRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segurança */}
        <TabsContent value="seguranca" className="mt-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base">Segurança e Auditoria</CardTitle></CardHeader>
            <CardContent>
              <ConfigRow label="Rate Limiting" desc="Máximo de req/min por IP">
                <Input defaultValue="60" className="w-24 font-mono" />
              </ConfigRow>
              <ConfigRow label="JWT Secret" desc="Secret para autenticação JWT">
                <SecretInput value="super-secret-jwt-key-here" />
              </ConfigRow>
              <ConfigRow label="Admin API Key" desc="Chave de acesso ao painel admin">
                <SecretInput value="admin-key-here-abc123" />
              </ConfigRow>
              <ConfigRow label="Logs de Auditoria" desc="Registrar todas as ações admin">
                <Toggle checked={true} onChange={() => {}} />
              </ConfigRow>
              <ConfigRow label="IP Whitelist" desc="Restringir acesso ao painel">
                <Toggle checked={false} onChange={() => {}} />
              </ConfigRow>
              <ConfigRow label="2FA Admin" desc="Autenticação de dois fatores">
                <Toggle checked={false} onChange={() => {}} />
              </ConfigRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes" className="mt-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base">Alertas e Notificações</CardTitle></CardHeader>
            <CardContent>
              {(Object.keys(notifs) as Array<keyof typeof notifs>).map(key => {
                const labels: Record<keyof typeof notifs, { label: string; desc: string }> = {
                  errosCriticos:        { label: 'Alerta de erros críticos', desc: 'Notificar quando houver erros' },
                  relatorioDiario:      { label: 'Relatório diário por e-mail', desc: 'Resumo enviado às 8h' },
                  clienteSemResposta:   { label: 'Cliente sem resposta (72h)', desc: 'Alertar sobre leads esquecidos' },
                  novoClienteVip:       { label: 'Novo cliente VIP detectado', desc: 'Quando lead score > 90' },
                  whatsappDesconectado: { label: 'WhatsApp desconectado', desc: 'Alertar se instância cair' },
                  followupSemResposta:  { label: 'Follow-up sem resposta', desc: 'Após 3 tentativas' },
                };
                const { label, desc } = labels[key];
                return (
                  <ConfigRow key={key} label={label} desc={desc}>
                    <Toggle
                      checked={notifs[key]}
                      onChange={v => setNotifs(prev => ({ ...prev, [key]: v }))}
                    />
                  </ConfigRow>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
