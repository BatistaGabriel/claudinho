import { execSync } from 'child_process'
import * as path from 'path'

export default async function globalSetup(): Promise<void> {
  const apiRoot = path.resolve(__dirname, '../../')
  execSync('npm run db:migrate:test', { cwd: apiRoot, stdio: 'inherit' })
}
