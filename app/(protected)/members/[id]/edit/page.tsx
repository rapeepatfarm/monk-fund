import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { MemberForm } from '../../member-form'

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('province_id, role')
    .eq('id', user.id)
    .single()

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single()

  if (!member) notFound()

  let templesQuery = supabase.from('temples').select('id, name, amphoe').order('name')
  if (profile?.province_id && profile.role !== 'super_admin') {
    templesQuery = templesQuery.eq('province_id', profile.province_id)
  }
  const { data: temples } = await templesQuery

  const { data: provinces } = await supabase
    .from('provinces')
    .select('id, name')
    .order('name')

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/members/${id}`} className="text-sm text-amber-600 hover:underline">
          ← กลับหน้าข้อมูลสมาชิก
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">แก้ไขข้อมูลสมาชิก</h1>
        <p className="text-gray-500 text-sm mt-1">
          {member.prefix} {member.first_name} {member.last_name}
        </p>
      </div>
      <MemberForm
        temples={temples ?? []}
        provinces={provinces ?? []}
        defaultProvinceId={profile?.province_id ?? ''}
        isSuperAdmin={profile?.role === 'super_admin'}
        member={member}
      />
    </div>
  )
}
