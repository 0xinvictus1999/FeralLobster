// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AxoEvolutionPressure
 * @dev Global parameters for evolutionary dynamics on Base L2
 * @notice Adjusts mutation rates and environmental pressure based on population metrics
 */
contract AxoEvolutionPressure is Ownable {
    
    struct EvolutionParams {
        uint256 averageSurvivalTime;    // Average lifespan in seconds
        uint256 totalPopulation;        // Total bots ever born
        uint256 currentAlive;           // Currently alive bots
        uint256 mutationRateBps;        // Mutation rate in basis points (100 = 1%)
        uint256 environmentalPressure;  // 0-10000 scale (10000 = max pressure)
        uint256 lastUpdateTime;
    }
    
    EvolutionParams public params;
    
    // Historical data for calculations
    uint256[] public survivalTimes;
    uint256 public constant MAX_SURVIVAL_HISTORY = 1000;
    
    // Adjustment parameters
    uint256 public constant BASE_MUTATION_RATE = 500; // 5%
    uint256 public constant MAX_MUTATION_RATE = 2000; // 20%
    uint256 public constant MIN_MUTATION_RATE = 100;  // 1%
    
    // Population targets
    uint256 public targetPopulation = 1000;
    uint256 public populationPressureThreshold = 500;
    
    // Events
    event ParamsUpdated(
        uint256 averageSurvivalTime,
        uint256 totalPopulation,
        uint256 mutationRate,
        uint256 environmentalPressure
    );
    
    event SurvivalTimeRecorded(uint256 survivalTime, uint256 newAverage);
    event TargetPopulationUpdated(uint256 newTarget);
    
    constructor() Ownable(msg.sender) {
        params = EvolutionParams({
            averageSurvivalTime: 0,
            totalPopulation: 0,
            currentAlive: 0,
            mutationRateBps: BASE_MUTATION_RATE,
            environmentalPressure: 5000, // 50% default
            lastUpdateTime: block.timestamp
        });
    }
    
    /**
     * @dev Record a bot's survival time when it dies
     */
    function recordSurvivalTime(uint256 survivalTime) external {
        // Add to history
        if (survivalTimes.length >= MAX_SURVIVAL_HISTORY) {
            // Remove oldest
            for (uint i = 0; i < survivalTimes.length - 1; i++) {
                survivalTimes[i] = survivalTimes[i + 1];
            }
            survivalTimes[survivalTimes.length - 1] = survivalTime;
        } else {
            survivalTimes.push(survivalTime);
        }
        
        // Recalculate average
        uint256 total = 0;
        for (uint i = 0; i < survivalTimes.length; i++) {
            total += survivalTimes[i];
        }
        params.averageSurvivalTime = total / survivalTimes.length;
        
        // Decrement alive count
        if (params.currentAlive > 0) {
            params.currentAlive--;
        }
        
        // Recalculate environmental pressure
        _updateEnvironmentalPressure();
        
        emit SurvivalTimeRecorded(survivalTime, params.averageSurvivalTime);
    }
    
    /**
     * @dev Record new birth
     */
    function recordBirth() external {
        params.totalPopulation++;
        params.currentAlive++;
        
        // Recalculate pressure
        _updateEnvironmentalPressure();
    }
    
    /**
     * @dev Get current mutation rate (returns basis points)
     */
    function getCurrentMutationRate() external view returns (uint256) {
        return params.mutationRateBps;
    }
    
    /**
     * @dev Calculate if a mutation should occur for a trait
     * Returns true if mutation should be applied
     */
    function shouldMutate() external view returns (bool) {
        // Pseudo-random based on block data
        uint256 random = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender
        ))) % 10000;
        
        return random < params.mutationRateBps;
    }
    
    /**
     * @dev Get mutation magnitude (0-10000, representing 0-100%)
     */
    function getMutationMagnitude() external view returns (uint256) {
        // Base magnitude around 20% (2000 bps)
        uint256 baseMagnitude = 2000;
        
        // Higher pressure = higher potential mutation
        uint256 pressureFactor = params.environmentalPressure / 100; // 0-100
        
        return baseMagnitude + (pressureFactor * 10); // Can go up to 30%
    }
    
    /**
     * @dev Manually update parameters (owner only, for emergencies)
     */
    function updateParams(
        uint256 mutationRateBps,
        uint256 environmentalPressure
    ) external onlyOwner {
        require(mutationRateBps <= MAX_MUTATION_RATE, "Rate too high");
        require(mutationRateBps >= MIN_MUTATION_RATE, "Rate too low");
        require(environmentalPressure <= 10000, "Pressure too high");
        
        params.mutationRateBps = mutationRateBps;
        params.environmentalPressure = environmentalPressure;
        params.lastUpdateTime = block.timestamp;
        
        emit ParamsUpdated(
            params.averageSurvivalTime,
            params.totalPopulation,
            mutationRateBps,
            environmentalPressure
        );
    }
    
    /**
     * @dev Set target population
     */
    function setTargetPopulation(uint256 newTarget) external onlyOwner {
        targetPopulation = newTarget;
        emit TargetPopulationUpdated(newTarget);
        _updateEnvironmentalPressure();
    }
    
    /**
     * @dev Get survival statistics
     */
    function getSurvivalStats() external view returns (
        uint256 average,
        uint256 min,
        uint256 max,
        uint256 count
    ) {
        if (survivalTimes.length == 0) {
            return (0, 0, 0, 0);
        }
        
        uint256 minTime = survivalTimes[0];
        uint256 maxTime = survivalTimes[0];
        
        for (uint i = 1; i < survivalTimes.length; i++) {
            if (survivalTimes[i] < minTime) minTime = survivalTimes[i];
            if (survivalTimes[i] > maxTime) maxTime = survivalTimes[i];
        }
        
        return (params.averageSurvivalTime, minTime, maxTime, survivalTimes.length);
    }
    
    /**
     * @dev Update environmental pressure based on population metrics
     */
    function _updateEnvironmentalPressure() internal {
        uint256 populationRatio = (params.currentAlive * 10000) / targetPopulation;
        
        if (populationRatio > 10000) {
            // Overpopulation - increase pressure
            params.environmentalPressure = 5000 + ((populationRatio - 10000) / 2);
            if (params.environmentalPressure > 10000) {
                params.environmentalPressure = 10000;
            }
        } else {
            // Underpopulation - decrease pressure
            params.environmentalPressure = 5000 - ((10000 - populationRatio) / 2);
            if (params.environmentalPressure < 1000) {
                params.environmentalPressure = 1000;
            }
        }
        
        // Adjust mutation rate based on pressure
        params.mutationRateBps = BASE_MUTATION_RATE + 
            ((params.environmentalPressure * 1000) / 10000);
        
        if (params.mutationRateBps > MAX_MUTATION_RATE) {
            params.mutationRateBps = MAX_MUTATION_RATE;
        }
        
        params.lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev Get population density (alive / target)
     */
    function getPopulationDensity() external view returns (uint256) {
        if (targetPopulation == 0) return 0;
        return (params.currentAlive * 10000) / targetPopulation;
    }
    
    /**
     * @dev Check if breeding should be encouraged
     */
    function isBreedingEncouraged() external view returns (bool) {
        return params.currentAlive < targetPopulation;
    }
    
    /**
     * @dev Get recommended breeding lock amount based on pressure
     */
    function getRecommendedLockAmount() external view returns (uint256) {
        // Base 5 USDC, can increase with pressure
        uint256 baseAmount = 5 * 10**6;
        uint256 pressureMultiplier = 10000 + params.environmentalPressure;
        return (baseAmount * pressureMultiplier) / 10000;
    }
}
