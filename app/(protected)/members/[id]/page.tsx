import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

const STATUS_CLASSES: Record<string, string> = {
  active:   'bg-green-100 text-green-800',
  inactive: 'bg-blue-100 text-blue-700',
  deceased: 'bg-red-100 text-red-800',
}
const STATUS_LABELS: Record<string, string> = {
  active:   'ประจำวัด',
  inactive: 'ย้ายออก',
  deceased: 'มรณภาพ',
}
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

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('*, temples(name, amphoe, district, address), provinces(name)')
    .eq('id', id)
    .single()

  if (!member) notFound()

  const { data: memberships } = await supabase
    .from('memberships')
    .select('*')
    .eq('member_id', id)
    .order('year', { ascending: false })

  const { data: claims } = await supabase
    .from('claims')
    .select('*, benefit_rules(benefit_type, description)')
    .eq('member_id', id)
    .order('claim_date', { ascending: false })
    .limit(20)

  const temple = Array.isArray(member.temples) ? member.temples[0] : member.temples
  const province = Array.isArray(member.provinces) ? member.provinces[0] : member.provinces
  const currentYear = new Date().getFullYear()
  const currentMembership = memberships?.find(m => m.year === currentYear)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/members" className="text-sm text-amber-600 hover:underline">← กลับ</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {member.prefix} {member.first_name} {member.last_name}
          </h1>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[member.status]}`}>
            {STATUS_LABELS[member.status]}
          </span>
        </div>
        <Link
          href={`/members/${id}/edit`}
          className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          แก้ไข
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">ข้อมูลส่วนตัว</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="วัด" value={temple?.name ?? '-'} />
            <Row label="อำเภอ" value={temple?.amphoe ?? '-'} />
            <Row label="จังหวัด" value={province?.name ?? '-'} />
            <Row label="เลขบัตรประชาชน" value={member.national_id ?? '-'} />
            <Row label="เบอร์โทร" value={member.phone ?? '-'} />
            <Row label="ช่องทางรับเงิน" value={member.payment_channel ?? '-'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">สมาชิกภาพ {currentYear}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {currentMembership ? (
              <div className="space-y-2">
                <Row label="สถานะ" value={
                  <span className={`px-2 py-0.5 rounded-full text-xs ${currentMembership.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {currentMembership.status === 'active' ? 'ชำระแล้ว' : 'หมดอายุ'}
                  </span>
                } />
                <Row label="วันที่ชำระ" value={currentMembership.paid_date ? format(new Date(currentMembership.paid_date), 'd MMMM yyyy', { locale: th }) : '-'} />
                <Row label="จำนวนเงิน" value={currentMembership.amount ? `฿${currentMembership.amount.toLocaleString()}` : '-'} />
              </div>
            ) : (
              <div className="text-center py-4 space-y-2">
                <p className="text-gray-400">ยังไม่ได้ชำระปีนี้</p>
                <Link
                  href={`/members/${id}/renew`}
                  className="inline-block mt-1 px-4 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors"
                >
                  ชำระค่าสมาชิก
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm">ประวัติการเบิกจ่าย</CardTitle>
          <Link
            href={`/claims/new?member_id=${id}`}
            className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            + ยื่นขอเบิก
          </Link>
        </CardHeader>
        <CardContent>
          {!claims?.length ? (
            <p className="text-sm text-gray-400 text-center py-6">ยังไม่มีการเบิกจ่าย</p>
          ) : (
            <div className="space-y-2">
              {claims.map((c) => {
                const rule = Array.isArray(c.benefit_rules) ? c.benefit_rules[0] : c.benefit_rules
                const cs = CLAIM_STATUS[c.status]
                return (
                  <Link
                    key={c.id}
                    href={`/claims/${c.id}`}
                    className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {rule?.description ?? BENEFIT_TYPE_TH[rule?.benefit_type ?? ''] ?? '-'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(c.claim_date), 'd MMM yyyy', { locale: th })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-amber-700">
                        ฿{(c.amount_approved ?? c.amount_requested ?? 0).toLocaleString()}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cs.cls}`}>{cs.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="text-gray-900 text-right">{value}</span>
    </div>
  )
}
