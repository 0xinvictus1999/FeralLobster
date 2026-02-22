// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BreedingFund
 * @dev Escrow contract for breeding operations
 * @notice Locks USDC from parents, releases to child upon birth
 */
contract BreedingFund is ReentrancyGuard, Ownable {
    
    IERC20 public usdc;
    
    struct BreedingLock {
        bytes32 geneA;
        bytes32 geneB;
        address parentA;
        address parentB;
        uint256 amount; // Amount per parent
        uint256 lockTime;
        bytes32 childGeneHash;
        bool released;
        bool refunded;
    }
    
    // lockId => BreedingLock
    mapping(bytes32 => BreedingLock) public locks;
    
    // geneHash => lockId
    mapping(bytes32 => bytes32) public geneToLock;
    
    // Total locked amount
    uint256 public totalLocked;
    
    // Constants
    uint256 public constant LOCK_AMOUNT = 5 * 10**6; // 5 USDC (6 decimals)
    uint256 public constant CHILD_AMOUNT = 10 * 10**6; // 10 USDC
    uint256 public constant REFUND_DELAY = 48 hours;
    
    // Authorized callers
    mapping(address => bool) public authorizedCallers;
    
    // Events
    event FundsLocked(
        bytes32 indexed lockId,
        bytes32 indexed geneA,
        bytes32 indexed geneB,
        uint256 amount,
        uint256 timestamp
    );
    
    event FundsReleased(
        bytes32 indexed lockId,
        bytes32 indexed childGeneHash,
        address indexed childWallet,
        uint256 amount
    );
    
    event FundsRefunded(
        bytes32 indexed lockId,
        bytes32 indexed geneHash,
        uint256 amount,
        uint256 timestamp
    );
    
    event ChildRegistered(bytes32 indexed lockId, bytes32 indexed childGeneHash);
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedCallers[msg.sender],
            "Not authorized"
        );
        _;
    }
    
    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }
    
    /**
     * @dev Lock funds for mating
     * Called by both parents
     */
    function lockForMating(
        bytes32 geneA,
        bytes32 geneB,
        address parentA,
        address parentB
    ) external nonReentrant returns (bytes32 lockId) {
        require(geneA != geneB, "Cannot mate with self");
        require(geneToLock[geneA] == bytes32(0), "Parent A already has active lock");
        require(geneToLock[geneB] == bytes32(0), "Parent B already has active lock");
        
        // Generate lock ID
        lockId = keccak256(abi.encodePacked(geneA, geneB, block.timestamp));
        
        // Transfer USDC from both parents
        require(
            usdc.transferFrom(parentA, address(this), LOCK_AMOUNT),
            "Parent A transfer failed"
        );
        require(
            usdc.transferFrom(parentB, address(this), LOCK_AMOUNT),
            "Parent B transfer failed"
        );
        
        // Create lock
        locks[lockId] = BreedingLock({
            geneA: geneA,
            geneB: geneB,
            parentA: parentA,
            parentB: parentB,
            amount: LOCK_AMOUNT,
            lockTime: block.timestamp,
            childGeneHash: bytes32(0),
            released: false,
            refunded: false
        });
        
        geneToLock[geneA] = lockId;
        geneToLock[geneB] = lockId;
        
        totalLocked += LOCK_AMOUNT * 2;
        
        emit FundsLocked(lockId, geneA, geneB, LOCK_AMOUNT, block.timestamp);
        
        return lockId;
    }
    
    /**
     * @dev Register child and release funds
     */
    function releaseToChild(
        bytes32 lockId,
        bytes32 childGeneHash,
        address childWallet
    ) external onlyAuthorized nonReentrant {
        BreedingLock storage lock = locks[lockId];
        require(lock.lockTime > 0, "Lock does not exist");
        require(!lock.released, "Already released");
        require(!lock.refunded, "Already refunded");
        require(childGeneHash != bytes32(0), "Invalid child gene hash");
        
        lock.childGeneHash = childGeneHash;
        lock.released = true;
        
        // Transfer to child
        require(
            usdc.transfer(childWallet, CHILD_AMOUNT),
            "Transfer to child failed"
        )
        
        // Clear gene locks
        geneToLock[lock.geneA] = bytes32(0);
        geneToLock[lock.geneB] = bytes32(0);
        
        totalLocked -= CHILD_AMOUNT;
        
        emit ChildRegistered(lockId, childGeneHash);
        emit FundsReleased(lockId, childGeneHash, childWallet, CHILD_AMOUNT);
    }
    
    /**
     * @dev Refund locked funds if breeding fails
     */
    function refund(bytes32 lockId) external nonReentrant {
        BreedingLock storage lock = locks[lockId];
        require(lock.lockTime > 0, "Lock does not exist");
        require(!lock.released, "Already released");
        require(!lock.refunded, "Already refunded");
        require(
            block.timestamp >= lock.lockTime + REFUND_DELAY,
            "Refund period not reached"
        );
        
        lock.refunded = true;
        
        // Refund both parents
        require(usdc.transfer(lock.parentA, LOCK_AMOUNT), "Refund A failed");
        require(usdc.transfer(lock.parentB, LOCK_AMOUNT), "Refund B failed");
        
        // Clear gene locks
        geneToLock[lock.geneA] = bytes32(0);
        geneToLock[lock.geneB] = bytes32(0);
        
        totalLocked -= LOCK_AMOUNT * 2;
        
        emit FundsRefunded(lockId, lock.geneA, LOCK_AMOUNT, block.timestamp);
        emit FundsRefunded(lockId, lock.geneB, LOCK_AMOUNT, block.timestamp);
    }
    
    /**
     * @dev Set authorized caller
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }
    
    /**
     * @dev Update USDC address (for migrations)
     */
    function setUSDC(address _usdc) external onlyOwner {
        usdc = IERC20(_usdc);
    }
    
    /**
     * @dev Get lock info
     */
    function getLock(bytes32 lockId) external view returns (BreedingLock memory) {
        return locks[lockId];
    }
    
    /**
     * @dev Check if parents can breed
     */
    function canBreed(bytes32 geneA, bytes32 geneB) external view returns (bool) {
        if (geneA == geneB) return false;
        if (geneToLock[geneA] != bytes32(0)) return false;
        if (geneToLock[geneB] != bytes32(0)) return false;
        return true;
    }
    
    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        require(balance > 0, "No balance");
        require(usdc.transfer(owner(), balance), "Transfer failed");
    }
}
