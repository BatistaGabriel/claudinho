export interface ICacheService {
  invalidate(key: string): Promise<void>
  get<T>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>
}
