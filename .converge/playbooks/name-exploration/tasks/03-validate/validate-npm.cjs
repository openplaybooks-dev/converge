const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const INPUT = 'artifacts/name-exploration/all-candidates.json';
const OUTPUT = 'artifacts/name-exploration/validated-candidates.json';

function npmView(pkg) {
  return new Promise((resolve) => {
    exec(`npm view ${pkg} 2>&1`, { timeout: 15000 }, (err, stdout) => {
      if (err || stdout.includes('E404') || stdout.includes('code E404') || stdout.includes('404 Not Found')) {
        // Check for unpublished packages
        if (stdout.includes('Unpublished')) {
          resolve({ available: true, note: `Unpublished — name can be claimed (${stdout.trim().substring(0, 100)})` });
        } else {
          resolve({ available: true, note: 'E404 — not found' });
        }
      } else if (stdout.includes('429')) {
        resolve({ available: null, note: 'Rate limited (429)' });
      } else {
        // Package exists — extract version and date if possible
        const version = stdout.match(/latest:\s*['"]?([\d.]+)/);
        resolve({ available: false, note: version ? `Taken (v${version[1]})` : 'Taken' });
      }
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const candidates = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  console.log(`Loaded ${candidates.length} candidates from ${INPUT}`);

  let availablePackage = 0;
  let availableScope = 0;
  let availableBoth = 0;
  let errors = 0;

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const name = c.name;

    // Validate name — skip obviously invalid npm package names
    const validName = /^[a-zA-Z0-9._-]+$/.test(name) && name.length <= 214;
    if (!validName) {
      c.available = false;
      c.error = 'invalid_name';
      errors++;
      console.log(`  [${i + 1}/${candidates.length}] ${name} → INVALID NAME`);
      continue;
    }

    // Check unscoped package
    const pkgResult = await npmView(name);

    // Check scoped package
    const scopeResult = await npmView(`@${name}/core`);

    const packageAvailable = pkgResult.available;
    const scopeAvailable = scopeResult.available;

    // overall: available only if BOTH package and scope are available
    const overall = (packageAvailable === true && scopeAvailable === true);

    c.available = overall;
    c.npm_check = {
      package_available: packageAvailable,
      scope_available: scopeAvailable,
      package_note: pkgResult.note,
      scope_note: scopeResult.note,
    };

    if (packageAvailable === null || scopeAvailable === null) {
      c.available = null;
      c.error = c.error || 'network_error';
      errors++;
    }

    if (packageAvailable === true) availablePackage++;
    if (scopeAvailable === true) availableScope++;
    if (overall) availableBoth++;

    const status = overall ? '✓' : (packageAvailable === false && scopeAvailable === false ? '✗ both' : (packageAvailable === false ? '✗ pkg' : '✗ scope'));
    console.log(`  [${i + 1}/${candidates.length}] ${name} → ${status}`);

    // Rate limiting: 200ms between checks (but we already check pkg + scope, so 200ms per candidate pair)
    if (i < candidates.length - 1) {
      await sleep(200);
    }
  }

  // Summary
  console.log('\nSummary:');
  console.log(`  Total checked: ${candidates.length}`);
  console.log(`  Available (package): ${availablePackage}`);
  console.log(`  Available (scope): ${availableScope}`);
  console.log(`  Available (both): ${availableBoth}`);
  console.log(`  Errors: ${errors}`);

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(candidates, null, 2));
  console.log(`\nWrote ${candidates.length} candidates to ${OUTPUT}`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
