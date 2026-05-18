-- Execute este SQL PRIMEIRO no Supabase, antes do 004
-- Ele remove funções antigas com assinatura conflitante

DROP FUNCTION IF EXISTS buscar_memoria_cliente(uuid, vector, integer, double precision) CASCADE;
DROP FUNCTION IF EXISTS buscar_memoria_cliente(uuid, vector, integer, float) CASCADE;
DROP FUNCTION IF EXISTS buscar_memoria_cliente CASCADE;

DROP FUNCTION IF EXISTS buscar_produtos_semantico(vector, integer, double precision) CASCADE;
DROP FUNCTION IF EXISTS buscar_produtos_semantico(vector, integer, float) CASCADE;
DROP FUNCTION IF EXISTS buscar_produtos_semantico CASCADE;

DROP FUNCTION IF EXISTS atualizar_temperatura_lead CASCADE;
DROP FUNCTION IF EXISTS atualizar_timestamp CASCADE;
