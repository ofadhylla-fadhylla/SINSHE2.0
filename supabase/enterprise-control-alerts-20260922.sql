-- SINSHE 2.0 - Enterprise Control Alerts
-- Applied to production Supabase on 2026-09-22.

CREATE OR REPLACE VIEW public.enterprise_control_alerts
WITH (security_invoker = true)
AS
SELECT 'Corrective Action'::text AS source,
       c.id::text AS record_id,
       c.company_code,
       c.unit,
       coalesce(c.title,c.id)::text AS title,
       c.due_date::date AS due_date,
       c.status::text AS status,
       CASE WHEN c.due_date < current_date THEN 'Critical'
            WHEN c.due_date <= current_date + 7 THEN 'High'
            WHEN c.due_date <= current_date + 30 THEN 'Medium' ELSE 'Low' END::text AS severity,
       'Action Due'::text AS alert_type,
       '/corrective-action'::text AS route,
       (c.due_date-current_date)::int AS days_to_due
FROM public.corrective_actions c
WHERE coalesce(c.status,'') NOT IN ('Closed','Completed','Cancelled')
  AND c.due_date IS NOT NULL
  AND c.due_date <= current_date + 60

UNION ALL
SELECT 'Regulatory Compliance',r.id::text,r.company_code,r.unit,coalesce(r.obligation,r.id)::text,r.due_date::date,r.status::text,
       CASE WHEN r.due_date < current_date OR coalesce(r.status,'') IN ('Overdue','Non-Compliant') THEN 'Critical'
            WHEN r.due_date <= current_date + 7 OR coalesce(r.priority,'')='Critical' THEN 'High'
            WHEN r.due_date <= current_date + 30 OR coalesce(r.priority,'')='High' THEN 'Medium' ELSE 'Low' END,
       'Compliance Due','/regulatory-compliance',(r.due_date-current_date)::int
FROM public.regulatory_obligations r
WHERE coalesce(r.status,'') NOT IN ('Compliant','Closed','Archived')
  AND r.due_date IS NOT NULL
  AND r.due_date <= current_date + 90

UNION ALL
SELECT 'Asset Integrity',a.id::text,a.company_code,a.unit,coalesce(a.name,a.id)::text,
       coalesce(a.next_test_date,a.riksa_due,a.silo_due,a.calibration_due)::date,
       coalesce(a.test_status,a.certificate_status,'')::text,
       CASE WHEN coalesce(a.next_test_date,a.riksa_due,a.silo_due,a.calibration_due)::date < current_date OR coalesce(a.test_status,'')='Expired' THEN 'Critical'
            WHEN coalesce(a.next_test_date,a.riksa_due,a.silo_due,a.calibration_due)::date <= current_date + 7 THEN 'High'
            WHEN coalesce(a.next_test_date,a.riksa_due,a.silo_due,a.calibration_due)::date <= current_date + 30 THEN 'Medium' ELSE 'Low' END,
       'Riksa / Certificate Due','/asset-integrity',
       (coalesce(a.next_test_date,a.riksa_due,a.silo_due,a.calibration_due)::date-current_date)::int
FROM public.assets a
WHERE coalesce(a.operational,'Active') <> 'Retired'
  AND coalesce(a.next_test_date,a.riksa_due,a.silo_due,a.calibration_due) IS NOT NULL
  AND coalesce(a.next_test_date,a.riksa_due,a.silo_due,a.calibration_due)::date <= current_date + 90

UNION ALL
SELECT 'SIO & Competency',l.id::text,l.company_code,l.unit,
       concat_ws(' · ',nullif(l.employee_name,''),nullif(l.training_name,''))::text,
       l.valid_until::date,l.status::text,
       CASE WHEN l.valid_until < current_date OR coalesce(l.status,'')='Expired' THEN 'Critical'
            WHEN l.valid_until <= current_date + 7 THEN 'High'
            WHEN l.valid_until <= current_date + 30 THEN 'Medium' ELSE 'Low' END,
       'SIO / Certificate Expiry','/learning-competency',(l.valid_until-current_date)::int
FROM public.learning_records l
WHERE coalesce(l.mandatory,true)=true
  AND l.valid_until IS NOT NULL
  AND l.valid_until <= current_date + 90

UNION ALL
SELECT 'Document & Evidence',e.id::text,e.company_code,e.unit,coalesce(e.title,e.file_name,e.id)::text,
       e.valid_until::date,e.status::text,
       CASE WHEN e.valid_until < current_date THEN 'Critical'
            WHEN e.valid_until <= current_date + 7 THEN 'High'
            WHEN e.valid_until <= current_date + 30 THEN 'Medium' ELSE 'Low' END,
       'Document Expiry','/document-evidence',(e.valid_until-current_date)::int
FROM public.evidence_documents e
WHERE coalesce(e.status,'Active') NOT IN ('Archived','Superseded')
  AND e.valid_until IS NOT NULL
  AND e.valid_until <= current_date + 90

UNION ALL
SELECT 'Permit Integration',p.id::text,p.company_code,p.unit,coalesce(p.title,p.id)::text,p.end_at::date,p.status::text,
       CASE WHEN (NOT pr.jsa_ready OR NOT pr.loto_ready) THEN 'Critical'
            WHEN p.status IN ('Active','Suspended') AND NOT pr.evidence_ready THEN 'High'
            ELSE 'Medium' END,
       trim(both ' / ' from concat(
         CASE WHEN NOT pr.jsa_ready THEN 'JSA Gap / ' ELSE '' END,
         CASE WHEN NOT pr.loto_ready THEN 'LOTO Gap / ' ELSE '' END,
         CASE WHEN NOT pr.evidence_ready THEN 'Evidence Gap' ELSE '' END
       ))::text,
       '/permit-to-work',(p.end_at::date-current_date)::int
FROM public.permit_integration_readiness pr
JOIN public.permits p ON p.id=pr.id
WHERE p.status IN ('Submitted','Assistant Review','Field Verification','Approved','Active','Suspended')
  AND (NOT pr.jsa_ready OR NOT pr.loto_ready OR NOT pr.evidence_ready);

REVOKE ALL ON public.enterprise_control_alerts FROM anon;
GRANT SELECT ON public.enterprise_control_alerts TO authenticated;
