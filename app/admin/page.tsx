'use client'

import { useState } from 'react'

type Registration = {
  id: string
  child_full_name: string
  age: string
  parent_name: string
  phone: string
  email: string
  created_at: string
}

export default function AdminPage() {
  const [pin, setPin] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [wrongPin, setWrongPin] = useState(false)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(false)

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pin !== '1972') {
      setWrongPin(true)
      setPin('')
      return
    }
    setUnlocked(true)
    setWrongPin(false)
    setLoading(true)
    fetch('/api/admin/registrations')
      .then(r => r.json())
      .then(data => {
        setRegistrations(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const exportCSV = () => {
    const headers = ['Child full name', 'Age', 'Parent name', 'Phone', 'Email', 'Registered at']
    const rows = registrations.map(r => [
      r.child_full_name,
      r.age,
      r.parent_name,
      r.phone,
      r.email,
      new Date(r.created_at).toLocaleString('en-AU'),
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'woodlands-wolves-have-a-go-registrations.csv'
    a.click()
    URL.revokeObjectURL(url)
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
              onChange={e => setPin(e.target.value)}
              placeholder="Enter PIN"
              className="w-full border-2 rounded-lg px-4 py-3 text-center text-2xl tracking-widest text-gray-900 focus:outline-none"
              style={{ borderColor: '#b9c8e8' }}
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
            onClick={exportCSV}
            className="text-white px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
            style={{ backgroundColor: '#0033A0' }}
          >
            Export CSV
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : registrations.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500">No registrations yet.</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-white" style={{ backgroundColor: '#0033A0' }}>
                <tr>
                  {['Child', 'Age', 'Parent', 'Phone', 'Email', 'Registered'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {registrations.map((r, i) => (
                  <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-medium text-gray-900">{r.child_full_name}</td>
                    <td className="px-4 py-3 text-gray-700">{r.age || '—'}</td>
                    <td className="px-4 py-3 text-gray-900">{r.parent_name}</td>
                    <td className="px-4 py-3 text-gray-700">{r.phone}</td>
                    <td className="px-4 py-3 text-gray-700">{r.email}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
