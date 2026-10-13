import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  ariaLabel: string;
  className?: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  value: string;
}

export function Dropdown({
  ariaLabel,
  className = "",
  onChange,
  options,
  value,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function chooseOption(option: DropdownOption) {
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setActiveIndex(selectedIndex);
        setIsOpen(true);
        return;
      }

      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + direction + options.length) % options.length);
    } else if (event.key === "Home" && isOpen) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && isOpen) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if ((event.key === "Enter" || event.key === " ") && isOpen) {
      event.preventDefault();
      chooseOption(options[activeIndex]);
    } else if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
    }
  }

  function toggleMenu() {
    if (!isOpen) {
      setActiveIndex(selectedIndex);
    }
    setIsOpen((current) => !current);
  }

  return (
    <div className={`relative min-w-0 ${className}`} ref={rootRef}>
      <button
        aria-activedescendant={isOpen ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-full border border-border bg-surface px-4 text-left text-sm font-medium text-ink transition-colors hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        ref={triggerRef}
        type="button"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
          size={17}
        />
      </button>

      <div
        aria-hidden={!isOpen}
        className={`absolute left-0 top-[calc(100%+8px)] z-40 w-full min-w-max origin-top rounded-2xl border border-border bg-surface p-1.5 shadow-xl transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none ${isOpen ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0"}`}
        id={listboxId}
        role="listbox"
      >
        {options.map((option, index) => {
          const selected = option.value === value;
          const active = index === activeIndex;

          return (
            <button
              aria-selected={selected}
              className={`flex min-h-10 w-full items-center justify-between gap-5 rounded-xl px-3 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${selected ? "bg-accent/10 font-semibold text-accent" : "text-ink"} ${active && !selected ? "bg-canvas" : "hover:bg-canvas"}`}
              id={`${listboxId}-option-${index}`}
              key={option.value}
              onClick={() => chooseOption(option)}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
              tabIndex={-1}
              type="button"
            >
              <span>{option.label}</span>
              {selected && <Check aria-hidden="true" className="shrink-0" size={15} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}