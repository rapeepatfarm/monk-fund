'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { UserCheck } from 'lucide-react'
import type { BenefitRule } from '@/types/database'

const BENEFIT_TYPE_TH: Record<string, string> = {
  accident:        'อุบัติเหตุ',
  hospitalization: 'นอนโรงพยาบาล',
  bedridden:       'ป่วยติดเตียง',
  death:           'มรณภาพ',
}

interface SimpleMember {
  id: string
  prefix: string
  first_name: string
  last_name: string
}

interface PrefilledMember {
  id: string
  prefix: string
  first_name: string
  last_name: string
  national_id: string
  temple_name: string
}

interface Props {
  members: SimpleMember[]
  benefitRules: BenefitRule[]
  defaultMemberId: string
  prefilledMember?: PrefilledMember | null
}

export function ClaimForm({ members, benefitRules, defaultMemberId, prefilledMember }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [memberId, setMemberId]       = useState(defaultMemberId)
  const [ruleId, setRuleId]           = useState('')
  const [units, setUnits]             = useState('')
  const [amountRequested, setAmountRequested] = useState('')
  const [yearlyUsed, setYearlyUsed]           = useState<number | null>(null)
  const [currentMembershipId, setCurrentMembershipId] = useState<string | null>(null)
  const [limitInfo, setLimitInfo]     = useState<string | null>(null)

  const selectedRule = benefitRules.find(r => r.id === ruleId)
  const isLocked     = !!prefilledMember  // ล็อคสมาชิกเมื่อมาจากหน้าสมาชิก

  // ── ดึง membership ปีนี้ของสมาชิกที่เลือก ──
  useEffect(() => {
    if (!memberId) { setCurrentMembershipId(null); return }
    const supabase = createClient()
    supabase
      .from('memberships')
      .select('id')
      .eq('member_id', memberId)
      .eq('year', new Date().getFullYear())
      .eq('status', 'active')
      .single()
      .then(({ data }) => setCurrentMembershipId(data?.id ?? null))
  }, [memberId])

  // ── ดึงวงเงินที่ใช้ไปแล้วปีนี้ ──
  useEffect(() => {
    if (!memberId || !ruleId || !selectedRule) { setLimitInfo(null); return }
    const supabase = createClient()
    const currentYear = new Date().getFullYear()
    supabase
      .from('claims')
      .select('amount_approved')
      .eq('member_id', memberId)
      .eq('benefit_rule_id', ruleId)
      .eq('status', 'approved')
      .gte('claim_date', `${currentYear}-01-01`)
      .lte('claim_date', `${currentYear}-12-31`)
      .then(({ data }) => {
        const used = data?.reduce((s, c) => s + (c.amount_approved ?? 0), 0) ?? 0
        setYearlyUsed(used)
        if (selectedRule.max_per_year) {
          const remaining = selectedRule.max_per_year - used
          setLimitInfo(
            `ใช้ไปแล้ว ฿${used.toLocaleString()} / ฿${selectedRule.max_per_year.toLocaleString()} (เหลือ ฿${remaining.toLocaleString()})`
          )
        } else {
          setLimitInfo(null)
        }
      })
  }, [memberId, ruleId, selectedRule])

  // ── คำนวณยอดอัตโนมัติตาม unit ──
  useEffect(() => {
    if (!selectedRule || !units) return
    if (selectedRule.rate_per_unit && selectedRule.unit !== 'baht') {
      const calc = parseFloat(units) * selectedRule.rate_per_unit
      setAmountRequested(isNaN(calc) ? '' : String(calc))
    }
  }, [units, selectedRule])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!currentMembershipId) {
      setError('สมาชิกยังไม่ได้ต่ออายุสมาชิกภาพสำหรับปีนี้ กรุณาชำระค่าสมาชิกก่อนยื่นเบิก')
      setLoading(false)
      return
    }

    const amount = parseFloat(amountRequested)
    if (selectedRule?.max_per_year && yearlyUsed !== null) {
      const remaining = selectedRule.max_per_year - yearlyUsed
      if (amount > remaining) {
        setError(`จำนวนเงินเกินวงเงินคงเหลือ (เหลือ ฿${remaining.toLocaleString()})`)
        setLoading(false)
        return
      }
    }
    if (selectedRule?.max_per_event && amount > selectedRule.max_per_event) {
      setError(`จำนวนเงินเกินวงเงินสูงสุดต่อครั้ง (สูงสุด ฿${selectedRule.max_per_event.toLocaleString()})`)
      setLoading(false)
      return
    }

    const fd = new FormData(e.currentTarget)
    const payload = {
      member_id:        memberId,
      membership_id:    currentMembershipId,
      benefit_rule_id:  ruleId,
      claim_date:       fd.get('claim_date') as string,
      amount_requested: amount,
      units:            units ? parseFloat(units) : null,
      note:             (fd.get('note') as string) || null,
      status:           'pending' as const,
    }

    const supabase = createClient()
    const { data, error } = await supabase.from('claims').insert(payload).select('id').single()
    if (error) { setError(error.message); setLoading(false); return }

    router.push(`/claims/${data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-4">

          {/* ── สมาชิก ── */}
          {isLocked && prefilledMember ? (
            /* มาจากหน้าสมาชิก → แสดงเป็น card ล็อค */
            <div className="space-y-1.5">
              <Label>สมาชิก</Label>
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center text-base shrink-0">
                  🧘
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {prefilledMember.prefix} {prefilledMember.first_name} {prefilledMember.last_name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                    {prefilledMember.temple_name && <span>{prefilledMember.temple_name}</span>}
                    {prefilledMember.national_id && (
                      <>
                        <span className="text-gray-300">·</span>
                        <span>{prefilledMember.national_id}</span>
                      </>
                    )}
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
              </div>
              {memberId && !currentMembershipId && (
                <p className="text-xs text-orange-600">
                  ⚠ สมาชิกยังไม่ได้ชำระค่าสมาชิกปีนี้
                </p>
              )}
            </div>
          ) : (
            /* เข้าตรงจากเมนู → แสดง dropdown เลือกสมาชิก */
            <div className="space-y-1.5">
              <Label htmlFor="member_id">สมาชิก</Label>
              <select
                id="member_id"
                name="member_id"
                required
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- เลือกสมาชิก --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.prefix} {m.first_name} {m.last_name}
                  </option>
                ))}
              </select>
              {memberId && !currentMembershipId && (
                <p className="text-xs text-orange-600">
                  ⚠ สมาชิกยังไม่ได้ชำระค่าสมาชิกปีนี้
                </p>
              )}
            </div>
          )}

          {/* ── ประเภทการเบิก ── */}
          <div className="space-y-1.5">
            <Label htmlFor="benefit_rule_id">ประเภทการเบิก</Label>
            <select
              id="benefit_rule_id"
              name="benefit_rule_id"
              required
              value={ruleId}
              onChange={(e) => setRuleId(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- เลือกประเภท --</option>
              {benefitRules.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.description ?? BENEFIT_TYPE_TH[r.benefit_type]}
                  {r.max_per_year ? ` (สูงสุด ฿${r.max_per_year.toLocaleString()}/ปี)` : ''}
                </option>
              ))}
            </select>
            {limitInfo && (
              <p className="text-xs text-blue-600">📊 {limitInfo}</p>
            )}
          </div>

          {/* ── วันที่รับการรักษา ── */}
          <div className="space-y-1.5">
            <Label htmlFor="claim_date">วันที่เข้ารับการรักษา</Label>
            <Input
              id="claim_date"
              name="claim_date"
              type="date"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* ── จำนวนหน่วย (ถ้ามี) ── */}
          {selectedRule && selectedRule.unit !== 'baht' && (
            <div className="space-y-1.5">
              <Label htmlFor="units">
                จำนวน ({selectedRule.unit === 'night' ? 'คืน' : selectedRule.unit === 'month' ? 'เดือน' : 'ครั้ง'})
              </Label>
              <Input
                id="units"
                name="units"
                type="number"
                min="1"
                step="1"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder={selectedRule.unit === 'night' ? 'จำนวนคืน' : 'จำนวน'}
              />
              {selectedRule.rate_per_unit && (
                <p className="text-xs text-gray-500">
                  อัตรา ฿{selectedRule.rate_per_unit.toLocaleString()}/{selectedRule.unit === 'night' ? 'คืน' : 'เดือน'}
                </p>
              )}
            </div>
          )}

          {/* ── จำนวนเงิน ── */}
          <div className="space-y-1.5">
            <Label htmlFor="amount_requested">จำนวนเงินที่ขอเบิก (บาท)</Label>
            <Input
              id="amount_requested"
              name="amount_requested"
              type="number"
              min="1"
              step="0.01"
              required
              value={amountRequested}
              onChange={(e) => setAmountRequested(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* ── หมายเหตุ ── */}
          <div className="space-y-1.5">
            <Label htmlFor="note">หมายเหตุ</Label>
            <Textarea
              id="note"
              name="note"
              rows={3}
              placeholder="รายละเอียดเพิ่มเติม..."
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700"
              disabled={loading}
            >
              {loading ? 'กำลังบันทึก...' : 'ยื่นขอเบิก'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              ยกเลิก
            </Button>
          </div>

        </CardContent>
      </Card>
    </form>
  )
}
