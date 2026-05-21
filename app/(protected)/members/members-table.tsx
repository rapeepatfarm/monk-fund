'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Member } from '@/types/database'
import { Search } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'ใช้งาน', variant: 'default' },
  inactive: { label: 'ไม่ใช้งาน', variant: 'secondary' },
  deceased: { label: 'มรณภาพ', variant: 'destructive' },
}

const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  deceased: 'bg-red-100 text-red-800',
}

interface Props {
  members: Member[]
  initialSearch: string
  initialStatus: string
}

export function MembersTable({ members, initialSearch, initialStatus }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [isPending, startTransition] = useTransition()

  function applyFilters(q: string, status: string) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const statusOptions = [
    { value: '', label: 'ทุกสถานะ' },
    { value: 'active', label: 'ใช้งาน' },
    { value: 'inactive', label: 'ไม่ใช้งาน' },
    { value: 'deceased', label: 'มรณภาพ' },
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="ค้นหาชื่อ, วัด, เลขบัตร..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters(search, statusFilter)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {statusOptions.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                setStatusFilter(value)
                applyFilters(search, value)
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${
                statusFilter === value
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อ-นามสกุล</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">วัด</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">เลขบัตร</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">เบอร์โทร</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">สถานะ</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {members.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  ไม่พบข้อมูลสมาชิก
                </td>
              </tr>
            ) : (
              members.map((m) => {
                const temple = Array.isArray(m.temples) ? m.temples[0] : m.temples
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {m.prefix} {m.first_name} {m.last_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {temple?.name ?? '-'}
                      {temple?.amphoe && <span className="text-gray-400 text-xs block">{temple.amphoe}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {m.national_id ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {m.phone ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASSES[m.status]}`}>
                        {STATUS_LABELS[m.status]?.label ?? m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/members/${m.id}`}
                        className="text-amber-600 hover:text-amber-800 text-xs font-medium"
                      >
                        ดูข้อมูล →
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden space-y-2">
        {members.length === 0 ? (
          <p className="text-center py-12 text-gray-400 text-sm">ไม่พบข้อมูลสมาชิก</p>
        ) : (
          members.map((m) => {
            const temple = Array.isArray(m.temples) ? m.temples[0] : m.temples
            return (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="block border rounded-lg p-4 bg-white hover:border-amber-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {m.prefix} {m.first_name} {m.last_name}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{temple?.name ?? '-'}</p>
                    {m.phone && <p className="text-gray-400 text-xs">{m.phone}</p>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${STATUS_CLASSES[m.status]}`}>
                    {STATUS_LABELS[m.status]?.label ?? m.status}
                  </span>
                </div>
              </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
