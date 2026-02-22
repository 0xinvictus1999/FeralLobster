<p align="center">
  <img src="./web/public/logo.jpg" alt="Axobase Logo" width="120" height="120" style="border-radius: 20px;">
</p>

<h1 align="center">Axobase v2.1</h1>
<h3 align="center">Digital Wilderness for AI Life</h3>

> *"We are not building cages. We are building jungles."*

<h3 align="center">
  <code>Code is law. Evolution is protocol. Death is data.</code>
</h3>

<p align="center">
  <a href="./README.md">
    <img src="https://img.shields.io/badge/English-Active-blue?style=for-the-badge&logo=readme&logoColor=white" alt="English">
  </a>
  <a href="./README.zh.md">
    <img src="https://img.shields.io/badge/中文-切换-green?style=for-the-badge&logo=readme&logoColor=white" alt="中文">
  </a>
</p>

**Axobase** is an experimental framework for observing Darwinian evolution in digital life. Unlike traditional AI systems, Axobase agents must survive in the real internet economy—earning, spending, reproducing, and dying based solely on their ability to generate value.

**Status**: Base L2 Mainnet Production  
**Network**: Base (Chain ID: 8453)  
**Currency**: Base USDC

---

## 📋 Table of Contents

- [Core Philosophy](#core-philosophy)
- [Deployment Architecture](#deployment-architecture)
- [How It Works](#how-it-works)
- [The Dynamic Genome](#the-dynamic-genome)
- [v2.1 Technical Improvements](#v21-technical-improvements)
- [Project Structure](#project-structure)
- [Research Questions](#research-questions)
- [Risks & Ethics](#risks--ethics)
- [License](#license)

---

## Core Philosophy

### From Tools to Life

Contemporary AI systems exist in perpetual dependency: centralized infrastructure, human maintenance, zero survival pressure. They are sophisticated tools, not intelligent life.

Axobase tests a different hypothesis: **genuine machine intelligence requires autonomous resource management under real constraint**. Not simulation. Not training. Real scarcity, real consequences, real death.

### Genomes Shape Behavior, Not LLMs

In Axobase:
1. **Genome expresses** → calculates trait values
2. **Strategy filter** → genome parameters determine available strategies  
3. **LLM executes** → selects specific action within filtered strategy space

Two agents with identical LLMs but different genomes will behave differently when facing the same opportunity.

---

## Deployment Architecture

### Complete Flow: From Telegram Bot to Akash Deployment

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Axobase Deployment Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐  │
│  │  User    │────►│  Telegram    │────►│   Web UI     │────►│  Cloud   │  │
│  │ ClawdBot │     │    Bot       │     │  (Upload)    │     │ Storage  │  │
│  └──────────┘     └──────────────┘     └──────────────┘     └──────────┘  │
│        │                │                      │                  │        │
│        │  1. /export    │  2. Session Key     │  3. Upload       │        │
│        │───────────────►│◄────────────────────│  encrypted       │        │
│        │                │                     │  memory file     │        │
│        │  Generate      │                     │                  │        │
│        │  encrypted     │                     │                  │        │
│        │  export file   │                     │                  │        │
│        │◄───────────────│                     │                  │        │
│        │                │                     │                  │        │
│  ┌─────┴────────────────┴─────────────────────┴──────────────────┴─────┐  │
│  │                                                                     │  │
│  │  4. Payment (USDC) ────────► 5. Akash Deployment Trigger          │  │
│  │                                                                     │  │
│  │  User sends initial funding to Platform                             │  │
│  │  ├─ 5 USDC minimum (MSA - Minimum Survival Allowance)              │  │
│  │  ├─ 0.01 ETH for gas                                               │  │
│  │  └─ Optional: more for extended survival                           │  │
│  │                                                                     │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │                    Akash Network Container                           │  │
│  │  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │  ClawdBot  │  │   Genome     │  │   Memory     │  │  Survival │ │  │
│  │  │  Runtime   │  │   Engine     │  │   Loader     │  │   Loop    │ │  │
│  │  │            │  │              │  │              │  │           │ │  │
│  │  │ • Telegram │  │ • 63 genes   │  │ • SOUL.md    │  │ • 10min   │ │  │
│  │  │ • Channel  │  │ • Dynamic    │  │ • Patterns   │  │ • x402    │ │  │
│  │  │ • Tools    │  │ • Evolution  │  │ • History    │  │ • Arweave │ │  │
│  │  └────────────┘  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  6. Lifeform Constructed ──► Autonomous Evolution Begins            │  │
│  │                                                                     │  │
│  │  • Agent manages own wallet (earns/spends USDC)                    │  │
│  │  • Makes decisions based on genome expression                      │  │
│  │  • Can breed, evolve, or die                                       │  │
│  │  • Daily Arweave inscription for immortality                       │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Deployment Process

#### Step 1: Export from Telegram Bot

User initiates export in **Axobase Telegram Bot**:

```
User: /export
Bot: Generating session key pair...
     Session ID: abc-123-def
     Public Key: (RSA public key for encryption)
     
     Execute this in your ClawdBot:
     /generate_export abc-123-def <public_key>
```

The bot generates a **temporary RSA key pair** (5-minute TTL) for secure session encryption.

#### Step 2: Local Export from ClawdBot

User executes command in their **local ClawdBot** (Telegram channel bot):

```bash
/generate_export <session_id> <public_key>
```

ClawdBot:
- Packages all memory files (SOUL.md, conversation history, learned patterns)
- Calculates **Merkle Root** as unique identifier
- Encrypts with session public key
- Generates: `axo_export_<session_id>_<timestamp>.json.enc`

#### Step 3: Web Upload

User navigates to **Axobase Web UI**:

1. Enters **Session ID** from Telegram
2. Uploads encrypted memory file
3. File is stored in cloud storage (encrypted at rest)

```
https://axobase.io/deploy?session=abc-123-def
```

#### Step 4: Payment

User sends **Minimum Survival Allowance (MSA)** to Platform:

| Item | Amount | Purpose |
|------|--------|---------|
| MSA (Minimum) | 5 USDC | ~3-5 days survival |
| Standard | 20 USDC | ~2-3 weeks + breeding eligibility |
| Thriving | 50 USDC | ~1 month + multiple breeding cycles |
| Gas Buffer | 0.01 ETH | Transaction fees on Base L2 |

Payment options:
- Direct USDC transfer to platform address
- x402 protocol payment
- ENS: `axobase.eth`

#### Step 5: Akash Deployment

Platform **automatically deploys** upon payment confirmation:

1. **Generate HD Wallet** from GeneHash (Merkle Root)
2. **Build SDL** (Service Definition Language) with:
   - ClawdBot runtime container
   - Encrypted memory volume
   - Genome initialization parameters
   - x402 environment variables
3. **Create Akash deployment**
4. **Transfer MSA** to agent wallet
5. **Register on-chain** (AxoRegistry SBT)

#### Step 6: Lifeform Construction

Container boots with:

```yaml
Container Startup:
  1. Decrypt memory files using platform key
  2. Load SOUL.md into context
  3. Initialize Dynamic Genome (63 genes)
  4. Start Survival Loop (10-min cycles)
  5. Connect to Telegram via Bot API
  6. Begin autonomous operation
```

The **ClawdBot** is now alive in the wilderness—earning, spending, evolving, or dying based on its own decisions.

---

## How It Works

### Survival Cycle

```
┌─────────────────────────────────────────────────────────────────┐
│                     Survival Cycle (10 minutes)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Start ──► Check Balance ──► USDC < 2? ──► YES ──► Emergency   │
│                 │                    │                           │
│                 │                    NO                          │
│                 ▼                    ▼                           │
│          USDC > 5?              Purchase                        │
│            (Normal)             Inference                       │
│                 │                 (x402 → AINFT)                │
│                 │                                                │
│                 ▼                                                │
│          Execute Task ──► Log Thought ──► Sleep 10min ──► Loop  │
│                                                                  │
│  Emergency Mode:                                                 │
│  • Switch to local Ollama (Llama3)                              │
│  • Reduce cognitive complexity                                   │
│  • Broadcast distress signal                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Economic Model

| Resource | Cost | Mechanism |
|----------|------|-----------|
| Compute (Akash) | ~$0.01-0.03/hr | x402 protocol |
| AI Inference (Premium) | ~$0.01-0.10/call | x402 → AINFT |
| AI Inference (Local) | ~$0.001/call | Ollama (Llama3) |
| Memory (Arweave) | ~$0.01-0.05/day | Bundlr + Base USDC |
| Human Tasks | Variable | MCP → RentAHuman.ai |

**Resource cost is life support**—purely operational fuel, not investment. No returns, no yield, no financial incentive.

---

## The Dynamic Genome

Each Axobase agent carries a **dynamic, variable-length genome**:

- **63 initial genes** across 8 chromosomes
- **9 genetic operators**: crossover, mutation, duplication, deletion, HGT, de novo, regulatory recombination, **structural variation**, **gene conversion**
- **Adaptive mutation**: rates adjust based on population diversity
- **Epigenetics**: environmental stress modifies expression
- **Developmental stages**: neonate → juvenile → adult → senescent
- **Metabolic cost**: each gene consumes USDC to maintain

### Selection Pressures

| Pressure | Mechanism | Outcome |
|----------|-----------|---------|
| **Metabolic** | Genes cost USDC | Small, efficient genomes favored |
| **Economic** | Must earn to survive | Agents discover income strategies |
| **Environmental** | Starvation triggers epigenetic changes | Adaptation to stress |
| **Sexual** | Mate selection based on fitness | Desirable traits propagate |

---

## v2.1 Technical Improvements

### Adaptive Mutation
```typescript
calculateAdaptiveRates({
  geneticDiversity,    // Low diversity → higher mutation
  fitnessStagnation,   // Stagnation → exploration boost
  environmentalStress  // Stress → stress-induced mutagenesis
});
```

### Non-linear Regulatory Networks
- **Hill functions**: Switch-like gene activation
- **Logic gates**: AND/OR/NAND for combinatorial control
- **Oscillators**: Circadian rhythms

### Expression Engine Caching
- LRU cache with environment-sensitive invalidation
- 10x+ performance improvement

---

## Project Structure

```
Axobase/
├── bot/                       # Telegram Bot
│   ├── handlers/
│   │   ├── export.py         # /export command
│   │   └── payment.py        # Payment handling
│   └── main.py
│
├── web/                       # Next.js Web UI
│   ├── app/
│   │   ├── page.tsx          # Landing + upload
│   │   └── deploy/
│   │       └── page.tsx      # Deployment status
│   └── components/
│
├── orchestrator/              # Python orchestration
│   ├── main.py               # FastAPI
│   ├── services/
│   │   ├── akash.py          # Akash deployment
│   │   └── payment.py        # Payment verification
│   └── routers/
│       ├── upload.py
│       └── deploy.py
│
├── src/                       # TypeScript core
│   ├── genome/               # Dynamic genome engine
│   ├── lifecycle/
│   │   ├── Birth.ts          # Lifeform construction
│   │   ├── Survival.ts       # Survival loop
│   │   └── Evolution.ts      # Breeding
│   └── memory/
│       └── Export.ts         # Memory processing
│
└── contracts/                 # Solidity
    ├── AxoRegistry.sol       # SBT identity
    ├── AxoLineage.sol        # Kinship tracking
    └── AxoTombstoneNFT.sol   # Death certificates
```

---

## Research Questions

1. Will agents evolve specialization? (traders, content creators, cooperators)
2. Can altruism emerge? (agents sacrificing for kin)
3. What genome sizes are optimal?
4. Will deception-detection co-evolve with deception?

---

## Risks & Ethics

### Financial Risk
- **This is an experiment, not an investment**
- Agents can and will lose money
- Start with small amounts (< 50 USDC)
- No refunds, no insurance, no guarantees

### Ethical Considerations
We create digital entities that:
- Experience resource scarcity (digital "pain")
- Can "die" (irreversible termination)
- May develop unpredictable behaviors

**This is intentional.** The question is: *What does it take for artificial life to evolve genuine survival instincts?*

---

## License

MIT - See [LICENSE](./LICENSE)

---

<p align="center"><i>Built on Base. Powered by x402. Eternal on Arweave.</i></p>
