interface SizePickerProps {
  sizes: string[];
  value: string;
  onChange: (size: string) => void;
  label: string;
}

export function SizePicker({ sizes, value, onChange, label }: SizePickerProps) {
  return (
    <label className="flex min-h-10 min-w-0 items-center rounded-full border border-border bg-surface px-4">
      <span className="sr-only">Choose size for {label}</span>
      <select
        className="w-full bg-transparent text-sm text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Choose size</option>
        {sizes.map((size) => (
          <option key={size} value={size}>
            Size {size}
          </option>
        ))}
      </select>
    </label>
  );
}
