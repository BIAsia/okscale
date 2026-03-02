import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

export type SelectOption = { id: string; label: string };

type GenSelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (id: string) => void;
  prefix?: ComponentChildren;
  /** When true, the selected label text is hidden (only prefix + chevron show) */
  hideLabel?: boolean;
};

export function GenSelect(props: GenSelectProps) {
  var openState = useState(false);
  var open = openState[0];
  var setOpen = openState[1];

  var ref = useRef<HTMLDivElement>(null);
  var selected = props.options.find(function (o) { return o.id === props.value; });

  useEffect(function () {
    if (!open) return;
    function handleDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleDown);
    return function () { document.removeEventListener('mousedown', handleDown); };
  }, [open]);

  return (
    <div ref={ref} class={'gen-select' + (open ? ' open' : '')}>
      <button
        type="button"
        class="gen-select-trigger"
        onClick={function () { setOpen(function (v) { return !v; }); }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {props.prefix && <span class="gen-select-prefix">{props.prefix}</span>}
        {!props.hideLabel && (
          <span class="gen-select-value">{selected ? selected.label : props.value}</span>
        )}
        <span class="gen-select-chevron">▾</span>
      </button>
      {open && (
        <div class="gen-select-menu" role="listbox">
          {props.options.map(function (opt) {
            var isSel = opt.id === props.value;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSel}
                class={'gen-select-option' + (isSel ? ' selected' : '')}
                onClick={function () {
                  props.onChange(opt.id);
                  setOpen(false);
                }}
              >
                <span class="gen-select-check">{isSel ? '✓' : ''}</span>
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
