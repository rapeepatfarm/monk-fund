'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createUser } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil, X, Check, Shield, User, UserPlus } from 'lucide-react'

interface Province { id: string; name: string }
interface UserProfile {
  id: string
  email?: string
  full_name: string | null
  role: string
  province_id: string | null
  created_at: string
  provinces?: { name: string } | null
}

interface Props {
  users: UserProfile[]
  provinces: Province[]
  currentUserId: string
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  province_admin: 'Admin จังหวัด',
}
const ROLE_CLASSES: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  province_admin: 'bg-blue-100 text-blue-700',
}

const emptyNewUser = { email: '', password: '', full_name: '', role: 'province_admin', province_id: '' }

export function UserManager({ users: initial, provinces, currentUserId }: Props) {
  const router = useRouter()
  const [users, setUsers] = useState(initial)

  // sync เมื่อ server re-render หลัง router.refresh()
  useEffect(() => { setUsers(initial) }, [initial])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ full_name: '', role: 'province_admin', province_id: '' })
  const [showCreate, setShowCreate] = useState(false)
  const [newUser, setNewUser] = useState({ ...emptyNewUser })
  const [createError, setCreateError] = useState<string | null>(null)
  const [createLoading, setCreateLoading] = useState(false)

  function startEdit(u: UserProfile) {
    setEditingId(u.id)
    setForm({
      full_name: u.full_name ?? '',
      role: u.role,
      province_id: u.province_id ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleSave(userId: string) {
    setLoading(true)
    const supabase = createClient()

    const payload = {
      full_name: form.full_name || null,
      role: form.role,
      province_id: form.role === 'super_admin' ? null : (form.province_id || null),
    }

    const { error } = await supabase
      .from('user_profiles')
      .update(payload)
      .eq('id', userId)

    if (!error) {
      const province = provinces.find(p => p.id === payload.province_id)
      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, ...payload, provinces: province ? { name: province.name } : null }
          : u
      ))
      setEditingId(null)
    }

    setLoading(false)
    router.refresh()
  }

  async function handleCreate() {
    if (!newUser.email || !newUser.password) {
      setCreateError('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }
    if (newUser.role === 'province_admin' && !newUser.province_id) {
      setCreateError('กรุณาเลือกจังหวัดสำหรับ Admin จังหวัด')
      return
    }
    setCreateLoading(true)
    setCreateError(null)
    const result = await createUser({
      email: newUser.email,
      password: newUser.password,
      full_name: newUser.full_name,
      role: newUser.role as 'province_admin' | 'super_admin',
      province_id: newUser.province_id,
    })
    if (result.error) {
      setCreateError(result.error)
      setCreateLoading(false)
      return
    }
    setShowCreate(false)
    setNewUser({ ...emptyNewUser })
    setCreateLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {/* Create user button + form */}
      {!showCreate ? (
        <div className="flex justify-end">
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => setShowCreate(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> สร้างผู้ใช้ใหม่
          </Button>
        </div>
      ) : (
        <Card className="border-amber-400">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm text-gray-900">สร้างผู้ใช้ใหม่</p>
              <button onClick={() => { setShowCreate(false); setCreateError(null) }} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>อีเมล *</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="space-y-1">
                <Label>รหัสผ่าน *</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                />
              </div>
              <div className="space-y-1">
                <Label>ชื่อ-นามสกุล</Label>
                <Input
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="ชื่อผู้ดูแลระบบ"
                />
              </div>
              <div className="space-y-1">
                <Label>บทบาท</Label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value, province_id: '' })}
                  className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="province_admin">Admin จังหวัด</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              {newUser.role === 'province_admin' && (
                <div className="space-y-1 sm:col-span-2">
                  <Label>จังหวัด</Label>
                  <select
                    value={newUser.province_id}
                    onChange={(e) => setNewUser({ ...newUser, province_id: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- เลือกจังหวัด --</option>
                    {provinces.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {createError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{createError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                onClick={handleCreate}
                disabled={createLoading || (newUser.role === 'province_admin' && !newUser.province_id)}
              >
                {createLoading ? 'กำลังสร้าง...' : 'สร้างบัญชี'}
              </Button>
              <Button variant="outline" onClick={() => { setShowCreate(false); setCreateError(null) }}>
                ยกเลิก
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {users.map((u) => {
        const isEditing = editingId === u.id
        const isCurrentUser = u.id === currentUserId

        return (
          <Card key={u.id} className={isEditing ? 'border-amber-400 shadow-sm' : ''}>
            <CardContent className="pt-4">
              {isEditing ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">{u.email}</p>
                    <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>ชื่อ-นามสกุล</Label>
                      <Input
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        placeholder="ชื่อผู้ใช้"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>บทบาท</Label>
                      <select
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value, province_id: '' })}
                        className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="province_admin">Admin จังหวัด</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>จังหวัด</Label>
                      <select
                        value={form.province_id}
                        onChange={(e) => setForm({ ...form, province_id: e.target.value })}
                        disabled={form.role === 'super_admin'}
                        className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:bg-gray-50"
                      >
                        <option value="">-- ไม่ระบุ --</option>
                        {provinces.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {form.role === 'super_admin' && (
                        <p className="text-xs text-gray-400">Super Admin เข้าถึงทุกจังหวัด</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="bg-amber-600 hover:bg-amber-700"
                      onClick={() => handleSave(u.id)}
                      disabled={loading}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      ยกเลิก
                    </Button>
                  </div>
                </div>
              ) : (
                /* View mode */
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${u.role === 'super_admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                      {u.role === 'super_admin'
                        ? <Shield className="w-4 h-4 text-purple-600" />
                        : <User className="w-4 h-4 text-blue-600" />
                      }
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm">
                          {u.full_name ?? '(ยังไม่ได้ตั้งชื่อ)'}
                          {isCurrentUser && (
                            <span className="ml-1 text-xs text-amber-600">(คุณ)</span>
                          )}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_CLASSES[u.role]}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{u.email ?? '-'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {u.role === 'super_admin'
                          ? 'ทุกจังหวัด'
                          : u.provinces?.name ?? (
                            <span className="text-orange-500">⚠ ยังไม่ได้กำหนดจังหวัด</span>
                          )
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => startEdit(u)}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {users.length === 0 && (
        <p className="text-center py-12 text-gray-400 text-sm">ยังไม่มีผู้ใช้งาน</p>
      )}
    </div>
  )
}
