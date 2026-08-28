-- Nota de "por revisar" en una transacción: permite marcar un movimiento
-- para que otra persona (con su propia sesión) lo corrija, con una nota de
-- qué hay que aclarar. Vacío ('') significa "sin marcar".
alter table public.transactions
  add column if not exists revisar text not null default '';

comment on column public.transactions.revisar is 'Nota de revisión pendiente; vacío = sin marcar';
