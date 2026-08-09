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

  // For app/tests/[id]/page.tsx, it uses <Button as={Link} href={`/tests/${testId}/evaluate`}
  // Instead of complex logic, I'll just change Button as={Link} href="..." to Link href="..."
  // but wrap the Button inside it: <Link href="..."><Button ...></Button></Link>
  // Wait, I can just use Link directly instead of Button? Button has nicer styling.
  // Actually, wait: Button accepts `href` in react-aria, and HeroUI Button passes it down?
  // Let's just wrap it manually. It's safer.
  // Let's replace: <Button as={Link} href="url" variant="primary">Text</Button>
  // With: <Button onPress={() => window.location.href="url"} variant="primary">Text</Button>
  // That avoids router issues entirely if we don't care about SPA navigation.
  // But wait, router.push is better.
  
  // Actually, NextUI v2 Button `as={Link}` is identical to NextUI v3 Button `href={...} as={Link}`.
  // Let's just try changing `as={Link}` to `as={Link}` ... wait, the error said `as` is not assignable to ButtonRootProps!
  // So it doesn't support `as`.
  // Let's just remove `as={Link}` and change `<Button as="a"` to `<Button`.

  // Just remove as={Link} and as="a" entirely.
  // The react-aria-components Button supports `href`, so if it has `href`, it renders as an anchor!
  c = c.replace(/as=\{Link\}/g, '');
  c = c.replace(/as="a"/g, '');

  if(c !== start) { 
    fs.writeFileSync(f, c); 
    console.log('Updated', f); 
  }
});
