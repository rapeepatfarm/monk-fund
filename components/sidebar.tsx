'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  UserCog,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { UserProfile } from '@/types/database'

const navItems = [
  { href: '/dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
  { href: '/members', label: 'จัดการสมาชิก', icon: Users },
  { href: '/memberships', label: 'สมาชิกภาพ', icon: CreditCard },
  { href: '/claims', label: 'การเบิกจ่าย', icon: FileText },
  { href: '/settings/temples', label: 'จัดการวัด', icon: Settings },
  { href: '/settings/benefit-rules', label: 'เงื่อนไขการเบิก', icon: Settings },
]

interface SidebarProps {
  profile: UserProfile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const NavContent = () => (
    <>
      <div className="p-4 border-b border-amber-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center text-lg shrink-0">
            🏛️
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight">กองบุญพระอาพาธ</p>
            <p className="text-amber-300 text-xs truncate">
              {profile?.provinces?.name ?? 'ทุกจังหวัด'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-amber-500 text-white'
                  : 'text-amber-100 hover:bg-amber-700 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}

        {profile?.role === 'super_admin' && (
          <>
            <div className="pt-2 pb-1 px-3">
              <p className="text-amber-500 text-xs font-semibold uppercase tracking-wide">Super Admin</p>
            </div>
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname === '/admin'
                  ? 'bg-amber-500 text-white'
                  : 'text-amber-100 hover:bg-amber-700 hover:text-white'
              )}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              ภาพรวมทั้งประเทศ
            </Link>
            <Link
              href="/admin/users"
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                pathname.startsWith('/admin/users')
                  ? 'bg-amber-500 text-white'
                  : 'text-amber-100 hover:bg-amber-700 hover:text-white'
              )}
            >
              <UserCog className="w-4 h-4 shrink-0" />
              จัดการผู้ใช้งาน
            </Link>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-amber-700">
        <div className="px-3 py-2 mb-1">
          <p className="text-amber-200 text-xs">{profile?.full_name ?? 'Admin'}</p>
          <p className="text-amber-400 text-xs">
            {profile?.role === 'super_admin' ? 'Super Admin' : 'Province Admin'}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-amber-100 hover:bg-amber-700 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          ออกจากระบบ
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center h-14 px-4 bg-amber-800 border-b border-amber-700">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-amber-700 mr-3"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        <span className="text-white font-bold text-sm">กองบุญพระอาพาธ</span>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'lg:hidden fixed top-14 left-0 bottom-0 z-20 w-64 bg-amber-800 flex flex-col transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-amber-800 h-screen sticky top-0 shrink-0">
        <NavContent />
      </aside>
    </>
  )
}
