import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TempleManager } from './temple-manager'

export default async function TemplesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('province_id, role')
    .eq('id', user.id)
    .single()

  let templesQuery = supabase
    .from('temples')
    .select('*')
    .order('name')

  if (profile?.province_id && profile.role !== 'super_admin') {
    templesQuery = templesQuery.eq('province_id', profile.province_id)
  }

  const { data: temples } = await templesQuery
  const { data: provinces } = await supabase.from('provinces').select('id, name').order('name')

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">จัดการวัด</h1>
        <p className="text-gray-500 text-sm mt-1">{temples?.length ?? 0} วัด</p>
      </div>
      <TempleManager
        temples={temples ?? []}
        provinces={provinces ?? []}
        defaultProvinceId={profile?.province_id ?? ''}
        isSuperAdmin={profile?.role === 'super_admin'}
      />
    </div>
  )
}
