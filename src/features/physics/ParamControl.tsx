import { RangeField } from '../../components/RangeField'
import { PARAM_SPECS, type ParamKey } from '../../physics/projectile'

interface Props {
  paramKey: ParamKey
  value: number
  onChange: (key: ParamKey, value: number) => void
  note?: string
}

/** A launch input: the shared slider + validated number field, configured from PARAM_SPECS. */
export function ParamControl({ paramKey, value, onChange, note }: Props) {
  return <RangeField spec={PARAM_SPECS[paramKey]} value={value} onChange={(v) => onChange(paramKey, v)} note={note} />
}
