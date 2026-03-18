export interface JwtPayload {
  userId: string
  organizationId?: string // undefined for admin role
  role: 'admin' | 'gestor' | 'operador'
}
