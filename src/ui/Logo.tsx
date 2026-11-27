export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <img
        src="/logo.png"
        alt="Airlock"
        width={compact ? 24 : 32}
        height={compact ? 24 : 32}
        style={{ display: 'block' }}
      />
    </div>
  )
}
