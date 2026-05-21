import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MembershipsList } from './memberships-list'

export default async function MembershipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const currentYear = new Date().getFullYear()

  // ดึงสมาชิกทั้งหมด (ทุกสถานะ) พร้อม national_id และ วัด
  const { data: members } = await supabase
    .from('members')
    .select('id, prefix, first_name, last_name, national_id, status, temples(id, name)')
    .order('first_name')

  const memberIds = members?.map(m => m.id) ?? []

  // ดึงสมาชิกภาพปีนี้
  const { data: memberships } = memberIds.length
    ? await supabase
        .from('memberships')
        .select('member_id, paid_date, amount, status, evidence_url')
        .in('member_id', memberIds)
        .eq('year', currentYear)
    : { data: [] }

  const membershipMap = new Map(memberships?.map(m => [m.member_id, m]))

  // รวม membership เข้ากับ member
  const combined = (members ?? []).map(m => {
    const temple = Array.isArray(m.temples) ? m.temples[0] : m.temples
    return {
      id: m.id,
      prefix: m.prefix ?? '',
      first_name: m.first_name,
      last_name: m.last_name,
      national_id: m.national_id ?? '',
      status: m.status as string,
      temple_name: (temple as any)?.name ?? '',
      membership: membershipMap.get(m.id) ?? null,
    }
  })

  // ── สถิติ ──────────────────────────────────────────────────────
  const totalAll      = combined.length
  const paidThisYear  = combined.filter(m => m.membership?.status === 'active').length
  const notRenewed    = combined.filter(m => m.status === 'active' && (!m.membership || m.membership.status !== 'active')).length
  const deceased      = combined.filter(m => m.status === 'deceased').length

  // รายชื่อวัดไม่ซ้ำ สำหรับ dropdown filter
  const temples = [...new Set(combined.map(m => m.temple_name).filter(Boolean))].sort()

  return (
    <MembershipsList
      members={combined}
      currentYear={currentYear}
      stats={{ totalAll, paidThisYear, notRenewed, deceased }}
      temples={temples}
    />
  )
}
