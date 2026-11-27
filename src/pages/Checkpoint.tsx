import { useWallet } from '@solana/wallet-adapter-react'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toSupabaseWallet } from '@/engines/auth/walletSource'

export function CheckpointPage() {
  const { wallets, wallet, select, connected, publicKey } = useWallet()
  const [log, setLog] = useState<string[]>([])
  const [identities, setIdentities] = useState<string | null>(null)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const walletRef = useRef(wallet)
  useEffect(() => {
    walletRef.current = wallet
  }, [wallet])

  function append(message: string) {
    console.log('[checkpoint]', message)
    setLog((prev) => [...prev, message])
  }

  async function connectWallet(name: string) {
    setBusy(true)
    setErrorText(null)
    setIdentities(null)
    setLog([])
    try {
      const detected = wallets.map((w) => `${w.adapter.name} (readyState=${w.readyState})`)
      append(`Detected wallets: ${detected.length ? detected.join(', ') : 'none'}`)

      const entry = wallets.find((w) => w.adapter.name === name)
      if (!entry) {
        append(`Wallet ${name} not found`)
        return
      }
      append(`Selected wallet: ${entry.adapter.name} (readyState=${entry.readyState})`)
      select(entry.adapter.name)

      append('Waiting for wallet to be set...')
      const start = Date.now()
      while (!walletRef.current && Date.now() - start < 5000) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      if (!walletRef.current) throw new Error(`Wallet ${name} was not set after selecting`)
      const adapter = entry.adapter
      append(`Wallet set: ${adapter.name}`)

      if (!adapter.connected) {
        append('Connecting via adapter...')
        await adapter.connect()
      } else {
        append('Already connected via adapter')
      }
      append(`Connected: ${adapter.publicKey?.toBase58()?.slice(0, 6) ?? 'n/a'}`)

      append('Calling supabase.auth.signInWithWeb3...')
      const wallet = toSupabaseWallet(adapter)
      const { data, error } = await supabase.auth.signInWithWeb3({
        chain: 'solana',
        statement: 'Airlock checkpoint test',
        wallet,
      })
      if (error) throw error
      append(`signInWithWeb3 OK. user: ${data.user?.id ?? 'n/a'}`)

      append('Calling supabase.auth.getUser()...')
      const { data: userData, error: getUserError } = await supabase.auth.getUser()
      if (getUserError) throw getUserError
      setIdentities(JSON.stringify(userData.user?.identities ?? null, null, 2))
      append('getUser() OK')
    } catch (err) {
      const e = err as { name?: string; message?: string }
      const detail = `Error name: ${e?.name ?? 'n/a'}; message: ${e?.message ?? String(err)}`
      console.error('[checkpoint] caught', err)
      setErrorText(detail)
      append(detail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      <h1>Checkpoint: wallet signInWithWeb3 (dev only)</h1>

      <div>
        <p>Selected wallet: {wallet ? `${wallet.adapter.name} (readyState=${wallet.readyState})` : 'none'}</p>
        <p>Connected: {String(connected)}</p>
        <p>PublicKey: {publicKey?.toBase58() ?? 'n/a'}</p>
      </div>

      <div>
        <p>Detected wallets:</p>
        {wallets.length === 0 ? (
          <p> none</p>
        ) : (
          wallets.map((w) => (
            <div key={w.adapter.name} style={{ marginBottom: 6 }}>
              <button onClick={() => connectWallet(w.adapter.name)} disabled={busy}>
                {busy ? 'Working...' : `Connect ${w.adapter.name}`}
              </button>
              <span style={{ marginLeft: 8 }}>
                readyState={w.readyState}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <p>Log:</p>
        {log.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {errorText && <p style={{ color: 'red' }}>{errorText}</p>}

      {identities && (
        <>
          <p>identities:</p>
          <pre>{identities}</pre>
        </>
      )}
    </div>
  )
}