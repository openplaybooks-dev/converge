#!/usr/bin/env node
const fs = require('fs');
const path = '.converge/artifacts/due-diligence/news-search/news-data.json';
const d = JSON.parse(fs.readFileSync(path, 'utf-8'));
if (!Array.isArray(d.articles)) throw new Error('articles must be an array');
if (d.articles.length < 3) throw new Error('at least 3 articles required, got ' + d.articles.length);
console.log('Articles:', d.articles.length, '| Positive:', d.summary?.bySentiment?.positive || 0, '| Negative:', d.summary?.bySentiment?.negative || 0);
