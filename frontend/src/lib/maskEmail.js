/** Hides most of an e-mail address, so it is safe to leave on a screen: "ga•••@g•••.com". */
export function maskEmail(email) {
  const text = String(email ?? '')
  const at = text.lastIndexOf('@')
  if (at < 1) return '•••'

  const local = text.slice(0, at)
  const domain = text.slice(at + 1)
  const dot = domain.lastIndexOf('.')
  const host = dot > 0 ? domain.slice(0, dot) : domain
  const ending = dot > 0 ? domain.slice(dot) : ''

  return `${local.slice(0, 2)}•••@${host.slice(0, 1)}•••${ending}`
}

/** The name to greet someone with: the one they chose, or the hidden e-mail. */
export function accountLabel(user) {
  const name = String(user?.user_metadata?.display_name ?? '').trim()
  return name ? { name, masked: null } : { name: null, masked: maskEmail(user?.email) }
}
