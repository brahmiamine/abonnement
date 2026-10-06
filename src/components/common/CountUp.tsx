import { formatMoney } from '../../domain/subscriptions'
import { useCountUp } from '../../hooks/useCountUp'

/** Montant (ou nombre entier) qui défile à l'apparition. */
export function CountUp({ value, money = true }: { value: number; money?: boolean }) {
  const current = useCountUp(value)
  return <>{money ? formatMoney(current) : String(Math.round(current))}</>
}
