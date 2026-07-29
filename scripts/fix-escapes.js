const fs = require('fs');
let content = fs.readFileSync('components/tienda/templates/ModaTemplate.tsx', 'utf8');
content = content.replace(/\\\$/g, '$').replace(/\\`/g, '`');
fs.writeFileSync('components/tienda/templates/ModaTemplate.tsx', content);
