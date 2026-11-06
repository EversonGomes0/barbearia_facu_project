-- GANGSTAR Barbearia - banco de dados no Supabase
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- Pode rodar de novo sem problema (usa "if not exists" / "or replace").

-- =========================================================
-- 1) TABELAS
-- =========================================================

create table if not exists public.barbeiros (
    id            serial primary key,
    nome          text not null unique,
    especialidade text
);

create table if not exists public.servicos (
    id    serial primary key,
    nome  text not null unique,
    preco numeric(8,2) not null check (preco >= 0)
);

create table if not exists public.agendamentos (
    id               bigint generated always as identity primary key,
    cliente_nome     text not null check (char_length(cliente_nome) between 2 and 80),
    cliente_telefone text not null check (cliente_telefone ~ '^[0-9]{10,11}$'),
    barbeiro_id      int  not null references public.barbeiros(id),
    servico_id       int  not null references public.servicos(id),
    data             date not null,
    horario          time not null,
    valor            numeric(8,2) not null,
    criado_em        timestamptz not null default now(),
    -- Impede dois clientes no mesmo barbeiro, dia e horário (mesmo se clicarem juntos)
    constraint agendamento_unico unique (barbeiro_id, data, horario)
);

-- =========================================================
-- 2) SEGURANÇA (RLS)
-- Com RLS ligado e SEM políticas, o site (chave pública) não consegue
-- ler nem gravar nas tabelas diretamente. O telefone dos clientes fica protegido.
-- O site só acessa os dados pelas duas funções da seção 3.
-- =========================================================

alter table public.barbeiros     enable row level security;
alter table public.servicos      enable row level security;
alter table public.agendamentos  enable row level security;

-- =========================================================
-- 3) FUNÇÕES QUE O SITE PODE CHAMAR
-- =========================================================

-- Devolve só os horários ocupados (nunca nome nem telefone)
create or replace function public.horarios_ocupados(p_barbeiro text, p_data date)
returns table (hora text)
language sql
stable
security definer
set search_path = public
as $$
    select to_char(a.horario, 'HH24:MI')
    from public.agendamentos a
    join public.barbeiros b on b.id = a.barbeiro_id
    where b.nome = p_barbeiro
      and a.data = p_data;
$$;

-- Cria o agendamento validando tudo no servidor (o preço vem da tabela, não do site)
create or replace function public.criar_agendamento(
    p_nome     text,
    p_telefone text,
    p_barbeiro text,
    p_servico  text,
    p_data     date,
    p_horario  text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
    v_nome     text := left(trim(coalesce(p_nome, '')), 80);
    v_tel      text := regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
    v_barb_id  int;
    v_serv_id  int;
    v_preco    numeric(8,2);
    v_hora     time;
    v_agora    timestamp := now() at time zone 'America/Sao_Paulo';
begin
    if char_length(v_nome) < 2 then
        return json_build_object('ok', false, 'erro', 'nome_invalido');
    end if;

    if v_tel !~ '^[0-9]{10,11}$' then
        return json_build_object('ok', false, 'erro', 'telefone_invalido');
    end if;

    if p_horario not in ('09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00','19:00') then
        return json_build_object('ok', false, 'erro', 'horario_invalido');
    end if;
    v_hora := p_horario::time;

    if p_data is null or p_data > (v_agora::date + 90) then
        return json_build_object('ok', false, 'erro', 'data_invalida');
    end if;

    if (p_data + v_hora) <= v_agora then
        return json_build_object('ok', false, 'erro', 'horario_passou');
    end if;

    select id into v_barb_id from public.barbeiros where nome = p_barbeiro;
    if v_barb_id is null then
        return json_build_object('ok', false, 'erro', 'barbeiro_invalido');
    end if;

    select id, preco into v_serv_id, v_preco from public.servicos where nome = p_servico;
    if v_serv_id is null then
        return json_build_object('ok', false, 'erro', 'servico_invalido');
    end if;

    begin
        insert into public.agendamentos
            (cliente_nome, cliente_telefone, barbeiro_id, servico_id, data, horario, valor)
        values
            (v_nome, v_tel, v_barb_id, v_serv_id, p_data, v_hora, v_preco);
    exception when unique_violation then
        return json_build_object('ok', false, 'erro', 'horario_ocupado');
    end;

    return json_build_object('ok', true, 'valor', v_preco);
end;
$$;

-- Só estas duas funções ficam liberadas para o site
revoke all on function public.horarios_ocupados(text, date) from public;
revoke all on function public.criar_agendamento(text, text, text, text, date, text) from public;
grant execute on function public.horarios_ocupados(text, date) to anon, authenticated;
grant execute on function public.criar_agendamento(text, text, text, text, date, text) to anon, authenticated;

-- =========================================================
-- 4) DADOS INICIAIS
-- Os nomes dos serviços precisam ser iguais aos valores do <select> do index.html
-- =========================================================

insert into public.barbeiros (nome, especialidade) values
    ('Carlos', 'Degradê & acabamento'),
    ('Marcos', 'Cortes clássicos'),
    ('Rafael', 'Moderno & freestyle'),
    ('Lucas',  'Tesoura & precisão')
on conflict (nome) do nothing;

insert into public.servicos (nome, preco) values
    ('Corte Degradê',         25.00),
    ('Corte Fade',            25.00),
    ('Corte Social Clássico', 20.00),
    ('Pompadour',             35.00),
    ('Razor Part',            35.00),
    ('Barba Completa',        15.00)
on conflict (nome) do nothing;

-- =========================================================
-- Para ver os agendamentos (só no painel do Supabase, nunca pelo site):
--   select a.data, a.horario, b.nome as barbeiro, s.nome as servico,
--          a.cliente_nome, a.cliente_telefone, a.valor
--   from agendamentos a
--   join barbeiros b on b.id = a.barbeiro_id
--   join servicos  s on s.id = a.servico_id
--   order by a.data, a.horario;
-- =========================================================
