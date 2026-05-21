'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Props {
  claimId: string
  amountRequested: number
}

export function ClaimActions({ claimId, amountRequested }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approvedAmount, setApprovedAmount] = useState(String(amountRequested))
  const [note, setNote] = useState('')

  async function handleAction(action: 'approved' | 'rejected') {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const payload: Record<string, unknown> = {
      status: action,
      approved_by: user?.id,
      approved_at: new Date().toISOString(),
      note: note || null,
    }
    if (action === 'approved') {
      payload.amount_approved = parseFloat(approvedAmount)
    }

    const { error } = await supabase.from('claims').update(payload).eq('id', claimId)
    if (error) { setError(error.message); setLoading(false); return }

    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="approved_amount">จำนวนเงินที่อนุมัติ (บาท)</Label>
        <Input
          id="approved_amount"
          type="number"
          min="0"
          step="0.01"
          value={approvedAmount}
          onChange={(e) => setApprovedAmount(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="action_note">หมายเหตุ</Label>
        <Textarea
          id="action_note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="เหตุผลการอนุมัติหรือปฏิเสธ..."
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}
      <div className="flex gap-3">
        <Button
          className="bg-green-600 hover:bg-green-700"
          disabled={loading}
          onClick={() => handleAction('approved')}
        >
          ✓ อนุมัติ
        </Button>
        <Button
          variant="destructive"
          disabled={loading}
          onClick={() => handleAction('rejected')}
        >
          ✗ ปฏิเสธ
        </Button>
      </div>
    </div>
  )
}
