# กองบุญพระอาพาธ — CLAUDE.md

ระบบจัดการกองบุญสุขภาพพระสงฆ์และสามเณรระดับจังหวัด  
배포: https://monk-fund.vercel.app  
Repository: https://github.com/rapeepatfarm/monk-fund

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix-based) |
| Backend/Auth/DB | Supabase (PostgreSQL + RLS + Storage) |
| Deployment | Vercel (auto-deploy on push to `main`) |
| Thai Address Data | `@riz007/thai-address-data` (7,436 records) |

---

## Project Structure

```
app/
  (protected)/          # ทุกหน้าที่ต้อง login ก่อน (layout มี Sidebar)
    dashboard/          # ภาพรวม: ยอดกองทุน + สถิติสมาชิก
    members/            # จัดการสมาชิก
      page.tsx          # ค้นหาด้วยเลขบัตรประชาชน (Server Component)
      member-search.tsx # UI ค้นหา + แสดงผล 4 cases (Client Component)
      member-form.tsx   # ฟอร์มเพิ่ม/แก้ไขสมาชิก (Client Component)
      actions.ts        # Server Actions: claimMember()
      claim-button.tsx  # ปุ่มรับสมาชิกเข้าจังหวัด
      members-table.tsx # ตารางรายชื่อทั้งหมด
      list/page.tsx     # หน้าดูรายชื่อสมาชิกทั้งหมด
      new/page.tsx      # หน้าเพิ่มสมาชิกใหม่
      [id]/page.tsx     # หน้าดูรายละเอียดสมาชิก
      [id]/edit/page.tsx # หน้าแก้ไขข้อมูลสมาชิก
      [id]/renew/       # หน้าชำระค่าสมาชิก
    memberships/        # สมาชิกภาพ: ค้นหา + กรอง + stat cards
    claims/             # การเบิกจ่ายสวัสดิการ
      page.tsx          # รายการเบิกจ่ายทั้งหมด
      new/page.tsx      # ยื่นขอเบิก (รองรับ pre-fill จาก member_id)
      [id]/page.tsx     # รายละเอียด + อนุมัติ/ปฏิเสธ
    settings/
      temples/          # จัดการวัด (cascade province→อำเภอ→ตำบล)
      benefit-rules/    # เงื่อนไขการเบิก
    admin/
      users/            # จัดการผู้ใช้ (super_admin เท่านั้น)
  login/page.tsx
  layout.tsx            # title: "กองบุญพระอาพาธ"

components/
  sidebar.tsx           # Navigation sidebar (Desktop + Mobile drawer)
  ui/                   # shadcn/ui components

lib/
  supabase/
    client.ts           # Browser Supabase client
    server.ts           # Server Supabase client (cookie-based)
    admin.ts            # Admin client (service role — bypasses RLS)
  national-id.ts        # Thai ID validation + format + checksum
  thailand-geo.ts       # Cascade province/อำเภอ/ตำบล helpers (cached)
  member-status.ts      # MEMBER_STATUS_LABEL / MEMBER_STATUS_CLASS
  utils.ts              # cn() helper
```

---

## Database Schema (Supabase)

### Tables

**`members`**
```
id, prefix ('พระ'|'สามเณร'), first_name, last_name,
national_id, phone, payment_channel,
province_id (FK→provinces, nullable), temple_id (FK→temples, nullable),
status ('active'|'inactive'|'deceased'),
created_at, updated_at
```

**`memberships`** — ค่าสมาชิกรายปี
```
id, member_id (FK), year (int), status ('active'|'expired'),
amount, paid_date, evidence_url, created_at
```

**`fund_transactions`** — บัญชีกองทุน
```
id, province_id, member_id, national_id,
type ('income'|'expense'), category ('membership'|'claim'|'other'),
reference_id (FK→memberships หรือ claims),
amount, note, transaction_date, created_at
```

**`claims`** — การเบิกจ่ายสวัสดิการ
```
id, member_id, benefit_rule_id, claim_date,
amount_requested, amount_approved,
status ('pending'|'approved'|'rejected'),
note, evidence_url, reviewed_by, reviewed_at
```

**`benefit_rules`** — เงื่อนไขการเบิก
```
id, province_id, benefit_type ('accident'|'hospitalization'|'bedridden'|'death'),
description, max_amount, conditions, is_active
```

**`temples`**
```
id, province_id, name, amphoe, district, address, is_active
```

**`provinces`** — `id, name`

**`user_profiles`**
```
id (FK→auth.users), full_name, role ('admin'|'super_admin'),
province_id (nullable — null = เข้าถึงได้ทุกจังหวัด)
```

---

## RLS & Authorization

- **Province admin** (`role = 'admin'`): เห็นเฉพาะ record ที่ `province_id` ตรงกับตัวเอง
- **Super admin** (`role = 'super_admin'`): เห็นทุก province (province_id = null ในตาราง user_profiles)
- **Admin client** (`lib/supabase/admin.ts`): ใช้ service_role key — **bypass RLS ทั้งหมด** ใช้เฉพาะใน Server Components/Actions เท่านั้น ห้ามใช้ใน Client Components

