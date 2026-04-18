const fs = require('fs');
try {
  const content = fs.readFileSync('app/dashboard/pedidos/page.tsx', 'utf8');
} catch(e){}
