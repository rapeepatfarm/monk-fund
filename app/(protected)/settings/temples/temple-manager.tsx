'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { Temple, Province } from '@/types/database'
import { Pencil, Trash2, Plus } from 'lucide-react'

interface Props {
  temples: Temple[]
  provinces: Pick<Province, 'id' | 'name'>[]
  defaultProvinceId: string
  isSuperAdmin: boolean
}

export function TempleManager({ temples: initial, provinces, defaultProvinceId, isSuperAdmin }: Props) {
  const router = useRouter()
  const [temples, setTemples] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Temple | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', amphoe: '', district: '', address: '', province_id: defaultProvinceId })

  function startAdd() {
    setEditing(null)
    setForm({ name: '', amphoe: '', district: '', address: '', province_id: defaultProvinceId })
    setShowForm(true)
  }

  function startEdit(t: Temple) {
    setEditing(t)
    setForm({ name: t.name, amphoe: t.amphoe ?? '', district: t.district ?? '', address: t.address ?? '', province_id: t.province_id })
    setShowForm(true)
  }

  async function handleSave() {
    setLoading(true)
    const supabase = createClient()
    const payload = {
      name: form.name,
      amphoe: form.amphoe || null,
      district: form.district || null,
      address: form.address || null,
      province_id: form.province_id || defaultProvinceId,
    }

    if (editing) {
      const { error } = await supabase.from('temples').update(payload).eq('id', editing.id)
      if (!error) {
        setTemples(temples.map(t => t.id === editing.id ? { ...t, ...payload } : t))
      }
    } else {
      const { data, error } = await supabase.from('temples').insert(payload).select().single()
      if (!error && data) {
        setTemples([...temples, data])
      }
    }
    setShowForm(false)
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm('ต้องการลบวัดนี้?')) return
    const supabase = createClient()
    const { error } = await supabase.from('temples').delete().eq('id', id)
    if (!error) setTemples(temples.filter(t => t.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button className="bg-amber-600 hover:bg-amber-700" onClick={startAdd}>
          <Plus className="w-4 h-4 mr-1" /> เพิ่มวัด
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="font-medium text-sm">{editing ? 'แก้ไขวัด' : 'เพิ่มวัดใหม่'}</p>
            {isSuperAdmin && (
              <div className="space-y-1">
                <Label>จังหวัด</Label>
                <select
                  value={form.province_id}
                  onChange={(e) => setForm({ ...form, province_id: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                >
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1">
              <Label>ชื่อวัด *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="วัดพระธาตุ..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ตำบล/แขวง</Label>
                <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>อำเภอ/เขต</Label>
                <Input value={form.amphoe} onChange={(e) => setForm({ ...form, amphoe: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>ที่อยู่</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSave} disabled={loading || !form.name}>
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อวัด</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">อำเภอ</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {temples.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-gray-400">ยังไม่มีข้อมูลวัด</td></tr>
            ) : temples.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{t.name}</p>
                  {t.address && <p className="text-xs text-gray-400">{t.address}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{t.amphoe ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => startEdit(t)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-red-50 rounded text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
