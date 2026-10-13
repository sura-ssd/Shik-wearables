import { Dropdown } from "./Dropdown";

interface SizePickerProps {
  sizes: string[];
  value: string;
  onChange: (size: string) => void;
  label: string;
}

export function SizePicker({ sizes, value, onChange, label }: SizePickerProps) {
  return (
    <Dropdown
      ariaLabel={`Choose size for ${label}`}
      className="min-h-10"
      onChange={onChange}
      options={[
        { value: "", label: "Choose size" },
        ...sizes.map((size) => ({ value: size, label: `Size ${size}` })),
      ]}
      value={value}
    />
  );
}
