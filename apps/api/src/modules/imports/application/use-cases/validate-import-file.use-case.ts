import * as path from 'path'

interface ValidateImportFileInput {
  originalname: string
  mimetype: string
  size: number
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const ALLOWED_MIME_TYPES = new Set([
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
])

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls'])

export class ValidateImportFileUseCase {
  execute(input: ValidateImportFileInput): { valid: true } {
    if (input.size > MAX_FILE_SIZE) {
      throw new Error('FILE_TOO_LARGE')
    }

    if (!ALLOWED_MIME_TYPES.has(input.mimetype)) {
      throw new Error('INVALID_FILE_TYPE')
    }

    const ext = path.extname(input.originalname)
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error('INVALID_FILE_TYPE')
    }

    return { valid: true }
  }
}
