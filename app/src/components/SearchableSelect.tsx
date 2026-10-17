import {
  Children,
  Fragment,
  isValidElement,
  useId,
  useState,
  useRef,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';

function optionText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? optionText(child.props.children)
        : String(child),
    )
    .join('');
}
function optionsFrom(node: ReactNode): { value: string; label: string; disabled?: boolean }[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<{ children?: ReactNode; value?: string; disabled?: boolean }>(child))
      return [];
    if (child.type === Fragment) return optionsFrom(child.props.children);
    if (child.type !== 'option') return [];
    const label = optionText(child.props.children);
    return [{ value: String(child.props.value ?? label), label, disabled: child.props.disabled }];
  });
}
export default function SearchableSelect({
  label,
  children,
  onChange,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const [query, setQuery] = useState('');
  const id = useId();
  const options = optionsFrom(children);
  const [open, setOpen] = useState(false),
    [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const matches = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find((o) => o.value === String(props.value));
  const choose = (value: string) => {
    onChange?.({ target: { value }, currentTarget: { value } } as ChangeEvent<HTMLSelectElement>);
    setOpen(false);
    setQuery('');
  };
  return (
    <div
      className="combobox"
      ref={ref}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
          setQuery('');
        }
      }}
    >
      <input
        role="combobox"
        aria-label={props['aria-label'] ?? label}
        aria-expanded={open}
        aria-controls={id}
        aria-autocomplete="list"
        aria-activedescendant={open && matches[active] ? id + '-' + active : undefined}
        value={open ? query : (selected?.label ?? '')}
        disabled={props.disabled}
        onFocus={() => {
          document
            .querySelectorAll('details[name="record-table-menu"][open]')
            .forEach((menu) => menu.removeAttribute('open'));
          setOpen(true);
          setQuery('');
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (open) { e.stopPropagation(); e.preventDefault(); }
            setOpen(false);
            setQuery('');
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setOpen(true);
            setActive((i) =>
              Math.max(0, Math.min(matches.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))),
            );
          }
          if (e.key === 'Enter' && open) {
            e.preventDefault();
            if (matches[active] && !matches[active].disabled) choose(matches[active].value);
          }
        }}
      />
      {open && (
        <div role="listbox" id={id} aria-label={label + ' options'}>
          {matches.length ? (
            matches.map((o, i) => (
              <button
                type="button"
                role="option"
                id={id + '-' + i}
                aria-selected={o.value === String(props.value)}
                disabled={o.disabled}
                key={o.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o.value)}
              >
                {o.label}
              </button>
            ))
          ) : (
            <p role="status">No results</p>
          )}
        </div>
      )}
    </div>
  );
}
