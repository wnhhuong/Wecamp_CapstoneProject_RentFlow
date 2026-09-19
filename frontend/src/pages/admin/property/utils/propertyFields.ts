import type { PropertyParameterName } from '@/shared/types/admin/parameter'

export type PropertyFormValues = Record<PropertyParameterName, string>
export type PropertyFormErrors = Partial<
  Record<PropertyParameterName, string>
>

export interface PropertyFieldConfig {
  name: PropertyParameterName
  label: string
  description: string
  placeholder: string
  group: 'identity' | 'contact' | 'bank'
  maxLength: number
  inputMode?: 'text' | 'tel' | 'email' | 'url'
  optional?: boolean
}

export const propertyFieldConfigs: PropertyFieldConfig[] = [
  {
    name: 'propertyName',
    label: 'Property name',
    description: 'Appears in the top bar and above the public room list.',
    placeholder: 'Nhà trọ Bình An',
    group: 'identity',
    maxLength: 120,
  },
  {
    name: 'address',
    label: 'Address',
    description: 'Street address shown to tenants and visitors.',
    placeholder: '128 Đường số 7, Thủ Đức',
    group: 'identity',
    maxLength: 200,
  },
  {
    name: 'adminPhone',
    label: 'Phone number',
    description: 'Ten digits starting with 03, 05, 07, 08 or 09.',
    placeholder: '0901234567',
    group: 'contact',
    maxLength: 10,
    inputMode: 'tel',
  },
  {
    name: 'adminEmail',
    label: 'Email',
    description: 'Used for enquiries from the public room list.',
    placeholder: 'owner@example.com',
    group: 'contact',
    maxLength: 160,
    inputMode: 'email',
  },
  {
    name: 'adminZalo',
    label: 'Zalo',
    description: 'A phone number or a full Zalo link.',
    placeholder: '0901234567',
    group: 'contact',
    maxLength: 200,
  },
  {
    name: 'adminFacebook',
    label: 'Facebook',
    description: 'A full link, or leave empty to hide it.',
    placeholder: 'https://facebook.com/...',
    group: 'contact',
    maxLength: 200,
    inputMode: 'url',
    optional: true,
  },
  {
    name: 'bankAccountHolder',
    label: 'Account holder',
    description: 'Exactly as the bank prints it, usually without accents.',
    placeholder: 'NGUYEN THI BINH',
    group: 'bank',
    maxLength: 120,
  },
  {
    name: 'bankName',
    label: 'Bank',
    description: 'Bank the account belongs to.',
    placeholder: 'Vietcombank (VCB)',
    group: 'bank',
    maxLength: 120,
  },
  {
    name: 'bankAccountNumber',
    label: 'Account number',
    description: 'Digits only, 6 to 20 of them.',
    placeholder: '0071000999999',
    group: 'bank',
    maxLength: 20,
    inputMode: 'text',
  },
]

// Mirrors the rules in backend/src/controllers/admin/parameter.controller.ts so
// the owner sees the problem before the round trip, not after.
const VN_PHONE = /^(03|05|07|08|09)\d{8}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i
const BANK_ACCOUNT = /^\d{6,20}$/

export function validatePropertyValues(
  values: Partial<PropertyFormValues>,
): PropertyFormErrors {
  const errors: PropertyFormErrors = {}
  const read = (name: PropertyParameterName) => (values[name] ?? '').trim()

  if (!read('propertyName')) {
    errors.propertyName = 'Enter the property name.'
  }

  if (!read('address')) {
    errors.address = 'Enter the address.'
  }

  const phone = read('adminPhone')
  if (!VN_PHONE.test(phone)) {
    errors.adminPhone = 'Enter 10 digits starting with 03, 05, 07, 08 or 09.'
  }

  const email = read('adminEmail')
  if (!EMAIL.test(email)) {
    errors.adminEmail = 'Enter a valid email address.'
  }

  const zalo = read('adminZalo')
  if (!zalo) {
    errors.adminZalo = 'Enter a phone number or a Zalo link.'
  } else if (!VN_PHONE.test(zalo) && !URL.test(zalo)) {
    errors.adminZalo = 'Enter a valid phone number or a link starting with http.'
  }

  const facebook = read('adminFacebook')
  if (facebook && !URL.test(facebook)) {
    errors.adminFacebook = 'Enter a link starting with http, or leave it empty.'
  }

  if (!read('bankAccountHolder')) {
    errors.bankAccountHolder = 'Enter the account holder name.'
  }

  if (!read('bankName')) {
    errors.bankName = 'Enter the bank name.'
  }

  if (!BANK_ACCOUNT.test(read('bankAccountNumber'))) {
    errors.bankAccountNumber = 'Enter 6 to 20 digits.'
  }

  return errors
}
