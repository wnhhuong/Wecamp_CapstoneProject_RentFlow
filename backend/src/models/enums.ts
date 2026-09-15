export enum ParameterName {
  ELECTRICITY_UNIT_PRICE = 'electricityUnitPrice',
  WATER_PRICE = 'waterPrice',
  WIFI_FEE = 'wifiFee',
  PARKING_FEE = 'parkingFee',
  OTHER_FEES = 'otherFees',
  METER_READING_START_DAY = 'meterReadingStartDay',
  METER_READING_END_DAY = 'meterReadingEndDay',
  PAYMENT_DUE_DAY = 'paymentDueDay',
  YEAR_TO_EXTEND = 'yearToExtend',
  ADMIN_PHONE = 'adminPhone',
  ADMIN_FACEBOOK = 'adminFacebook',
  ADMIN_ZALO = 'adminZalo',
  ADDRESS = 'address',
  PROPERTY_NAME = 'propertyName',
  ADMIN_EMAIL = 'adminEmail',
  CONTRACT_PLACEHOLDER = 'contractPlaceholder',
}

export enum Sex {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum RoomStatus {
  NOT_AVAILABLE = 'not_available',
  AVAILABLE_SOON = 'available_soon',
  AVAILABLE_NOW = 'available_now',
  RENTED = 'rented',
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

export enum AccountRole {
  ADMIN = 'admin',
  USER = 'user',
}

export enum ContractStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
}

export enum InvoiceStatus {
  NOT_PAID = 'not_paid',
  PENDING = 'pending',
  PAID = 'paid',
}

export enum TicketStatus {
  NEED_ACTION = 'need_action',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
}

export enum RequestType {
  CONSUMP = 'consump',
  DELAY = 'delay',
  CHECKOUT = 'checkout',
  PAID = 'paid',
  EXTEND = 'extend',
  MOVEOUT = 'moveout',
}

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
}