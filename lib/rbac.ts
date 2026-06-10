import type { UserRole } from '@prisma/client'

export type UserRoleType = UserRole

const APPROVAL_MATRIX: Record<UserRoleType, UserRoleType[]> = {
  father: ['brother', 'me'],
  brother: ['me'],
  me: ['brother'],
}

export function getApprovalPermissionRules(creatorRole: UserRoleType | null | string): UserRoleType[] {
  if (!creatorRole || !(creatorRole in APPROVAL_MATRIX)) return []
  return APPROVAL_MATRIX[creatorRole as UserRoleType]
}

export function isApprovalAllowed(creatorRole: UserRoleType | null | string, approverRole: UserRoleType | null | string): boolean {
  if (!creatorRole || !approverRole) return false
  return APPROVAL_MATRIX[creatorRole as UserRoleType]?.includes(approverRole as UserRoleType) ?? false
}
