'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
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
  const [error, setError] = useState<string | null>(null)
  const [provinceId, setProvinceId] = useState(member?.province_id ?? defaultProvinceId)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    const payload = {
      province_id: fd.get('province_id') as string,
      temple_id: fd.get('temple_id') as string,
      prefix: fd.get('prefix') as 'พระ' | 'สามเณร',
      first_name: fd.get('first_name') as string,
      last_name: fd.get('last_name') as string,
      national_id: (fd.get('national_id') as string) || null,
      phone: (fd.get('phone') as string) || null,
      payment_channel: (fd.get('payment_channel') as string) || null,
      status: fd.get('status') as 'active' | 'inactive' | 'deceased',
    }

    const supabase = createClient()

    if (member) {
      const { error } = await supabase.from('members').update(payload).eq('id', member.id)
      if (error) { setError(error.message); setLoading(false); return }
      router.push(`/members/${member.id}`)
    } else {
      const { data, error } = await supabase.from('members').insert(payload).select('id').single()
      if (error) { setError(error.message); setLoading(false); return }
      router.push(`/members/${data.id}`)
    }
    router.refresh()
  }

  const filteredTemples = provinceId
    ? temples.filter(() => true) // Server already filtered; for super admin filter on client
    : temples

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          {isSuperAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="province_id">จังหวัด</Label>
              <select
                id="province_id"
                name="province_id"
                required
                value={provinceId}
                onChange={(e) => setProvinceId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- เลือกจังหวัด --</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
          {!isSuperAdmin && (
            <input type="hidden" name="province_id" value={defaultProvinceId} />
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="prefix">คำนำหน้า</Label>
              <select
                id="prefix"
                name="prefix"
                required
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

          <div className="space-y-1.5">
            <Label htmlFor="last_name">ฉายา / นามสกุล</Label>
            <Input id="last_name" name="last_name" required defaultValue={member?.last_name} placeholder="ฉายา" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="temple_id">วัด</Label>
            <select
              id="temple_id"
              name="temple_id"
              required
              defaultValue={member?.temple_id ?? ''}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">-- เลือกวัด --</option>
              {filteredTemples.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.amphoe ? ` (${t.amphoe})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="national_id">เลขบัตรประชาชน</Label>
            <Input id="national_id" name="national_id" defaultValue={member?.national_id ?? defaultNationalId ?? ''} placeholder="1-2345-67890-12-3" maxLength={17} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">เบอร์ติดต่อ</Label>
            <Input id="phone" name="phone" defaultValue={member?.phone ?? ''} placeholder="08X-XXX-XXXX" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment_channel">ช่องทางรับเงิน</Label>
            <Textarea
              id="payment_channel"
              name="payment_channel"
              defaultValue={member?.payment_channel ?? ''}
              placeholder="เช่น ธ.กสิกรไทย เลขที่ 123-4-56789-0 หรือ พร้อมเพย์ 0812345678"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">สถานะ</Label>
            <select
              id="status"
              name="status"
              required
              defaultValue={member?.status ?? 'active'}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="active">ใช้งาน (Active)</option>
              <option value="inactive">ไม่ใช้งาน (Inactive)</option>
              <option value="deceased">มรณภาพ</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={loading}>
              {loading ? 'กำลังบันทึก...' : member ? 'บันทึกการแก้ไข' : 'เพิ่มสมาชิก'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              ยกเลิก
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
