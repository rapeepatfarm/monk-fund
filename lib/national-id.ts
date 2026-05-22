/**
 * Thai National ID (บัตรประชาชน) validation
 * - ตรวจ format: 13 หลัก (อนุญาต dash เช่น 1-2345-67890-12-3)
 * - ตรวจ checksum ตามอัลกอริทึมกรมการปกครอง
 */

/** ลบ dash/space ออก แล้วคืนเฉพาะตัวเลข */
export function stripNationalId(value: string): string {
  return value.replace(/[-\s]/g, '')
}

/** Format แสดงผล: X-XXXX-XXXXX-XX-X */
export function formatNationalId(digits: string): string {
  const d = stripNationalId(digits)
  if (d.length !== 13) return digits
  return `${d[0]}-${d.slice(1, 5)}-${d.slice(5, 10)}-${d.slice(10, 12)}-${d[12]}`
}

/** ตรวจสอบ checksum ของเลขบัตรประชาชนไทย */
function verifyChecksum(digits: string): boolean {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * (13 - i)
  }
  const remainder = sum % 11
  const checkDigit = remainder < 2 ? 1 - remainder : 11 - remainder
  return checkDigit === parseInt(digits[12], 10)
}

export type NationalIdValidation =
  | { valid: true }
  | { valid: false; message: string }

/**
 * ตรวจสอบเลขบัตรประชาชน
 * รับได้ทั้ง "1234567890123" และ "1-2345-67890-12-3"
 */
export function validateNationalId(value: string): NationalIdValidation {
  if (!value || value.trim() === '') return { valid: true } // ไม่บังคับกรอก

  const digits = stripNationalId(value)

  if (!/^\d{13}$/.test(digits)) {
    return { valid: false, message: 'เลขบัตรประชาชนต้องเป็นตัวเลข 13 หลัก' }
  }

  if (digits[0] === '0') {
    return { valid: false, message: 'เลขบัตรประชาชนต้องไม่ขึ้นต้นด้วย 0' }
  }

  if (!verifyChecksum(digits)) {
    return { valid: false, message: 'เลขบัตรประชาชนไม่ถูกต้อง (checksum ผิด)' }
  }

  return { valid: true }
}
