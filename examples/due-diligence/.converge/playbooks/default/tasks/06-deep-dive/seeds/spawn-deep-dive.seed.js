import { join, dirname } from 'path';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function run(ctx) {
  const artifactsRoot = '.converge/artifacts/due-diligence';
  const company = ctx.vars.company || 'Unknown';

  const siteDataPath = join(ctx.projectDir, artifactsRoot, 'company-site', 'site-data.json');
  const secDataPath = join(ctx.projectDir, artifactsRoot, 'sec-edgar', 'sec-data.json');
  const peopleDataPath = join(ctx.projectDir, artifactsRoot, 'glassdoor', 'people-data.json');
  const newsDataPath = join(ctx.projectDir, artifactsRoot, 'news-search', 'news-data.json');
  const historyDataPath = join(ctx.projectDir, artifactsRoot, 'wayback', 'history-data.json');

  // Ensure output directories exist
  const deepDiveRoot = join(ctx.projectDir, artifactsRoot, 'deep-dive');
  for (const dir of ['executives', 'products', 'risks', 'legal']) {
    const p = join(deepDiveRoot, dir);
    if (!existsSync(p)) mkdirSync(p, { recursive: true });
  }

  // --- Read Phase 1 outputs ---

  let siteData = null;
  if (existsSync(siteDataPath)) {
    try { siteData = JSON.parse(readFileSync(siteDataPath, 'utf-8')); }
    catch (e) { ctx.log.warn('Failed to parse site-data.json: ' + e.message); }
  }

  let secData = null;
  if (existsSync(secDataPath)) {
    try { secData = JSON.parse(readFileSync(secDataPath, 'utf-8')); }
    catch (e) { ctx.log.warn('Failed to parse sec-data.json: ' + e.message); }
  }

  let peopleData = null;
  if (existsSync(peopleDataPath)) {
    try { peopleData = JSON.parse(readFileSync(peopleDataPath, 'utf-8')); }
    catch (e) { ctx.log.warn('Failed to parse people-data.json: ' + e.message); }
  }

  let newsData = null;
  if (existsSync(newsDataPath)) {
    try { newsData = JSON.parse(readFileSync(newsDataPath, 'utf-8')); }
    catch (e) { ctx.log.warn('Failed to parse news-data.json: ' + e.message); }
  }

  let historyData = null;
  if (existsSync(historyDataPath)) {
    try { historyData = JSON.parse(readFileSync(historyDataPath, 'utf-8')); }
    catch (e) { ctx.log.warn('Failed to parse history-data.json: ' + e.message); }
  }

  let spawnedCount = 0;

  // --- Spawn executive background checks ---

  if (siteData && Array.isArray(siteData.leadership) && siteData.leadership.length > 0) {
    ctx.log.info(`Found ${siteData.leadership.length} executives — spawning background checks`);

    for (const exec of siteData.leadership.slice(0, 8)) {
      if (!exec.name) continue;
      const nameSlug = exec.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      await ctx.spawn({
        id: `exec-${nameSlug}`,
        title: `Background Check: ${exec.name} (${exec.title || 'Unknown Role'})`,
        skill: 'browser-background-check',
        outputs: [`${artifactsRoot}/deep-dive/executives/${nameSlug}.json`],
        vars: {
          executiveName: exec.name,
          currentCompany: company,
          currentTitle: exec.title || 'Unknown',
          artifactsRoot: `${artifactsRoot}/deep-dive`,
        },
        checks: [
          {
            id: `exec-${nameSlug}-output`,
            cmd: `test -f ${artifactsRoot}/deep-dive/executives/${nameSlug}.json`,
            description: `Executive report for ${exec.name} exists`
          },
          {
            id: `exec-${nameSlug}-valid`,
            cmd: `node -e "const d=JSON.parse(require('fs').readFileSync('${artifactsRoot}/deep-dive/executives/${nameSlug}.json','utf-8')); if(!d.name) throw new Error('Missing name'); if(!Array.isArray(d.previousRoles)) throw new Error('previousRoles must be array')"`,
            description: `Executive report for ${exec.name} is valid`
          },
        ],
        body: `# Background Check: ${exec.name}

Research ${exec.name}, ${exec.currentTitle || 'executive'} at ${company}.

## Research Steps

1. Search Google News for "${exec.name} ${company}" — extract career history, past companies, notable achievements
2. Search for "${exec.name} controversy lawsuit" — check for any negative news, lawsuits, or regulatory actions
3. Search for "${exec.name} board" — check for board positions at other companies
4. Take a screenshot of search results as evidence

## Output

Write \`${artifactsRoot}/deep-dive/executives/${nameSlug}.json\` with the full executive profile following the browser-background-check skill schema.`,
      });
      spawnedCount++;
    }
  }

  // --- Spawn product analysis tasks ---

  if (siteData && Array.isArray(siteData.products) && siteData.products.length > 0) {
    ctx.log.info(`Found ${siteData.products.length} products — spawning product analysis`);

    for (const product of siteData.products.slice(0, 5)) {
      if (!product.name) continue;
      const productSlug = product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      await ctx.spawn({
        id: `product-${productSlug}`,
        title: `Product Analysis: ${product.name}`,
        outputs: [`${artifactsRoot}/deep-dive/products/${productSlug}.json`],
        vars: {
          productName: product.name,
          company,
          artifactsRoot: `${artifactsRoot}/deep-dive`,
        },
        checks: [
          {
            id: `product-${productSlug}-output`,
            cmd: `test -f ${artifactsRoot}/deep-dive/products/${productSlug}.json`,
            description: `Product analysis for ${product.name} exists`
          },
        ],
        body: `# Product Analysis: ${product.name}

Research ${product.name}, a product by ${company}.

## Research Steps

1. Search for "${company} ${product.name} review" — find reviews, ratings, user feedback
2. Search for "${product.name} vs" — find competitor comparisons
3. Search for "${product.name} pricing" — find pricing information
4. Take screenshots of key findings

## Output

Write \`${artifactsRoot}/deep-dive/products/${productSlug}.json\`:
\`\`\`json
{
  "product": "${product.name}",
  "company": "${company}",
  "researchDate": "<ISO 8601>",
  "reviews": [{"source": "string", "rating": "string", "summary": "string"}],
  "competitors": [{"name": "string", "comparison": "string"}],
  "pricing": "string or null",
  "marketPosition": "string",
  "screenshotPath": "string"
}
\`\`\``,
      });
      spawnedCount++;
    }
  }

  // --- Spawn risk deep-dive tasks ---

  if (secData && secData.publicCompany !== false &&
      secData.latest10K && Array.isArray(secData.latest10K.riskFactors) &&
      secData.latest10K.riskFactors.length > 0) {

    // Only spawn for high-severity risks
    const highRisks = secData.latest10K.riskFactors
      .filter(r => r.severity === 'high')
      .slice(0, 5);

    if (highRisks.length > 0) {
      ctx.log.info(`Found ${highRisks.length} high-severity risk factors — spawning risk deep-dives`);

      for (const risk of highRisks) {
        const riskSlug = risk.heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

        await ctx.spawn({
          id: `risk-${riskSlug}`,
          title: `Risk Deep-Dive: ${risk.heading.slice(0, 80)}`,
          outputs: [`${artifactsRoot}/deep-dive/risks/${riskSlug}.json`],
          vars: {
            riskHeading: risk.heading,
            riskSummary: risk.summary,
            company,
            artifactsRoot: `${artifactsRoot}/deep-dive`,
          },
          checks: [
            {
              id: `risk-${riskSlug}-output`,
              cmd: `test -f ${artifactsRoot}/deep-dive/risks/${riskSlug}.json`,
              description: `Risk report for "${risk.heading.slice(0, 50)}" exists`
            },
          ],
          body: `# Risk Deep-Dive: ${risk.heading}

Research the risk factor "${risk.heading}" for ${company}.

**Context from 10-K**: ${risk.summary}

## Research Steps

1. Search Google News for "${company} ${risk.heading}" — find any related news or events
2. Search for industry context on this risk — is it common across the industry or unique to the company?
3. Assess whether there is evidence this risk has materialized (past events, near misses)
4. Take screenshots of key findings

## Output

Write \`${artifactsRoot}/deep-dive/risks/${riskSlug}.json\`:
\`\`\`json
{
  "riskHeading": "${risk.heading.replace(/"/g, '\\"')}",
  "company": "${company}",
  "researchDate": "<ISO 8601>",
  "materializedEvidence": ["string (past events where this risk materialized)"],
  "industryPrevalence": "common|uncommon|unique-to-company",
  "relatedNews": [{"headline": "string", "date": "string", "url": "string"}],
  "assessment": "string",
  "severityAdjustment": "same|elevated|reduced (whether research suggests adjusting the 10-K severity)",
  "screenshotPath": "string"
}
\`\`\``,
        });
        spawnedCount++;
      }
    }
  }

  // --- Spawn legal check tasks ---

  if (secData && secData.publicCompany !== false &&
      secData.latest10K && Array.isArray(secData.latest10K.legalProceedings) &&
      secData.latest10K.legalProceedings.length > 0) {

    ctx.log.info(`Found ${secData.latest10K.legalProceedings.length} legal proceedings — spawning legal checks`);

    for (const legal of secData.latest10K.legalProceedings.slice(0, 5)) {
      const legalSlug = legal.description.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);

      await ctx.spawn({
        id: `legal-${legalSlug}`,
        title: `Legal Check: ${legal.description.slice(0, 80)}`,
        skill: 'browser-legal-check',
        outputs: [`${artifactsRoot}/deep-dive/legal/${legalSlug}.json`],
        vars: {
          company,
          legalItem: legal.description,
          artifactsRoot: `${artifactsRoot}/deep-dive`,
        },
        checks: [
          {
            id: `legal-${legalSlug}-output`,
            cmd: `test -f ${artifactsRoot}/deep-dive/legal/${legalSlug}.json`,
            description: `Legal report for "${legal.description.slice(0, 50)}" exists`
          },
        ],
        body: `# Legal Check: ${legal.description}

Research the legal proceeding "${legal.description}" for ${company}.

## Research Steps

1. Search Google News for "${company} ${legal.description}"
2. Check SEC enforcement actions if relevant
3. Search for court records if case is in a public database
4. Assess materiality and potential impact
5. Take screenshots of key findings

## Output

Write \`${artifactsRoot}/deep-dive/legal/${legalSlug}.json\` following the browser-legal-check skill schema.`,
      });
      spawnedCount++;
    }
  }

  // --- Write spawn manifest ---

  const manifest = {
    company,
    timestamp: new Date().toISOString(),
    spawnedCount,
    categories: {
      executives: siteData?.leadership?.length || 0,
      products: siteData?.products?.length || 0,
      risks: secData?.latest10K?.riskFactors?.filter(r => r.severity === 'high').length || 0,
      legal: secData?.latest10K?.legalProceedings?.length || 0,
    },
    sourcesAvailable: {
      siteData: !!siteData,
      secData: !!(secData && secData.publicCompany !== false),
      peopleData: !!peopleData,
      newsData: !!newsData,
      historyData: !!historyData,
    },
  };

  writeFileSync(join(deepDiveRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
  ctx.log.info(`Deep dive complete: spawned ${spawnedCount} subtasks across ${Object.values(manifest.categories).filter(v => v > 0).length} categories`);
}
