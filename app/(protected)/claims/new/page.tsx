import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ClaimForm } from '../claim-form'

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ member_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('province_id, role')
    .eq('id', user.id)
    .single()

  const params = await searchParams
  const defaultMemberId = params.member_id ?? ''

  // ดึงข้อมูลสมาชิกพร้อมกัน
  let membersQuery = supabase
    .from('members')
    .select('id, prefix, first_name, last_name, province_id')
    .eq('status', 'active')
    .order('first_name')

  if (profile?.province_id && profile.role !== 'super_admin') {
    membersQuery = membersQuery.eq('province_id', profile.province_id)
  }

  // ดึงเงื่อนไขการเบิก
  let rulesQuery = supabase
    .from('benefit_rules')
    .select('*')
    .eq('is_active', true)

  if (profile?.province_id && profile.role !== 'super_admin') {
    rulesQuery = rulesQuery.eq('province_id', profile.province_id)
  }

  // ถ้ามี member_id มา ให้ดึงข้อมูลสมาชิกนั้นพร้อม วัด
  const prefilledFetch = defaultMemberId
    ? supabase
        .from('members')
        .select('id, prefix, first_name, last_name, national_id, temples(name)')
        .eq('id', defaultMemberId)
        .single()
    : Promise.resolve({ data: null })

  const [
    { data: members },
    { data: benefitRules },
    { data: prefilledMemberRaw },
  ] = await Promise.all([membersQuery, rulesQuery, prefilledFetch])

  // แปลงข้อมูลสมาชิกที่ pre-fill
  let prefilledMember: { id: string; prefix: string; first_name: string; last_name: string; national_id: string; temple_name: string } | null = null
  if (prefilledMemberRaw) {
    const temple = Array.isArray(prefilledMemberRaw.temples)
      ? prefilledMemberRaw.temples[0]
      : prefilledMemberRaw.temples
    prefilledMember = {
      id:          prefilledMemberRaw.id,
      prefix:      prefilledMemberRaw.prefix ?? '',
      first_name:  prefilledMemberRaw.first_name,
      last_name:   prefilledMemberRaw.last_name,
      national_id: prefilledMemberRaw.national_id ?? '',
      temple_name: (temple as any)?.name ?? '',
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={defaultMemberId ? `/members/${defaultMemberId}` : '/claims'}
          className="text-sm text-amber-600 hover:underline"
        >
          ← กลับ
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">ยื่นขอเบิก</h1>
        <p className="text-gray-500 text-sm mt-0.5">กรอกข้อมูลการขอเบิกจ่ายจากกองทุน</p>
      </div>
      <ClaimForm
        members={members ?? []}
        benefitRules={benefitRules ?? []}
        defaultMemberId={defaultMemberId}
        prefilledMember={prefilledMember}
      />
    </div>
  )
}
