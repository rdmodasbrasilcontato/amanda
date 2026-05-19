'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, Eye, EyeOff, RefreshCw, Shield, Bell, Sliders, Palette, Globe, Key } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

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

function SecretInput({ value, label }: { value: string; label: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Input value={show ? value : '•'.repeat(24)} readOnly className="w-64 font-mono text-xs" />
      <Button variant="ghost" size="icon" onClick={() => setShow(!show)}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button
      onClick={() => setOn(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? 'bg-primary' : 'bg-muted'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Configurações"
        description="Configure as variáveis de ambiente, segurança e comportamento do sistema"
        actions={<Button variant="glow" size="sm"><Save className="h-3.5 w-3.5" /> Salvar</Button>}
      />

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
                <Input defaultValue="RD Modas Brasil" className="w-56" />
              </ConfigRow>
              <ConfigRow label="Nome da Assistente" desc="Persona da IA">
                <Input defaultValue="Amanda" className="w-56" />
              </ConfigRow>
              <ConfigRow label="Fuso Horário" desc="Usado para follow-ups e relatórios">
                <Input defaultValue="America/Sao_Paulo" className="w-56 font-mono text-xs" />
              </ConfigRow>
              <ConfigRow label="Horário de Atendimento" desc="09h–20h — seg a sáb">
                <div className="flex items-center gap-2">
                  <Input defaultValue="09" className="w-16 text-center" />
                  <span className="text-muted-foreground">às</span>
                  <Input defaultValue="20" className="w-16 text-center" />
                </div>
              </ConfigRow>
              <ConfigRow label="Webhook Base URL" desc="URL pública desta VPS">
                <Input defaultValue="http://SEU-IP:3000" className="w-64 font-mono text-xs" />
              </ConfigRow>
              <ConfigRow label="Modo de Log" desc="Nível de verbosidade dos logs">
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option>info</option><option>debug</option><option>warn</option><option>error</option>
                </select>
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
                <div className="flex items-center gap-3">
                  <Progress value={70} className="w-28 h-2" />
                  <Input defaultValue="0.7" className="w-16 text-center font-mono" />
                </div>
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
            <CardHeader><CardTitle className="text-base">Follow-ups</CardTitle></CardHeader>
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
              <ConfigRow label="Probabilidade de Áudio" desc="Chance de responder com áudio">
                <Input defaultValue="0.15" className="w-24 font-mono" />
              </ConfigRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credenciais */}
        <TabsContent value="credenciais" className="mt-4 space-y-4">
          {[
            { title: 'OpenAI', fields: [{ k: 'OPENAI_API_KEY', v: 'sk-proj-abc123...' }] },
            { title: 'Supabase', fields: [
              { k: 'SUPABASE_URL', v: 'https://xxx.supabase.co' },
              { k: 'SUPABASE_ANON_KEY', v: 'eyJhbGci...' },
              { k: 'SUPABASE_SERVICE_ROLE_KEY', v: 'eyJhbGci...' },
            ]},
            { title: 'Z-API', fields: [
              { k: 'ZAPI_INSTANCE_ID', v: 'INSTANCE_ID' },
              { k: 'ZAPI_TOKEN', v: 'TOKEN_AQUI' },
              { k: 'ZAPI_CLIENT_TOKEN', v: 'CLIENT_TOKEN' },
            ]},
          ].map(section => (
            <Card key={section.title} className="glass">
              <CardHeader><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
              <CardContent>
                {section.fields.map(f => (
                  <ConfigRow key={f.k} label={f.k}>
                    <SecretInput value={f.v} label={f.k} />
                  </ConfigRow>
                ))}
              </CardContent>
            </Card>
          ))}
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
                <SecretInput value="super-secret-jwt-key-here" label="JWT_SECRET" />
              </ConfigRow>
              <ConfigRow label="Admin API Key" desc="Chave de acesso ao painel admin">
                <SecretInput value="admin-key-here-abc123" label="ADMIN_API_KEY" />
              </ConfigRow>
              <ConfigRow label="Logs de Auditoria" desc="Registrar todas as ações admin">
                <Toggle defaultChecked />
              </ConfigRow>
              <ConfigRow label="IP Whitelist" desc="Restringir acesso ao painel">
                <Toggle />
              </ConfigRow>
              <ConfigRow label="2FA Admin" desc="Autenticação de dois fatores">
                <Toggle />
              </ConfigRow>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notificações */}
        <TabsContent value="notificacoes" className="mt-4">
          <Card className="glass">
            <CardHeader><CardTitle className="text-base">Alertas e Notificações</CardTitle></CardHeader>
            <CardContent>
              {[
                { label: 'Alerta de erros críticos', desc: 'Notificar quando houver erros', on: true },
                { label: 'Relatório diário por e-mail', desc: 'Resumo enviado às 8h', on: false },
                { label: 'Cliente sem resposta (72h)', desc: 'Alertar sobre leads esquecidos', on: true },
                { label: 'Novo cliente VIP detectado', desc: 'Quando lead score > 90', on: true },
                { label: 'WhatsApp desconectado', desc: 'Alertar se instância cair', on: true },
                { label: 'Follow-up sem resposta', desc: 'Após 3 tentativas', on: false },
              ].map(n => (
                <ConfigRow key={n.label} label={n.label} desc={n.desc}>
                  <Toggle defaultChecked={n.on} />
                </ConfigRow>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
