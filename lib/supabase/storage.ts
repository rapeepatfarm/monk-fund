import { createClient } from '@/lib/supabase/client'

export async function uploadEvidence(file: File, memberId: string): Promise<string | null> {
  const supabase = createClient()
  const ext = file.name.split('.').pop()
  const path = `${memberId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('evidence')
    .upload(path, file, { upsert: true })

  if (error) return null

  const { data } = supabase.storage.from('evidence').getPublicUrl(path)
  return data.publicUrl
}
