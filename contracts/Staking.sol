// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./RewardToken.sol";


contract Staking is Ownable {
    using SafeERC20 for IERC20; // Wrappers around ERC20 operations that throw on failure

    RewardToken public rewardToken;

    uint256 private rewardTokensPerBlock; // Number of reward tokens minted per block
    uint256 private constant REWARDS_PRECISION = 1e12; // Big number to perform multiplications/divisions

    // Staking user for a pool
    struct PoolStaker {
        uint256 amount; // Amount of tokens staked
        uint256 rewards; // Amount of rewards accumulated
        uint256 rewardDebt; // Amount relative to accummulatedRewardsPerShare the user can't get as reward
    }
    
    // Staking pool
    struct Pool {
        IERC20 stakeToken; // Token to be staked
        uint256 tokensStaked; // Total tokens staked
        uint256 lastRewardedBlock; // Last block number that user claimed their rewards calculated
        uint256 accumulatedRewardsPerShare; // Accumulated rewards per share times REWARDS_PRECISION
    }

    Pool[] public pools; // Staking pools

    // Mapping poolId => staker address => PoolStaker
    mapping(uint256 => mapping(address => PoolStaker)) public poolStakers;

    // Events
    event Deposit(address indexed user, uint256 indexed poolId, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed poolId, uint256 amount);
    event HarvestRewards(address indexed user, uint256 indexed poolId, uint256 amount);
    event PoolCreated(uint256 poolId);

    // Constructor
    constructor(address rewardTokenAddress, uint256 rewardTokensPerBlock_) {
        rewardToken = RewardToken(rewardTokenAddress);
        rewardTokensPerBlock = rewardTokensPerBlock_;
    }

    /**
     * @dev Create a new staking pool
     * @param stakeToken_ Address of the staked token
     */
    function createPool(IERC20 stakeToken_) external onlyOwner {
        Pool memory pool;
        pool.stakeToken = stakeToken_;
        pools.push(pool);
        uint256 poolId = pools.length - 1;
        emit PoolCreated(poolId);
    } 

    /**
     * @dev Deposit a staking pool
     * @param poolId ID of the pool
     * @param amount Amount of staked tokens to be deposited
     */
    function deposit(uint256 poolId, uint256 amount) external {
        require(amount > 0, "Deposit amount can't be zero");
        Pool storage pool = pools[poolId];
        PoolStaker storage staker = poolStakers[poolId][msg.sender];

        // Update pool stakers
        harvestRewards(poolId);

        // Update current staker
        staker.amount = staker.amount + amount;
        staker.rewardDebt = staker.amount * pool.accumulatedRewardsPerShare / REWARDS_PRECISION;

        // Update pool
        pool.tokensStaked = pool.tokensStaked + amount;

        // Deposit tokens
        emit Deposit(msg.sender, poolId, amount);
        pool.stakeToken.safeTransferFrom(
            address(msg.sender),
            address(this), 
            amount
        );
    }

    /**
     * @dev Withdraw all tokens from an existing staking pool
     * @param poolId ID of the pool
     */
    function withdraw(uint256 poolId) external {
        Pool storage pool = pools[poolId];
        PoolStaker storage staker = poolStakers[poolId][msg.sender];

        uint256 amount = staker.amount;
        require(amount > 0, "Withdraw amount can't be zero");

        // Pay rewards
        harvestRewards(poolId);

        // Update staker
        staker.amount = 0;
        staker.rewardDebt = staker.amount * pool.accumulatedRewardsPerShare / REWARDS_PRECISION;

        // Update pool
        pool.tokensStaked = pool.tokensStaked - amount;

        // Withdraw tokens
        emit Withdraw(address(msg.sender), poolId, amount);
        pool.stakeToken.safeTransfer(
            address(msg.sender),
            amount
        );
    }

    /**
     * @dev Harvest user's rewards from a given pool id
     * @param poolId ID of the pool
     */
    function harvestRewards(uint256 poolId) public {
        updatePoolRewards(poolId);
        Pool storage pool = pools[poolId];
        PoolStaker storage staker = poolStakers[poolId][msg.sender];
        
        uint256 rewardsToHarvest = (staker.amount * pool.accumulatedRewardsPerShare / REWARDS_PRECISION) - staker.rewardDebt;
        
        if (rewardsToHarvest == 0) {
            staker.rewardDebt = staker.amount * pool.accumulatedRewardsPerShare / REWARDS_PRECISION;
            return;
        } 
        staker.rewards = 0;
        staker.rewardDebt = staker.amount * pool.accumulatedRewardsPerShare / REWARDS_PRECISION;
        emit HarvestRewards(msg.sender, poolId, rewardsToHarvest);
        rewardToken.mint(msg.sender, rewardsToHarvest);
    }

    /**
     * @dev Update the accumulated rewards per share
     * and last rewarded block for a given pool
     * @param poolId ID of the pool
     */
    function updatePoolRewards(uint256 poolId) private {
        Pool storage pool = pools[poolId];
        if (pool.tokensStaked == 0) {
            pool.lastRewardedBlock = block.number;
            return;
        }
        uint256 blocksSinceLastReward = block.number - pool.lastRewardedBlock;
        uint256 rewards = blocksSinceLastReward * rewardTokensPerBlock;
        pool.accumulatedRewardsPerShare = pool.accumulatedRewardsPerShare + (rewards * REWARDS_PRECISION / pool.tokensStaked);
        pool.lastRewardedBlock = block.number;
    }
}