### เมื่อไหร่ต้องใช้ Admin Client
- ค้นหาสมาชิกข้ามจังหวัด (national_id search)
- `claimMember()` server action — reassign province_id ให้สมาชิก "ลอยตัว"

---

## Member Transfer Flow ("ย้ายออก")

สมาชิก **ย้ายข้ามจังหวัด** ทำงานแบบนี้:

1. Admin ต้นทางเปลี่ยน status → `inactive` → ระบบ set `province_id = null`, `temple_id = null`
2. สมาชิกกลายเป็น **"ลอยตัว"** — RLS บล็อก regular client ทุก province
3. Admin ปลายทางค้นหาด้วยเลขบัตร → เจอ case "ลอยตัว"
4. Admin กด **"รับเข้าจังหวัด"** → `claimMember()` server action ตั้ง `province_id` ใหม่
5. Redirect ไปหน้า edit → admin กำหนดวัดใหม่

---

## Member Status Labels

| DB value | แสดงผล | สี |
|----------|---------|-----|
| `active` | ประจำวัด | green |
| `inactive` | ย้ายออก | blue |
| `deceased` | มรณภาพ | red |

ใช้ `MEMBER_STATUS_LABEL` และ `MEMBER_STATUS_CLASS` จาก `lib/member-status.ts`

---

## Member Search (หน้า /members)

ค้นหาด้วยเลขบัตรประชาชน 13 หลัก มี 4 กรณี:

| กรณี | เงื่อนไข | Action |
|------|---------|--------|
| **ไม่พบ** | ไม่มีในระบบ | ปุ่มสมัครสมาชิกใหม่ |
| **ลอยตัว** | `province_id = null` (ย้ายออกแล้ว) | ปุ่มรับเข้าจังหวัด |
| **ต่างจังหวัด** | `province_id != null` แต่ไม่ใช่จังหวัดเรา | แสดงข้อมูล อ่านอย่างเดียว |
| **จังหวัดเดียวกัน** | ปกติ | แก้ไข / ต่ออายุ / เบิกจ่าย |

**Validation ก่อน search:** ตรวจ format + checksum (Thai ID algorithm) ถ้าผิดจะไม่ navigate และไม่แสดงปุ่มสมัครสมาชิก

---

## Thai National ID Validation (`lib/national-id.ts`)

```typescript
validateNationalId(value)  // ตรวจ format + checksum
formatNationalId(digits)   // "1234567890123" → "1-2345-67890-12-3"
stripNationalId(value)     // ลบ dash/space → digits เท่านั้น
```

- checksum: `sum = sum(digit[i] * (13-i))` สำหรับ i=0..11, checkDigit = `remainder < 2 ? 1-rem : 11-rem`
- เลขขึ้นต้น `0` = ไม่ถูกต้อง

---

## Fund Transactions

ทุกครั้งที่มีเงินเข้า/ออกกองทุน ต้อง insert เข้า `fund_transactions`:
- **ชำระค่าสมาชิก** → `type='income'`, `category='membership'`, `reference_id=membership.id`
- **อนุมัติเบิกจ่าย** → `type='expense'`, `category='claim'`, `reference_id=claim.id`

Dashboard ดึงยอดจาก `fund_transactions` โดยตรง (ไม่ได้คำนวณ realtime จาก memberships/claims)

---

## Cascade Dropdown (`lib/thailand-geo.ts`)

ใช้ `@riz007/thai-address-data` (7,436 records) — load ครั้งเดียว, cache ใน Map:
- `getAmphoeList(provinceName)` → อำเภอทั้งหมดในจังหวัด
- `getTambonList(provinceName, amphoeName)` → ตำบลทั้งหมดในอำเภอ
- `getProvinceList()` → จังหวัดทั้งหมด

**หมายเหตุ:** ชื่อจังหวัดใน package นี้**ไม่มี**คำว่า "จังหวัด" นำหน้า เช่น "เชียงใหม่" ไม่ใช่ "จังหวัดเชียงใหม่"

---

## Dev Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint
npx tsc --noEmit # TypeScript check (ไม่ compile)
```

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # ใช้ใน admin client เท่านั้น — ห้าม expose ฝั่ง client
```

---

## Coding Conventions

- **Server Component** (default) สำหรับหน้าที่ fetch ข้อมูล และไม่มี interactivity
- **`'use client'`** เฉพาะเมื่อมี state, event handler, หรือ browser API
- **`'use server'`** สำหรับ Server Actions ที่ต้องการสิทธิ์พิเศษ (admin client)
- ใช้ `createClient()` (server) ใน page/layout — ใช้ `createClient()` (client) ใน Client Components
- **ห้ามใช้ `createAdminClient()`** ใน Client Components เด็ดขาด
- Thai text ตลอด UI — ตัวแปรและ comment ภาษาอังกฤษหรือไทยได้
- Tailwind color theme หลัก: **amber** (primary), green (success), red (danger), blue (inactive/ย้ายออก)
