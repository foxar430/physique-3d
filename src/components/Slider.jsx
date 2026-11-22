/** Curseur de paramètre avec nom, valeur et unité. */
export default function Slider({ label, value, min, max, step, unit, onChange, format }) {
  const id = 'sl-' + label.replace(/\W+/g, '')
  return (
    <div className="slider">
      <label htmlFor={id}>
        <span>{label}</span>
        <output>
          {format ? format(value) : value} {unit}
        </output>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--pct': (((value - min) / (max - min || 1)) * 100).toFixed(1) + '%' }}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}
