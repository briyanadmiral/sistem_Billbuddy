export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface PaymentAccount {
  id: string
  user_id: string
  bank_name: string
  account_number: string
  account_holder: string
  is_primary: boolean
  created_at: string
}

export interface Room {
  id: string
  name: string
  description: string | null
  host_id: string
  invite_code: string
  is_active: boolean
  created_at: string
  updated_at: string
  host?: Profile
  members?: RoomMember[]
}

export interface RoomMember {
  id: string
  room_id: string
  user_id: string
  joined_at: string
  profile?: Profile
}

export interface Activity {
  id: string
  room_id: string
  name: string
  description: string | null
  payer_id: string
  subtotal: number
  tax_amount: number
  service_charge: number
  discount_amount: number
  total_amount: number
  receipt_image_url: string | null
  created_at: string
  updated_at: string
  payer?: Profile
  items?: ActivityItem[]
}

export interface ActivityItem {
  id: string
  activity_id: string
  name: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
  splits?: ItemSplit[]
}

export interface ItemSplit {
  id: string
  item_id: string
  user_id: string
  share_amount: number
  created_at: string
  user?: Profile
}

export interface Settlement {
  id: string
  room_id: string
  debtor_id: string
  creditor_id: string
  amount: number
  is_paid: boolean
  paid_at: string | null
  created_at: string
  updated_at: string
  debtor?: Profile
  creditor?: Profile
}

export interface DebtSummary {
  debtor: Profile
  creditor: Profile
  amount: number
  settlements: Settlement[]
}

export interface ParsedReceipt {
  items: {
    name: string
    quantity: number
    unit_price: number
    total_price: number
  }[]
  subtotal: number
  tax: number
  service_charge: number
  discount: number
  total: number
}
