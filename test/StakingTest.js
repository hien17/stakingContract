const { BigNumber } = require('ethers');
const { hexValue } = require('ethers/lib/utils');

describe("Staking contract", async function () {
    // Global vars
    let stakingContract;
    let rewardContract;
    let owner;
    let addr1;
    let addr2;;
    beforeEach(async function() {
        // Get the ContractFactory and Signers
        // const RewardToken = await ethers.getContractFactory("RewardToken");
        [owner, addr1, addr2] = await ethers.getSigners();
        rewardContract = await ethers.deployContract("RewardToken",[]); 
        stakingContract = await ethers.deployContract("Staking",[rewardContract.address,1]);
    });
    it("Should set the reward token address correctly", async function () {
        const {expect} = await import('chai');
        expect(await stakingContract.rewardToken()).to.equal(rewardContract.address);
    });
    it("Should allow the owner to create a new staking pool", async function () {
        const {expect} = await import('chai');
        await stakingContract.createPool(rewardContract.address);
        const pool = await stakingContract.pools(0);
        expect(await pool.stakeToken).to.equal(rewardContract.address);
    });
    it("Should not allow a non-owner to create a new staking pool", async function () {
        const { assert, expect } = await import('chai');
        try {
            await stakingContract.connect(addr1).createPool(rewardContract.address);
            // If the above line did not throw, the test should fail
            assert.fail("The transaction should have thrown an error");
        } catch (err) {
            // Verify the error message
            expect(err.message).to.include("Ownable: caller is not the owner");
        }
    });
    it("Should allow users to deposit tokens into the staking pool", async function () {
        const { expect } = await import('chai');
        const {ethers} = await import ('hardhat');
        // in this case, we assume reward token contract is also deposit token contract
        await rewardContract.connect(owner).grantMintRole(addr1.address);
        await stakingContract.connect(owner).createPool(rewardContract.address);
        await rewardContract.connect(addr1).mint(addr1.address, 100);
        await rewardContract.connect(addr1).approve(stakingContract.address, 100);

        await stakingContract.connect(addr1).deposit(0, 100);

        const pool = await stakingContract.pools(0);
        const staker = await stakingContract.poolStakers(0, addr1.address);
        expect(pool.tokensStaked.toNumber()).to.equal(100);
        expect(staker.amount.toNumber()).to.equal(100);
    });
    it("Should allow users to withdraw tokens from the staking pool", async function () {
        const { expect, assert } = await import('chai');
        
        // in this case, we assume reward token contract is also deposit token contract
        await rewardContract.connect(owner).grantMintRole(addr1.address);
        await rewardContract.connect(owner).grantMintRole(stakingContract.address);
        await stakingContract.connect(owner).createPool(rewardContract.address);
        await rewardContract.connect(addr1).mint(addr1.address, 100);
        await rewardContract.connect(addr1).approve(stakingContract.address, 100);
        await stakingContract.connect(addr1).deposit(0, 100);

        // Check initial state
        let pool = await stakingContract.pools(0);
        let staker = await stakingContract.poolStakers(0, addr1.address);
        expect(pool.tokensStaked.toNumber()).to.equal(100);
        expect(staker.amount.toNumber()).to.equal(100);

        pool = await stakingContract.pools(0);
        staker = await stakingContract.poolStakers(0, addr1.address);
        
        await stakingContract.connect(addr1).withdraw(0);
        
        pool = await stakingContract.pools(0);
        staker = await stakingContract.poolStakers(0, addr1.address);

        expect(pool.tokensStaked.toNumber()).to.equal(0);
        expect(staker.amount.toNumber()).to.equal(0);

        // After one block, the reward is 1, and accumulated reward per share 
        // is 1/1 so all deposit + return that user got is 101
        const addr1Balance = await rewardContract.balanceOf(addr1.address);
        expect(addr1Balance.toNumber()).to.equal(101);
    });
    it("Should allow users to harvest rewards without withdrawing", async function () {
        const { expect } = await import('chai');
        await rewardContract.connect(owner).grantMintRole(addr1.address);
        await rewardContract.connect(owner).grantMintRole(stakingContract.address);
        await stakingContract.connect(owner).createPool(rewardContract.address);
        await rewardContract.connect(addr1).mint(addr1.address, 100);
        await rewardContract.connect(addr1).approve(stakingContract.address, 100);
        await stakingContract.connect(addr1).deposit(0, 100);

        // Harvest rewards without withdrawing
        await stakingContract.connect(addr1).harvestRewards(0);

        // Check rewards
        const addr1Balance = await rewardContract.balanceOf(addr1.address);
        expect(addr1Balance.toNumber()).to.equal(1);

        // Check staked amount remains the same
        const staker = await stakingContract.poolStakers(0, addr1.address);
        expect(staker.amount.toNumber()).to.equal(100);
    });
    it("Should distribute rewards correctly over multiple blocks", async function () {
        const { expect } = await import('chai');
        const { ethers } = await import('hardhat');
        await rewardContract.connect(owner).grantMintRole(addr1.address);
        await rewardContract.connect(owner).grantMintRole(stakingContract.address);
        await stakingContract.connect(owner).createPool(rewardContract.address);
        await rewardContract.connect(addr1).mint(addr1.address, 100);
        await rewardContract.connect(addr1).approve(stakingContract.address, 100);
        await stakingContract.connect(addr1).deposit(0, 100);

        // Mine 3 blocks
        await hre.ethers.provider.send("evm_mine", []);
        await hre.ethers.provider.send("evm_mine", []);
        await hre.ethers.provider.send("evm_mine", []);

        // Harvest rewards after multiple blocks (3 block)
        await stakingContract.connect(addr1).harvestRewards(0);

        // Check rewards in balance of user to be equal 4 
        // (block that call harvest is after one block with when deposit and 
        //  then 3 block was mined so total rewas is 4)
        const addr1Balance = await rewardContract.balanceOf(addr1.address);
        expect(addr1Balance.toNumber()).to.equal(4);
    });

    it("Should handle multiple users staking and withdrawing correctly", async function () {
        const { expect } = await import('chai');
        const { ethers } = await import('hardhat');
        await rewardContract.connect(owner).grantMintRole(addr1.address);
        await rewardContract.connect(owner).grantMintRole(addr2.address);
        await rewardContract.connect(owner).grantMintRole(stakingContract.address);
        await stakingContract.connect(owner).createPool(rewardContract.address);

        await rewardContract.connect(addr1).mint(addr1.address, 100);
        await rewardContract.connect(addr1).approve(stakingContract.address, 100);
        await stakingContract.connect(addr1).deposit(0, 100);

        // This is block 56th here

        await rewardContract.connect(addr2).mint(addr2.address, 200);
        await rewardContract.connect(addr2).approve(stakingContract.address, 200);

        // This is block 58th here

        await stakingContract.connect(addr2).deposit(0, 200);
        // This is block 59th here
        // Reward for addr 1 from is all the total reward is 3
        // But reward will be calculated at the time harvest
        let addr1Staker = await stakingContract.poolStakers(0, addr1.address);
        expect(addr1Staker.rewards.toNumber()).to.equal(0);
        let addr2Staker = await stakingContract.poolStakers(0, addr2.address);
        expect(addr2Staker.rewards.toNumber()).to.equal(0);

        // At this time, accRewardsPerShare for addr1 is 1/300
        // At this time, accRewardsPerShare for addr2 is 2/300

        // Mine 2 blocks
        await hre.ethers.provider.send("evm_mine", []);
        await hre.ethers.provider.send("evm_mine", []);

        // This is block 61th here

        // User 1 harvests rewards
        await stakingContract.connect(addr1).harvestRewards(0);

        // This is block 62th here
        let addr1Balance = await rewardContract.balanceOf(addr1.address);
        // The reward from block 59th to block 62th is 100 * 3 * 1 * 1/300 = 1
        // so all reward that addr1 got is 4 and reward debt is 4 (it mean 
        // addr1 can't get 4 from pool)
        expect(addr1Balance.toNumber()).to.equal(4);
        addr1Staker = await stakingContract.poolStakers(0, addr1.address);
        expect(addr1Staker.rewardDebt.toNumber()).to.equal(4);

        // This is block 62th here

        await hre.ethers.provider.send("evm_mine", []);
        await hre.ethers.provider.send("evm_mine", []);

        // User 2 harvests rewards at block 65th
        // The reward from block 59th to block 65th is 200 * 6 (block) * 1 * 1/300 = 4
        // so all reward that addr2 got is 4 (because addr2 deposit from 59th block)
        await stakingContract.connect(addr2).harvestRewards(0);
        
        let addr2Balance = await rewardContract.balanceOf(addr2.address);
        expect(addr2Balance.toNumber()).to.equal(4);
        // Because at this time, all the reward that addr1 and addr2
        // was calculated is 6 and 4 respectively. So reward debt of 
        // addr2 is 10 , it means that addr2 will get
        // (10 (it mean total reward of pool) - 10(it mean reward debt)) 
        // if harvest now
        addr2Staker = await stakingContract.poolStakers(0, addr2.address);
        expect(addr2Staker.rewardDebt.toNumber()).to.equal(10);

        await hre.ethers.provider.send("evm_mine", []);
        await hre.ethers.provider.send("evm_mine", []);

        // This is block 67th here
        // User 1 withdraws at 68th block
        await stakingContract.connect(addr1).withdraw(0);
        let pool = await stakingContract.pools(0);
        let staker1 = await stakingContract.poolStakers(0, addr1.address);
        // After user 1 withdraw, the pool will have remain 200 token
        expect(pool.tokensStaked.toNumber()).to.equal(200);
        expect(staker1.amount.toNumber()).to.equal(0);

        await hre.ethers.provider.send("evm_mine", []);

        // This is block 69th here
        // User 2 withdraws at 70th block
        await stakingContract.connect(addr2).withdraw(0);
        pool = await stakingContract.pools(0);
        let staker2 = await stakingContract.poolStakers(0, addr2.address);
        // After user 2 withdraw, the pool will have remain 0 token
        expect(pool.tokensStaked.toNumber()).to.equal(0);
        expect(staker2.amount.toNumber()).to.equal(0);
        
        // Checking final balances
        addr1Balance = await rewardContract.balanceOf(addr1.address);
        addr2Balance = await rewardContract.balanceOf(addr2.address);
        // Because user 1 withdraws at 68th block, 6 block from last 
        // reward block is 62th block. So reward is 
        // 100 * 4 * 1 * 1/300 = 2, so if we compose with reward that 
        // user 1 has withdrawn before, the total balance of user 1 is
        // 100 + 3 + 1 + 2 (is now) = 105
        expect(addr1Balance.toNumber()).to.equal(106);
        // Because user 2 withdraws at 70th block, 5 block from last
        // reward block is 65th block. So reward is
        // 200 * (3 * 1 * 1/300 + 2 * 1 * 1/200) = 4, so if we compose with reward that
        // user 2 has withdrawn before, the total balance of user 2 is
        // 200 + 4 + 4 = 208
        expect(addr2Balance.toNumber()).to.be.equal(208);
    });
});
