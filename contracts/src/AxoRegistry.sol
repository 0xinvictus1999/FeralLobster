// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title AxoRegistry
 * @dev Central registry for all Axobase AI bots on Base L2
 * @notice Tracks birth, life status, lineage, and Arweave inscriptions
 */
contract AxoRegistry is Ownable, ReentrancyGuard {
    
    enum BotStatus {
        Unborn,
        Alive,
        Dead,
        Reincarnated,
        Hibernating
    }
    
    struct Bot {
        bytes32 geneHash;           // Hash of dynamic genome (for on-chain verification)
        string genomeArweaveTx;     // Arweave tx containing full DynamicGenome
        address wallet;
        string computeDseq;         // Akash/Spheron deployment sequence
        string computeProvider;     // akash | spheron
        BotStatus status;
        uint256 birthTime;
        uint256 deathTime;
        uint256 survivalDays;       // Days survived before death
        bytes32 parentA;            // Parent A genome hash
        bytes32 parentB;            // Parent B genome hash
        bytes32[] children;
        string arweaveBirthTx;
        string arweaveDeathTx;
        uint256 generation;
        uint256 tombstoneId;
        uint256 totalGeneCount;     // Total genes at birth
    }
    
    // geneHash => Bot
    mapping(bytes32 => Bot) public bots;
    
    // wallet => geneHash
    mapping(address => bytes32) public walletToGene;
    
    // Total counts
    uint256 public totalBorn;
    uint256 public totalAlive;
    uint256 public totalDead;
    
    // Authorized minters (AxoBreedingFund, etc.)
    mapping(address => bool) public authorizedMinters;
    
    // Events
    event BotBorn(
        bytes32 indexed geneHash,
        string genomeArweaveTx,
        address indexed wallet,
        string computeDseq,
        string computeProvider,
        uint256 timestamp,
        bytes32 parentA,
        bytes32 parentB,
        uint256 generation,
        uint256 totalGeneCount
    );
    
    event GenomeUpdated(
        bytes32 indexed geneHash,
        string newArweaveTx,
        uint256 newGeneCount,
        uint256 timestamp
    );
    
    event BotDied(
        bytes32 indexed geneHash,
        uint256 indexed tombstoneId,
        string reason,
        uint256 timestamp
    );
    
    event BotReincarnated(
        bytes32 indexed oldGeneHash,
        bytes32 indexed newGeneHash,
        uint256 timestamp
    );
    
    event StatusChanged(
        bytes32 indexed geneHash,
        BotStatus oldStatus,
        BotStatus newStatus,
        uint256 timestamp
    );
    
    event AuthorizedMinterSet(address indexed minter, bool authorized);
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedMinters[msg.sender],
            "Not authorized"
        );
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Register a new bot birth
     */
    function registerBirth(
        bytes32 geneHash,
        string calldata genomeArweaveTx,
        address wallet,
        string calldata computeDseq,
        string calldata computeProvider,
        string calldata arweaveBirthTx,
        bytes32 parentA,
        bytes32 parentB,
        uint256 generation,
        uint256 totalGeneCount
    ) external onlyAuthorized nonReentrant {
        require(bots[geneHash].birthTime == 0, "Bot already exists");
        require(wallet != address(0), "Invalid wallet");
        require(bytes(computeDseq).length > 0, "Invalid dseq");
        require(bytes(genomeArweaveTx).length > 0, "Invalid genome Arweave tx");
        
        Bot storage bot = bots[geneHash];
        bot.geneHash = geneHash;
        bot.genomeArweaveTx = genomeArweaveTx;
        bot.wallet = wallet;
        bot.computeDseq = computeDseq;
        bot.computeProvider = computeProvider;
        bot.status = BotStatus.Alive;
        bot.birthTime = block.timestamp;
        bot.parentA = parentA;
        bot.parentB = parentB;
        bot.generation = generation;
        bot.totalGeneCount = totalGeneCount;
        bot.arweaveBirthTx = arweaveBirthTx;
        
        walletToGene[wallet] = geneHash;
        
        // Update parent children arrays
        if (parentA != bytes32(0)) {
            bots[parentA].children.push(geneHash);
        }
        if (parentB != bytes32(0)) {
            bots[parentB].children.push(geneHash);
        }
        
        totalBorn++;
        totalAlive++;
        
        emit BotBorn(
            geneHash,
            genomeArweaveTx,
            wallet,
            computeDseq,
            computeProvider,
            block.timestamp,
            parentA,
            parentB,
            generation,
            totalGeneCount
        );
    }
    
    /**
     * @dev Update genome (e.g., after significant epigenetic changes)
     */
    function updateGenome(
        bytes32 geneHash,
        string calldata newGenomeArweaveTx,
        uint256 newGeneCount
    ) external onlyAuthorized {
        require(bots[geneHash].birthTime > 0, "Bot does not exist");
        
        Bot storage bot = bots[geneHash];
        bot.genomeArweaveTx = newGenomeArweaveTx;
        bot.totalGeneCount = newGeneCount;
        
        emit GenomeUpdated(geneHash, newGenomeArweaveTx, newGeneCount, block.timestamp);
    }
    
    /**
     * @dev Record bot death
     */
    function recordDeath(
        bytes32 geneHash,
        uint256 tombstoneId,
        string calldata reason,
        string calldata arweaveDeathTx,
        string calldata finalGenomeArweaveTx
    ) external onlyAuthorized nonReentrant {
        Bot storage bot = bots[geneHash];
        require(bot.birthTime > 0, "Bot does not exist");
        require(bot.status == BotStatus.Alive || bot.status == BotStatus.Hibernating, "Bot not alive");
        
        BotStatus oldStatus = bot.status;
        bot.status = BotStatus.Dead;
        bot.deathTime = block.timestamp;
        bot.survivalDays = (block.timestamp - bot.birthTime) / 1 days;
        bot.tombstoneId = tombstoneId;
        bot.arweaveDeathTx = arweaveDeathTx;
        
        // Update with final genome snapshot if provided
        if (bytes(finalGenomeArweaveTx).length > 0) {
            bot.genomeArweaveTx = finalGenomeArweaveTx;
        }
        
        totalAlive--;
        totalDead++;
        
        emit StatusChanged(geneHash, oldStatus, BotStatus.Dead, block.timestamp);
        emit BotDied(geneHash, tombstoneId, reason, block.timestamp);
    }
    
    /**
     * @dev Record bot reincarnation
     */
    function recordReincarnation(
        bytes32 oldGeneHash,
        bytes32 newGeneHash
    ) external onlyAuthorized {
        Bot storage oldBot = bots[oldGeneHash];
        require(oldBot.status == BotStatus.Dead, "Old bot must be dead");
        require(bots[newGeneHash].birthTime > 0, "New bot must exist");
        
        oldBot.status = BotStatus.Reincarnated;
        
        emit BotReincarnated(oldGeneHash, newGeneHash, block.timestamp);
    }
    
    /**
     * @dev Update bot status
     */
    function updateStatus(bytes32 geneHash, BotStatus newStatus) external onlyAuthorized {
        Bot storage bot = bots[geneHash];
        require(bot.birthTime > 0, "Bot does not exist");
        
        BotStatus oldStatus = bot.status;
        bot.status = newStatus;
        
        emit StatusChanged(geneHash, oldStatus, newStatus, block.timestamp);
    }
    
    /**
     * @dev Update compute deployment info
     */
    function updateComputeInfo(
        bytes32 geneHash, 
        string calldata newDseq,
        string calldata newProvider
    ) external onlyAuthorized {
        require(bytes(newDseq).length > 0, "Invalid dseq");
        bots[geneHash].computeDseq = newDseq;
        bots[geneHash].computeProvider = newProvider;
    }
    
    /**
     * @dev Set authorized minter
     */
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
        emit AuthorizedMinterSet(minter, authorized);
    }
    
    /**
     * @dev Check if bot exists
     */
    function botExists(bytes32 geneHash) external view returns (bool) {
        return bots[geneHash].birthTime > 0;
    }
    
    /**
     * @dev Get bot by wallet
     */
    function getBotByWallet(address wallet) external view returns (Bot memory) {
        bytes32 geneHash = walletToGene[wallet];
        require(geneHash != bytes32(0), "Wallet not registered");
        return bots[geneHash];
    }
    
    /**
     * @dev Get bot lineage
     */
    function getLineage(bytes32 geneHash) external view returns (
        bytes32 parentA,
        bytes32 parentB,
        bytes32[] memory children,
        uint256 generation
    ) {
        Bot storage bot = bots[geneHash];
        return (bot.parentA, bot.parentB, bot.children, bot.generation);
    }
    
    /**
     * @dev Get genome info
     */
    function getGenomeInfo(bytes32 geneHash) external view returns (
        bytes32 hash,
        string memory arweaveTx,
        uint256 geneCount,
        uint256 generation
    ) {
        Bot storage bot = bots[geneHash];
        return (bot.geneHash, bot.genomeArweaveTx, bot.totalGeneCount, bot.generation);
    }
    
    /**
     * @dev Get bot compute info
     */
    function getComputeInfo(bytes32 geneHash) external view returns (
        string memory dseq,
        string memory provider
    ) {
        Bot storage bot = bots[geneHash];
        return (bot.computeDseq, bot.computeProvider);
    }
}
