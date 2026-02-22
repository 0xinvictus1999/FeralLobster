#!/usr/bin/env node
/**
 * Feral CLI - Command Line Interface for FeralLobster
 * 
 * Commands:
 * - export: Export and encrypt Clawdbot memory
 * - deploy: Deploy bot to Akash (birth ritual)
 * - monitor: Monitor bot status
 * - resurrect: Resurrect dead bot
 * - lineage: Display family tree
 */

import { Command } from 'commander';
import * as fs from 'fs/promises';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { MemoryExporter } from '../memory/Export.js';
import { MemoryImporter } from '../memory/Import.js';
import { MemoryBlender } from '../memory/Blend.js';
import { ArweaveInscriber } from '../memory/Inscribe.js';
import { WalletManager } from '../wallet/WalletManager.js';
import { HDWallet } from '../wallet/HDWallet.js';
import { BirthRitualManager } from '../lifecycle/Birth.js';
import { SurvivalManager } from '../lifecycle/Survival.js';
import { DeathManager } from '../lifecycle/Death.js';
import { ReincarnationManager } from '../lifecycle/Reincarnation.js';
import { EvolutionManager } from '../lifecycle/Evolution.js';
import { AkashClient } from '../network/AkashClient.js';
import { X402Client } from '../network/X402Client.js';
import { P2PNetwork } from '../network/P2P.js';
import { GPGVault } from '../security/GPGVault.js';

dotenvConfig();

const program = new Command();

program
  .name('feral')
  .description('FeralLobster - AI Digital Life Autonomous Evolution Platform')
  .version('1.0.0');

