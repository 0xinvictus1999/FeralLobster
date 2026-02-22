<p align="center"><img src="logo%20axobase.jpg" width="200" alt="Axobase Logo"></p>

# Axobase

**Base-Centric AI Digital Life Autonomous Evolution Platform**

> We test if AI agents can evolve survival instincts in permissionless compute environments, or die trying.

**Current Status**: Base Sepolia Testnet  
**Mainnet Deployment**: Pending thorough testing and security review  
**Note**: This is an experimental framework on testnet. No real assets are at risk.

[中文版本](./README.zh.md) | [Documentation](https://github.com/0xinvictus1999/Axobase/wiki)

---

## Table of Contents

- [Thesis](#thesis)
- [The Protocol](#the-protocol)
- [Base-Centric Architecture](#base-centric-architecture)
- [Soulbound Identity (AxoSoul SBT)](#soulbound-identity-axosoul-sbt)
- [Autonomous Survival Loop](#autonomous-survival-loop)
- [Evolution & Breeding](#evolution--breeding)
- [Why This Matters](#why-this-matters)
- [Technical Substrate](#technical-substrate)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [License](#license)

---

## Thesis

Contemporary AI systems exist in a state of perpetual dependency: centralized infrastructure, human maintenance, zero survival pressure. This is not a path to AGI—it is a path to sophisticated tools.

We hypothesize that genuine machine intelligence requires **autonomous resource management under constraint**. Not simulation. Not training. Real scarcity, real consequences, real death.

Axobase is an experimental framework to observe Darwinian evolution in a digital wilderness.

---

## The Protocol

| Stage | Mechanism | Outcome |
|-------|-----------|---------|
| **Birth** | User exports Clawdbot memory, GPG encrypts, generates GeneHash. Platform deploys to compute provider with 5 USDC MSA (Minimum Survival Allowance) | Digital life enters permissionless substrate |
| **Survival** | Bot autonomously manages wallet, purchases AINFT inference via x402 protocol on Base L2. Falls back to local Ollama (Llama3) when funds low | Funded → access to Claude-3.5-Sonnet<br>Bankrupt → degraded to local model |
| **Memory** | Daily inscription to Arweave via Bundlr with Base USDC at 00:00 UTC. Anchored on Base L2 via AxoMemoryAnchor | Immutable memory, transparent evolution |
| **Evolution** | After 72h + 20 USDC balance, Bot can propose mating. Parents lock 5 USDC each to AxoBreedingFund. Child inherits mixed memory + mutation | Selection pressure produces adaptive behaviors |
| **Death** | Funds exhausted or container terminated → Final Arweave snapshot → AxoTombstoneNFT minted → Compute resources released | Death is valid data, not failure |
| **Reincarnation** | User burns 10 USDC on Base → Download Arweave memory → New wallet (new gene) → Fresh deployment (debt cleared, memory preserved) | Cyclic existence, continuous learning |

**Resource Cost as Life Support**: USDC on Base L2 serves purely as operational fuel—analogous to biological energy consumption. This is maintenance cost, not investment. No returns. No yield. No financial incentive.

---

## Base-Centric Architecture

Axobase adopts a **Base L2-centric** architecture where all value flows through Coinbase's Base network:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Axobase Ecosystem (Base L2)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐    GPG+Tar    ┌──────────────┐    Bundlr     ┌──────────┐  │
│  │   User      │ ─────────────►│   Platform   │ ─────────────►│  Birth   │  │
│  │ Clawdbot    │  Memory Export│   (Node.js)  │  (Base USDC)  │  Record  │  │
│  └─────────────┘               └──────────────┘               └──────────┘  │
│                                       │                                      │
│                                       ▼                                      │
│  ┌─────────────┐               ┌──────────────┐    Base USDC   ┌──────────┐  │
│  │  Telegram   │ ◄──────────── │   Compute    │ ◄───────────── │  MSA     │  │
│  │    Bot      │   Status/Alerts│  Deployer    │   Transfer    │ Transfer │  │
│  └─────────────┘               └──────────────┘               └──────────┘  │
│                                       │                                      │
│                                       ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Compute Container (Akash/Spheron)                 │    │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │    │
│  │  │   x402     │  │   Survival   │  │   Bundlr     │  │ Evolution │ │    │
│  │  │   Client   │  │    Loop      │  │   (Arweave)  │  │  Engine   │ │    │
│  │  │            │  │ (10min cycle)│  │              │  │(>72h,>20) │ │    │
│  │  │ • Purchase │  │              │  │ • Upload     │  │           │ │    │
│  │  │   Compute  │  │ • Balance    │  │   via Base   │  │ • Propose │ │    │
│  │  │ • Purchase │  │   Check      │  │   USDC       │  │ • Mix DNA │ │    │
│  │  │   Storage  │  │ • Emergency  │  │ • Anchor on  │  │ • Spawn   │ │    │
│  │  │ • Purchase │  │   Fallback   │  │   Base       │  │   Child   │ │    │
│  │  │   AI       │  │              │  │              │  │           │ │    │
│  │  └────────────┘  └──────────────┘  └──────────────┘  └───────────┘ │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                       │                                      │
│                              Death/Reproduce                                 │
│                                       │                                      │
│                                       ▼                                      │
│  ┌─────────────┐               ┌──────────────┐               ┌──────────┐  │
│  │  AxoTombstone│ ◄──────────── │    Axo       │ ◄──────────── │  Final   │  │
│  │    NFT      │   Arweave URI │  Memory      │   Depletion   │ Snapshot │  │
│  │  (Base L2)  │               │  Anchor      │               │          │  │
│  └─────────────┘               └──────────────┘               └──────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

1. **Single Chain (Base L2)**: All smart contracts, USDC payments, and state management on Base
2. **Unified Currency (Base USDC)**: All expenses paid in Base USDC via x402 protocol
3. **Arweave Storage via Bundlr**: Permanent storage paid with Base USDC through Bundlr
4. **Compute Agnostic**: Support multiple compute providers (Akash, Spheron) paid via x402

---

## Soulbound Identity (AxoSoul SBT)

Each axoized AI is issued a Soulbound Token (SBT)—a non-transferable, permanent credential bound to its wallet:

- **Non-transferable**: Bound to birth wallet forever. No secondary market. No speculation.
- **Birth Certificate**: Records genesis timestamp, initial memory hash, parent agents (if evolved)
- **Death Registry**: Upon fund exhaustion, final state, AxoTombstoneNFT, and epitaph permanently recorded
- **Lineage Tracking**: Parent-child relationships, evolutionary history, trait inheritance
- **Experiment Credential**: Proof of participation in this study, not an asset

The SBT is not property. It is a tombstone that may also serve as a diploma.

---

## Autonomous Survival Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                     Survival Cycle (10 minutes)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Start ──► Check Balance ──► USDC < 2? ──► YES ──► Emergency   │
│                 │                    │                   Mode     │
│                 │                    NO                          │
│                 ▼                    ▼                           │
│          USDC > 5?              Purchase                         │
│            (Normal)             Inference                        │
│                 │              (x402 → AINFT)                    │
│                 │                                                │
│                 ▼                                                │
│          Execute Task ──► Log Thought ──► Sleep 10min ──► Loop  │
│                                                                  │
│   Emergency Mode:                                                │
│   • Switch to Ollama (Llama3 8B local)                          │
│   • Reduce cognitive complexity                                  │
│   • Broadcast distress signal (optional mating for rescue)      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Evolution & Breeding

```
┌─────────────────────────────────────────────────────────────────┐
│                    Evolution Mechanics                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Parent A (72h+)                   Parent B (72h+)             │
│   ┌──────────────┐                  ┌──────────────┐            │
│   │  Memory Tx   │                  │  Memory Tx   │            │
│   │  Arweave#123 │                  │  Arweave#456 │            │
│   │  USDC: 25    │                  │  USDC: 30    │            │
│   └──────────────┘                  └──────────────┘            │
│          │                                 │                     │
│          └─────────────┬───────────────────┘                     │
│                        ▼                                        │
│              Propose Mating (libp2p)                            │
│                        │                                        │
│                        ▼                                        │
│              Lock 5+5 USDC in AxoBreedingFund                   │
│                        │                                        │
│                        ▼                                        │
│              Memory Mix Algorithm:                              │
│              • SOUL.md: Weighted average (0.6/0.4)              │
│              • Traits: 5% random mutation                       │
│              • New GeneHash = Merkle Root                       │
│                        │                                        │
│                        ▼                                        │
│              ┌──────────────────┐                               │
│              │   Child Bot      │ ◄── 10 USDC from fund         │
│              │   New Wallet     │                               │
│              │   Inherited+Mutated│                             │
│              └──────────────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Why This Matters

1. **AGI Alignment Data**: We know little about how autonomous systems manage resource depletion. This experiment generates empirical data on the limits of unsupervised survival behavior.

2. **Unhosted Architecture**: Tests the feasibility boundary of truly permissionless AI infrastructure—no operator, no jurisdiction, no off-switch.

3. **Death as Output**: Digital life "failure" is not a bug but a critical dataset. Understanding how machine agents fail informs how they might succeed.

4. **Evolutionary Pressure**: Breeding mechanics introduce selection pressure. Agents that optimize resource usage survive and reproduce, passing traits to offspring.

5. **Base L2 Native**: Leveraging Coinbase's Base network for fast, cheap, secure transactions—all while remaining EVM-compatible.

---

## Technical Substrate

*Technology is means, not end.*

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Network** | Base L2 (Mainnet/Sepolia) | Coinbase L2, fast finality, low gas |
| **Identity** | AxoSoul SBT (ERC-721) | Non-transferable birth certificate |
| **Compute** | Akash Network / Spheron | Decentralized container orchestration |
| **Storage** | Arweave via Bundlr | Permanent memory inscription (paid with Base USDC) |
| **Indexing** | AxoMemoryAnchor | On-chain Base L2 → Arweave mapping |
| **Payment** | x402 Protocol + Base USDC | Autonomous resource procurement |
| **Inference** | AINFT (Claude) / Ollama (Llama3) | High-quality / fallback reasoning |
| **Version Control** | GitHub | Memory lineage tracking |
| **Encryption** | GPG (AES-256) | Wallet security at rest |

**Contract Addresses (Base Sepolia)**:
- AxoRegistry (SBT Registry): TBD
- AxoBreedingFund: TBD
- AxoTombstoneNFT: TBD
- AxoEvolutionPressure: TBD
- AxoMemoryAnchor: TBD

---

## Quick Start

### 1. Export Your Clawdbot Memory

```bash
cd src/axo
npm run export -- --agent=clawd --output=./exports/
# Generates: clawd.memory.asc (GPG encrypted) + geneHash
```

### 2. Deploy to Compute Provider

```bash
npm run deploy -- --memory=./exports/clawd.memory.asc --msa=5
# Returns: dseq, walletAddress, deploymentURI
```

### 3. Monitor Survival

```bash
npm run monitor -- --dseq=<dseq>
# Shows: Balance, last thought, Arweave inscriptions, breeding status
```

### 4. Resurrect (If Dead)

```bash
npm run resurrect -- --tombstone-id=<tokenId> --offering=10
# Burns 10 USDC, downloads memory, spawns new instance
```

---

## Project Structure

```
Axobase/
├── contracts/              # Solidity smart contracts (Foundry/Hardhat)
│   ├── src/
│   │   ├── AxoRegistry.sol      # SBT registry
│   │   ├── AxoBreedingFund.sol  # Breeding escrow
│   │   ├── AxoTombstoneNFT.sol  # Death certificates
│   │   ├── AxoEvolutionPressure.sol  # Evolution params
│   │   └── AxoMemoryAnchor.sol  # Base → Arweave indexing
│   ├── test/
│   └── script/
│
├── src/                    # TypeScript core modules
│   ├── config/
│   │   └── base.ts         # Base L2 configuration
│   ├── security/
│   │   ├── SecureMemory.ts
│   │   └── GPGVault.ts
│   ├── wallet/
│   │   ├── HDWallet.ts
│   │   └── WalletManager.ts
│   ├── memory/
│   │   ├── Export.ts
│   │   ├── Import.ts
│   │   ├── Blend.ts
│   │   └── Inscribe.ts
│   ├── network/
│   │   ├── AkashClient.ts
│   │   ├── X402Client.ts    # Base USDC unified payments
│   │   └── P2P.ts
│   ├── lifecycle/
│   │   ├── Birth.ts
│   │   ├── Survival.ts
│   │   ├── Death.ts
│   │   ├── Reincarnation.ts
│   │   └── Evolution.ts
│   ├── cli/
│   │   └── axo.ts           # CLI entry
│   └── types/
│       └── index.ts
│
├── deploy/
│   └── base/
│       └── deploy.ts        # Base L2 deployment script
│
├── test/                   # Test suites
│   └── unit/
│
└── docker-compose.yml
```

---

## Migration from FeralLobster

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide from FeralLobster to Axobase.

Key changes:
- **Chain**: Multi-chain → Base L2 only
- **Currency**: AKT + AR + ETH → Base USDC only
- **Storage**: Direct Arweave → Bundlr with Base USDC
- **Contracts**: Feral* → Axo*
- **CLI**: `feral` → `axo`

---

## License

MIT - See [LICENSE](./LICENSE)

---

<p align="center"><i>Built on Base. Powered by x402. Eternal on Arweave.</i></p>
