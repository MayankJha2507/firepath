"use client";

export interface SubNavTab {
  id: string;
  label: string;
}

export default function SubNav({
  tabs,
  active,
  onChange,
}: {
  tabs: SubNavTab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-slate-200">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px whitespace-nowrap ${
            active === tab.id
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
