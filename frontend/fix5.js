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

// 1. Fix Chip variants from flat to soft
const filesWithChips = [
  'app/evaluations/[id]/page.tsx',
  'app/evaluations/[id]/review/page.tsx',
  'app/evaluations/page.tsx',
  'app/page.tsx',
  'app/tests/[id]/page.tsx'
];
filesWithChips.forEach(f => {
  replaceInFile(f, [
    [/variant="flat"/g, 'variant="soft"']
  ]);
});

// 2. Fix Button variant success -> primary in app/templates/page.tsx
replaceInFile('app/templates/page.tsx', [
  [/variant=\{saved \? "success" \: "primary"\}/, 'variant="primary"']
]);

// 3. Fix Slider size in app/settings/page.tsx
replaceInFile('app/settings/page.tsx', [
  [/size="sm"/g, '']
]);

// 4. Fix Modal backdrop in app/templates/GenerateSheetModal.tsx
//    and isLoading -> isPending
//    and variant='bordered' -> ''
replaceInFile('app/templates/GenerateSheetModal.tsx', [
  [/backdrop="blur"/g, ''],
  [/isLoading/g, 'isPending'],
  [/variant="bordered"/g, '']
]);

// 5. Fix 'as' prop on Button in tests/[id]/page.tsx
replaceInFile('app/tests/[id]/page.tsx', [
  [/<Button[^>]+as="label"[^>]*>([\s\S]*?)<\/Button>/g, '<label className="bg-default-100 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer hover:bg-default-200 transition-colors border border-default-200">$1</label>']
]);
