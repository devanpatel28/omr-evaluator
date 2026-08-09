const fs = require('fs');

function fix(file, replaces) {
  let c = fs.readFileSync(file, 'utf8');
  for (let r of replaces) c = c.replace(r[0], r[1]);
  fs.writeFileSync(file, c);
}

// Revert Button variant='soft' to variant='outline'
const files = [
  'app/evaluations/[id]/page.tsx',
  'app/evaluations/[id]/review/page.tsx',
  'app/evaluations/page.tsx',
  'app/page.tsx',
  'app/tests/[id]/page.tsx'
];
files.forEach(f => {
  fix(f, [
    [/<Button([^>]*?)variant="soft"/g, '<Button$1variant="outline"']
  ]);
});

// Fix Chip color='secondary'
fix('app/evaluations/[id]/page.tsx', [
  [/color=\{status.color as any\}/g, 'color={status.color === "secondary" ? "default" : status.color as any}']
]);
fix('app/evaluations/[id]/review/page.tsx', [
  [/color=\{status.color as any\}/g, 'color={status.color === "secondary" ? "default" : status.color as any}'],
  [/variant=\{filter === f \? "solid" : "flat"\}/g, 'variant={filter === f ? "primary" : "secondary"}']
]);

// Fix GenerateSheetModal.tsx
fix('app/templates/GenerateSheetModal.tsx', [
  [/onValueChange=\{([^\}]+)\}/g, 'onChange={(e) => $1(e.target.value)}'],
  [/startContent=\{<FileDown size=\{16\} \/>\}/g, '']
]);

// Fix tests/new/page.tsx
fix('app/tests/new/page.tsx', [
  [/isRequired/g, 'required'],
  [/<Input([^>]+)label="([^"]+)"([^>]+)type="number"([^>]+)\/>/g, (match, p1, label, p3, p4) => {
    let r = p4.replace(/onValueChange=\{([^\}]+)\}/, 'onChange={(e) => $1(e.target.value)}');
    return `<div className="flex flex-col gap-1.5"><label className="text-sm font-medium">${label}</label><input type="number"${p1}${p3}${r} className="w-full bg-default-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" /></div>`;
  }]
]);

// Fix templates/page.tsx
fix('app/templates/page.tsx', [
  [/onValueChange=\{v => updateSection\(idx, f.field, Number\(v\)\)\}/g, 'onChange={e => updateSection(idx, f.field, Number(e.target.value))}'],
  [/value=\{String\(section\[f.field\]\)\}/g, 'value={section[f.field]}'],
  [/<Input([^>]+)label="([^"]+)"([^>]+)\/>/g, (match, p1, label, p3) => {
    return `<div className="flex flex-col gap-1.5"><label className="text-xs font-medium">${label}</label><input${p1}${p3} className="w-full bg-default-100 rounded-lg px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary" /></div>`;
  }]
]);
