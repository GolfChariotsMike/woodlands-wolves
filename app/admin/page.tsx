'use client'

import { useEffect, useState } from 'react'
import { ADMIN_PIN } from '@/lib/pin'
import {
  FIELD_TYPES,
  csvCell,
  formatAnswer,
  optionsFromLines,
  type FieldType,
  type FormField,
} from '@/lib/fields'

type Registration = {
  id: string
  child_full_name: string
  age: string
  child_gender: string | null
  parent_name: string
  phone: string
  email: string
  custom_answers: Record<string, unknown> | null
  created_at: string
}

type FieldDraft = {
  label: string
  field_type: FieldType
  required: boolean
  enabled: boolean
  optionsText: string
}

type ConfirmState =
  | { kind: 'registration'; registration: Registration }
  | { kind: 'field'; field: FormField }

const emptyDraft: FieldDraft = {
  label: '',
  field_type: 'text',
  required: false,
  enabled: true,
  optionsText: '',
}

const TYPE_LABELS: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Long text',
  number: 'Number',
  email: 'Email',
  tel: 'Phone',
  select: 'Dropdown',
  checkbox: 'Checkbox',
}

const inputClass = 'w-full rounded-lg px-3 py-2 focus:outline-none border-2 bg-white text-gray-900'
const inputStyle = { borderColor: '#b9c8e8' }

