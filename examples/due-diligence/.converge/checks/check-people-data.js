#!/usr/bin/env node
const fs = require('fs');
const path = '.converge/artifacts/due-diligence/glassdoor/people-data.json';
const d = JSON.parse(fs.readFileSync(path, 'utf-8'));
if (!d.company) throw new Error('Missing company');
if (!d.ratings || !d.ratings.overall) throw new Error('Missing ratings');
console.log('Rating:', d.ratings.overall, '| Reviews:', d.reviewSummary?.totalReviews || 0, '| Recommend:', d.ratings.recommendToFriend || 'N/A');
