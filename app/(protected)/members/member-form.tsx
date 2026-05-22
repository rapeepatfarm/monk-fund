'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { validateNationalId, formatNationalId, stripNationalId } from '@/lib/national-id'
import type { Member, Temple, Province } from '@/types/database'

interface Props {
  temples: Pick<Temple, 'id' | 'name' | 'amphoe'>[]
  provinces: Pick<Province, 'id' | 'name'>[]
  defaultProvinceId: string
  isSuperAdmin: boolean
  member?: Member
  defaultNationalId?: string
}

export function MemberForm({ temples, provinces, defaultProvinceId, isSuperAdmin, member, defaultNationalId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [provinceId, setProvinceId] = useState(member?.province_id ?? defaultProvinceId)
  const [status, setStatus] = useState<'active' | 'inactive' | 'deceased'>(
    (member?.status as 'active' | 'inactive' | 'deceased') ?? 'active'
  )

  // ── national ID state ──────────────────────────────────────────
  const [nationalId, setNationalId] = useState(
    member?.national_id ?? defaultNationalId ?? ''
  )
  const [idTouched, setIdTouched] = useState(false)

  const idValidation = validateNationalId(nationalId)
  const showIdError  = idTouched && !idValidation.valid
  const showIdOk     = idTouched && nationalId.trim() !== '' && idValidation.valid

  function handleNationalIdChange(raw: string) {
    // รับได้ทั้งตัวเลขล้วนและมี dash
    const stripped = stripNationalId(raw)
    // จำกัด 13 หลัก
    if (stripped.length <= 13) {
      // auto-format ขณะพิมพ์
      setNationalId(raw.replace(/[^\d-]/g, '').slice(0, 17))
    }
  }

  function handleNationalIdBlur() {
    setIdTouched(true)
    // auto-format เมื่อออกจาก field
    const stripped = stripNationalId(nationalId)
    if (stripped.length === 13) {
      setNationalId(formatNationalId(stripped))
    }
  }

  // ── submit ─────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIdTouched(true)

    if (!idValidation.valid) return  // หยุดถ้า ID ไม่ถูกต้อง

    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const memberStatus = fd.get('status') as 'active' | 'inactive' | 'deceased'
    const isTransferOut = memberStatus === 'inactive'

    const payload = {
      // ถ้าสถานะ "ย้ายออก" → ล้าง province และ temple ออก (สมาชิกลอยตัว)
      province_id:     isTransferOut ? null : (fd.get('province_id') as string || defaultProvinceId),
      temple_id:       isTransferOut ? null : ((fd.get('temple_id') as string) || null),
      prefix:          fd.get('prefix') as 'พระ' | 'สามเณร',
      first_name:      fd.get('first_name') as string,
      last_name:       fd.get('last_name') as string,
      national_id:     stripNationalId(nationalId) || null,
      phone:           (fd.get('phone') as string) || null,
      payment_channel: (fd.get('payment_channel') as string) || null,
      status:          memberStatus,
    }

    const supabase = createClient()

    if (member) {
      const { error } = await supabase.from('members').update(payload).eq('id', member.id)
      if (error) { setError(error.message); setLoading(false); return }
      // ถ้าย้ายออก → กลับหน้ารายชื่อ (เพราะ admin ไม่สามารถเข้าถึง record นี้ต่อได้แล้ว)
      if (isTransferOut) {
        router.push('/members')
      } else {
        router.push(`/members/${member.id}`)
      }
    } else {
      const { data, error } = await supabase.from('members').insert(payload).select('id').single()
      if (error) { setError(error.message); setLoading(false); return }
      router.push(`/members/${data.id}`)
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-4">

          {/* จังหวัด (super admin) */}
          {isSuperAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="province_id">จังหวัด</Label>
              <select
                id="province_id"
                name="province_id"
                required
                value={provinceId}
                onChange={e => setProvinceId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- เลือกจังหวัด --</option>
                {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          {!isSuperAdmin && (
            <input type="hidden" name="province_id" value={defaultProvinceId} />
          )}

          {/* คำนำหน้า + ชื่อ */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prefix">คำนำหน้า</Label>
              <select
                id="prefix" name="prefix" required
                defaultValue={member?.prefix ?? 'พระ'}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="พระ">พระ</option>
                <option value="สามเณร">สามเณร</option>
              </select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="first_name">ชื่อ</Label>
              <Input id="first_name" name="first_name" required defaultValue={member?.first_name} placeholder="ชื่อ" />
            </div>
          </div>

          {/* ฉายา/นามสกุล */}
          <div className="space-y-1.5">
            <Label htmlFor="last_name">ฉายา / นามสกุล</Label>
            <Input id="last_name" name="last_name" required defaultValue={member?.last_name} placeholder="ฉายา" />
          </div>

          {/* วัด */}
          <div className="space-y-1.5">
            <Label htmlFor="temple_id">วัด</Label>
            <select
              id="temple_id" name="temple_id" required
              defaultValue={member?.temple_id ?? ''}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- เลือกวัด --</option>
              {temples.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.amphoe ? ` (${t.amphoe})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* เลขบัตรประชาชน + validation */}
          <div className="space-y-1.5">
            <Label htmlFor="national_id">เลขบัตรประชาชน</Label>
            <div className="relative">
              <Input
                id="national_id"
                name="national_id"
                value={nationalId}
                onChange={e => handleNationalIdChange(e.target.value)}
                onBlur={handleNationalIdBlur}
                placeholder="1-2345-67890-12-3"
                maxLength={17}
                className={
                  showIdError ? 'border-red-400 pr-9 focus-visible:ring-red-300' :
                  showIdOk    ? 'border-green-400 pr-9 focus-visible:ring-green-300' : 'pr-9'
                }
              />
              {showIdOk && (
                <CheckCircle2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500 pointer-events-none" />
              )}
              {showIdError && (
                <AlertCircle className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
              )}
            </div>
            {showIdError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {'message' in idValidation ? idValidation.message : ''}
              </p>
            )}
            {showIdOk && (
              <p className="text-xs text-green-600">เลขบัตรประชาชนถูกต้อง</p>
            )}
          </div>

          {/* เบอร์ติดต่อ */}
          <div className="space-y-1.5">
            <Label htmlFor="phone">เบอร์ติดต่อ</Label>
            <Input id="phone" name="phone" defaultValue={member?.phone ?? ''} placeholder="08X-XXX-XXXX" />
          </div>

          {/* ช่องทางรับเงิน */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_channel">ช่องทางรับเงิน</Label>
            <Textarea
              id="payment_channel" name="payment_channel"
              defaultValue={member?.payment_channel ?? ''}
              placeholder="เช่น ธ.กสิกรไทย เลขที่ 123-4-56789-0 หรือ พร้อมเพย์ 0812345678"
              rows={2}
            />
          </div>

          {/* สถานะ */}
          <div className="space-y-1.5">
            <Label htmlFor="status">สถานะ</Label>
            <select
              id="status" name="status" required
              value={status}
              onChange={e => setStatus(e.target.value as 'active' | 'inactive' | 'deceased')}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="active">ประจำวัด</option>
              <option value="inactive">ย้ายออก</option>
              <option value="deceased">มรณภาพ</option>
            </select>
            {status === 'inactive' && (
              <div className="flex gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  เมื่อบันทึกสถานะ <strong>ย้ายออก</strong> ระบบจะนำข้อมูลวัดและจังหวัดออกจากสมาชิกรายนี้
                  เพื่อให้ admin จังหวัดปลายทางสามารถรับเข้าและกำหนดวัดใหม่ได้
                </span>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : member ? 'บันทึกการแก้ไข' : 'เพิ่มสมาชิก'}
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
