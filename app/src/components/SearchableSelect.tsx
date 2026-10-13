import {
  Children,
  Fragment,
  isValidElement,
  useId,
  useState,
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
  const term = query.trim().toLocaleLowerCase();
  const matches = options.filter((o) => `${o.label} ${o.value}`.toLocaleLowerCase().includes(term));
  const selected = options.find((o) => o.value === String(props.value));
  return (
    <div className="searchable-select">
      <div className="select-search">
        <input
          type="search"
          aria-label={`Search ${label.toLowerCase()} options`}
          placeholder={`Search ${label.toLowerCase()}…`}
          value={query}
          disabled={props.disabled}
          aria-controls={props.id ?? id}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
            if (e.key === 'Escape') {
              e.preventDefault();
              setQuery('');
            }
          }}
        />
        {query && (
          <button
            type="button"
            disabled={props.disabled}
            aria-label={`Clear ${label.toLowerCase()} search`}
            onClick={() => setQuery('')}
          >
            Clear
          </button>
        )}
      </div>
      <select
        {...props}
        id={props.id ?? id}
        aria-label={props['aria-label'] ?? label}
        onChange={(e) => {
          onChange?.(e);
          setQuery('');
        }}
      >
        {selected && !matches.includes(selected) && (
          <option value={selected.value} hidden>
            {selected.label}
          </option>
        )}
        {matches.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      {query && (
        <span className="small" role="status">
          {matches.length
            ? `${matches.length} matching options`
            : 'No matching options. Clear search to see all.'}
          {selected && !matches.includes(selected) ? ' Current selection kept.' : ''}
        </span>
      )}
    </div>
  );
}
