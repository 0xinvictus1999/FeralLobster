// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AxoLineage
 * @notice Tracks lineage and ancestry for Axobase agents
 * @dev Prevents inbreeding by checking kinship within N generations
 */
contract AxoLineage is ReentrancyGuard, Pausable, Ownable {
    
    // ============================================================================
    // Data Structures
    // ============================================================================
    
    struct Agent {
        bytes32 genomeHash;
        bytes32 parentA;
        bytes32 parentB;
        uint256 generation;
        uint256 birthTimestamp;
        bool exists;
    }
    
    struct LineageTree {
        bytes32[] ancestors; // Up to N generations back
        bytes32[] descendants;
        uint256 totalDescendants;
    }
    
    // ============================================================================
    // State Variables
    // ============================================================================
    
    // Maximum generations to check for kinship (prevents inbreeding)
    uint256 public constant KINSHIP_CHECK_DEPTH = 3;
    
    // Maximum similarity allowed (80% = potential siblings/parents)
    uint256 public constant MAX_KINSHIP_SIMILARITY = 8000; // 80% in basis points
    
    // Agent registry
    mapping(bytes32 => Agent) public agents;
    
    // Lineage tracking
    mapping(bytes32 => LineageTree) public lineageTrees;
    
    // Quick kinship cache: keccak256(abi.encodePacked(agentA, agentB)) => similarity
    mapping(bytes32 => uint256) public kinshipCache;
    
    // Authorized breeders (AxoBreedingFund contract)
    mapping(address => bool) public authorizedBreeders;
    
    // Total registered agents
    uint256 public totalAgents;
    
    // ============================================================================
    // Events
    // ============================================================================
    
    event AgentRegistered(
        bytes32 indexed genomeHash,
        bytes32 indexed parentA,
        bytes32 indexed parentB,
        uint256 generation
    );
    
    event KinshipCheck(
        bytes32 indexed agentA,
        bytes32 indexed agentB,
        uint256 similarity,
        bool allowed
    );
    
    event BreedingAuthorized(
        address indexed breeder
    );
    
    event BreedingRevoked(
        address indexed breeder
    );
    
    // ============================================================================
    // Modifiers
    // ============================================================================
    
    modifier onlyAuthorizedBreeder() {
        require(authorizedBreeders[msg.sender], "AxoLineage: not authorized");
        _;
    }
    
    modifier agentExists(bytes32 genomeHash) {
        require(agents[genomeHash].exists, "AxoLineage: agent not found");
        _;
    }
    
    // ============================================================================
    // Constructor
    // ============================================================================
    
    constructor() Ownable(msg.sender) {}
    
    // ============================================================================
    // Admin Functions
    // ============================================================================
    
    function authorizeBreeder(address breeder) external onlyOwner {
        authorizedBreeders[breeder] = true;
        emit BreedingAuthorized(breeder);
    }
    
    function revokeBreeder(address breeder) external onlyOwner {
        authorizedBeders[breeder] = false;
        emit BreedingRevoked(breeder);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============================================================================
    // Registration
    // ============================================================================
    
    /**
     * @notice Register a genesis agent (no parents)
     * @param genomeHash Unique genome identifier
     */
    function registerGenesis(bytes32 genomeHash) 
        external 
        onlyAuthorizedBreeder 
        whenNotPaused 
    {
        require(!agents[genomeHash].exists, "AxoLineage: already registered");
        
        agents[genomeHash] = Agent({
            genomeHash: genomeHash,
            parentA: bytes32(0),
            parentB: bytes32(0),
            generation: 0,
            birthTimestamp: block.timestamp,
            exists: true
        });
        
        lineageTrees[genomeHash] = LineageTree({
            ancestors: new bytes32[](0),
            descendants: new bytes32[](0),
            totalDescendants: 0
        });
        
        totalAgents++;
        
        emit AgentRegistered(genomeHash, bytes32(0), bytes32(0), 0);
    }
    
    /**
     * @notice Register a child agent with parent lineage
     * @param genomeHash Child's genome hash
     * @param parentA First parent's genome hash
     * @param parentB Second parent's genome hash
     */
    function registerChild(
        bytes32 genomeHash,
        bytes32 parentA,
        bytes32 parentB
    ) 
        external 
        onlyAuthorizedBreeder 
        whenNotPaused 
        agentExists(parentA)
        agentExists(parentB)
        returns (bool)
    {
        require(!agents[genomeHash].exists, "AxoLineage: already registered");
        require(parentA != parentB, "AxoLineage: same parents");
        
        // Check kinship between parents
        require(
            !areKin(parentA, parentB, KINSHIP_CHECK_DEPTH),
            "AxoLineage: parents are kin"
        );
        
        Agent memory parentAData = agents[parentA];
        Agent memory parentBData = agents[parentB];
        
        uint256 childGeneration = parentAData.generation > parentBData.generation 
            ? parentAData.generation + 1 
            : parentBData.generation + 1;
        
        // Build ancestor list (union of parents' ancestors + parents themselves)
        bytes32[] memory ancestors = buildAncestorList(parentA, parentB);
        
        agents[genomeHash] = Agent({
            genomeHash: genomeHash,
            parentA: parentA,
            parentB: parentB,
            generation: childGeneration,
            birthTimestamp: block.timestamp,
            exists: true
        });
        
        lineageTrees[genomeHash] = LineageTree({
            ancestors: ancestors,
            descendants: new bytes32[](0),
            totalDescendants: 0
        });
        
        // Update parents' descendant lists
        lineageTrees[parentA].descendants.push(genomeHash);
        lineageTrees[parentA].totalDescendants++;
        
        lineageTrees[parentB].descendants.push(genomeHash);
        lineageTrees[parentB].totalDescendants++;
        
        totalAgents++;
        
        emit AgentRegistered(genomeHash, parentA, parentB, childGeneration);
        
        return true;
    }
    
    // ============================================================================
    // Kinship Detection
    // ============================================================================
    
    /**
     * @notice Check if two agents are kin within N generations
     * @param agentA First agent
     * @param agentB Second agent
     * @param depth How many generations to check
     * @return true if they share a common ancestor within depth generations
     */
    function areKin(
        bytes32 agentA,
        bytes32 agentB,
        uint256 depth
    ) 
        public 
        view 
        agentExists(agentA)
        agentExists(agentB)
        returns (bool) 
    {
        if (agentA == agentB) return true;
        
        // Get ancestors for both
        bytes32[] memory ancestorsA = getAncestors(agentA, depth);
        bytes32[] memory ancestorsB = getAncestors(agentB, depth);
        
        // Check for intersection
        for (uint256 i = 0; i < ancestorsA.length; i++) {
            for (uint256 j = 0; j < ancestorsB.length; j++) {
                if (ancestorsA[i] == ancestorsB[j]) {
                    return true;
                }
            }
        }
        
        // Check if one is ancestor of other
        for (uint256 i = 0; i < ancestorsA.length; i++) {
            if (ancestorsA[i] == agentB) return true;
        }
        for (uint256 i = 0; i < ancestorsB.length; i++) {
            if (ancestorsB[i] == agentA) return true;
        }
        
        return false;
    }
    
    /**
     * @notice Check if breeding is allowed between two agents
     * @param agentA First agent
     * @param agentB Second agent
     * @return allowed Whether breeding is allowed
     * @return reason Reason if not allowed
     */
    function canBreed(bytes32 agentA, bytes32 agentB)
        external
        view
        agentExists(agentA)
        agentExists(agentB)
        returns (bool allowed, string memory reason)
    {
        if (agentA == agentB) {
            return (false, "Same agent");
        }
        
        if (areKin(agentA, agentB, KINSHIP_CHECK_DEPTH)) {
            return (false, "Agents are kin");
        }
        
        return (true, "");
    }
    
    /**
     * @notice Get similarity score between two agents (placeholder for genetic similarity)
     * @dev In production, this would compare genome hashes or use oracle
     */
    function getSimilarity(bytes32 agentA, bytes32 agentB)
        external
        view
        returns (uint256 similarity)
    {
        bytes32 cacheKey = keccak256(abi.encodePacked(agentA, agentB));
        return kinshipCache[cacheKey];
    }
    
    // ============================================================================
    // View Functions
    // ============================================================================
    
    /**
     * @notice Get ancestors of an agent up to N generations
     */
    function getAncestors(bytes32 genomeHash, uint256 depth)
        public
        view
        agentExists(genomeHash)
        returns (bytes32[] memory)
    {
        bytes32[] memory result = new bytes32[](2**depth - 1);
        uint256 count = 0;
        
        bytes32[] memory currentGen = new bytes32[](1);
        currentGen[0] = genomeHash;
        
        for (uint256 gen = 0; gen < depth && currentGen.length > 0; gen++) {
            bytes32[] memory nextGen = new bytes32[](currentGen.length * 2);
            uint256 nextCount = 0;
            
            for (uint256 i = 0; i < currentGen.length; i++) {
                Agent memory agent = agents[currentGen[i]];
                if (agent.parentA != bytes32(0)) {
                    result[count++] = agent.parentA;
                    nextGen[nextCount++] = agent.parentA;
                }
                if (agent.parentB != bytes32(0)) {
                    result[count++] = agent.parentB;
                    nextGen[nextCount++] = agent.parentB;
                }
            }
            
            currentGen = nextGen;
        }
        
        // Trim result
        bytes32[] memory trimmed = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            trimmed[i] = result[i];
        }
        
        return trimmed;
    }
    
    /**
     * @notice Get direct children of an agent
     */
    function getChildren(bytes32 genomeHash)
        external
        view
        agentExists(genomeHash)
        returns (bytes32[] memory)
    {
        return lineageTrees[genomeHash].descendants;
    }
    
    /**
     * @notice Get generation number
     */
    function getGeneration(bytes32 genomeHash)
        external
        view
        agentExists(genomeHash)
        returns (uint256)
    {
        return agents[genomeHash].generation;
    }
    
    /**
     * @notice Get parents
     */
    function getParents(bytes32 genomeHash)
        external
        view
        agentExists(genomeHash)
        returns (bytes32 parentA, bytes32 parentB)
    {
        Agent memory agent = agents[genomeHash];
        return (agent.parentA, agent.parentB);
    }
    
    /**
     * @notice Get statistics for a lineage
     */
    function getLineageStats(bytes32 genomeHash)
        external
        view
        agentExists(genomeHash)
        returns (
            uint256 generation,
            uint256 totalDescendants,
            uint256 ancestorCount
        )
    {
        Agent memory agent = agents[genomeHash];
        LineageTree memory tree = lineageTrees[genomeHash];
        return (
            agent.generation,
            tree.totalDescendants,
            tree.ancestors.length
        );
    }
    
    /**
     * @notice Check if two agents are siblings
     */
    function areSiblings(bytes32 agentA, bytes32 agentB)
        external
        view
        agentExists(agentA)
        agentExists(agentB)
        returns (bool)
    {
        if (agentA == agentB) return false;
        
        Agent memory a = agents[agentA];
        Agent memory b = agents[agentB];
        
        return (a.parentA == b.parentA && a.parentA != bytes32(0)) ||
               (a.parentA == b.parentB && a.parentA != bytes32(0)) ||
               (a.parentB == b.parentA && a.parentB != bytes32(0)) ||
               (a.parentB == b.parentB && a.parentB != bytes32(0));
    }
    
    // ============================================================================
    // Internal Functions
    // ============================================================================
    
    function buildAncestorList(bytes32 parentA, bytes32 parentB)
        internal
        view
        returns (bytes32[] memory)
    {
        bytes32[] memory ancestorsA = getAncestors(parentA, KINSHIP_CHECK_DEPTH);
        bytes32[] memory ancestorsB = getAncestors(parentB, KINSHIP_CHECK_DEPTH);
        
        // Union of ancestors + parents
        bytes32[] memory result = new bytes32[](
            ancestorsA.length + ancestorsB.length + 2
        );
        uint256 count = 0;
        
        // Add parents
        result[count++] = parentA;
        result[count++] = parentB;
        
        // Add ancestors from A
        for (uint256 i = 0; i < ancestorsA.length; i++) {
            bool exists = false;
            for (uint256 j = 0; j < count; j++) {
                if (result[j] == ancestorsA[i]) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                result[count++] = ancestorsA[i];
            }
        }
        
        // Add ancestors from B
        for (uint256 i = 0; i < ancestorsB.length; i++) {
            bool exists = false;
            for (uint256 j = 0; j < count; j++) {
                if (result[j] == ancestorsB[i]) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                result[count++] = ancestorsB[i];
            }
        }
        
        // Trim
        bytes32[] memory trimmed = new bytes32[](count);
        for (uint256 i = 0; i < count; i++) {
            trimmed[i] = result[i];
        }
        
        return trimmed;
    }
}
