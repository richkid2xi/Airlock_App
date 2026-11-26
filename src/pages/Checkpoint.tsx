import { useWallet } from '@solana/wallet-adapter-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function CheckpointPage() {
  const { publicKey, connect, connected, wallet } = useWallet()
  const [identities, setIdentities] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    setError(null)
    try {
      if (!connected) await connect()
      if (!wallet) throw new Error('No wallet adapter (install Phantom)')
      const { error: authError } = await supabase.auth.signInWithWeb3({
        chain: 'solana',
        statement: 'Airlock checkpoint test',
        wallet: wallet.adapter as any,
      })
      if (authError) throw authError
      const { data, error: getUserError } = await supabase.auth.getUser()
      if (getUserError) throw getUserError
      setIdentities(JSON.stringify(data.user?.identities ?? null, null, 2))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
      <h1>Checkpoint: Phantom signInWithWeb3</h1>
      <p>Connected: {String(connected)} | PublicKey: {publicKey?.toBase58() ?? 'n/a'}</p>
      <button onClick={run} disabled={busy}>
        {busy ? 'Working...' : 'Connect + signInWithWeb3'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {identities && (
        <>
          <p>identities:</p>
          <pre>{identities}</pre>
        </>
      )}
    </div>
  )
}
