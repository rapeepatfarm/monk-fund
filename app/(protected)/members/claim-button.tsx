'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus, Loader2 } from 'lucide-react'
import { claimMember } from './actions'

export function ClaimButton({ memberId }: { memberId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handle() {
    setLoading(true)
    setError(null)
    try {
      await claimMember(memberId)
      // redirect เกิดจาก server action โดยตรง
    } catch (e: any) {
      setError(e?.message ?? 'เกิดข้อผิดพลาด')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        className="w-full bg-amber-600 hover:bg-amber-700"
        onClick={handle}
        disabled={loading}
      >
        {loading
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> กำลังดำเนินการ...</>
          : <><UserPlus className="w-4 h-4 mr-2" /> รับเข้าจังหวัดและกำหนดวัด</>
        }
      </Button>
      {error && (
        <p className="text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  )
}
