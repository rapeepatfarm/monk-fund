'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { getAmphoeList, getTambonList } from '@/lib/thailand-geo'
import type { Temple, Province } from '@/types/database'
import { Pencil, Trash2, Plus } from 'lucide-react'

interface Props {
  temples: Temple[]
  provinces: Pick<Province, 'id' | 'name'>[]
  defaultProvinceId: string
  defaultProvinceName: string   // ชื่อจังหวัดของ admin (สำหรับ cascade dropdown)
  isSuperAdmin: boolean
}

const emptyForm = { name: '', amphoe: '', district: '', address: '', province_id: '' }

export function TempleManager({ temples: initial, provinces, defaultProvinceId, defaultProvinceName, isSuperAdmin }: Props) {
  const router = useRouter()
  const [temples, setTemples] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Temple | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ ...emptyForm, province_id: defaultProvinceId })

  // หาชื่อจังหวัดจาก province_id เพื่อใช้ filter geo data
  // super admin → ดูจาก dropdown ที่เลือก
  // province admin → ใช้ defaultProvinceName ที่ส่งมาจาก server โดยตรง
  const selectedProvinceName = useMemo(() => {
    if (!isSuperAdmin) return defaultProvinceName
    const pid = form.province_id || defaultProvinceId
    return provinces.find(p => p.id === pid)?.name ?? ''
  }, [isSuperAdmin, defaultProvinceName, form.province_id, defaultProvinceId, provinces])

  const amphoeList = useMemo(() => getAmphoeList(selectedProvinceName), [selectedProvinceName])
  const tambonList = useMemo(() => getTambonList(selectedProvinceName, form.amphoe), [selectedProvinceName, form.amphoe])

  function startAdd() {
    setEditing(null)
    setForm({ ...emptyForm, province_id: defaultProvinceId })
    setShowForm(true)
  }

  function startEdit(t: Temple) {
    setEditing(t)
    setForm({
      name: t.name,
      amphoe: t.amphoe ?? '',
      district: t.district ?? '',
      address: t.address ?? '',
      province_id: t.province_id,
    })
    setShowForm(true)
  }

  function setField(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      // reset cascade เมื่อเปลี่ยน province หรือ amphoe
      if (field === 'province_id') { next.amphoe = ''; next.district = '' }
      if (field === 'amphoe') { next.district = '' }
      return next
    })
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setLoading(true)
    const supabase = createClient()
    const payload = {
      name: form.name.trim(),
      amphoe:     form.amphoe   || null,
      district:   form.district || null,
      address:    form.address  || null,
      province_id: form.province_id || defaultProvinceId,
    }

    if (editing) {
      const { error } = await supabase.from('temples').update(payload).eq('id', editing.id)
      if (!error) setTemples(temples.map(t => t.id === editing.id ? { ...t, ...payload } : t))
    } else {
      const { data, error } = await supabase.from('temples').insert(payload).select().single()
      if (!error && data) setTemples([...temples, data])
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
            <p className="font-semibold text-sm text-gray-800">{editing ? 'แก้ไขวัด' : 'เพิ่มวัดใหม่'}</p>

            {/* จังหวัด */}
            {isSuperAdmin ? (
              <div className="space-y-1">
                <Label>จังหวัด <span className="text-red-500">*</span></Label>
                <select
                  value={form.province_id}
                  onChange={e => setField('province_id', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">— เลือกจังหวัด —</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label>จังหวัด</Label>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                  <span className="text-gray-400">📍</span>
                  <span className="font-medium">{defaultProvinceName || '—'}</span>
                </div>
              </div>
            )}

            {/* ชื่อวัด */}
            <div className="space-y-1">
              <Label>ชื่อวัด <span className="text-red-500">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="วัดพระธาตุ..."
              />
            </div>

            {/* อำเภอ → cascade */}
            <div className="space-y-1">
              <Label>อำเภอ/เขต</Label>
              {amphoeList.length > 0 ? (
                <select
                  value={form.amphoe}
                  onChange={e => setField('amphoe', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">— เลือกอำเภอ —</option>
                  {amphoeList.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              ) : (
                <Input
                  value={form.amphoe}
                  onChange={e => setField('amphoe', e.target.value)}
                  placeholder="อำเภอ/เขต"
                />
              )}
            </div>

            {/* ตำบล → cascade จาก amphoe */}
            <div className="space-y-1">
              <Label>ตำบล/แขวง</Label>
              {tambonList.length > 0 ? (
                <select
                  value={form.district}
                  onChange={e => setField('district', e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="">— เลือกตำบล —</option>
                  {tambonList.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <Input
                  value={form.district}
                  onChange={e => setField('district', e.target.value)}
                  placeholder={form.amphoe ? 'ตำบล/แขวง' : 'เลือกอำเภอก่อน'}
                  disabled={amphoeList.length > 0 && !form.amphoe}
                />
              )}
            </div>

            {/* ที่อยู่ */}
            <div className="space-y-1">
              <Label>ที่อยู่ (เพิ่มเติม)</Label>
              <Input
                value={form.address}
                onChange={e => setField('address', e.target.value)}
                placeholder="เลขที่ ถนน..."
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                className="bg-amber-600 hover:bg-amber-700"
                onClick={handleSave}
                disabled={loading || !form.name.trim()}
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ตาราง */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ชื่อวัด</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">ตำบล</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">อำเภอ</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {temples.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">ยังไม่มีข้อมูลวัด</td></tr>
            ) : temples.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{t.name}</p>
                  {t.address && <p className="text-xs text-gray-400">{t.address}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{t.district ?? '-'}</td>
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
