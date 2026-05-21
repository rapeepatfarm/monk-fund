export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type MemberStatus = 'active' | 'inactive' | 'deceased'
export type MembershipStatus = 'active' | 'expired'
export type ClaimStatus = 'pending' | 'approved' | 'rejected'
export type BenefitType = 'accident' | 'hospitalization' | 'bedridden' | 'death'
export type BenefitUnit = 'baht' | 'night' | 'month' | 'event'
export type UserRole = 'province_admin' | 'super_admin'
export type MemberPrefix = 'พระ' | 'สามเณร'

export interface Province {
  id: string
  name: string
  code: string
  created_at: string
}

export interface Temple {
  id: string
  province_id: string
  name: string
  address: string | null
  district: string | null
  amphoe: string | null
  created_at: string
}

export interface Member {
  id: string
  province_id: string
  temple_id: string
  prefix: MemberPrefix
  first_name: string
  last_name: string
  national_id: string | null
  phone: string | null
  payment_channel: string | null
  status: MemberStatus
  created_at: string
  updated_at: string
  // joined relations
  temples?: Temple
  provinces?: Province
}

export interface Membership {
  id: string
  member_id: string
  year: number
  paid_date: string | null
  amount: number | null
  status: MembershipStatus
  created_at: string
  members?: Member
}

export interface BenefitRule {
  id: string
  province_id: string
  benefit_type: BenefitType
  description: string | null
  max_per_event: number | null
  max_per_year: number | null
  rate_per_unit: number | null
  unit: BenefitUnit
  is_active: boolean
  created_at: string
}

export interface Claim {
  id: string
  member_id: string
  membership_id: string
  benefit_rule_id: string
  claim_date: string
  amount_requested: number | null
  amount_approved: number | null
  units: number | null
  status: ClaimStatus
  evidence_urls: string[] | null
  note: string | null
  approved_by: string | null
  approved_at: string | null
  created_at: string
  members?: Member
  memberships?: Membership
  benefit_rules?: BenefitRule
}

export interface UserProfile {
  id: string
  province_id: string | null
  full_name: string | null
  role: UserRole
  created_at: string
  provinces?: Province
}

export interface Database {
  public: {
    Tables: {
      provinces: {
        Row: Province
        Insert: Omit<Province, 'id' | 'created_at'>
        Update: Partial<Omit<Province, 'id' | 'created_at'>>
      }
      temples: {
        Row: Temple
        Insert: Omit<Temple, 'id' | 'created_at'>
        Update: Partial<Omit<Temple, 'id' | 'created_at'>>
      }
      members: {
        Row: Member
        Insert: Omit<Member, 'id' | 'created_at' | 'updated_at' | 'temples' | 'provinces'>
        Update: Partial<Omit<Member, 'id' | 'created_at' | 'updated_at' | 'temples' | 'provinces'>>
      }
      memberships: {
        Row: Membership
        Insert: Omit<Membership, 'id' | 'created_at' | 'members'>
        Update: Partial<Omit<Membership, 'id' | 'created_at' | 'members'>>
      }
      benefit_rules: {
        Row: BenefitRule
        Insert: Omit<BenefitRule, 'id' | 'created_at'>
        Update: Partial<Omit<BenefitRule, 'id' | 'created_at'>>
      }
      claims: {
        Row: Claim
        Insert: Omit<Claim, 'id' | 'created_at' | 'members' | 'memberships' | 'benefit_rules'>
        Update: Partial<Omit<Claim, 'id' | 'created_at' | 'members' | 'memberships' | 'benefit_rules'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'provinces'>
        Update: Partial<Omit<UserProfile, 'created_at' | 'provinces'>>
      }
    }
  }
}
