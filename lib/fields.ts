export const FIELD_TYPES = ['text', 'textarea', 'number', 'email', 'tel', 'select', 'checkbox'] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export type FormField = {
  id: string
  label: string
  field_key: string
  field_type: FieldType
  options: string[]
  required: boolean
  enabled: boolean
  sort_order: number
}

export type CustomAnswer = string | boolean

const RESERVED_KEYS = new Set([
  'id',
  'child_full_name',
  'age',
  'child_gender',
  'parent_name',
  'phone',
  'email',
  'custom_answers',
  'created_at',
])

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isFieldType(value: string): value is FieldType {
  return (FIELD_TYPES as readonly string[]).includes(value)
}

export function slugFieldKey(label: string): string {
  let base = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
  if (!base) base = 'field'
  if (!/^[a-z]/.test(base)) base = `field_${base}`.slice(0, 48)
  return base
}

export function uniqueFieldKey(label: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  let base = slugFieldKey(label)
  if (RESERVED_KEYS.has(base)) base = `${base}_extra`
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base}_${n}`)) n += 1
  return `${base}_${n}`
}

export function normalizeOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const options: string[] = []
  for (const item of value) {
    const text = String(item ?? '').trim().slice(0, 80)
    if (!text || seen.has(text)) continue
    seen.add(text)
    options.push(text)
    if (options.length >= 30) break
  }
  return options
}

export function optionsFromLines(text: string): string[] {
  return normalizeOptions(text.split(/\r?\n/))
}

export type FieldDraft = {
  label: string
  field_type: FieldType
  options: string[]
  required: boolean
  enabled: boolean
}

export function validateFieldDraft(input: {
  label: unknown
  field_type: unknown
  options?: unknown
  required?: unknown
  enabled?: unknown
}): { ok: true; draft: FieldDraft } | { ok: false; error: string } {
  const label = String(input.label ?? '').trim()
  if (!label || label.length > 80) {
    return { ok: false, error: 'Enter a label up to 80 characters' }
  }
  const fieldType = String(input.field_type ?? '')
  if (!isFieldType(fieldType)) {
    return { ok: false, error: 'Choose a valid field type' }
  }
  const options = fieldType === 'select' ? normalizeOptions(input.options) : []
  if (fieldType === 'select' && options.length === 0) {
    return { ok: false, error: 'Select fields need at least one option' }
  }
  if (typeof input.required !== 'boolean' || typeof input.enabled !== 'boolean') {
    return { ok: false, error: 'Invalid field settings' }
  }
  return {
    ok: true,
    draft: {
      label,
      field_type: fieldType,
      options,
      required: input.required,
      enabled: input.enabled,
    },
  }
}

export function toFormField(row: {
  id: string
  label: string
  field_key: string
  field_type: string
  options: unknown
  required: boolean
  enabled: boolean
  sort_order: number
}): FormField {
  return {
    id: row.id,
    label: row.label,
    field_key: row.field_key,
    field_type: isFieldType(row.field_type) ? row.field_type : 'text',
    options: normalizeOptions(row.options),
    required: Boolean(row.required),
    enabled: Boolean(row.enabled),
    sort_order: Number(row.sort_order) || 0,
  }
}

function isChecked(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    return normalized === 'true' || normalized === 'on' || normalized === 'yes' || normalized === '1'
  }
  return false
}

export function validateCustomAnswers(
  raw: unknown,
  fields: Pick<FormField, 'field_key' | 'field_type' | 'required' | 'options'>[],
): { ok: true; answers: Record<string, CustomAnswer> } | { ok: false; error: string } {
  if (raw == null) raw = {}
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Invalid custom answers' }
  }
  const input = raw as Record<string, unknown>
  const answers: Record<string, CustomAnswer> = {}

  for (const field of fields) {
    const value = input[field.field_key]
    if (field.field_type === 'checkbox') {
      const checked = isChecked(value)
      if (field.required && !checked) {
        return { ok: false, error: 'Missing required fields' }
      }
      answers[field.field_key] = checked
      continue
    }

    const text = String(value ?? '').trim()
    if (!text) {
      if (field.required) return { ok: false, error: 'Missing required fields' }
      continue
    }
    if (text.length > 2000) return { ok: false, error: 'Invalid custom answers' }

    if (field.field_type === 'number' && !Number.isFinite(Number(text))) {
      return { ok: false, error: 'Invalid custom answers' }
    }
    if (field.field_type === 'email' && !EMAIL_RE.test(text)) {
      return { ok: false, error: 'Invalid custom answers' }
    }
    if (field.field_type === 'select' && !field.options.includes(text)) {
      return { ok: false, error: 'Invalid custom answers' }
    }

    answers[field.field_key] = text
  }

  return { ok: true, answers }
}

export function formatAnswer(value: unknown): string {
  if (value == null || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}
