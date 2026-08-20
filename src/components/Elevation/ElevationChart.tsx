import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { MouseHandlerDataParam } from 'recharts'
import type { TrackPoint } from '../../types'

interface ElevationChartProps {
  points: TrackPoint[]
  onHoverIndexChange: (index: number | null) => void
}

function toIndex(value: number | string | null | undefined): number | null {
  if (value == null) return null
  const index = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(index) ? null : index
}

export default function ElevationChart({ points, onHoverIndexChange }: ElevationChartProps) {
  const data = points.map((point) => ({
    distanceKm: point.distanceKm,
    elevation: point.elevation ?? 0,
  }))

  function handleMove(state: MouseHandlerDataParam) {
    onHoverIndexChange(toIndex(state.activeTooltipIndex))
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} onMouseMove={handleMove} onMouseLeave={() => onHoverIndexChange(null)}>
        <defs>
          <linearGradient id="elevationFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="distanceKm"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value: number) => `${value.toFixed(1)}km`}
        />
        <YAxis dataKey="elevation" width={48} tickFormatter={(value: number) => `${Math.round(value)}m`} />
        <Tooltip
          formatter={(value) => [`${Math.round(Number(value))}m`, 'Elevation']}
          labelFormatter={(label) => `${Number(label).toFixed(2)}km`}
        />
        <Area type="monotone" dataKey="elevation" stroke="#7c3aed" fill="url(#elevationFill)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
