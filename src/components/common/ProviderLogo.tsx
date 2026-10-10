import { memo, useEffect, useState } from 'react'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

export const ProviderLogo = memo(function ProviderLogo({
  name,
  logo,
  size = 'md',
}: {
  name: string
  logo?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
}) {
  const [failed, setFailed] = useState(!logo)

  useEffect(() => setFailed(!logo), [logo])

  return (
    <span className={`provider-logo provider-logo--${size}`} aria-hidden="true">
      {!failed && logo ? (
        <img src={logo} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span>{initials(name)}</span>
      )}
    </span>
  )
})
