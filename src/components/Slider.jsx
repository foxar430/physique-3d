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
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}
