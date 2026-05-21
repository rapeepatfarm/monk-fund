'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createUser(formData: {
  email: string
  password: string
  full_name: string
  role: 'province_admin' | 'super_admin'
  province_id: string
}) {
  // ตรวจสอบว่าผู้เรียกเป็น super_admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') return { error: 'Forbidden' }

  const admin = createAdminClient()

  // สร้าง user ใน Supabase Auth
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: { full_name: formData.full_name },
  })

  if (createError) return { error: createError.message }

  // อัปเดต user_profile (trigger สร้างให้อัตโนมัติ แต่ update เพิ่มเติม)
  await admin.from('user_profiles').upsert({
    id: newUser.user.id,
    email: formData.email,
    full_name: formData.full_name || null,
    role: formData.role,
    province_id: formData.role === 'super_admin' ? null : (formData.province_id || null),
  })

  revalidatePath('/admin/users')
  return { success: true }
}
