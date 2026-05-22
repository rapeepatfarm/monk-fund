'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Search, RefreshCw, AlertCircle, CheckCircle,
  CreditCard, MapPin, Info, ArrowRightLeft, Pencil,
} from 'lucide-react'
import { ClaimButton } from './claim-button'
import { validateNationalId, stripNationalId } from '@/lib/national-id'

interface Props {
  initialQ: string
  searched: boolean
  member: any
  outsideMember: any
  floatingMember: any
  latestMembership: any
  membershipStatus: 'active' | 'expired' | 'none'
  currentYear: number
}

export function MemberSearch({
  initialQ, searched, member, outsideMember, floatingMember,
  latestMembership, membershipStatus, currentYear,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [q, setQ]           = useState(initialQ)
  const [idError, setIdError] = useState<string | null>(null)

  // ── validate + search ──────────────────────────────────────────
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = q.trim()
    if (!trimmed) return

    // ตรวจสอบ format และ checksum ก่อน navigate
    const digits    = stripNationalId(trimmed)
    const validation = validateNationalId(trimmed)

    if (!validation.valid) {
      if (!/^\d+$/.test(digits)) {
        setIdError('รูปแบบไม่ถูกต้อง — กรุณากรอกเฉพาะตัวเลข เช่น 1234567890123 หรือ 1-2345-67890-12-3')
      } else if (digits.length !== 13) {
        setIdError(`รูปแบบไม่ถูกต้อง — ต้องมี 13 หลัก (กรอกมา ${digits.length} หลัก)`)
      } else {
        setIdError('เลขบัตรประชาชนไม่ถูกต้อง — กรุณาตรวจสอบหมายเลขอีกครั้ง')
      }
      return
    }

    setIdError(null)
    router.push(`${pathname}?q=${digits}`)
  }

  const temple   = member && (Array.isArray(member.temples)   ? member.temples[0]   : member.temples)
  const province = member && (Array.isArray(member.provinces) ? member.provinces[0] : member.provinces)
  const expiryYear    = latestMembership?.year
  const expiryDisplay = expiryYear ? `31 ธันวาคม ${expiryYear + 543}` : null

  const outsideTemple   = outsideMember && (Array.isArray(outsideMember.temples)   ? outsideMember.temples[0]   : outsideMember.temples)
  const outsideProvince = outsideMember && (Array.isArray(outsideMember.provinces) ? outsideMember.provinces[0] : outsideMember.provinces)

  return (
    <div className="space-y-4">

      {/* ── Search form ── */}
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">เลขบัตรประชาชน</label>
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  value={q}
                  onChange={e => { setQ(e.target.value); setIdError(null) }}
                  placeholder="กรอกเลข 13 หลัก"
                  maxLength={17}
                  className={`font-mono text-lg tracking-wider ${idError ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                  autoFocus
                />
                {idError && (
                  <p className="flex items-start gap-1.5 text-xs text-red-600">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {idError}
                  </p>
                )}
              </div>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 shrink-0 self-start">
                <Search className="w-4 h-4 mr-1" /> ค้นหา
              </Button>
            </div>
            <p className="text-xs text-gray-400">รูปแบบ: 1234567890123 หรือ 1-2345-67890-12-3</p>
          </form>
        </CardContent>
      </Card>

      {searched && (
        <>
          {/* ── Case 1: ไม่พบในทุกจังหวัด ── */}
          {!member && !outsideMember && !floatingMember && (
            <Card className="border-orange-200">
              <CardContent className="pt-5">
                <div className="flex flex-col items-center text-center py-4 space-y-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">ไม่พบข้อมูลสมาชิก</p>
                    <p className="text-sm text-gray-500 mt-1">
                      ไม่มีเลขบัตรประชาชน <span className="font-mono font-medium">{initialQ}</span> ในระบบ
                    </p>
                  </div>
                  <Link href={`/members/new?national_id=${initialQ}`}>
                    <Button className="bg-amber-600 hover:bg-amber-700">
                      + สมัครสมาชิกใหม่
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Case 1.5: พบ "ลอยตัว" (ย้ายออกแล้ว) ── */}
          {!member && floatingMember && (
            <Card className="border-green-300 bg-green-50/30">
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-lg shrink-0">🧘</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg">
                      {floatingMember.prefix} {floatingMember.first_name} {floatingMember.last_name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{floatingMember.national_id}</p>
                  </div>
                  <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium shrink-0">ย้ายออกแล้ว</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-green-100 border border-green-300 rounded-lg">
                  <ArrowRightLeft className="w-4 h-4 text-green-700 shrink-0" />
                  <p className="text-sm text-green-800 font-medium">
                    สมาชิกรายนี้ย้ายออกจากวัดเดิมแล้ว พร้อมรับเข้าจังหวัดและกำหนดวัดใหม่ได้
                  </p>
                </div>
                <ClaimButton memberId={floatingMember.id} />
              </CardContent>
            </Card>
          )}

          {/* ── Case 2: พบในจังหวัดอื่น (ยังสังกัดอยู่) ── */}
          {!member && !floatingMember && outsideMember && (
            <Card className="border-yellow-300 bg-yellow-50/40">
              <CardContent className="pt-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-lg shrink-0">🧘</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-base">
                      {outsideMember.prefix} {outsideMember.first_name} {outsideMember.last_name}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {outsideTemple?.name ?? '-'}{outsideTemple?.amphoe ? ` · ${outsideTemple.amphoe}` : ''}
                    </p>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">{outsideMember.national_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm border-t pt-3">
                  <MapPin className="w-4 h-4 text-yellow-600 shrink-0" />
                  <span className="text-gray-600">สังกัดจังหวัด</span>
                  <span className="font-semibold text-gray-900">{outsideProvince?.name ?? '-'}</span>
                </div>
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2 text-yellow-800 font-semibold text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    พบข้อมูลสมาชิกในจังหวัดอื่น
                  </div>
                  <p className="text-sm text-yellow-800 leading-relaxed">
                    สมาชิกรายนี้อยู่ภายใต้การดูแลของจังหวัด
                    <span className="font-bold"> {outsideProvince?.name ?? '-'} </span>
                    วัด <span className="font-bold">{outsideTemple?.name ?? '-'}</span>
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                    <Info className="w-4 h-4 shrink-0" />
                    คำแนะนำสำหรับผู้ดูแลระบบ
                  </div>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside leading-relaxed">
                    <li>ต้องให้สมาชิกย้ายออกจากวัดต้นทาง (<span className="font-medium">{outsideProvince?.name ?? '-'}</span>) ก่อน</li>
                    <li>ติดต่อผู้ดูแลระบบจังหวัด{outsideProvince?.name ?? '-'} เพื่อเปลี่ยนสถานะเป็น "ย้ายออก"</li>
                    <li>เมื่อย้ายเรียบร้อยแล้ว จึงสามารถรับเข้าจังหวัดนี้ได้</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Case 3: พบในจังหวัดเดียวกัน ── */}
          {member && (
            <Card className={membershipStatus === 'active' ? 'border-green-300' : 'border-red-300'}>
              <CardContent className="pt-5 space-y-4">

                {/* ข้อมูลสมาชิก */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-lg shrink-0">🧘</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg">
                      {member.prefix} {member.first_name} {member.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {temple?.name ?? '-'}{temple?.amphoe ? ` · ${temple.amphoe}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{member.national_id}</p>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">จังหวัด</span>
                    <span className="text-gray-800">{province?.name ?? '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">วันหมดอายุสมาชิก</span>
                    <span className="font-medium">{expiryDisplay ?? 'ไม่มีข้อมูล'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">สถานะสมาชิก</span>
                    {membershipStatus === 'active' ? (
                      <span className="flex items-center gap-1 text-green-700 font-medium">
                        <CheckCircle className="w-4 h-4" /> ยังไม่หมดอายุ
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <AlertCircle className="w-4 h-4" /> หมดอายุแล้ว
                      </span>
                    )}
                  </div>
                </div>

                {/* ปุ่มดำเนินการ */}
                <div className="border-t pt-3">
                  {membershipStatus === 'active' ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      {/* แก้ไขข้อมูล — อยู่ก่อน */}
                      <Link href={`/members/${member.id}/edit`} className="flex-1">
                        <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                          <Pencil className="w-4 h-4 mr-2" /> แก้ไขข้อมูลสมาชิก
                        </Button>
                      </Link>
                      <Link href={`/members/${member.id}/renew`} className="flex-1">
                        <Button variant="outline" className="w-full border-amber-400 text-amber-700 hover:bg-amber-50">
                          <RefreshCw className="w-4 h-4 mr-2" /> ต่ออายุสมาชิก
                        </Button>
                      </Link>
                      <Link href={`/claims/new?member_id=${member.id}`} className="flex-1">
                        <Button className="w-full bg-amber-600 hover:bg-amber-700">
                          <CreditCard className="w-4 h-4 mr-2" /> เบิก/จ่ายสวัสดิการ
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-sm text-red-700 font-medium">
                          สถานะสมาชิกหมดอายุแล้ว กรุณาต่อสมาชิกใหม่ก่อนเบิกสวัสดิการ
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Link href={`/members/${member.id}/edit`} className="flex-1">
                          <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                            <Pencil className="w-4 h-4 mr-2" /> แก้ไขข้อมูลสมาชิก
                          </Button>
                        </Link>
                        <Link href={`/members/${member.id}/renew`} className="flex-1">
                          <Button className="w-full bg-amber-600 hover:bg-amber-700">
                            <RefreshCw className="w-4 h-4 mr-2" /> ต่อสมาชิกใหม่
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Initial state */}
      {!searched && (
        <div className="text-center py-12 text-gray-400 text-sm">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
          กรอกเลขบัตรประชาชนแล้วกด ค้นหา
        </div>
      )}
    </div>
  )
}
