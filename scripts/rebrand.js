#!/usr/bin/env node
/**
 * Axobase Rebranding Script
 * 
 * Performs global replacements:
 * - Axobase → Axobase
 * - axo → axo
 * - AXO_ → AXO_
 * - etc.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');

const REPLACEMENTS = [
  // Brand names
  { from: /Axobase/g, to: 'Axobase' },
  { from: /axobase/gi, to: 'axobase' },
  
  // Class names
  { from: /AxoRegistry/g, to: 'AxoRegistry' },
  { from: /AxoBreedingFund/g, to: 'AxoBreedingFund' },
  { from: /AxoTombstoneNFT/g, to: 'AxoTombstoneNFT' },
  { from: /AxoEvolutionPressure/g, to: 'AxoEvolutionPressure' },
  { from: /AxoMemoryAnchor/g, to: 'AxoMemoryAnchor' },
  { from: /AxoRite/g, to: 'AxoRite' },
  
  // Variable prefixes
  { from: /AXO_/g, to: 'AXO_' },
  { from: /axo_/g, to: 'axo_' },
  
  // CLI and commands (preserve inside URLs/paths)
  { from: /\bferal\b/g, to: 'axo' },
  
  // Comments and strings
  { from: /axo-bot/g, to: 'axo-bot' },
  { from: /axo bots/gi, to: 'axo bots' },
];

const EXCLUDE_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'artifacts',
  'cache',
  'coverage',
];

const INCLUDE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.sol',
  '.json',
  '.md',
  '.yml',
  '.yaml',
  '.sh',
  '.toml',
];

async function shouldProcessFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!INCLUDE_EXTENSIONS.includes(ext)) return false;
  
  // Check if in excluded directory
  const parts = filePath.split(path.sep);
  for (const part of parts) {
    if (EXCLUDE_DIRS.includes(part)) return false;
  }
  
  return true;
}

async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    let newContent = content;
    let modified = false;
    
    for (const { from, to } of REPLACEMENTS) {
      if (from.test(newContent)) {
        newContent = newContent.replace(from, to);
        modified = true;
      }
    }
    
    if (modified) {
      await fs.writeFile(filePath, newContent, 'utf8');
      console.log(`✅ ${path.relative(ROOT_DIR, filePath)}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

async function walkDir(dir, callback) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(entry.name)) {
        await walkDir(fullPath, callback);
      }
    } else {
      await callback(fullPath);
    }
  }
}

async function renameFiles() {
  const renames = [
    { from: 'src/cli/axo.ts', to: 'src/cli/axo.ts' },
    { from: 'deploy/akash/axo-bot.yaml', to: 'deploy/akash/axo-bot.yaml' },
  ];
  
  for (const { from, to } of renames) {
    const fromPath = path.join(ROOT_DIR, from);
    const toPath = path.join(ROOT_DIR, to);
    
    try {
      await fs.access(fromPath);
      await fs.rename(fromPath, toPath);
      console.log(`📝 Renamed: ${from} → ${to}`);
    } catch (error) {
      // File may not exist, that's ok
    }
  }
}

async function main() {
  console.log('🅰️  Axobase Rebranding Script');
  console.log('═══════════════════════════════════════');
  console.log('');
  
  let processedCount = 0;
  let modifiedCount = 0;
  
  await walkDir(ROOT_DIR, async (filePath) => {
    if (await shouldProcessFile(filePath)) {
      processedCount++;
      const modified = await processFile(filePath);
      if (modified) modifiedCount++;
    }
  });
  
  console.log('');
  console.log('📝 Renaming files...');
  await renameFiles();
  
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('✨ Rebranding complete!');
  console.log(`   Files processed: ${processedCount}`);
  console.log(`   Files modified: ${modifiedCount}`);
  console.log('═══════════════════════════════════════');
}

main().catch(console.error);
