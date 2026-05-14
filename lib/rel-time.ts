export function relTime(value: string): string {
  const timestamp = new Date(value).getTime()
  const diffMs = Date.now() - timestamp
  const absMs = Math.abs(diffMs)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (absMs < minute) {
    return "now"
  }

  if (absMs < hour) {
    return `${Math.round(absMs / minute)}m`
  }

  if (absMs < day) {
    return `${Math.round(absMs / hour)}h`
  }

  return `${Math.round(absMs / day)}d`
}
