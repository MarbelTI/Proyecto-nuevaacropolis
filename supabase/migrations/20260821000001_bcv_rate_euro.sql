-- Agrega la tasa Euro del BCV junto a la tasa dólar ya existente.
-- Son valores monetarios (tasas de cambio): DECIMAL(19,4), no `numeric` sin
-- precisión, para no arrastrar el redondeo binario de float en cálculos de
-- dinero. Se fija también la precisión de `rate` (dólar), que ya existía sin
-- especificar, para que ambas columnas queden consistentes.
alter table public.bcv_rates
  add column if not exists rate_euro decimal(19, 4) null;

alter table public.bcv_rates
  alter column rate type decimal(19, 4);

comment on column public.bcv_rates.rate is 'Tasa BCV bolívares por dólar (celda G15 del XLS trimestral)';
comment on column public.bcv_rates.rate_euro is 'Tasa BCV bolívares por euro (celda G11 del XLS trimestral)';
