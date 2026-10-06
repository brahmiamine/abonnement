export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly'
export type SubscriptionStatus = 'active' | 'trial' | 'paused'
export type Category =
  | 'Streaming'
  | 'Musique'
  | 'IA'
  | 'Cloud'
  | 'Productivité'
  | 'Gaming'
  | 'Sport'
  | 'Télécom'
  | 'Assurance'
  | 'Énergie'
  | 'Transport'
  | 'Fitness'
  | 'Autre'

export type Provider = {
  id: string
  name: string
  category: Category
  logo: string
  website: string
  color: string
}

export type Subscription = {
  id: string
  providerId?: string
  name: string
  logo: string
  website?: string
  category: Category
  price: number
  currency: 'EUR'
  cycle: BillingCycle
  startDate: string
  renewalDate: string
  expirationDate?: string
  status: SubscriptionStatus
  autoRenew: boolean
  remindDays: number[]
  notes?: string
  createdAt: string
}

export type Settings = {
  monthlyBudget: number
  theme: 'dark' | 'light'
  remindersEnabled: boolean
}