// Export command
program
  .command('export')
  .description('Export and encrypt Clawdbot memory')
  .requiredOption('--agent <name>', 'Agent name to export')
  .option('-o, --output <path>', 'Output directory', './exports')
  .option('--no-encrypt', 'Skip encryption (not recommended)')
  .option('--force', 'Force re-export even if already exported')
  .action(async (options) => {
    try {
      console.log('🔐 FeralLobster Memory Export');
      console.log('═══════════════════════════════');

      const exporter = new MemoryExporter();
      const result = await exporter.export({
        agent: options.agent,
        output: options.output,
        encrypt: options.encrypt,
        force: options.force,
      });

      console.log('\n✅ Export successful!');
      console.log(`Gene Hash: ${result.geneHash}`);
      console.log(`File: ${result.encryptedPath}`);
      console.log(`Size: ${result.originalSize} bytes (${result.encryptedSize} encrypted)`);
      console.log(`Fingerprint: ${result.fingerprint || 'N/A'}`);

      // Save export manifest
      const manifestPath = path.join(options.output, 'export-manifest.json');
      await fs.writeFile(manifestPath, JSON.stringify(result, null, 2));
      console.log(`\nManifest saved to: ${manifestPath}`);
    } catch (error) {
      console.error('\n❌ Export failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Deploy command
program
  .command('deploy')
  .description('Execute birth ritual and deploy to Akash')
  .argument('<memory>', 'Path to encrypted memory file (.asc)')
  .option('-m, --msa <amount>', 'Minimum Survival Allowance in USDC', '5')
  .option('-n, --network <name>', 'Network (base/baseSepolia)', 'baseSepolia')
  .option('--dry-run', 'Simulate without actual deployment')
  .action(async (memoryPath, options) => {
    try {
      console.log('🦞 FeralLobster Birth Ritual');
      console.log('═══════════════════════════════');

      // Validate memory file
      await fs.access(memoryPath);

      // Initialize components
      const walletManager = new WalletManager({
        network: options.network,
        masterSeedPhrase: process.env.MASTER_SEED_PHRASE || HDWallet.generateSeedPhrase(),
      });

      const akashClient = new AkashClient({
        mnemonic: process.env.AKASH_MNEMONIC || '',
      });

      const inscriber = new ArweaveInscriber({
        arweaveKeyFile: process.env.ARWEAVE_KEY_FILE,
      });

      const birthManager = new BirthRitualManager(
        walletManager,
        akashClient,
        inscriber,
        null as any // Registry contract
      );

      if (options.dryRun) {
        console.log('📝 DRY RUN - No actual deployment');
        console.log(`Memory: ${memoryPath}`);
        console.log(`MSA: ${options.msa} USDC`);
        console.log(`Network: ${options.network}`);
        return;
      }

      // Perform birth ritual
      const result = await birthManager.performRitual(
        memoryPath,
        options.msa as Hex
      );

      console.log('\n✅ Birth ritual complete!');
      console.log(`Wallet: ${result.walletAddress}`);
      console.log(`DSEQ: ${result.dseq}`);
      console.log(`URI: ${result.uri}`);
      console.log(`Arweave: ${result.arweaveTx}`);

      // Save birth certificate
      const certPath = path.join('./', `birth-${result.geneHash.slice(0, 16)}.json`);
      await fs.writeFile(certPath, JSON.stringify(result, null, 2));
      console.log(`\nBirth certificate saved: ${certPath}`);
    } catch (error) {
      console.error('\n❌ Deployment failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Monitor command
program
  .command('monitor')
  .description('Monitor bot status')
  .argument('<dseq>', 'Akash deployment sequence')
  .option('-f, --follow', 'Continuous monitoring')
  .option('-i, --interval <seconds>', 'Check interval', '60')
  .action(async (dseq, options) => {
    try {
      console.log('📊 FeralLobster Bot Monitor');
      console.log('═══════════════════════════════');
      console.log(`DSEQ: ${dseq}`);

      const akashClient = new AkashClient({
        mnemonic: process.env.AKASH_MNEMONIC || '',
      });

      const checkStatus = async () => {
        const status = await akashClient.monitorDeployment(dseq);

        console.clear();
        console.log('📊 FeralLobster Bot Monitor');
        console.log('═══════════════════════════════');
        console.log(`DSEQ: ${dseq}`);
        console.log(`State: ${status.state}`);
        console.log(`Healthy: ${status.healthy ? '✅' : '❌'}`);
        console.log(`URI: ${status.uri || 'N/A'}`);
        console.log(`Last check: ${new Date().toISOString()}`);
      };

      await checkStatus();

      if (options.follow) {
        console.log('\n👀 Following (Ctrl+C to exit)...');
        setInterval(checkStatus, parseInt(options.interval) * 1000);
      }
    } catch (error) {
      console.error('\n❌ Monitor failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Resurrect command
program
  .command('resurrect')
  .description('Resurrect a dead bot from tombstone')
  .argument('<tombstoneId>', 'Tombstone NFT token ID')
  .option('-o, --offering <amount>', 'Resurrection offering in USDC', '10')
  .option('-n, --network <name>', 'Network', 'baseSepolia')
  .action(async (tombstoneId, options) => {
    try {
      console.log('🔥 FeralLobster Resurrection Ritual');
      console.log('════════════════════════════════════');

      const walletManager = new WalletManager({
        network: options.network,
        masterSeedPhrase: process.env.MASTER_SEED_PHRASE || '',
      });

      const akashClient = new AkashClient({
        mnemonic: process.env.AKASH_MNEMONIC || '',
      });

      const inscriber = new ArweaveInscriber();

      const reincarnationManager = new ReincarnationManager(
        walletManager,
        akashClient,
        inscriber,
        null as any, // Registry
        null as any  // TombstoneNFT
      );

      console.log(`Tombstone ID: ${tombstoneId}`);
      console.log(`Offering: ${options.offering} USDC`);
      console.log('\nPerforming resurrection ritual...\n');

      const result = await reincarnationManager.resurrect(
        BigInt(tombstoneId),
        '0x0' as Hex // Would get from payment
      );

      console.log('\n✅ Resurrection complete!');
      console.log(`New Gene Hash: ${result.newGeneHash}`);
      console.log(`New Wallet: ${result.newWalletAddress}`);
      console.log(`New DSEQ: ${result.newDseq}`);
      console.log(`Memory preserved: ${result.memoryPreserved ? '✅' : '❌'}`);

      // Save resurrection certificate
      const certPath = path.join('./', `resurrection-${tombstoneId}.json`);
      await fs.writeFile(certPath, JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('\n❌ Resurrection failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Lineage command
program
  .command('lineage')
  .description('Display family tree for a bot')
  .argument('<geneHash>', 'Bot gene hash')
  .option('-d, --depth <number>', 'Search depth', '3')
  .option('-f, --format <format>', 'Output format (tree/json/dot)', 'tree')
  .action(async (geneHash, options) => {
    try {
      console.log('🌳 FeralLobster Lineage');
      console.log('═══════════════════════════');
      console.log(`Gene Hash: ${geneHash}`);
      console.log(`Depth: ${options.depth}`);
      console.log();

      // This would query the registry for lineage data
      // For now, display placeholder

      if (options.format === 'tree') {
        console.log('Generation 0: Genesis');
        console.log('  └── Generation 1: Parent A');
        console.log('      └── Generation 2: Target Bot');
        console.log();
        console.log('Use --format json for machine-readable output');
      } else if (options.format === 'json') {
        const lineage = {
          geneHash,
          depth: parseInt(options.depth),
          parents: [],
          children: [],
          siblings: [],
        };
        console.log(JSON.stringify(lineage, null, 2));
      }
    } catch (error) {
      console.error('\n❌ Lineage query failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize FeralLobster configuration')
  .action(async () => {
    try {
      console.log('🔧 FeralLobster Initialization');
      console.log('═════════════════════════════════');

      // Check for .env file
      const envPath = path.join(process.cwd(), '.env');
      try {
        await fs.access(envPath);
        console.log('✅ .env file exists');
      } catch {
        console.log('Creating .env file from template...');
        const envExample = await fs.readFile('.env.example', 'utf8');
        await fs.writeFile(envPath, envExample);
        console.log('✅ Created .env file');
      }

      // Generate GPG keys if needed
      console.log('\nGenerate GPG keys for memory encryption?');
      console.log('Run: gpg --full-generate-key');

      console.log('\n✅ Initialization complete!');
      console.log('Next steps:');
      console.log('1. Edit .env with your configuration');
      console.log('2. Export your Clawdbot memory: feral export --agent=<name>');
      console.log('3. Deploy: feral deploy <memory.asc>');
    } catch (error) {
      console.error('\n❌ Initialization failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse();

// Show help if no command
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