function adminHeaders(pin: string, json = false): HeadersInit {
  return json
    ? { 'Content-Type': 'application/json', 'x-admin-pin': pin }
    : { 'x-admin-pin': pin }
}

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [sessionPin, setSessionPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [wrongPin, setWrongPin] = useState(false)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [fields, setFields] = useState<FormField[]>([])
  const [noticeEnabled, setNoticeEnabled] = useState(false)
  const [noticeText, setNoticeText] = useState('')
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [noticeMessage, setNoticeMessage] = useState('')
  const [noticeError, setNoticeError] = useState('')
  const [savingNotice, setSavingNotice] = useState(false)
  const [draft, setDraft] = useState<FieldDraft>(emptyDraft)
  const [adding, setAdding] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<FieldDraft>(emptyDraft)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    if (!unlocked || !sessionPin) return
    let cancelled = false
    setLoading(true)
    setLoadError('')
    Promise.all([
      fetch('/api/admin/registrations', { headers: adminHeaders(sessionPin) }),
      fetch('/api/admin/notice', { headers: adminHeaders(sessionPin) }),
      fetch('/api/admin/fields', { headers: adminHeaders(sessionPin) }),
    ])
      .then(async ([registrationsRes, noticeRes, fieldsRes]) => {
        if (cancelled) return
        if (!registrationsRes.ok || !noticeRes.ok || !fieldsRes.ok) {
          setLoadError('Could not load admin data.')
          setLoading(false)
          return
        }
        const [registrationData, noticeData, fieldData] = await Promise.all([
          registrationsRes.json(),
          noticeRes.json(),
          fieldsRes.json(),
        ])
        setRegistrations(Array.isArray(registrationData) ? registrationData : [])
        setNoticeEnabled(Boolean(noticeData?.enabled))
        setNoticeText(typeof noticeData?.text === 'string' ? noticeData.text : '')
        setFields(Array.isArray(fieldData) ? fieldData : [])
        setLoaded(true)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setLoadError('Could not load admin data.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [unlocked, sessionPin])

  useEffect(() => {
    if (!confirmState) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) {
        setConfirmState(null)
        setDeleteError('')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirmState, deleting])

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin !== ADMIN_PIN) {
      setWrongPin(true)
      setPin('')
      return
    }
    setSessionPin(pin)
    setUnlocked(true)
    setWrongPin(false)
  }

  const columns = answerColumns(fields, registrations)

  const exportCSV = () => {
    const headers = [
      'Child full name',
      'Age',
      'Child gender',
      'Parent name',
      'Phone',
      'Email',
      ...columns.map((column) => column.label),
      'Registered at',
    ]
    const rows = registrations.map((registration) => [
      registration.child_full_name,
      registration.age,
      registration.child_gender || '',
      registration.parent_name,
      registration.phone,
      registration.email,
      ...columns.map((column) => formatAnswer(registration.custom_answers?.[column.key])),
      new Date(registration.created_at).toLocaleString('en-AU'),
    ])
    const csv = [headers, ...rows].map((row) => row.map((value) => csvCell(value || '')).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'woodlands-wolves-have-a-go-registrations.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const saveNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingNotice(true)
    setNoticeError('')
    setNoticeMessage('')
    try {
      const res = await fetch('/api/admin/notice', {
        method: 'PATCH',
        headers: adminHeaders(sessionPin, true),
        body: JSON.stringify({ enabled: noticeEnabled, text: noticeText }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setNoticeError(typeof data?.error === 'string' ? data.error : 'Could not save the notice.')
        return
      }
      setNoticeEnabled(Boolean(data.enabled))
      setNoticeText(typeof data.text === 'string' ? data.text : '')
      setNoticeMessage('Notice saved.')
    } catch {
      setNoticeError('Could not save the notice.')
    } finally {
      setSavingNotice(false)
    }
  }

  const addField = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdding(true)
    setFieldError('')
    try {
      const res = await fetch('/api/admin/fields', {
        method: 'POST',
        headers: adminHeaders(sessionPin, true),
        body: JSON.stringify({
          label: draft.label,
          field_type: draft.field_type,
          options: optionsFromLines(draft.optionsText),
          required: draft.required,
          enabled: draft.enabled,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setFieldError(typeof data?.error === 'string' ? data.error : 'Could not add that question.')
        return
      }
      setFields((current) => [...current, data as FormField].sort((a, b) => a.sort_order - b.sort_order))
      setDraft(emptyDraft)
    } catch {
      setFieldError('Could not add that question.')
    } finally {
      setAdding(false)
    }
  }

  const saveEdit = async (id: string) => {
    setFieldError('')
    const res = await fetch(`/api/admin/fields/${id}`, {
      method: 'PATCH',
      headers: adminHeaders(sessionPin, true),
      body: JSON.stringify({
        label: editDraft.label,
        field_type: editDraft.field_type,
        options: optionsFromLines(editDraft.optionsText),
        required: editDraft.required,
        enabled: editDraft.enabled,
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setFieldError(typeof data?.error === 'string' ? data.error : 'Could not save that question.')
      return
    }
    setFields((current) => current.map((field) => (field.id === id ? (data as FormField) : field)))
    setEditingId(null)
  }

  const toggleEnabled = async (field: FormField) => {
    setFieldError('')
    const res = await fetch(`/api/admin/fields/${field.id}`, {
      method: 'PATCH',
      headers: adminHeaders(sessionPin, true),
      body: JSON.stringify({ enabled: !field.enabled }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      setFieldError(typeof data?.error === 'string' ? data.error : 'Could not update that question.')
      return
    }
    setFields((current) => current.map((item) => (item.id === field.id ? (data as FormField) : item)))
  }

  const moveField = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= fields.length) return
    const previous = fields
    const next = [...fields]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setFields(next)
    setEditingId(null)
    setFieldError('')
    const res = await fetch('/api/admin/fields/reorder', {
      method: 'POST',
      headers: adminHeaders(sessionPin, true),
      body: JSON.stringify({ ids: next.map((field) => field.id) }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !Array.isArray(data)) {
      setFields(previous)
      setFieldError('Could not reorder questions.')
      return
    }
    setFields(data as FormField[])
  }

  const confirmAction = async () => {
    if (!confirmState) return
    setDeleting(true)
    setDeleteError('')
    try {
      if (confirmState.kind === 'registration') {
        const id = confirmState.registration.id
        const res = await fetch(`/api/admin/registrations/${id}`, {
          method: 'DELETE',
          headers: adminHeaders(sessionPin),
        })
        if (!res.ok) {
          setDeleteError('Could not delete that registration.')
          return
        }
        setRegistrations((current) => current.filter((registration) => registration.id !== id))
      } else {
        const id = confirmState.field.id
        const res = await fetch(`/api/admin/fields/${id}`, {
          method: 'DELETE',
          headers: adminHeaders(sessionPin),
        })
        if (!res.ok) {
          setDeleteError('Could not remove that question.')
          return
        }
        setFields((current) => current.filter((field) => field.id !== id))
        if (editingId === id) setEditingId(null)
      }
      setConfirmState(null)
    } catch {
      setDeleteError('Could not complete that delete.')
    } finally {
      setDeleting(false)
    }
  }

  if (!unlocked) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#f4f7fb' }}>
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <h1 className="text-xl font-bold mb-6" style={{ color: '#0033A0' }}>Admin Access</h1>
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full border-2 rounded-lg px-4 py-3 text-center text-2xl tracking-widest text-gray-900 focus:outline-none"
              style={inputStyle}
              maxLength={10}
              autoFocus
              aria-label="Admin PIN"
            />
            {wrongPin && <p className="text-red-700 text-sm font-medium">Incorrect PIN</p>}
            <button
              type="submit"
              className="w-full text-white font-semibold py-3 rounded-lg transition hover:opacity-90"
              style={{ backgroundColor: '#0033A0' }}
            >
              Unlock
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6" style={{ backgroundColor: '#f4f7fb' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#0033A0' }}>
              Woodlands Wolves — Have a Go Day
            </h1>
            <p className="text-gray-600 text-sm mt-1">{registrations.length} registered</p>
          </div>
          <button
            type="button"
            onClick={exportCSV}
            className="text-white px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#0033A0' }}
          >
            Export CSV
          </button>
        </div>

        {loadError && <p className="mb-4 text-red-700 text-sm font-medium">{loadError}</p>}

        <section className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="text-lg font-bold mb-3" style={{ color: '#0033A0' }}>Homepage notice</h2>
          <form onSubmit={saveNotice} className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <input
                type="checkbox"
                checked={noticeEnabled}
                onChange={(e) => setNoticeEnabled(e.target.checked)}
              />
              Show notice on the registration page
            </label>
            <textarea
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Message shown above the registration form"
              className={inputClass}
              style={inputStyle}
              aria-label="Homepage notice"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={!loaded || savingNotice}
                className="text-white px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#0033A0' }}
              >
                {savingNotice ? 'Saving...' : 'Save notice'}
              </button>
              {noticeMessage && <p className="text-sm text-green-700">{noticeMessage}</p>}
              {noticeError && <p className="text-sm text-red-700">{noticeError}</p>}
            </div>
          </form>
        </section>

        <section className="bg-white rounded-xl shadow p-5 mb-6">
          <h2 className="text-lg font-bold mb-1" style={{ color: '#0033A0' }}>Custom questions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Extra questions appear after the fixed registration fields. Name, age, gender, parent, phone, and email stay on the form.
          </p>
          <form onSubmit={addField} className="grid gap-3 md:grid-cols-2 mb-5">
            <label className="text-sm font-semibold text-gray-800">
              Label
              <input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                required
                maxLength={80}
                className={`${inputClass} mt-1`}
                style={inputStyle}
              />
            </label>
            <label className="text-sm font-semibold text-gray-800">
              Type
              <select
                value={draft.field_type}
                onChange={(e) => setDraft({ ...draft, field_type: e.target.value as FieldType })}
                className={`${inputClass} mt-1`}
                style={inputStyle}
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                ))}
              </select>
            </label>
            {draft.field_type === 'select' && (
              <label className="text-sm font-semibold text-gray-800 md:col-span-2">
                Options, one per line
                <textarea
                  value={draft.optionsText}
                  onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })}
                  required
                  rows={3}
                  className={`${inputClass} mt-1`}
                  style={inputStyle}
                />
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={draft.required}
                onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              Show on the form
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={!loaded || adding}
                className="text-white px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#0033A0' }}
              >
                {adding ? 'Adding...' : 'Add question'}
              </button>
            </div>
          </form>

          {fieldError && <p className="mb-3 text-sm text-red-700">{fieldError}</p>}

          {fields.length === 0 ? (
            <p className="text-sm text-gray-500">No extra questions yet.</p>
          ) : (
            <ul className="space-y-3">
              {fields.map((field, index) => (
                <li key={field.id} className="border-2 rounded-lg p-3" style={{ borderColor: '#b9c8e8' }}>
                  {editingId === field.id ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-semibold text-gray-800">
                        Label
                        <input
                          value={editDraft.label}
                          onChange={(e) => setEditDraft({ ...editDraft, label: e.target.value })}
                          required
                          maxLength={80}
                          className={`${inputClass} mt-1`}
                          style={inputStyle}
                        />
                      </label>
                      <label className="text-sm font-semibold text-gray-800">
                        Type
                        <select
                          value={editDraft.field_type}
                          onChange={(e) => setEditDraft({ ...editDraft, field_type: e.target.value as FieldType })}
                          className={`${inputClass} mt-1`}
                          style={inputStyle}
                        >
                          {FIELD_TYPES.map((type) => (
                            <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                          ))}
                        </select>
                      </label>
                      {editDraft.field_type === 'select' && (
                        <label className="text-sm font-semibold text-gray-800 md:col-span-2">
                          Options, one per line
                          <textarea
                            value={editDraft.optionsText}
                            onChange={(e) => setEditDraft({ ...editDraft, optionsText: e.target.value })}
                            required
                            rows={3}
                            className={`${inputClass} mt-1`}
                            style={inputStyle}
                          />
                        </label>
                      )}
                      <label className="flex items-center gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={editDraft.required}
                          onChange={(e) => setEditDraft({ ...editDraft, required: e.target.checked })}
                        />
                        Required
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={editDraft.enabled}
                          onChange={(e) => setEditDraft({ ...editDraft, enabled: e.target.checked })}
                        />
                        Show on the form
                      </label>
                      <div className="md:col-span-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => saveEdit(field.id)}
                          className="text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                          style={{ backgroundColor: '#0033A0' }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium border-2"
                          style={{ borderColor: '#b9c8e8', color: '#0033A0' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {field.label}{' '}
                          {!field.enabled && <span className="text-xs font-medium text-gray-500">(hidden)</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {TYPE_LABELS[field.field_type]}
                          {field.required ? ' · Required' : ''}
                          {field.field_type === 'select' && field.options.length > 0 ? ` · ${field.options.join(', ')}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => moveField(index, -1)} disabled={index === 0} className="px-2 py-1 text-sm rounded border-2 disabled:opacity-40" style={{ borderColor: '#b9c8e8', color: '#0033A0' }}>Up</button>
                        <button type="button" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="px-2 py-1 text-sm rounded border-2 disabled:opacity-40" style={{ borderColor: '#b9c8e8', color: '#0033A0' }}>Down</button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(field.id)
                            setEditDraft({
                              label: field.label,
                              field_type: field.field_type,
                              required: field.required,
                              enabled: field.enabled,
                              optionsText: field.options.join('\n'),
                            })
                          }}
                          className="px-2 py-1 text-sm rounded border-2"
                          style={{ borderColor: '#b9c8e8', color: '#0033A0' }}
                        >
                          Edit
                        </button>
                        <button type="button" onClick={() => toggleEnabled(field)} className="px-2 py-1 text-sm rounded border-2" style={{ borderColor: '#b9c8e8', color: '#0033A0' }}>
                          {field.enabled ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('')
                            setConfirmState({ kind: 'field', field })
                          }}
                          className="px-2 py-1 text-sm rounded text-white bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : registrations.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">No registrations yet.</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white" style={{ backgroundColor: '#0033A0' }}>
                <tr>
                  {['Child', 'Age', 'Child gender', 'Parent', 'Phone', 'Email', ...columns.map((column) => column.label), 'Registered', ''].map((header, index) => (
                    <th key={`${header}-${index}`} className="text-left px-4 py-3 font-medium whitespace-nowrap">{header || 'Remove'}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.map((registration, index) => (
                  <tr key={registration.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{registration.child_full_name}</td>
                    <td className="px-4 py-3 text-gray-700">{registration.age || '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{registration.child_gender || '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{registration.parent_name}</td>
                    <td className="px-4 py-3 text-gray-700">{registration.phone}</td>
                    <td className="px-4 py-3 text-gray-700">{registration.email}</td>
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-3 text-gray-700">
                        {formatAnswer(registration.custom_answers?.[column.key]) || '—'}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {new Date(registration.created_at).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError('')
                          setConfirmState({ kind: 'registration', registration })
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-red-700 hover:opacity-90"
                        aria-label={`Remove registration for ${registration.child_full_name}`}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <h2 id="confirm-title" className="text-lg font-bold" style={{ color: '#0033A0' }}>
              {confirmState.kind === 'registration' ? 'Delete registration' : 'Remove question'}
            </h2>
            <p className="mt-3 text-gray-800">
              {confirmState.kind === 'registration'
                ? `Delete registration for ${confirmState.registration.child_full_name}? This cannot be undone.`
                : `Remove “${confirmState.field.label}” from the form? Past answers stay on existing registrations.`}
            </p>
            {deleteError && <p className="mt-3 text-sm text-red-700">{deleteError}</p>}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (deleting) return
                  setConfirmState(null)
                  setDeleteError('')
                }}
                className="px-4 py-2 rounded-lg border-2 font-medium"
                style={{ borderColor: '#b9c8e8', color: '#0033A0' }}
                autoFocus
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAction}
                disabled={deleting}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function answerColumns(fields: FormField[], registrations: Registration[]) {
  const known = new Set(fields.map((field) => field.field_key))
  const extras = new Set<string>()
  for (const registration of registrations) {
    const answers = registration.custom_answers && typeof registration.custom_answers === 'object'
      ? registration.custom_answers
      : {}
    for (const key of Object.keys(answers)) {
      if (!known.has(key)) extras.add(key)
    }
  }
  return [
    ...fields.map((field) => ({ key: field.field_key, label: field.label })),
    ...[...extras].sort().map((key) => ({ key, label: key })),
  ]
}
