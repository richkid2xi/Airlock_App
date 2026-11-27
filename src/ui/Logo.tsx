export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo">
      <img
        src="/logo.png"
        alt=""
        width={compact ? 24 : 32}
        height={compact ? 24 : 32}
        style={{ display: 'block' }}
      />
      {!compact && <b className="logo-text">AirLock</b>}
    </div>
  )
}