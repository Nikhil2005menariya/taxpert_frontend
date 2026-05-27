const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../src/components/marketing');

fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    let p = path.join(dir, file);
    let content = fs.readFileSync(p, 'utf-8');
    
    // Naively replace href= with to= for <Link
    // Actually we can do it more carefully:
    content = content.replace(/<Link([^>]*)href=/g, '<Link$1to=');
    
    fs.writeFileSync(p, content);
  }
});
