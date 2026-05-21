'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { BenefitRule } from '@/types/database'
import { Pencil, Plus, Power } from 'lucide-react'

const BENEFIT_TYPES = [
  { value: 'accident', label: 'อุบัติเหตุ' },
  { value: 'hospitalization', label: 'นอนโรงพยาบาล' },
  { value: 'bedridden', label: 'ป่วยติดเตียง' },
  { value: 'death', label: 'มรณภาพ' },
]
const UNITS = [
  { value: 'baht', label: 'บาท (ตามจริง)' },
  { value: 'night', label: 'คืน' },
  { value: 'month', label: 'เดือน' },
  { value: 'event', label: 'ครั้ง' },
]

interface Province { id: string; name: string }

interface Props {
  rules: BenefitRule[]
  provinceId: string
  isSuperAdmin: boolean
  provinces: Province[]
}

const empty = {
  benefit_type: 'accident',
  description: '',
  max_per_event: '',
  max_per_year: '',
  rate_per_unit: '',
  unit: 'baht',
}

export function BenefitRulesManager({ rules: initial, provinceId: defaultProvinceId, isSuperAdmin, provinces }: Props) {
  const router = useRouter()
  const [rules, setRules] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<BenefitRule | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<typeof empty>({ ...empty })
  const [selectedProvinceId, setSelectedProvinceId] = useState(defaultProvinceId)
  const [filterProvinceId, setFilterProvinceId] = useState(defaultProvinceId)

  function startAdd() {
    setEditing(null)
    setForm({ ...empty })
    setShowForm(true)
  }

  function startEdit(r: BenefitRule) {
    setEditing(r)
    setForm({
      benefit_type: r.benefit_type,
      description: r.description ?? '',
      max_per_event: r.max_per_event ? String(r.max_per_event) : '',
      max_per_year: r.max_per_year ? String(r.max_per_year) : '',
      rate_per_unit: r.rate_per_unit ? String(r.rate_per_unit) : '',
      unit: r.unit,
    })
    setShowForm(true)
  }

  async function handleSave() {
    if (!selectedProvinceId) {
      alert('กรุณาเลือกจังหวัดก่อน')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const payload = {
      province_id: editing ? editing.province_id : selectedProvinceId,
      benefit_type: form.benefit_type as BenefitRule['benefit_type'],
      description: form.description || null,
      max_per_event: form.max_per_event ? parseFloat(form.max_per_event) : null,
      max_per_year: form.max_per_year ? parseFloat(form.max_per_year) : null,
      rate_per_unit: form.rate_per_unit ? parseFloat(form.rate_per_unit) : null,
      unit: form.unit as BenefitRule['unit'],
      is_active: true,
    }

    if (editing) {
      const { error } = await supabase.from('benefit_rules').update(payload).eq('id', editing.id)
      if (!error) setRules(rules.map(r => r.id === editing.id ? { ...r, ...payload } : r))
    } else {
      const { data, error } = await supabase.from('benefit_rules').insert(payload).select().single()
      if (!error && data) setRules([...rules, data])
    }
    setShowForm(false)
    setLoading(false)
    router.refresh()
  }

  async function toggleActive(r: BenefitRule) {
    const supabase = createClient()
    await supabase.from('benefit_rules').update({ is_active: !r.is_active }).eq('id', r.id)
    setRules(rules.map(x => x.id === r.id ? { ...x, is_active: !x.is_active } : x))
  }

  const typeLabel = (t: string) => BENEFIT_TYPES.find(x => x.value === t)?.label ?? t
  const unitLabel = (u: string) => UNITS.find(x => x.value === u)?.label ?? u

  const provinceLabel = (id: string) => provinces.find(p => p.id === id)?.name ?? ''
  const displayedRules = isSuperAdmin && filterProvinceId
    ? rules.filter(r => r.province_id === filterProvinceId)
    : rules

  return (
    <div className="space-y-3">
      {isSuperAdmin && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Label className="shrink-0 text-amber-800">กรองจังหวัด:</Label>
          <select
            value={filterProvinceId}
            onChange={(e) => setFilterProvinceId(e.target.value)}
            className="flex-1 border rounded-md px-3 py-1.5 text-sm bg-white"
          >
            <option value="">-- ทุกจังหวัด --</option>
            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      )}

      <div className="flex justify-end">
        <Button className="bg-amber-600 hover:bg-amber-700" onClick={startAdd}>
          <Plus className="w-4 h-4 mr-1" /> เพิ่มเงื่อนไข
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="font-medium text-sm">{editing ? 'แก้ไขเงื่อนไข' : 'เพิ่มเงื่อนไขใหม่'}</p>
            {isSuperAdmin && !editing && (
              <div className="space-y-1">
                <Label>จังหวัด *</Label>
                <select
                  value={selectedProvinceId}
                  onChange={(e) => setSelectedProvinceId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="">-- เลือกจังหวัด --</option>
                  {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>ประเภท</Label>
                <select
                  value={form.benefit_type}
                  onChange={(e) => setForm({ ...form, benefit_type: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                >
                  {BENEFIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label>หน่วย</Label>
                <select
                  value={form.unit}
                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white"
                >
                  {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>คำอธิบาย</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="เช่น เบิกตามจริง ไม่เกิน..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>สูงสุด/ครั้ง (฿)</Label>
                <Input type="number" value={form.max_per_event} onChange={(e) => setForm({ ...form, max_per_event: e.target.value })} placeholder="20000" />
              </div>
              <div className="space-y-1">
                <Label>สูงสุด/ปี (฿)</Label>
                <Input type="number" value={form.max_per_year} onChange={(e) => setForm({ ...form, max_per_year: e.target.value })} placeholder="30000" />
              </div>
              <div className="space-y-1">
                <Label>อัตรา/หน่วย (฿)</Label>
                <Input type="number" value={form.rate_per_unit} onChange={(e) => setForm({ ...form, rate_per_unit: e.target.value })} placeholder="1000" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSave} disabled={loading}>
                {loading ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>ยกเลิก</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {displayedRules.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">ยังไม่มีเงื่อนไขการเบิก</p>
        ) : displayedRules.map((r) => (
          <div key={r.id} className={`border rounded-lg p-4 bg-white ${!r.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                    {typeLabel(r.benefit_type)}
                  </span>
                  {isSuperAdmin && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {provinceLabel(r.province_id)}
                    </span>
                  )}
                  {!r.is_active && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">ปิดใช้งาน</span>
                  )}
                </div>
                <p className="text-sm text-gray-900 mt-1">{r.description ?? '-'}</p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  <span>หน่วย: {unitLabel(r.unit)}</span>
                  {r.rate_per_unit && <span>อัตรา: ฿{r.rate_per_unit.toLocaleString()}/{r.unit === 'night' ? 'คืน' : 'เดือน'}</span>}
                  {r.max_per_event && <span>สูงสุด/ครั้ง: ฿{r.max_per_event.toLocaleString()}</span>}
                  {r.max_per_year && <span>สูงสุด/ปี: ฿{r.max_per_year.toLocaleString()}</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => startEdit(r)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleActive(r)} className={`p-1.5 rounded ${r.is_active ? 'hover:bg-red-50 text-red-400' : 'hover:bg-green-50 text-green-500'}`}>
                  <Power className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
