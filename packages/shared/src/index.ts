export enum Role {
  ADMIN = 'admin',
  GESTOR = 'gestor',
  OPERADOR = 'operador',
}

export enum MovementType {
  INFLOW = 'inflow',
  OUTFLOW = 'outflow',
}

export interface JwtPayload {
  userId: string
  organizationId?: string
  role: Role
}
