import { ValidateImportFileUseCase } from '../../../../src/modules/imports/application/use-cases/validate-import-file.use-case'

describe('ValidateImportFileUseCase', () => {
  let useCase: ValidateImportFileUseCase

  beforeEach(() => {
    useCase = new ValidateImportFileUseCase()
  })

  it('should reject file larger than 5MB with FILE_TOO_LARGE', () => {
    const input = {
      originalname: 'large-file.csv',
      mimetype: 'text/csv',
      size: 5 * 1024 * 1024 + 1, // 1 byte over 5MB
    }

    expect(() => useCase.execute(input)).toThrow('FILE_TOO_LARGE')
  })

  it('should reject unsupported MIME type with INVALID_FILE_TYPE', () => {
    const input = {
      originalname: 'document.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    }

    expect(() => useCase.execute(input)).toThrow('INVALID_FILE_TYPE')
  })

  it('should reject file with .exe extension even if MIME is text/csv', () => {
    const input = {
      originalname: 'malicious.exe',
      mimetype: 'text/csv',
      size: 1024,
    }

    expect(() => useCase.execute(input)).toThrow('INVALID_FILE_TYPE')
  })

  it('should accept valid .csv file under 5MB', () => {
    const input = {
      originalname: 'products.csv',
      mimetype: 'text/csv',
      size: 1024,
    }

    const result = useCase.execute(input)

    expect(result).toEqual({ valid: true })
  })

  it('should accept valid .xlsx file under 5MB', () => {
    const input = {
      originalname: 'products.xlsx',
      mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 1024,
    }

    const result = useCase.execute(input)

    expect(result).toEqual({ valid: true })
  })

  it('should accept valid .xls file under 5MB', () => {
    const input = {
      originalname: 'products.xls',
      mimetype: 'application/vnd.ms-excel',
      size: 1024,
    }

    const result = useCase.execute(input)

    expect(result).toEqual({ valid: true })
  })
})
