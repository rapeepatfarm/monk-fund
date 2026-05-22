'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

/**
 * รับสมาชิก "ลอยตัว" (province_id = null) เข้าจังหวัดของ admin คนนี้
 * ใช้ admin client เพราะ member มี province_id = null → RLS บล็อก regular client
 */
export async function claimMember(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ดึง province_id ของ admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('province_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.province_id && profile?.role !== 'super_admin') {
    throw new Error('ไม่พบข้อมูลจังหวัดของผู้ดูแลระบบ')
  }

  const admin = createAdminClient()

  // ตรวจสอบว่า member นี้ "ลอยตัว" จริง (province_id = null และ status = inactive)
  const { data: member } = await admin
    .from('members')
    .select('id, province_id, status')
    .eq('id', memberId)
    .single()

  if (!member) throw new Error('ไม่พบข้อมูลสมาชิก')
  if (member.province_id !== null) throw new Error('สมาชิกนี้ยังคงสังกัดจังหวัดอื่นอยู่')

  // ผูก province_id เข้ากับจังหวัดของ admin (ยังไม่กำหนด temple — ให้ admin แก้ไขเอง)
  const { error } = await admin
    .from('members')
    .update({ province_id: profile.province_id })
    .eq('id', memberId)

  if (error) throw new Error(error.message)

  // Redirect ไปหน้าแก้ไข เพื่อให้ admin กำหนด วัด/ตำบล ใหม่
  redirect(`/members/${memberId}/edit`)
}
