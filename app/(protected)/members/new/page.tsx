import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MemberForm } from '../member-form'

export default async function NewMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ national_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('province_id, role')
    .eq('id', user.id)
    .single()

  let templesQuery = supabase.from('temples').select('id, name, amphoe').order('name')
  if (profile?.province_id && profile.role !== 'super_admin') {
    templesQuery = templesQuery.eq('province_id', profile.province_id)
  }
  const { data: temples } = await templesQuery

  let provincesQuery = supabase.from('provinces').select('id, name').order('name')
  const { data: provinces } = await provincesQuery

  const params = await searchParams
  const defaultNationalId = params.national_id ?? ''

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">เพิ่มสมาชิกใหม่</h1>
        <p className="text-gray-500 text-sm mt-1">กรอกข้อมูลสมาชิกพระสงฆ์หรือสามเณร</p>
      </div>
      <MemberForm
        temples={temples ?? []}
        provinces={provinces ?? []}
        defaultProvinceId={profile?.province_id ?? ''}
        isSuperAdmin={profile?.role === 'super_admin'}
        defaultNationalId={defaultNationalId}
      />
    </div>
  )
}
