-- ============================================================
-- Backfill fund_transactions จาก memberships ที่มีอยู่แล้ว
-- รันใน Supabase SQL Editor (New Query)
-- ============================================================

INSERT INTO fund_transactions (
  province_id,
  member_id,
  national_id,
  type,
  category,
  reference_id,
  amount,
  note,
  transaction_date,
  created_at
)
SELECT
  m.province_id,
  m.id                                              AS member_id,
  COALESCE(m.national_id, '')                       AS national_id,
  'income'                                          AS type,
  'membership'                                      AS category,
  ms.id                                             AS reference_id,
  ms.amount,
  CONCAT('ชำระค่าสมาชิก ปี พ.ศ. ', ms.year + 543) AS note,
  COALESCE(ms.paid_date, ms.created_at::date)       AS transaction_date,
  ms.created_at
FROM memberships ms
JOIN members m ON m.id = ms.member_id
WHERE ms.status  = 'active'
  AND ms.amount  IS NOT NULL
  AND ms.amount  > 0
  -- ไม่ insert ซ้ำถ้ามี transaction อยู่แล้ว
  AND NOT EXISTS (
    SELECT 1
    FROM fund_transactions ft
    WHERE ft.reference_id = ms.id
      AND ft.category     = 'membership'
  );
