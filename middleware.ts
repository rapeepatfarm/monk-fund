import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // ใช้ getSession() แทน getUser() ใน middleware
  // เหตุผล: getUser() ทำ network request ไป Supabase ทุก request → timeout บน Vercel
  // getSession() อ่านจาก cookie โดยตรง (fast, no network) — ปลอดภัยพอสำหรับ redirect guard
  // การตรวจสอบ auth จริงๆ ทำใน Server Components ด้วย getUser() แทน
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  if (!session && pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (session && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  // จำกัด matcher ให้รันเฉพาะหน้าที่จำเป็น (ไม่รัน API routes ที่ไม่เกี่ยวข้อง)
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
