const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../../thetaxpert/components/marketing');
const destDir = path.join(__dirname, '../src/components/marketing');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function processFile(filePath, destPath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace next/link with react-router-dom Link
  content = content.replace(/import Link from ["']next\/link["'];?/g, 'import { Link } from "react-router-dom";');
  content = content.replace(/import Image from ["']next\/image["'];?/g, '');
  content = content.replace(/<Image([^>]+)\/?>/g, '<img$1 />');

  // Fix hrefs in Link components if they use Next.js specific patterns (usually standard)
  
  // Also fix any next/navigation imports if present
  content = content.replace(/import \{.*?\} from ["']next\/navigation["'];?/g, 'import { useNavigate, useLocation } from "react-router-dom";');

  fs.writeFileSync(destPath, content);
}

fs.readdirSync(srcDir).forEach(file => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    processFile(path.join(srcDir, file), path.join(destDir, file));
  }
});

// Also copy site-content and blog-content
const libDir = path.join(__dirname, '../../thetaxpert/lib');
const sharedDir = path.join(__dirname, '../src/shared');
['site-content.ts', 'blog-content.ts'].forEach(file => {
  let content = fs.readFileSync(path.join(libDir, file), 'utf-8');
  fs.writeFileSync(path.join(sharedDir, file), content);
});

console.log('Marketing components and content files migrated successfully.');
