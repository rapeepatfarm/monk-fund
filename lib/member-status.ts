/** Label และ CSS class สำหรับสถานะสมาชิก (ใช้ร่วมกันทุกหน้า) */

export const MEMBER_STATUS_LABEL: Record<string, string> = {
  active:   'ประจำวัด',
  inactive: 'ย้ายออก',
  deceased: 'มรณภาพ',
}

export const MEMBER_STATUS_CLASS: Record<string, string> = {
  active:   'bg-green-100 text-green-800',
  inactive: 'bg-blue-100 text-blue-700',
  deceased: 'bg-red-100 text-red-800',
}
