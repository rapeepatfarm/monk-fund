import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClaimActions } from './claim-actions'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

const BENEFIT_TYPE_TH: Record<string, string> = {
  accident: 'อุบัติเหตุ',
  hospitalization: 'นอนโรงพยาบาล',
  bedridden: 'ป่วยติดเตียง',
  death: 'มรณภาพ',
}
const CLAIM_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'รออนุมัติ', cls: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'อนุมัติแล้ว', cls: 'bg-green-100 text-green-800' },
  rejected: { label: 'ปฏิเสธ', cls: 'bg-red-100 text-red-800' },
}

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const { data: claim } = await supabase
    .from('claims')
    .select('*, members(prefix, first_name, last_name, temples(name)), benefit_rules(benefit_type, description, max_per_event, max_per_year, rate_per_unit, unit)')
    .eq('id', id)
    .single()

  if (!claim) notFound()

  const member = Array.isArray(claim.members) ? claim.members[0] : claim.members
  const temple = member && (Array.isArray((member as any).temples) ? (member as any).temples[0] : (member as any).temples)
  const rule = Array.isArray(claim.benefit_rules) ? claim.benefit_rules[0] : claim.benefit_rules
  const cs = CLAIM_STATUS[claim.status]
  const canAct = claim.status === 'pending'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <Link href="/claims" className="text-sm text-amber-600 hover:underline">← กลับ</Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">รายละเอียดการเบิก</CardTitle>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cs.cls}`}>
            {cs.label}
          </span>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="สมาชิก" value={`${member?.prefix} ${member?.first_name} ${member?.last_name}`} />
          <Row label="วัด" value={temple?.name ?? '-'} />
          <Row label="ประเภท" value={rule?.description ?? BENEFIT_TYPE_TH[rule?.benefit_type ?? ''] ?? '-'} />
          <Row label="วันที่เข้ารับการรักษา" value={format(new Date(claim.claim_date), 'd MMMM yyyy', { locale: th })} />
          {claim.units && <Row label="จำนวน" value={`${claim.units} ${rule?.unit === 'night' ? 'คืน' : rule?.unit === 'month' ? 'เดือน' : 'ครั้ง'}`} />}
          <Row label="จำนวนเงินที่ขอเบิก" value={`฿${(claim.amount_requested ?? 0).toLocaleString()}`} />
          {claim.amount_approved !== null && (
            <Row label="จำนวนเงินที่อนุมัติ" value={
              <span className="font-semibold text-amber-700">฿{claim.amount_approved.toLocaleString()}</span>
            } />
          )}
          {claim.note && <Row label="หมายเหตุ" value={claim.note} />}
          <Row label="วันที่ยื่น" value={format(new Date(claim.created_at), 'd MMMM yyyy HH:mm', { locale: th })} />

          {rule && (
            <div className="pt-2 border-t">
              <p className="text-gray-400 text-xs mb-1">ข้อมูลวงเงิน</p>
              {rule.max_per_event && <p className="text-xs text-gray-500">สูงสุดต่อครั้ง: ฿{rule.max_per_event.toLocaleString()}</p>}
              {rule.max_per_year && <p className="text-xs text-gray-500">สูงสุดต่อปี: ฿{rule.max_per_year.toLocaleString()}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {claim.evidence_urls && claim.evidence_urls.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">เอกสารหลักฐาน</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {claim.evidence_urls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="block text-amber-600 hover:underline text-sm">
                  เอกสาร {i + 1}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canAct && (
        <Card>
          <CardHeader><CardTitle className="text-sm">ดำเนินการ</CardTitle></CardHeader>
          <CardContent>
            <ClaimActions
              claimId={id}
              amountRequested={claim.amount_requested ?? 0}
            />
          </CardContent>
        </Card>
      )}
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
