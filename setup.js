const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function setup() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   API Key Management System — Setup      ║');
  console.log('╚══════════════════════════════════════════╝\n');

  console.log('📋 This will configure your MySQL database connection.\n');

  const host = await ask('MySQL Host [localhost]: ') || 'localhost';
  const port = await ask('MySQL Port [3306]: ') || '3306';
  const user = await ask('MySQL User [root]: ') || 'root';
  const password = await ask('MySQL Password: ')|| '111';
  const dbName = await ask('Database Name [api_key_management]: ') || 'api_key_management';
  const backendPort = await ask('Backend Port [5000]: ') || '5000';

  const envContent = `# Database Configuration (MySQL Workbench)
DB_HOST=${host}
DB_PORT=${port}
DB_USER=${user}
DB_PASSWORD=${password}
DB_NAME=${dbName}

# Server
PORT=${backendPort}
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
`;

  fs.writeFileSync(path.join(__dirname, 'backend', '.env'), envContent);
  console.log('\n✅ Created backend/.env');

  rl.close();

  console.log('\n📦 Next steps:');
  console.log('   1. cd backend && npm install');
  console.log('   2. node server.js         (starts backend on port ' + backendPort + ')');
  console.log('   3. cd ../frontend && npm install');
  console.log('   4. npm start              (starts frontend on port 3000)');
  console.log('\n🌐 Then open: http://localhost:3000');
  console.log('\n🎉 Done!\n');
}

setup().catch(console.error);
