const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'dist');

const copyDir = (from, to) => {
  if (!fs.existsSync(from)) {
    throw new Error(`Build output not found: ${from}`);
  }

  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
};

fs.rmSync(outputDir, { recursive: true, force: true });

copyDir(path.join(root, 'user', 'dist'), outputDir);
copyDir(path.join(root, 'admin', 'dist'), path.join(outputDir, 'admin'));
copyDir(path.join(root, 'officer', 'dist'), path.join(outputDir, 'officer'));

console.log('Prepared Vercel static output in dist/');
