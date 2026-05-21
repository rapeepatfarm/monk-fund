'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Search, UserPlus, RefreshCw, AlertCircle, CheckCircle, CreditCard } from 'lucide-react'

interface Props {
  initialQ: string
  searched: boolean
  member: any
  latestMembership: any
  membershipStatus: 'active' | 'expired' | 'none'
  currentYear: number
}

export function MemberSearch({ initialQ, searched, member, latestMembership, membershipStatus, currentYear }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(initialQ)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!q.trim()) return
    router.push(`${pathname}?q=${q.trim()}`)
  }

  const temple = member && (Array.isArray(member.temples) ? member.temples[0] : member.temples)
  const province = member && (Array.isArray(member.provinces) ? member.provinces[0] : member.provinces)

  // Calculate expiry date display
  const expiryYear = latestMembership?.year
  const expiryDisplay = expiryYear ? `31 ธันวาคม ${expiryYear + 543}` : null

  return (
    <div className="space-y-4">
      {/* Search form */}
      <Card>
        <CardContent className="pt-5">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              เลขบัตรประชาชน
            </label>
            <div className="flex gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="กรอกเลข 13 หลัก"
                maxLength={17}
                className="font-mono text-lg tracking-wider"
                autoFocus
              />
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 shrink-0">
                <Search className="w-4 h-4 mr-1" /> ค้นหา
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {searched && (
        <>
          {/* Case 1: Not found */}
          {!member && (
            <Card className="border-orange-200">
              <CardContent className="pt-5">
                <div className="flex flex-col items-center text-center py-4 space-y-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">ไม่พบข้อมูลสมาชิก</p>
                    <p className="text-sm text-gray-500 mt-1">ไม่มีเลขบัตรประชาชน <span className="font-mono font-medium">{initialQ}</span> ในระบบ</p>
                  </div>
                  <Link href={`/members/new?national_id=${initialQ}`}>
                    <Button className="bg-amber-600 hover:bg-amber-700">
                      <UserPlus className="w-4 h-4 mr-2" /> สมัครสมาชิก
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Case 2: Found */}
          {member && (
            <Card className={membershipStatus === 'active' ? 'border-green-300' : 'border-red-300'}>
              <CardContent className="pt-5 space-y-4">
                {/* Member info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-lg shrink-0">
                    🧘
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-lg">
                      {member.prefix} {member.first_name} {member.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{temple?.name ?? '-'}{temple?.amphoe ? ` · ${temple.amphoe}` : ''}</p>
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

                {/* Action buttons */}
                <div className="border-t pt-3">
                  {membershipStatus === 'active' ? (
                    <div className="flex flex-col sm:flex-row gap-2">
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
                        <p className="text-sm text-red-700 font-medium">สถานะสมาชิกหมดอายุแล้ว กรุณาต่อสมาชิกใหม่ก่อนเบิกสวัสดิการ</p>
                      </div>
                      <Link href={`/members/${member.id}/renew`}>
                        <Button className="w-full bg-amber-600 hover:bg-amber-700">
                          <RefreshCw className="w-4 h-4 mr-2" /> ต่อสมาชิกใหม่
                        </Button>
                      </Link>
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
