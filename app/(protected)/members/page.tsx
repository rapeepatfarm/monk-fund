import { createClient } from '@/lib/supabase/server'
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

  const params = await searchParams
  const q = params.q?.trim() ?? ''

  let member: any = null
  let latestMembership: any = null
  let searched = false

  if (q) {
    searched = true
    const { data } = await supabase
      .from('members')
      .select('*, temples(name, amphoe), provinces(name)')
      .eq('national_id', q)
      .single()

    member = data ?? null

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

  // Determine membership status
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
        <Link
          href="/members/list"
          className="text-sm text-amber-600 hover:underline"
        >
          ดูรายชื่อทั้งหมด →
        </Link>
      </div>

      <MemberSearch
        initialQ={q}
        searched={searched}
        member={member}
        latestMembership={latestMembership}
        membershipStatus={membershipStatus}
        currentYear={currentYear}
      />
    </div>
  )
}
