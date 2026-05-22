/**
 * Thailand geography helpers
 * data: { province, district (อำเภอ), subdistrict (ตำบล), zipcode }
 */
import { data as geoData } from '@riz007/thai-address-data'

type GeoRow = { province: string; district: string; subdistrict: string; zipcode: string }
const rows = geoData as GeoRow[]

// ── cache ──────────────────────────────────────────────────────
const amphoeCache = new Map<string, string[]>()
const tambonCache = new Map<string, string[]>()

/** รายชื่ออำเภอทั้งหมดในจังหวัด (ไม่ซ้ำ เรียงตาม ก–ฮ) */
export function getAmphoeList(provinceName: string): string[] {
  if (!provinceName) return []
  if (amphoeCache.has(provinceName)) return amphoeCache.get(provinceName)!
  const result = [...new Set(
    rows.filter(r => r.province === provinceName).map(r => r.district)
  )].sort((a, b) => a.localeCompare(b, 'th'))
  amphoeCache.set(provinceName, result)
  return result
}

/** รายชื่อตำบลทั้งหมดในอำเภอ (ไม่ซ้ำ เรียงตาม ก–ฮ) */
export function getTambonList(provinceName: string, amphoeName: string): string[] {
  if (!provinceName || !amphoeName) return []
  const key = `${provinceName}__${amphoeName}`
  if (tambonCache.has(key)) return tambonCache.get(key)!
  const result = [...new Set(
    rows
      .filter(r => r.province === provinceName && r.district === amphoeName)
      .map(r => r.subdistrict)
  )].sort((a, b) => a.localeCompare(b, 'th'))
  tambonCache.set(key, result)
  return result
}

/** รายชื่อจังหวัดทั้งหมด (ไม่ซ้ำ เรียงตาม ก–ฮ) */
export function getProvinceList(): string[] {
  return [...new Set(rows.map(r => r.province))].sort((a, b) =>
    a.localeCompare(b, 'th')
  )
}
