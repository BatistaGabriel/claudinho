export interface IPubSubService {
  publish(channel: string, message: Record<string, unknown>): Promise<void>
  subscribe(channel: string, handler: (message: Record<string, unknown>) => void): Promise<void>
}
