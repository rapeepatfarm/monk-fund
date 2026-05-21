import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { RenewForm } from './renew-form'

export default async function RenewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('*, temples(name)')
    .eq('id', id)
    .single()

  if (!member) notFound()

  const { data: memberships } = await supabase
    .from('memberships')
    .select('*')
    .eq('member_id', id)
    .order('year', { ascending: false })

  const currentYear = new Date().getFullYear()
  const latestMembership = memberships?.[0] ?? null

  // Calculate new year logic
  // Case 1: latest membership is current year → renew to next year
  // Case 2: latest membership is past year (or none) → renew to current year
  let newYear: number
  if (latestMembership && latestMembership.year >= currentYear) {
    newYear = latestMembership.year + 1
  } else {
    newYear = currentYear
  }

  const temple = Array.isArray(member.temples) ? member.temples[0] : member.temples

  return (
    <div className="p-6 max-w-lg mx-auto space-y-4">
      <div>
        <Link href="/members" className="text-sm text-amber-600 hover:underline">← กลับ</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">ชำระค่าสมาชิก</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {member.prefix} {member.first_name} {member.last_name}
          {temple?.name ? ` · ${temple.name}` : ''}
        </p>
      </div>

      <RenewForm
        memberId={id}
        nationalId={member.national_id ?? ''}
        provinceId={member.province_id ?? ''}
        latestMembership={latestMembership}
        newYear={newYear}
        currentYear={currentYear}
      />
    </div>
  )
}
