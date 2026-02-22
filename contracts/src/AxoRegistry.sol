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
        bytes32 geneHash;
        address wallet;
        string computeDseq;      // Akash/Spheron deployment sequence
        string computeProvider;  // akash | spheron
        BotStatus status;
        uint256 birthTime;
        uint256 deathTime;
        bytes32[] parents;
        bytes32[] children;
        string arweaveBirthTx;
        string arweaveDeathTx;
        uint256 generation;
        uint256 tombstoneId;
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
        address indexed wallet,
        string computeDseq,
        string computeProvider,
        uint256 timestamp,
        bytes32[] parents,
        uint256 generation
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
        address wallet,
        string calldata computeDseq,
        string calldata computeProvider,
        string calldata arweaveBirthTx,
        bytes32[] calldata parents,
        uint256 generation
    ) external onlyAuthorized nonReentrant {
        require(bots[geneHash].birthTime == 0, "Bot already exists");
        require(wallet != address(0), "Invalid wallet");
        require(bytes(computeDseq).length > 0, "Invalid dseq");
        
        Bot storage bot = bots[geneHash];
        bot.geneHash = geneHash;
        bot.wallet = wallet;
        bot.computeDseq = computeDseq;
        bot.computeProvider = computeProvider;
        bot.status = BotStatus.Alive;
        bot.birthTime = block.timestamp;
        bot.parents = parents;
        bot.generation = generation;
        bot.arweaveBirthTx = arweaveBirthTx;
        
        walletToGene[wallet] = geneHash;
        
        // Update parent children arrays
        for (uint i = 0; i < parents.length; i++) {
            bots[parents[i]].children.push(geneHash);
        }
        
        totalBorn++;
        totalAlive++;
        
        emit BotBorn(
            geneHash,
            wallet,
            computeDseq,
            computeProvider,
            block.timestamp,
            parents,
            generation
        );
    }
    
    /**
     * @dev Record bot death
     */
    function recordDeath(
        bytes32 geneHash,
        uint256 tombstoneId,
        string calldata reason,
        string calldata arweaveDeathTx
    ) external onlyAuthorized nonReentrant {
        Bot storage bot = bots[geneHash];
        require(bot.birthTime > 0, "Bot does not exist");
        require(bot.status == BotStatus.Alive || bot.status == BotStatus.Hibernating, "Bot not alive");
        
        BotStatus oldStatus = bot.status;
        bot.status = BotStatus.Dead;
        bot.deathTime = block.timestamp;
        bot.tombstoneId = tombstoneId;
        bot.arweaveDeathTx = arweaveDeathTx;
        
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
        bytes32[] memory parents,
        bytes32[] memory children,
        uint256 generation
    ) {
        Bot storage bot = bots[geneHash];
        return (bot.parents, bot.children, bot.generation);
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
