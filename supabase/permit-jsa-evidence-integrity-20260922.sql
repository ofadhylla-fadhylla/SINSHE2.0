-- SINSHE 2.0 - PTW cross-module integrity hard gates
-- Applied to production Supabase on 2026-09-22.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='permits_jsa_no_fkey' AND conrelid='public.permits'::regclass
  ) THEN
    ALTER TABLE public.permits
      ADD CONSTRAINT permits_jsa_no_fkey
      FOREIGN KEY (jsa_no) REFERENCES public.jsa_assessments(id)
      ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.validate_permit_integrity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_jsa_status text;
  v_jsa_company text;
  v_jsa_valid_until date;
  v_loto_status text;
  v_evidence_count integer;
BEGIN
  IF NEW.jsa_no IS NOT NULL AND btrim(NEW.jsa_no) <> '' THEN
    SELECT status, company_code, valid_until
      INTO v_jsa_status, v_jsa_company, v_jsa_valid_until
    FROM public.jsa_assessments
    WHERE id = NEW.jsa_no;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'JSA % tidak ditemukan pada Digital JSA.', NEW.jsa_no;
    END IF;

    IF v_jsa_company IS DISTINCT FROM NEW.company_code THEN
      RAISE EXCEPTION 'JSA % berasal dari PT %, sedangkan permit menggunakan PT %.', NEW.jsa_no, v_jsa_company, NEW.company_code;
    END IF;
  END IF;

  IF NEW.status IN ('Submitted','Assistant Review','Field Verification','Approved','Active','Suspended','Closed') THEN
    IF NEW.jsa_no IS NULL OR btrim(NEW.jsa_no) = '' THEN
      RAISE EXCEPTION 'Permit status % wajib memiliki JSA aktual.', NEW.status;
    END IF;
    IF v_jsa_status IS DISTINCT FROM 'Approved' THEN
      RAISE EXCEPTION 'JSA % harus berstatus Approved sebelum permit dapat %.', NEW.jsa_no, NEW.status;
    END IF;
    IF v_jsa_valid_until IS NOT NULL AND v_jsa_valid_until < current_date THEN
      RAISE EXCEPTION 'JSA % sudah kedaluwarsa sejak %.', NEW.jsa_no, v_jsa_valid_until;
    END IF;
  END IF;

  IF NEW.permit_type = 'Electrical Work'
     AND coalesce(NEW.loto_required,false)
     AND NEW.status IN ('Approved','Active') THEN
    IF NEW.loto_ref IS NULL OR btrim(NEW.loto_ref) = '' THEN
      RAISE EXCEPTION 'Electrical Work membutuhkan LOTO aktual sebelum %.', NEW.status;
    END IF;
    SELECT status INTO v_loto_status
    FROM public.loto_installations
    WHERE id = NEW.loto_ref;
    IF v_loto_status IS DISTINCT FROM 'Applied' THEN
      RAISE EXCEPTION 'LOTO % harus berstatus Applied sebelum permit %.', NEW.loto_ref, NEW.status;
    END IF;
  END IF;

  IF NEW.status = 'Closed' THEN
    SELECT count(*) INTO v_evidence_count
    FROM public.evidence_documents e
    WHERE e.module = 'Permit to Work'
      AND e.record_id = NEW.id
      AND nullif(e.storage_path,'') IS NOT NULL
      AND coalesce(e.status,'Active') NOT IN ('Archived','Superseded');
    IF v_evidence_count < 1 THEN
      RAISE EXCEPTION 'Permit % belum dapat ditutup: upload minimal 1 file evidence aktual pada Document & Evidence.', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_permit_integrity() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validate_permit_integrity ON public.permits;
CREATE TRIGGER trg_validate_permit_integrity
BEFORE INSERT OR UPDATE OF jsa_no,status,company_code,loto_ref,loto_required,closure
ON public.permits
FOR EACH ROW EXECUTE FUNCTION public.validate_permit_integrity();

CREATE OR REPLACE VIEW public.permit_integration_readiness
WITH (security_invoker = true)
AS
SELECT
  p.id,
  p.company_code,
  p.unit,
  p.permit_type,
  p.status AS permit_status,
  p.jsa_no,
  j.status AS jsa_status,
  j.valid_until AS jsa_valid_until,
  (j.id IS NOT NULL AND j.status='Approved' AND (j.valid_until IS NULL OR j.valid_until >= current_date) AND j.company_code=p.company_code) AS jsa_ready,
  p.loto_ref,
  l.status AS loto_status,
  CASE WHEN p.permit_type='Electrical Work' AND coalesce(p.loto_required,false)
       THEN (l.id IS NOT NULL AND l.status='Applied') ELSE true END AS loto_ready,
  coalesce(ev.evidence_count,0) AS evidence_count,
  coalesce(ev.file_count,0) AS file_evidence_count,
  (coalesce(ev.file_count,0) > 0) AS evidence_ready
FROM public.permits p
LEFT JOIN public.jsa_assessments j ON j.id=p.jsa_no
LEFT JOIN public.loto_installations l ON l.id=p.loto_ref
LEFT JOIN LATERAL (
  SELECT count(*)::int AS evidence_count,
         count(*) FILTER (WHERE nullif(e.storage_path,'') IS NOT NULL)::int AS file_count
  FROM public.evidence_documents e
  WHERE e.module='Permit to Work'
    AND e.record_id=p.id
    AND coalesce(e.status,'Active') NOT IN ('Archived','Superseded')
) ev ON true;

REVOKE ALL ON public.permit_integration_readiness FROM anon;
GRANT SELECT ON public.permit_integration_readiness TO authenticated;
