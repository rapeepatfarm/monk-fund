import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MemberSearch } from './member-search'

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
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
  const q = params.q?.trim() ?? ''

  let member: any           = null
  let latestMembership: any = null
  let outsideMember: any    = null   // พบในจังหวัดอื่น (มี province_id)
  let floatingMember: any   = null   // พบแต่ "ลอยตัว" (province_id = null, ย้ายออกแล้ว)
  let searched              = false

  if (q) {
    searched = true

    // ค้นหาภายในขอบเขต RLS (จังหวัดตัวเอง หรือ super admin เห็นทั้งหมด)
    const { data } = await supabase
      .from('members')
      .select('*, temples(name, amphoe), provinces(name)')
      .eq('national_id', q)
      .single()

    member = data ?? null

    // ถ้าไม่พบผ่าน RLS → ค้นหาด้วย admin client (bypass RLS) เพื่อเช็คข้ามจังหวัด
    if (!member) {
      const adminClient = createAdminClient()
      const { data: crossData } = await adminClient
        .from('members')
        .select('id, prefix, first_name, last_name, national_id, province_id, status, temples(name, amphoe), provinces(name)')
        .eq('national_id', q)
        .single()

      if (crossData) {
        if (crossData.province_id === null) {
          // สมาชิก "ลอยตัว" — ย้ายออกแล้ว ไม่สังกัดจังหวัดใด → รับเข้าได้เลย
          floatingMember = crossData
        } else if (profile?.role !== 'super_admin') {
          // อยู่จังหวัดอื่น → แจ้งเตือน
          outsideMember = crossData
        }
      }
    }

    // ดึง membership ล่าสุดของสมาชิกที่พบในจังหวัดเดียวกัน
    if (member) {
      const { data: memberships } = await supabase
        .from('memberships')
        .select('*')
        .eq('member_id', member.id)
        .order('year', { ascending: false })
        .limit(1)

      latestMembership = memberships?.[0] ?? null
    }
  }

  const currentYear = new Date().getFullYear()

  // ตรวจสถานะ membership
  let membershipStatus: 'active' | 'expired' | 'none' = 'none'
  if (latestMembership) {
    if (latestMembership.year >= currentYear && latestMembership.status === 'active') {
      membershipStatus = 'active'
    } else {
      membershipStatus = 'expired'
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการสมาชิก</h1>
          <p className="text-gray-500 text-sm mt-1">ค้นหาสมาชิกด้วยเลขบัตรประชาชน</p>
        </div>
        <Link href="/members/list" className="text-sm text-amber-600 hover:underline">
          ดูรายชื่อทั้งหมด →
        </Link>
      </div>

      <MemberSearch
        initialQ={q}
        searched={searched}
        member={member}
        outsideMember={outsideMember}
        floatingMember={floatingMember}
        latestMembership={latestMembership}
        membershipStatus={membershipStatus}
        currentYear={currentYear}
      />
    </div>
  )
}
