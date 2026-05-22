'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search, Users, UserCheck, UserX, HeartCrack } from 'lucide-react'
import { format } from 'date-fns'
import { th } from 'date-fns/locale'

type MemberRow = {
  id: string
  prefix: string
  first_name: string
  last_name: string
  national_id: string
  status: string
  temple_name: string
  membership: {
    paid_date: string | null
    amount: number | null
    status: string
    evidence_url?: string | null
  } | null
}

type Stats = {
  totalAll: number
  paidThisYear: number
  notRenewed: number
  deceased: number
}

interface Props {
  members: MemberRow[]
  currentYear: number
  stats: Stats
  temples: string[]
}

type TabKey = 'all' | 'paid' | 'unpaid' | 'deceased'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all',      label: 'ทั้งหมด' },
  { key: 'paid',     label: 'ชำระแล้ว' },
  { key: 'unpaid',   label: 'ยังไม่ชำระ' },
  { key: 'deceased', label: 'มรณภาพ' },
]

export function MembershipsList({ members, currentYear, stats, temples }: Props) {
  const [query, setQuery]       = useState('')
  const [temple, setTemple]     = useState('')
  const [tab, setTab]           = useState<TabKey>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter(m => {
      // tab filter
      if (tab === 'paid'     && !(m.membership?.status === 'active')) return false
      if (tab === 'unpaid'   && !(m.status === 'active' && (!m.membership || m.membership.status !== 'active'))) return false
      if (tab === 'deceased' && m.status !== 'deceased') return false

      // temple filter
      if (temple && m.temple_name !== temple) return false

      // text search: ชื่อ, เลขบัตร, วัด
      if (q) {
        const haystack = [
          m.first_name, m.last_name, m.prefix,
          m.national_id, m.temple_name,
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })
  }, [members, query, temple, tab])

  const tabCount: Record<TabKey, number> = {
    all:      members.length,
    paid:     stats.paidThisYear,
    unpaid:   stats.notRenewed,
    deceased: stats.deceased,
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">สมาชิกภาพ</h1>
        <p className="text-gray-500 text-sm mt-1">
          ปี พ.ศ. {currentYear + 543} · ชำระแล้ว {stats.paidThisYear} / {stats.totalAll} ราย
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="w-4 h-4 text-amber-600" />}
          bg="bg-amber-50"
          label="ทั้งหมดในระบบ"
          value={stats.totalAll}
          unit="ราย"
        />
        <StatCard
          icon={<UserCheck className="w-4 h-4 text-green-600" />}
          bg="bg-green-50"
          label={`ชำระแล้ว ปี ${currentYear + 543}`}
          value={stats.paidThisYear}
          unit="ราย"
          valueColor="text-green-600"
        />
        <StatCard
          icon={<UserX className="w-4 h-4 text-orange-500" />}
          bg="bg-orange-50"
          label="ยังไม่ต่ออายุ"
          value={stats.notRenewed}
          unit="ราย"
          valueColor="text-orange-500"
        />
        <StatCard
          icon={<HeartCrack className="w-4 h-4 text-red-500" />}
          bg="bg-red-50"
          label="มรณภาพ"
          value={stats.deceased}
          unit="ราย"
          valueColor="text-red-500"
        />
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="ค้นหาชื่อ หรือ เลขบัตรประชาชน..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={temple}
          onChange={e => setTemple(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:w-56"
        >
          <option value="">— วัดทั้งหมด —</option>
          {temples.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            <span className={`ml-1.5 text-xs ${tab === key ? 'text-amber-600' : 'text-gray-400'}`}>
              {tabCount[key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── List ── */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-2">
              <Search className="w-8 h-8 opacity-30" />
              <p className="text-sm">ไม่พบรายการที่ตรงกับเงื่อนไข</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(m => {
                const isPaid     = m.membership?.status === 'active'
                const isDeceased = m.status === 'deceased'
                const isInactive = m.status === 'inactive'

                return (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">

                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 ${
                      isDeceased ? 'bg-red-100' : isPaid ? 'bg-green-100' : 'bg-orange-100'
                    }`}>
                      {isDeceased ? '🙏' : m.prefix === 'สามเณร' ? '🧒' : '🧘'}
                    </div>

                    {/* ข้อมูล */}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/members/${m.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-amber-700 truncate block"
                      >
                        {m.prefix} {m.first_name} {m.last_name}
                      </Link>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {m.temple_name && (
                          <span className="text-xs text-gray-400">{m.temple_name}</span>
                        )}
                        {m.national_id && (
                          <span className="text-xs text-gray-300">·</span>
                        )}
                        {m.national_id && (
                          <span className="text-xs text-gray-400">{m.national_id}</span>
                        )}
                      </div>
                    </div>

                    {/* สถานะ / action */}
                    <div className="text-right shrink-0">
                      {isDeceased ? (
                        <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                          มรณภาพ
                        </span>
                      ) : isInactive ? (
                        <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                          ย้ายออก
                        </span>
                      ) : isPaid ? (
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            ชำระแล้ว
                          </span>
                          {m.membership?.paid_date && (
                            <p className="text-xs text-gray-400">
                              {format(new Date(m.membership.paid_date), 'd MMM yyyy', { locale: th })}
                            </p>
                          )}
                          {m.membership?.amount != null && (
                            <p className="text-xs font-medium text-amber-700">
                              ฿{Number(m.membership.amount).toLocaleString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Link
                          href={`/members/${m.id}/renew`}
                          className="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-3 rounded-md font-medium transition-colors"
                        >
                          ชำระค่าสมาชิก
                        </Link>
                      )}
                    </div>

                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* จำนวนที่แสดง */}
      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          แสดง {filtered.length} จาก {members.length} รายการ
        </p>
      )}
    </div>
  )
}

function StatCard({
  icon, bg, label, value, unit, valueColor = 'text-gray-900',
}: {
  icon: React.ReactNode
  bg: string
  label: string
  value: number
  unit: string
  valueColor?: string
}) {
  return (
    <div className={`${bg} border rounded-xl p-4 space-y-1`}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        <span className="text-xs text-gray-500 font-medium leading-tight">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>
        {value.toLocaleString()}
        <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>
      </p>
    </div>
  )
}
