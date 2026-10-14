"use client";
// The topic's ⋯ menu: closes on outside click and Escape, arrow keys move, focus returns to the button.

import { useEffect, useId, useRef, useState } from "react";
import { Icon, type IconName } from "../Icon";

export type MenuItem = { label: string; icon: IconName; onSelect?: () => void; href?: string; danger?: boolean };

export function MoreMenu({ items }: { items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const list = wrap.current?.querySelector<HTMLElement>("[role=menu]");
    list?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const move = (e: React.KeyboardEvent) => {
    const els = [...(wrap.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const i = els.indexOf(document.activeElement as HTMLElement);
    let next = -1;
    if (e.key === "ArrowDown") next = (i + 1) % els.length;
    else if (e.key === "ArrowUp") next = (i - 1 + els.length) % els.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = els.length - 1;
    else if (e.key === "Tab") setOpen(false);
    if (next >= 0) {
      e.preventDefault();
      els[next]?.focus();
    }
  };

  const pick = (item: MenuItem) => {
    setOpen(false);
    button.current?.focus();
    item.onSelect?.();
  };

  return (
    <div className="menu" ref={wrap}>
      <button
        ref={button}
        type="button"
        className="icon-btn plain more-btn"
        aria-label="More"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="more" size={22} />
      </button>
      {open && (
        <div className="menu-list" role="menu" id={id} aria-label="Topic" onKeyDown={move}>
          {items.map((item) =>
            item.href ? (
              <a key={item.label} role="menuitem" tabIndex={-1} href={item.href} className={item.danger ? "danger" : undefined} onClick={() => setOpen(false)}>
                <Icon name={item.icon} size={18} /> {item.label}
              </a>
            ) : (
              <button key={item.label} role="menuitem" tabIndex={-1} type="button" className={item.danger ? "danger" : undefined} onClick={() => pick(item)}>
                <Icon name={item.icon} size={18} /> {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
