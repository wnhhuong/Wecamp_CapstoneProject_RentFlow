export interface FirstLoginProfileInput {
  fullName: string
  dob: string
  phoneNumber: string
  identityNo: string
  sex: string
  nationality: string
  por: string
  password: string
  confirmPassword: string
  confirmIn4: string
}

export interface FirstLoginUser { fullName?: string; identityNo?: string; PoR?: string; por?: string }
export interface FirstLoginRoom { roomCode?: string; price?: number }
export interface ContractPreview {
  renderedText: string
  displayText?: string
  displayContractId?: string
  displayParagraphs?: string[]
  displayBoldValues?: string[]
  user: FirstLoginUser
  room: FirstLoginRoom
  draftContract: { startDate: string; expireDate: string; propertyDeposit: number }
}

export interface OnboardingResult {
  onboardingToken: string
  user: FirstLoginUser
}



