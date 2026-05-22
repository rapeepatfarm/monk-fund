import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users, FileText, TrendingUp, TrendingDown,
  Wallet, AlertCircle, UserCheck, UserX,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, provinces(*)')
    .eq('id', user.id)
    .single()

  const currentYear = new Date().getFullYear()

  // ดึงข้อมูลคู่ขนาน
  const [
    { data: memberStatuses },
    { data: membershipsThisYear },
    { data: fundTx },
    { data: recentClaims },
    { count: pendingCount },
  ] = await Promise.all([
    // สถานะสมาชิกทั้งหมด + prefix
    supabase.from('members').select('status, prefix'),

    // สมาชิกภาพที่ active ปีนี้
    supabase
      .from('memberships')
      .select('member_id')
      .eq('year', currentYear)
      .eq('status', 'active'),

    // ธุรกรรมกองทุนทั้งหมด
    supabase.from('fund_transactions').select('type, amount'),

    // การเบิกจ่ายล่าสุดที่รอดำเนินการ
    supabase
      .from('claims')
      .select('id, claim_date, amount_requested, members(prefix, first_name, last_name, temples(name)), benefit_rules(benefit_type, description)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),

    // จำนวน pending claims
    supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  // ── สถิติสมาชิก ──────────────────────────────────────────────
  const totalMembers   = memberStatuses?.length ?? 0
  const monkCount      = memberStatuses?.filter(m => m.prefix === 'พระ').length ?? 0
  const noviceCount    = memberStatuses?.filter(m => m.prefix === 'สามเณร').length ?? 0
  const activeStatus   = memberStatuses?.filter(m => m.status === 'active').length ?? 0
  const inactiveStatus = memberStatuses?.filter(m => m.status === 'inactive').length ?? 0
  const deceasedStatus = memberStatuses?.filter(m => m.status === 'deceased').length ?? 0
  const paidThisYear   = membershipsThisYear?.length ?? 0
  const notPaidThisYear = activeStatus - paidThisYear  // active แต่ยังไม่ชำระปีนี้

  // ── สถิติกองทุน ───────────────────────────────────────────────
  const totalIncome  = fundTx
    ?.filter(t => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0
  const totalExpense = fundTx
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0) ?? 0
  const balance = totalIncome - totalExpense

  const benefitTypeLabel: Record<string, string> = {
    accident: 'อุบัติเหตุ',
    hospitalization: 'นอนโรงพยาบาล',
    bedridden: 'ป่วยติดเตียง',
    death: 'มรณภาพ',
  }

  const fmt = (n: number) =>
    n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="p-6 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ภาพรวม</h1>
        <p className="text-gray-500 text-sm mt-1">
          {profile?.provinces?.name ?? 'ทุกจังหวัด'} · ปี พ.ศ. {currentYear + 543}
        </p>
      </div>

      {/* ── ส่วนที่ 1: สถานะกองทุน ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">สถานะกองทุน</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* เงินรับเข้า */}
          <Card className="border-green-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">เงินรับเข้าทั้งหมด</CardTitle>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">฿{fmt(totalIncome)}</p>
              <p className="text-xs text-gray-400 mt-1">ยอดสะสมทั้งหมด</p>
            </CardContent>
          </Card>

          {/* เงินจ่ายออก */}
          <Card className="border-red-100">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">เงินจ่ายออกทั้งหมด</CardTitle>
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">฿{fmt(totalExpense)}</p>
              <p className="text-xs text-gray-400 mt-1">ยอดสะสมทั้งหมด</p>
            </CardContent>
          </Card>

          {/* ยอดคงเหลือ */}
          <Card className={`border-2 ${balance >= 0 ? 'border-amber-200 bg-amber-50/40' : 'border-red-200 bg-red-50/40'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">ยอดคงเหลือ</CardTitle>
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Wallet className="w-4 h-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-amber-700' : 'text-red-600'}`}>
                ฿{fmt(balance)}
              </p>
              <p className="text-xs text-gray-400 mt-1">รับเข้า − จ่ายออก</p>
            </CardContent>
          </Card>

        </div>
      </section>

      {/* ── ส่วนที่ 2: สถิติสมาชิก ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">สถิติสมาชิก</h2>

        {/* Row 1: ยอดรวม */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">สมาชิกทั้งหมด</CardTitle>
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Users className="w-4 h-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-gray-900">{totalMembers.toLocaleString()}</p>
              <div className="flex gap-3 mt-2 text-xs text-gray-500">
                <span>พระ {monkCount.toLocaleString()} รูป</span>
                <span>·</span>
                <span>เณร {noviceCount.toLocaleString()} รูป</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">ชำระค่าสมาชิกแล้ว</CardTitle>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{paidThisYear.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-2">
                ปี พ.ศ. {currentYear + 543} · คิดเป็น{' '}
                {totalMembers > 0 ? Math.round((paidThisYear / totalMembers) * 100) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">ยังไม่ชำระ / หมดอายุ</CardTitle>
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <UserX className="w-4 h-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-500">
                {(notPaidThisYear < 0 ? 0 : notPaidThisYear).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-2">สมาชิก active ที่ยังไม่ชำระปีนี้</p>
            </CardContent>
          </Card>

        </div>

        {/* Row 2: สถานะบุคคล + แถบ progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-700">สถานะสมาชิกรายบุคคล</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'ประจำวัด',  count: activeStatus,   total: totalMembers, color: 'bg-green-500' },
              { label: 'ย้ายออก',  count: inactiveStatus, total: totalMembers, color: 'bg-blue-400' },
              { label: 'มรณภาพ',  count: deceasedStatus, total: totalMembers, color: 'bg-red-500' },
            ].map(({ label, count, total, color }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-gray-700">{label}</span>
                    <span className="font-medium text-gray-900">
                      {count.toLocaleString()} ราย
                      <span className="text-gray-400 font-normal ml-1">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

      </section>

      {/* ── ส่วนที่ 3: การเบิกจ่ายรอดำเนินการ ── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            การเบิกจ่ายรอดำเนินการ
            {(pendingCount ?? 0) > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-orange-500 text-white text-xs rounded-full">
                {pendingCount}
              </span>
            )}
          </h2>
          <Link href="/claims" className="text-xs text-amber-600 hover:underline">ดูทั้งหมด →</Link>
        </div>

        <Card>
          <CardContent className="pt-4">
            {!recentClaims?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 gap-2">
                <AlertCircle className="w-8 h-8 opacity-40" />
                <p className="text-sm">ไม่มีรายการรอดำเนินการ</p>
              </div>
            ) : (
              <div className="divide-y">
                {recentClaims.map((claim) => {
                  const member = Array.isArray(claim.members) ? claim.members[0] : claim.members
                  const rule   = Array.isArray(claim.benefit_rules) ? claim.benefit_rules[0] : claim.benefit_rules
                  return (
                    <Link
                      key={claim.id}
                      href={`/claims/${claim.id}`}
                      className="flex items-center gap-3 py-3 hover:bg-gray-50 transition-colors px-1 rounded"
                    >
                      <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center text-base shrink-0">
                        🧘
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {member?.prefix} {member?.first_name} {member?.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {rule?.description ?? benefitTypeLabel[rule?.benefit_type ?? ''] ?? '-'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-amber-700">
                          ฿{(claim.amount_requested ?? 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">
                          {format(new Date(claim.claim_date), 'd MMM yy', { locale: th })}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

    </div>
  )
}
