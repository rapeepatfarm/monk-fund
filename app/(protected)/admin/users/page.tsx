import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserManager } from './user-manager'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') redirect('/dashboard')

  const [{ data: users }, { data: provinces }] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('*, provinces(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('provinces')
      .select('id, name')
      .order('name'),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
        <p className="text-gray-500 text-sm mt-1">{users?.length ?? 0} บัญชี</p>
      </div>
      <UserManager users={users ?? []} provinces={provinces ?? []} currentUserId={user.id} />
    </div>
  )
}
