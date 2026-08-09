const fs = require('fs');

function fixButtonHref(file) {
  let c = fs.readFileSync(file, 'utf8');
  let original = c;
  
  c = c.replace(/<Button([^>]+)href=([\"\{][^\">\}]+[\"\}])([^>]*)>([\s\S]*?)<\/Button>/g, (match, before, href, after, inner) => {
    return `<Link href=${href} passHref legacyBehavior><Button${before}${after}>${inner}</Button></Link>`;
  });
  
  if (c !== original) {
    if (!c.includes('import Link from "next/link"') && !c.includes("import Link from 'next/link'")) {
      c = 'import Link from "next/link";\n' + c;
    }
    fs.writeFileSync(file, c);
    console.log('Fixed Button href in', file);
  }
}

function fixInput(file) {
  let c = fs.readFileSync(file, 'utf8');
  let original = c;
  c = c.replace(/<Input\s+label=\"([^\"]+)\"([^>]+)\/>/g, (match, label, rest) => {
    let r = rest.replace(/onValueChange=\{([^}]+)\}/, 'onChange={(e) => $1(e.target.value)}');
    return `<div className="flex flex-col gap-1.5">\n  <label className="text-sm font-medium">${label}</label>\n  <input className="w-full bg-default-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" ${r} />\n</div>`;
  });
  
  if (c !== original) {
    fs.writeFileSync(file, c);
    console.log('Fixed Input in', file);
  }
}

function fixChip(file) {
  let c = fs.readFileSync(file, 'utf8');
  if(c.includes('variant="outline"') && c.includes('<Chip')) {
    c = c.replace(/<Chip([^>]+)variant="outline"/g, '<Chip$1variant="flat"');
    fs.writeFileSync(file, c);
    console.log('Fixed Chip in', file);
  }
}

['app/tests/[id]/page.tsx', 'app/tests/new/page.tsx', 'app/tests/page.tsx', 'app/page.tsx', 'app/evaluations/[id]/review/page.tsx', 'app/evaluations/page.tsx', 'app/settings/page.tsx'].forEach(f => {
  fixButtonHref(f);
  fixInput(f);
  fixChip(f);
});
