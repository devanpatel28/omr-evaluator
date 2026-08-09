const fs = require('fs');
const files = [
  'app/tests/[id]/page.tsx',
  'app/tests/[id]/evaluate/page.tsx',
  'app/tests/page.tsx',
  'app/page.tsx',
  'app/evaluations/[id]/review/page.tsx',
  'app/evaluations/[id]/page.tsx',
  'app/evaluations/page.tsx',
  'app/tests/new/page.tsx'
];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  let start = c;
  
  c = c.replace(/isLoading/g, 'isPending');
  c = c.replace(/variant="bordered"/g, '');
  c = c.replace(/startContent=\{[^\}]+\}/g, '');
  // Fix multiple attributes with same name by replacing multiple variants or duplicate isPending if generated
  // Not going to do complex regex, just remove startContent.

  if(c !== start) { fs.writeFileSync(f, c); console.log('Updated', f); }
});
