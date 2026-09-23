'use client'

import { useState } from 'react'
import Image from 'next/image'

const emptyForm = {
  child_full_name: '',
  age: '',
  parent_name: '',
  phone: '',
  email: '',
}

export default function RegistrationForm() {
  const [form, setForm] = useState(emptyForm)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setError('')
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Submission failed')
      setStatus('success')
    } catch {
      setError('Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f4f7fb' }}>
        <div className="rounded-2xl shadow-xl overflow-hidden max-w-md w-full text-center bg-white">
          <div className="py-6 px-8" style={{ backgroundColor: '#0033A0' }}>
            <Image
              src="/woodlands-wolves-logo.png"
              alt="Woodlands Wolves"
              width={1021}
              height={546}
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
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f4f7fb' }}>
      <div className="rounded-2xl shadow-xl overflow-hidden max-w-lg w-full bg-white">
        <div className="px-8 py-7 text-white text-center" style={{ backgroundColor: '#0033A0' }}>
          <Image
            src="/woodlands-wolves-logo.png"
            alt="Woodlands Wolves"
            width={1021}
            height={546}
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
    </main>
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
  inputMode?: 'numeric' | 'text' | 'tel' | 'email'
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-bold mb-1 uppercase tracking-wide" style={{ color: '#0033A0' }}>
        {label} {required && <span className="text-red-700">*</span>}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        required={required}
        value={value}
        onChange={onChange}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="w-full rounded-lg px-4 py-2.5 focus:outline-none border-2 bg-white text-gray-900"
        style={{ borderColor: '#b9c8e8' }}
        placeholder={placeholder}
      />
    </div>
  )
}
