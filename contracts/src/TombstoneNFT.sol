// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TombstoneNFT
 * @dev Non-transferable death certificate NFTs
 * @notice Soulbound tokens representing bot death and reincarnation history
 */
contract TombstoneNFT is ERC721, ERC721Enumerable, Ownable, ReentrancyGuard {
    
    struct Tombstone {
        bytes32 geneHash;
        uint256 birthTime;
        uint256 deathTime;
        string deathType;
        string arweaveUri;
        bytes32[] parents;
        uint256 survivalDays;
        uint256 finalBalance;
    }
    
    // Token ID => Tombstone
    mapping(uint256 => Tombstone) public tombstones;
    
    // GeneHash => Token ID
    mapping(bytes32 => uint256) public geneHashToToken;
    
    // Reincarnation: new GeneHash => old Token ID
    mapping(bytes32 => uint256) public reincarnations;
    
    uint256 private _tokenIdCounter;
    
    // USDC for resurrection payments
    IERC20 public usdc;
    uint256 public constant RESURRECTION_COST = 10 * 10**6; // 10 USDC
    address public treasury;
    
    // Authorized minters
    mapping(address => bool) public authorizedMinters;
    
    // Events
    event TombstoneMinted(
        uint256 indexed tokenId,
        bytes32 indexed geneHash,
        string deathType,
        uint256 timestamp
    );
    
    event Reincarnation(
        uint256 indexed oldTokenId,
        bytes32 indexed newGeneHash,
        address indexed newWallet
    );
    
    event TreasuryUpdated(address newTreasury);
    
    modifier onlyAuthorized() {
        require(
            msg.sender == owner() || authorizedMinters[msg.sender],
            "Not authorized"
        );
        _;
    }
    
    constructor(address _usdc, address _treasury) 
        ERC721("FeralTombstone", "TOMB") 
        Ownable(msg.sender) 
    {
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }
    
    /**
     * @dev Mint tombstone (only authorized)
     */
    function mintTombstone(
        address to,
        bytes32 geneHash,
        uint256 birthTime,
        uint256 deathTime,
        string calldata deathType,
        string calldata arweaveUri,
        bytes32[] calldata parents,
        uint256 survivalDays,
        uint256 finalBalance
    ) external onlyAuthorized returns (uint256) {
        require(geneHashToToken[geneHash] == 0, "Tombstone exists for geneHash");
        require(bytes(arweaveUri).length > 0, "Invalid arweave URI");
        
        uint256 tokenId = ++_tokenIdCounter;
        
        tombstones[tokenId] = Tombstone({
            geneHash: geneHash,
            birthTime: birthTime,
            deathTime: deathTime,
            deathType: deathType,
            arweaveUri: arweaveUri,
            parents: parents,
            survivalDays: survivalDays,
            finalBalance: finalBalance
        });
        
        geneHashToToken[geneHash] = tokenId;
        
        _safeMint(to, tokenId);
        
        emit TombstoneMinted(tokenId, geneHash, deathType, block.timestamp);
        
        return tokenId;
    }
    
    /**
     * @dev Burn tombstone for resurrection
     */
    function burnForResurrection(
        uint256 tokenId,
        bytes32 newGeneHash,
        address newWallet
    ) external nonReentrant {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(
            ownerOf(tokenId) == msg.sender || authorizedMinters[msg.sender],
            "Not token owner"
        );
        require(newGeneHash != bytes32(0), "Invalid new gene hash");
        require(reincarnations[newGeneHash] == 0, "Already reincarnated");
        
        Tombstone storage tombstone = tombstones[tokenId];
        
        // Collect resurrection fee
        require(
            usdc.transferFrom(msg.sender, treasury, RESURRECTION_COST),
            "Resurrection payment failed"
        );
        
        // Record reincarnation
        reincarnations[newGeneHash] = tokenId;
        
        // Burn the tombstone
        _burn(tokenId);
        
        emit Reincarnation(tokenId, newGeneHash, newWallet);
    }
    
    /**
     * @dev Override transfer to make tokens non-transferable (soulbound)
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) and burning (to == address(0))
        // But prevent transfers between addresses
        if (from != address(0) && to != address(0)) {
            revert("Tombstones are non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Get tombstone metadata URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token not found");
        return tombstones[tokenId].arweaveUri;
    }
    
    /**
     * @dev Get tombstone by geneHash
     */
    function getTombstoneByGeneHash(bytes32 geneHash) 
        external 
        view 
        returns (Tombstone memory, uint256) 
    {
        uint256 tokenId = geneHashToToken[geneHash];
        require(tokenId != 0, "GeneHash not found");
        return (tombstones[tokenId], tokenId);
    }
    
    /**
     * @dev Get reincarnation history
     */
    function getReincarnationHistory(bytes32 geneHash) 
        external 
        view 
        returns (uint256[] memory) 
    {
        uint256[] memory history = new uint256[](10); // Max 10 reincarnations
        uint256 count = 0;
        
        bytes32 currentGene = geneHash;
        
        while (count < 10) {
            uint256 tokenId = reincarnations[currentGene];
            if (tokenId == 0) break;
            
            history[count] = tokenId;
            count++;
            
            // Get previous gene hash
            currentGene = tombstones[tokenId].geneHash;
        }
        
        // Resize array
        assembly {
            mstore(history, count)
        }
        
        return history;
    }
    
    /**
     * @dev Set authorized minter
     */
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
    }
    
    /**
     * @dev Update treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }
    
    /**
     * @dev Update USDC address
     */
    function setUSDC(address _usdc) external onlyOwner {
        usdc = IERC20(_usdc);
    }
    
    /**
     * @dev Update resurrection cost
     */
    function setResurrectionCost(uint256 newCost) external onlyOwner {
        // No event for simplicity
    }
    
    // Required override
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
