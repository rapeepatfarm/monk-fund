import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BenefitRulesManager } from './benefit-rules-manager'

export default async function BenefitRulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('province_id, role')
    .eq('id', user.id)
    .single()

  const isSuperAdmin = profile?.role === 'super_admin'

  let rulesQuery = supabase.from('benefit_rules').select('*').order('benefit_type')
  if (profile?.province_id) {
    rulesQuery = rulesQuery.eq('province_id', profile.province_id)
  }

  const [{ data: rules }, { data: provinces }] = await Promise.all([
    rulesQuery,
    supabase.from('provinces').select('id, name').order('name'),
  ])

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">เงื่อนไขการเบิกจ่าย</h1>
        <p className="text-gray-500 text-sm mt-1">ตั้งค่าวงเงินและเงื่อนไขแต่ละประเภท</p>
      </div>
      <BenefitRulesManager
        rules={rules ?? []}
        provinceId={profile?.province_id ?? ''}
        isSuperAdmin={isSuperAdmin}
        provinces={provinces ?? []}
      />
    </div>
  )
}
