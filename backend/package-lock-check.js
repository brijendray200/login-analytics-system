// Quick dependency check script
import { exec } from 'child_process';

console.log('🔍 Checking dependencies...\n');

const requiredPackages = [
  'express',
  'mongoose',
  'bcryptjs',
  'jsonwebtoken',
  'nodemailer',
  'cors',
  'dotenv',
  'ua-parser-js',
  'helmet'
];

requiredPackages.forEach(pkg => {
  try {
    require.resolve(pkg);
    console.log(`✅ ${pkg}`);
  } catch (e) {
    console.log(`❌ ${pkg} - NOT INSTALLED`);
  }
});

console.log('\n✨ Dependency check complete!');
