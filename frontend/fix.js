const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}
const files = walk('./app').concat(walk('./components'));
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Remove Card shadow props
  content = content.replace(/shadow="[^"]*"/g, '');

  // Button as={Link} mapping
  // Actually we can't easily replace `as={Link}` to wrap the button if we just use string replace.
  // Wait, if Button doesn't support `as`, NextUI used it to render as Next.js Link.
  // I will just replace `<Button as={Link} href="X"` with `<Button href="X"` and see if HeroUI supports href directly (React Aria components usually do if you pass href).
  // Actually, I'll remove `as={Link}` and change to `href`? No, let's just remove `as={Link}` and change `<Button as={Link} href=...>` to `<Link href=...><Button ...></Button></Link>`.
  // Wait, if it's too hard to regex, I can just fix the 4 files manually.
  
  // Fix button colors
  content = content.replace(/color="primary"/g, 'variant="primary"');
  content = content.replace(/color="danger"/g, 'variant="danger"');
  content = content.replace(/variant="flat"/g, 'variant="outline"');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
