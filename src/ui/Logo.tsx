export function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo"><span className="logo-mark"><span/><span/></span>{!compact && <b>AIRLOCK</b>}</div>
}
