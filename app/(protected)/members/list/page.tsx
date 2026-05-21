import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MembersTable } from '../members-table'

export default async function MembersListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('province_id, role')
    .eq('id', user.id)
    .single()

  const params = await searchParams
  const search = params.q ?? ''
  const statusFilter = params.status ?? ''

  let query = supabase
    .from('members')
    .select('*, temples(name, amphoe), provinces(name)')
    .order('created_at', { ascending: false })

  if (profile?.province_id && profile.role !== 'super_admin') {
    query = query.eq('province_id', profile.province_id)
  }
  if (statusFilter) query = query.eq('status', statusFilter)
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,national_id.ilike.%${search}%`
    )
  }

  const { data: members } = await query.limit(100)

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <Link href="/members" className="text-sm text-amber-600 hover:underline">← ค้นหาสมาชิก</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">รายชื่อสมาชิกทั้งหมด</h1>
          <p className="text-gray-500 text-sm">{members?.length ?? 0} ราย</p>
        </div>
        <Link href="/members/new">
          <Button className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto">
            + เพิ่มสมาชิก
          </Button>
        </Link>
      </div>
      <MembersTable members={members ?? []} initialSearch={search} initialStatus={statusFilter} />
    </div>
  )
}
