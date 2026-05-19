const fs = require('fs');
const path = require('path');

const domains = [
    'products', 'quotes', 'intelligence', 'auth', 'bi', 'crm', 
    'kit-builder', 'mockup', 'favorites', 'comparison', 'common', 'admin'
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            if (file.name !== 'node_modules' && file.name !== '.git') {
                processDirectory(fullPath);
            }
        } else if (file.name.endsWith('.ts') || file.name.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;

            for (const domain of domains) {
                const regex = new RegExp(`(['"])@/hooks/${domain}([A-Z][a-zA-Z]*)(['"])`, 'g');
                if (content.match(regex)) {
                    content = content.replace(regex, `$1@/hooks/${domain}$3`);
                    changed = true;
                }
            }

            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log(`Cleaned up imports in ${fullPath}`);
            }
        }
    }
}

processDirectory(path.join(process.cwd(), 'src'));


