import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

const CLAIM_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'รออนุมัติ', cls: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'อนุมัติแล้ว', cls: 'bg-green-100 text-green-800' },
  rejected: { label: 'ปฏิเสธ', cls: 'bg-red-100 text-red-800' },
}
const BENEFIT_TYPE_TH: Record<string, string> = {
  accident: 'อุบัติเหตุ',
  hospitalization: 'นอนโรงพยาบาล',
  bedridden: 'ป่วยติดเตียง',
  death: 'มรณภาพ',
}

export default async function ClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
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
  const statusFilter = params.status ?? ''

  let query = supabase
    .from('claims')
    .select('*, members!inner(prefix, first_name, last_name, province_id, temples(name)), benefit_rules(benefit_type, description)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (profile?.province_id && profile.role !== 'super_admin') {
    query = query.eq('members.province_id', profile.province_id)
  }
  if (statusFilter) {
    query = query.eq('status', statusFilter)
  }

  const { data: claims } = await query

  const statusOptions = [
    { value: '', label: 'ทุกสถานะ' },
    { value: 'pending', label: 'รออนุมัติ' },
    { value: 'approved', label: 'อนุมัติแล้ว' },
    { value: 'rejected', label: 'ปฏิเสธ' },
  ]

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">การเบิกจ่าย</h1>
        <p className="text-gray-500 text-sm mt-1">{claims?.length ?? 0} รายการ</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {statusOptions.map(({ value, label }) => (
          <Link
            key={value}
            href={value ? `/claims?status=${value}` : '/claims'}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              statusFilter === value
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สมาชิก</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">ประเภท</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">วันที่ยื่น</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">จำนวนเงิน</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!claims?.length ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">ไม่พบรายการเบิกจ่าย</td>
              </tr>
            ) : (
              claims.map((c) => {
                const member = Array.isArray(c.members) ? c.members[0] : c.members
                const rule = Array.isArray(c.benefit_rules) ? c.benefit_rules[0] : c.benefit_rules
                const temple = member && (Array.isArray((member as any).temples) ? (member as any).temples[0] : (member as any).temples)
                const cs = CLAIM_STATUS[c.status]
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">
                        {member?.prefix} {member?.first_name} {member?.last_name}
                      </p>
                      <p className="text-xs text-gray-400">{temple?.name ?? ''}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {rule?.description ?? BENEFIT_TYPE_TH[rule?.benefit_type ?? ''] ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {format(new Date(c.claim_date), 'd MMM yyyy', { locale: th })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">
                      ฿{(c.amount_approved ?? c.amount_requested ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cs.cls}`}>
                        {cs.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/claims/${c.id}`} className="text-amber-600 hover:text-amber-800 text-xs font-medium">
                        ดู →
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
