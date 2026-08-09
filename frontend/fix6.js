const fs = require('fs');

function replaceInFile(file, replaces) {
  let c = fs.readFileSync(file, 'utf8');
  let original = c;
  for (let r of replaces) {
    c = c.replace(r[0], r[1]);
  }
  if (c !== original) {
    fs.writeFileSync(file, c);
    console.log('Fixed', file);
  }
}

// app/evaluations/[id]/page.tsx
replaceInFile('app/evaluations/[id]/page.tsx', [
  [/AMBIGUOUS: { color: "secondary", label: "AMBIGUOUS" },/g, 'AMBIGUOUS: { color: "default", label: "AMBIGUOUS" },'],
  [/variant="flat"/g, 'variant="soft"'],
  [/variant="outline"/g, 'variant="soft"'],
  [/variant="solid"/g, 'variant="primary"'],
  [/color=\{filter === f \? "primary" : "default"\} variant=\{filter === f \? "solid" : "flat"\}/g, 'variant={filter === f ? "primary" : "secondary"}'],
  [/<Chip size="sm" color=\{status.color as any\} variant="soft">/g, '<Chip size="sm" color={status.color as any} variant="soft">']
]);

// app/evaluations/[id]/review/page.tsx
replaceInFile('app/evaluations/[id]/review/page.tsx', [
  [/AMBIGUOUS: { color: "secondary", label: "AMBIGUOUS" },/g, 'AMBIGUOUS: { color: "default", label: "AMBIGUOUS" },'],
  [/variant="flat"/g, 'variant="soft"'],
  [/variant="outline"/g, 'variant="soft"'],
  [/variant="solid"/g, 'variant="primary"'],
  [/color=\{filter === f \? "primary" : "default"\} variant=\{filter === f \? "solid" : "flat"\}/g, 'variant={filter === f ? "primary" : "secondary"}']
]);

// app/evaluations/page.tsx
replaceInFile('app/evaluations/page.tsx', [
  [/variant="flat"/g, 'variant="soft"'],
  [/variant="outline"/g, 'variant="soft"']
]);

// app/page.tsx
replaceInFile('app/page.tsx', [
  [/variant="flat"/g, 'variant="soft"'],
  [/variant="outline"/g, 'variant="soft"']
]);

// app/tests/[id]/page.tsx
replaceInFile('app/tests/[id]/page.tsx', [
  [/<Button[^>]+as="label"[^>]*>([\s\S]*?)<\/Button>/g, '<label className="bg-default-100 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer hover:bg-default-200 transition-colors border border-default-200">$1</label>'],
  [/variant="flat"/g, 'variant="soft"'],
  [/variant="outline"/g, 'variant="soft"']
]);

// app/templates/page.tsx
replaceInFile('app/templates/page.tsx', [
  [/variant=\{saved \? "success" : "primary"\}/g, 'variant="primary"']
]);

// app/templates/GenerateSheetModal.tsx
replaceInFile('app/templates/GenerateSheetModal.tsx', [
  [/backdrop="blur"/g, ''],
  [/isLoading/g, 'isPending'],
  [/variant="bordered"/g, ''],
  [/startContent=\{<FileDown size=\{16\} \/>\}/g, ''],
  [/<Input([^>]+)label="([^"]+)"([^>]+)placeholder="([^"]+)"([^>]+)\/>/g, (match, p1, label, p3, placeholder, p5) => {
    return `<div className="flex flex-col gap-1.5"><label className="text-sm font-medium">${label}</label><input className="w-full bg-default-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" placeholder="${placeholder}" ${p3}${p5} /></div>`;
  }]
]);

// app/tests/new/page.tsx
replaceInFile('app/tests/new/page.tsx', [
  [/<Input[^>]+label="([^"]+)"[^>]+type="number"[^>]+min=\{([^\}]+)\}[^>]+max=\{([^\}]+)\}[^>]+value=\{([^\}]+)\}[^>]+onValueChange=\{([^\}]+)\}[^>]+description="([^"]+)"[^>]+\/>/g, (match, label, min, max, value, onValueChange, desc) => {
    return `<div className="flex flex-col gap-1.5"><label className="text-sm font-medium">${label}</label><input type="number" min={${min}} max={${max}} value={${value}} onChange={(e) => ${onValueChange}(e.target.value)} className="w-full bg-default-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" /><p className="text-xs text-default-500">${desc}</p></div>`;
  }],
  [/<Input([^>]+)isRequired([^>]+)\/>/g, (match, p1, p2) => {
    return `<Input${p1}required${p2}/>`;
  }]
]);
