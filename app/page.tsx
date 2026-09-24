'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { isFieldType, type FormField } from '@/lib/fields'

const CHILD_GENDERS = ['Male', 'Female', 'Prefer not to say'] as const

const emptyForm = {
  child_full_name: '',
  age: '',
  child_gender: '',
  parent_name: '',
  phone: '',
  email: '',
}

const inputClass = 'w-full rounded-lg px-4 py-2.5 focus:outline-none border-2 bg-white text-gray-900'
const inputStyle = { borderColor: '#b9c8e8' }

export default function RegistrationForm() {
  const [form, setForm] = useState(emptyForm)
  const [fields, setFields] = useState<FormField[]>([])
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({})
  const [notice, setNotice] = useState({ enabled: false, text: '' })
  const [configError, setConfigError] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/public/form')
      .then(async (res) => {
        if (!res.ok) throw new Error('load failed')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const nextFields = Array.isArray(data?.fields)
          ? (data.fields as FormField[]).filter((field) => field?.enabled && isFieldType(field.field_type))
          : []
        setNotice({
          enabled: Boolean(data?.notice?.enabled),
          text: typeof data?.notice?.text === 'string' ? data.notice.text : '',
        })
        setFields(nextFields)
        setAnswers(
          Object.fromEntries(
            nextFields.map((field) => [field.field_key, field.field_type === 'checkbox' ? false : '']),
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setConfigError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError('')
    const custom_answers: Record<string, string | boolean> = {}
    for (const field of fields) {
      if (field.field_type === 'checkbox') custom_answers[field.field_key] = Boolean(answers[field.field_key])
      else custom_answers[field.field_key] = String(answers[field.field_key] ?? '')
    }
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, custom_answers }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(res.status === 400 && typeof data?.error === 'string' ? data.error : 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }
      setStatus('success')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <PageShell>
        <div className="rounded-2xl shadow-xl overflow-hidden max-w-md w-full text-center bg-white">
          <div className="py-6 px-8" style={{ backgroundColor: '#0033A0' }}>
            <Image
              src="/woodlands-wolves-logo.png"
              alt="Woodlands Wolves"
              width={3243}
              height={1627}
              className="mx-auto h-auto w-full max-w-xs rounded-lg bg-black"
              priority
            />
          </div>
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0033A0' }}>You&apos;re registered!</h1>
            <p className="text-gray-700">
              Thanks for signing up for Have a Go Day. We&apos;ll be in touch with the details.
            </p>
          </div>
        </div>
      </PageShell>
    )
  }

  const showNotice = notice.enabled && notice.text.trim().length > 0

  return (
    <PageShell>
      <div className="w-full max-w-lg">
        {showNotice && (
          <div
            className="mb-4 rounded-xl px-4 py-3 text-sm text-white whitespace-pre-wrap"
            style={{ backgroundColor: '#0033A0' }}
            role="status"
          >
            {notice.text}
          </div>
        )}
        <div className="rounded-2xl shadow-xl overflow-hidden w-full bg-white">
          <div className="px-8 py-7 text-white text-center" style={{ backgroundColor: '#0033A0' }}>
            <Image
              src="/woodlands-wolves-logo.png"
              alt="Woodlands Wolves"
              width={3243}
              height={1627}
              className="mx-auto mb-4 h-auto w-full max-w-sm rounded-lg bg-black"
              priority
            />
            <h1 className="text-xl font-bold tracking-wide uppercase">
              Woodlands Wolves Ball Club
            </h1>
            <p className="text-sm mt-1 font-semibold text-white">Have a Go Day — Registration</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <Field
              label="Child's full name"
              name="child_full_name"
              type="text"
              required
              value={form.child_full_name}
              onChange={handleChange}
              placeholder="e.g. Jack Smith"
              autoComplete="name"
            />
            <Field
              label="Age"
              name="age"
              type="text"
              required
              value={form.age}
              onChange={handleChange}
              placeholder="e.g. 8"
              inputMode="numeric"
              autoComplete="off"
            />
            <SelectField
              label="Child's gender"
              name="child_gender"
              required
              value={form.child_gender}
              onChange={handleChange}
              options={CHILD_GENDERS}
              placeholder="Select gender"
            />
            <Field
              label="Parent name"
              name="parent_name"
              type="text"
              required
              value={form.parent_name}
              onChange={handleChange}
              placeholder="e.g. Sarah Smith"
              autoComplete="name"
            />
            <Field
              label="Phone"
              name="phone"
              type="tel"
              required
              value={form.phone}
              onChange={handleChange}
              placeholder="e.g. 0412 345 678"
              autoComplete="tel"
            />
            <Field
              label="Email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              placeholder="e.g. sarah@email.com"
              autoComplete="email"
            />

            {fields.map((field) => (
              <CustomField
                key={field.id}
                field={field}
                value={answers[field.field_key]}
                onValue={(value) => setAnswers((current) => ({ ...current, [field.field_key]: value }))}
              />
            ))}

            {configError && (
              <p className="text-sm text-gray-600">
                Extra questions could not be loaded. You can still submit the main registration details.
              </p>
            )}
            {error && <p className="text-red-700 text-sm font-medium">{error}</p>}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full text-white font-bold py-3 rounded-lg transition uppercase tracking-widest hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#0033A0' }}
            >
              {status === 'loading' ? 'Submitting...' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col p-4" style={{ backgroundColor: '#f4f7fb' }}>
      <div className="flex-1 flex flex-col items-center justify-center">{children}</div>
      <p className="pb-2 text-center text-xs text-gray-500">
        Powered by{' '}
        <a
          href="https://manyhandz.ai"
          className="underline hover:text-gray-700"
          target="_blank"
          rel="noopener noreferrer"
        >
          manyhandz.ai
        </a>
      </p>
    </main>
  )
}

function FieldLabel({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-bold mb-1 uppercase tracking-wide" style={{ color: '#0033A0' }}>
      {label} {required && <span className="text-red-700">*</span>}
    </label>
  )
}

function Field({
  label,
  name,
  type,
  required,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
}: {
  label: string
  name: string
  type: string
  required?: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
  inputMode?: 'numeric' | 'text' | 'tel' | 'email' | 'decimal'
}) {
  return (
    <div>
      <FieldLabel htmlFor={name} label={label} required={required} />
      <input
        id={name}
        type={type}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className={inputClass}
        style={inputStyle}
        placeholder={placeholder}
      />
    </div>
  )
}

function SelectField({
  label,
  name,
  required,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  name: string
  required?: boolean
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: readonly string[]
  placeholder: string
}) {
  return (
    <div>
      <FieldLabel htmlFor={name} label={label} required={required} />
      <select
        id={name}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        className={inputClass}
        style={inputStyle}
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}

function CustomField({
  field,
  value,
  onValue,
}: {
  field: FormField
  value: string | boolean | undefined
  onValue: (value: string | boolean) => void
}) {
  if (field.field_type === 'checkbox') {
    return (
      <label className="flex items-start gap-3 text-sm font-bold uppercase tracking-wide" style={{ color: '#0033A0' }}>
        <input
          id={field.field_key}
          name={field.field_key}
          type="checkbox"
          required={field.required}
          checked={Boolean(value)}
          onChange={(e) => onValue(e.target.checked)}
          className="mt-1"
        />
        <span>
          {field.label} {field.required && <span className="text-red-700">*</span>}
        </span>
      </label>
    )
  }

  if (field.field_type === 'textarea') {
    return (
      <div>
        <FieldLabel htmlFor={field.field_key} label={field.label} required={field.required} />
        <textarea
          id={field.field_key}
          name={field.field_key}
          required={field.required}
          value={String(value ?? '')}
          onChange={(e) => onValue(e.target.value)}
          rows={3}
          className={inputClass}
          style={inputStyle}
        />
      </div>
    )
  }

  if (field.field_type === 'select') {
    return (
      <SelectField
        label={field.label}
        name={field.field_key}
        required={field.required}
        value={String(value ?? '')}
        onChange={(e) => onValue(e.target.value)}
        options={field.options}
        placeholder="Select an option"
      />
    )
  }

  const type = field.field_type === 'number' || field.field_type === 'email' || field.field_type === 'tel'
    ? field.field_type
    : 'text'

  return (
    <Field
      label={field.label}
      name={field.field_key}
      type={type}
      required={field.required}
      value={String(value ?? '')}
      onChange={(e) => onValue(e.target.value)}
      inputMode={field.field_type === 'number' ? 'decimal' : undefined}
      autoComplete="off"
    />
  )
}
