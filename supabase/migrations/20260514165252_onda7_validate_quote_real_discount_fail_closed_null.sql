-- Onda 7 (B-4 da auditoria de 10/mai/2026): fail-CLOSED em NULL no validate_quote_real_discount.
--
-- CONTEXTO:
-- A funcao trigger validate_quote_real_discount tinha bypass NULL: quando o vendedor
-- nao tinha linha em seller_discount_limits, _max_allowed=NULL e a condicao
-- "_max_allowed IS NOT NULL AND _real_pct > _max_allowed" era FALSA, deixando passar
-- DESCONTO INFINITO. Risco real em producao: vendedor novo entra, admin esquece de
-- cadastrar limite, vendedor da 99% de desconto, margem evapora.
--
-- MUDANCA:
-- 1. COALESCE(_max_allowed, 0) apos o SELECT INTO — NULL vira 0% (default conservador).
-- 2. Mensagem de erro distinta no caso "sem cadastro" vs "estourou limite".
--
-- ESCOPO INTENCIONALMENTE LIMITADO:
-- O check de admin (_is_admin via role='admin') NAO foi alterado. Tema do "dual admin
-- pattern" esta deferido para decisao arquitetural separada (memoria do PO).
--
-- APLICADA EM PROD em 14/mai/2026 via MCP apply_migration (ADR 0006).
-- Este arquivo registra a migration no repo para historico/auditabilidade.

CREATE OR REPLACE FUNCTION public.validate_quote_real_discount()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _markup       NUMERIC := COALESCE(NEW.negotiation_markup_percent, 0);
  _apparent_pct NUMERIC := COALESCE(NEW.discount_percent, 0);
  _presented    NUMERIC := COALESCE(NEW.subtotal, 0);
  _real_sub     NUMERIC;
  _final        NUMERIC;
  _real_pct     NUMERIC;
  _max_allowed  NUMERIC;
  _is_admin     BOOLEAN;
BEGIN
  IF _markup > 0 THEN _real_sub := _presented / (1 + _markup / 100);
  ELSE _real_sub := _presented; END IF;
  _final := _presented * (1 - _apparent_pct / 100);
  IF _real_sub > 0 THEN
    _real_pct := ROUND(((_real_sub - _final) / _real_sub) * 100, 2);
  ELSE _real_pct := 0; END IF;
  NEW.real_subtotal := ROUND(_real_sub, 2);
  NEW.real_discount_percent := _real_pct;

  IF NEW.status IN ('draft', 'pending') AND NEW.seller_id IS NOT NULL AND _real_pct > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.seller_id AND role = 'admin'
    ) INTO _is_admin;

    IF NOT _is_admin THEN
      SELECT max_discount_percent INTO _max_allowed
      FROM public.seller_discount_limits WHERE user_id = NEW.seller_id;

      -- Onda 7 (B-4): fail-CLOSED em NULL. Vendedor sem linha em seller_discount_limits
      -- nao tem mais desconto ilimitado — agora trata como 0% (precisa aprovacao para qualquer desconto).
      _max_allowed := COALESCE(_max_allowed, 0);

      IF _real_pct > _max_allowed THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.discount_approval_requests
          WHERE quote_id = NEW.id AND status = 'approved'
            AND requested_discount_percent >= _real_pct
        ) THEN
          -- Mensagens distintas: "sem cadastro" (Onda 7) vs "estourou limite" (comportamento original)
          IF _max_allowed = 0 THEN
            RAISE EXCEPTION
              'Vendedor sem limite de desconto cadastrado. Solicite ao administrador o cadastro em seller_discount_limits, ou peca aprovacao para o desconto de %%%.',
              _real_pct
              USING ERRCODE = 'check_violation';
          ELSE
            RAISE EXCEPTION
              'Desconto real (%%%) excede o limite do vendedor (%%%). Solicite aprovacao antes de salvar.',
              _real_pct, _max_allowed
              USING ERRCODE = 'check_violation';
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.validate_quote_real_discount IS
'Onda 7 (B-4): valida real_discount_percent vs seller_discount_limits.max_discount_percent. NULL agora trata como 0 (fail-closed em NULL bypass). Admins (role=admin) tem bypass mantido.';
