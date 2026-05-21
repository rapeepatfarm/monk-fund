'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadEvidence } from '@/lib/supabase/storage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'

interface Props {
  memberId: string
  nationalId: string
  provinceId: string
  latestMembership: any
  newYear: number
  currentYear: number
}

export function RenewForm({
  memberId,
  nationalId,
  provinceId,
  latestMembership,
  newYear,
  currentYear,
}: Props) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ amount?: string; file?: string }>({})

  const latestYear = latestMembership?.year ?? null
  const latestExpiryThai = latestYear ? `31 ธันวาคม ${latestYear + 543}` : null
  const newExpiryThai = `31 ธันวาคม ${newYear + 543}`

  function validate() {
    const errors: { amount?: string; file?: string } = {}
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0) {
      errors.amount = 'กรุณากรอกจำนวนเงินที่ถูกต้อง (ต้องมากกว่า 0)'
    }
    if (!file) {
      errors.file = 'กรุณาแนบหลักฐานการชำระเงิน (รูปภาพหรือ PDF)'
    }
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError(null)

    // 1. Upload evidence
    let evidenceUrl: string | null = null
    try {
      evidenceUrl = await uploadEvidence(file!, memberId)
    } catch {
      setError('อัปโหลดหลักฐานไม่สำเร็จ กรุณาลองใหม่')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const parsedAmount = parseFloat(amount)
    const today = new Date().toISOString().split('T')[0]

    // 2. Upsert membership
    const { data: membershipData, error: dbError } = await supabase
      .from('memberships')
      .upsert(
        {
          member_id: memberId,
          year: newYear,
          paid_date: today,
          amount: parsedAmount,
          status: 'active',
          evidence_url: evidenceUrl,
        },
        { onConflict: 'member_id,year' }
      )
      .select('id')
      .single()

    if (dbError) {
      setError(dbError.message)
      setLoading(false)
      return
    }

    // 3. Get current user for created_by
    const { data: { user } } = await supabase.auth.getUser()

    // 4. Insert fund transaction (income)
    const { error: txError } = await supabase.from('fund_transactions').insert({
      province_id: provinceId || null,
      member_id: memberId,
      national_id: nationalId,
      type: 'income',
      category: 'membership',
      reference_id: membershipData?.id ?? null,
      amount: parsedAmount,
      note: `ชำระค่าสมาชิก ปี พ.ศ. ${newYear + 543}`,
      transaction_date: today,
      created_by: user?.id ?? null,
    })

    if (txError) {
      // ไม่ block การทำงาน — แต่แจ้ง warning ใน console
      console.warn('fund_transaction insert error:', txError.message)
    }

    router.push('/members')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Card>
        <CardContent className="pt-5 space-y-4">

          {/* Membership info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            {latestExpiryThai && (
              <div className="flex justify-between">
                <span className="text-gray-500">วันหมดอายุปัจจุบัน</span>
                <span className="text-red-600 font-medium">{latestExpiryThai}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">ปีที่ต่ออายุ</span>
              <span className="font-semibold text-gray-900">พ.ศ. {newYear + 543}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-1">
              <span className="text-gray-500">วันหมดอายุใหม่</span>
              <span className="text-green-700 font-semibold">{newExpiryThai}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">
              จำนวนเงิน (บาท) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value)
                if (fieldErrors.amount) setFieldErrors(p => ({ ...p, amount: undefined }))
              }}
              placeholder="500"
              className={fieldErrors.amount ? 'border-red-400 focus-visible:ring-red-300' : ''}
            />
            {fieldErrors.amount && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.amount}
              </p>
            )}
          </div>

          {/* Evidence upload */}
          <div className="space-y-1.5">
            <Label>
              หลักฐานการชำระเงิน <span className="text-red-500">*</span>
            </Label>
            <label
              className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                fieldErrors.file
                  ? 'border-red-400 bg-red-50 hover:border-red-500'
                  : file
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50'
              }`}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null)
                  if (fieldErrors.file) setFieldErrors(p => ({ ...p, file: undefined }))
                }}
              />
              {file ? (
                <div className="flex flex-col items-center gap-1 text-green-700">
                  <CheckCircle className="w-6 h-6" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div className={`flex flex-col items-center gap-1 ${fieldErrors.file ? 'text-red-400' : 'text-gray-400'}`}>
                  <Upload className="w-6 h-6" />
                  <p className="text-sm">คลิกเพื่อแนบรูปหลักฐาน</p>
                  <p className="text-xs">รูปภาพ หรือ PDF</p>
                </div>
              )}
            </label>
            {fieldErrors.file && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {fieldErrors.file}
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              type="submit"
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={loading}
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกชำระค่าสมาชิก'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              ยกเลิก
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
