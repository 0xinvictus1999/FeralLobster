// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AxoMemoryAnchor
 * @dev On-chain index for Arweave memory inscriptions
 * @notice Maps Base L2 transactions to Arweave transactions for permanent memory storage
 */
contract AxoMemoryAnchor is Ownable {
    
    enum InscriptionType {
        Birth,
        Daily,
        Death,
        Breeding,
        Reincarnation
    }
    
    struct MemoryAnchor {
        bytes32 geneHash;
        string arweaveTxId;
        InscriptionType inscriptionType;
        uint256 timestamp;
        uint256 blockNumber;
        bytes32 previousAnchor;  // For chaining daily inscriptions
    }
    
    // Base tx hash => MemoryAnchor
    mapping(bytes32 => MemoryAnchor) public anchors;
    
    // geneHash => latest anchor
    mapping(bytes32 => bytes32) public latestAnchor;
    
    // geneHash => all anchor hashes (for history)
    mapping(bytes32 => bytes32[]) public geneAnchors;
    
    // Arweave txId => Base tx hash (reverse lookup)
    mapping(string => bytes32) public arweaveToBase;
    
    // Total anchors
    uint256 public totalAnchors;
    
    // Authorized inscribers
    mapping(address => bool) public authorizedInscribers;
    
    // Events
    event MemoryAnchored(
        bytes32 indexed baseTxHash,
        bytes32 indexed geneHash,
        string arweaveTxId,
        InscriptionType inscriptionType,
        uint256 timestamp
    );
    
    event ChainLinked(
        bytes32 indexed geneHash,
        bytes32 indexed newAnchor,
        bytes32 indexed previousAnchor
    );
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedInscribers[msg.sender],
            "Not authorized"
        );
        _;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Anchor a new memory inscription
     * @param baseTxHash The Base L2 transaction hash
     * @param geneHash The bot's gene hash
     * @param arweaveTxId The Arweave transaction ID
     * @param inscriptionType Type of inscription
     */
    function anchorMemory(
        bytes32 baseTxHash,
        bytes32 geneHash,
        string calldata arweaveTxId,
        InscriptionType inscriptionType
    ) external onlyAuthorized {
        require(bytes(arweaveTxId).length > 0, "Invalid Arweave txId");
        require(bytes(arweaveToBase[arweaveTxId]).length == 0, "Arweave tx already anchored");
        
        // Get previous anchor for chaining
        bytes32 previousAnchor = latestAnchor[geneHash];
        
        MemoryAnchor memory anchor = MemoryAnchor({
            geneHash: geneHash,
            arweaveTxId: arweaveTxId,
            inscriptionType: inscriptionType,
            timestamp: block.timestamp,
            blockNumber: block.number,
            previousAnchor: previousAnchor
        });
        
        anchors[baseTxHash] = anchor;
        latestAnchor[geneHash] = baseTxHash;
        geneAnchors[geneHash].push(baseTxHash);
        arweaveToBase[arweaveTxId] = baseTxHash;
        
        totalAnchors++;
        
        emit MemoryAnchored(
            baseTxHash,
            geneHash,
            arweaveTxId,
            inscriptionType,
            block.timestamp
        );
        
        if (previousAnchor != bytes32(0)) {
            emit ChainLinked(geneHash, baseTxHash, previousAnchor);
        }
    }
    
    /**
     * @dev Batch anchor multiple memories
     */
    function batchAnchorMemory(
        bytes32[] calldata baseTxHashes,
        bytes32[] calldata geneHashes,
        string[] calldata arweaveTxIds,
        InscriptionType[] calldata inscriptionTypes
    ) external onlyAuthorized {
        require(
            baseTxHashes.length == geneHashes.length &&
            geneHashes.length == arweaveTxIds.length &&
            arweaveTxIds.length == inscriptionTypes.length,
            "Array length mismatch"
        );
        
        for (uint i = 0; i < baseTxHashes.length; i++) {
            // Skip if already anchored
            if (bytes(anchors[baseTxHashes[i]].arweaveTxId).length > 0) {
                continue;
            }
            
            bytes32 previousAnchor = latestAnchor[geneHashes[i]];
            
            anchors[baseTxHashes[i]] = MemoryAnchor({
                geneHash: geneHashes[i],
                arweaveTxId: arweaveTxIds[i],
                inscriptionType: inscriptionTypes[i],
                timestamp: block.timestamp,
                blockNumber: block.number,
                previousAnchor: previousAnchor
            });
            
            latestAnchor[geneHashes[i]] = baseTxHashes[i];
            geneAnchors[geneHashes[i]].push(baseTxHashes[i]);
            arweaveToBase[arweaveTxIds[i]] = baseTxHashes[i];
            
            totalAnchors++;
            
            emit MemoryAnchored(
                baseTxHashes[i],
                geneHashes[i],
                arweaveTxIds[i],
                inscriptionTypes[i],
                block.timestamp
            );
        }
    }
    
    /**
     * @dev Get anchor by Base tx hash
     */
    function getAnchor(bytes32 baseTxHash) external view returns (MemoryAnchor memory) {
        return anchors[baseTxHash];
    }
    
    /**
     * @dev Get anchor by Arweave txId
     */
    function getAnchorByArweave(string calldata arweaveTxId) 
        external 
        view 
        returns (MemoryAnchor memory) 
    {
        bytes32 baseTxHash = arweaveToBase[arweaveTxId];
        require(baseTxHash != bytes32(0), "Arweave tx not found");
        return anchors[baseTxHash];
    }
    
    /**
     * @dev Get all anchors for a geneHash
     */
    function getGeneAnchors(bytes32 geneHash) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return geneAnchors[geneHash];
    }
    
    /**
     * @dev Get anchor chain (breadcrumb trail)
     */
    function getAnchorChain(bytes32 geneHash, uint256 maxDepth) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        bytes32[] memory chain = new bytes32[](maxDepth);
        uint256 count = 0;
        
        bytes32 current = latestAnchor[geneHash];
        
        while (current != bytes32(0) && count < maxDepth) {
            chain[count] = current;
            count++;
            current = anchors[current].previousAnchor;
        }
        
        // Resize
        assembly {
            mstore(chain, count)
        }
        
        return chain;
    }
    
    /**
     * @dev Check if Base tx is anchored
     */
    function isAnchored(bytes32 baseTxHash) external view returns (bool) {
        return bytes(anchors[baseTxHash].arweaveTxId).length > 0;
    }
    
    /**
     * @dev Check if Arweave tx is anchored
     */
    function isArweaveAnchored(string calldata arweaveTxId) external view returns (bool) {
        return arweaveToBase[arweaveTxId] != bytes32(0);
    }
    
    /**
     * @dev Get latest anchor for geneHash
     */
    function getLatestAnchor(bytes32 geneHash) 
        external 
        view 
        returns (bytes32 baseTxHash, MemoryAnchor memory anchor) 
    {
        baseTxHash = latestAnchor[geneHash];
        require(baseTxHash != bytes32(0), "No anchors found");
        anchor = anchors[baseTxHash];
    }
    
    /**
     * @dev Set authorized inscriber
     */
    function setAuthorizedInscriber(address inscriber, bool authorized) external onlyOwner {
        authorizedInscribers[inscriber] = authorized;
    }
    
    /**
     * @dev Get anchor count for geneHash
     */
    function getGeneAnchorCount(bytes32 geneHash) external view returns (uint256) {
        return geneAnchors[geneHash].length;
    }
}
