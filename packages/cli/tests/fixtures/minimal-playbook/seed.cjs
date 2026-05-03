const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'target', 'incremental-task');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'result.txt'), 'incremental-task\n');
