describe("Reward Token contract", async function () {
    // Global vars
    let rewardToken;
    let owner;
    let addr1;
    let addr2;;
    beforeEach(async function() {
        // Get the ContractFactory and Signers
        // const RewardToken = await ethers.getContractFactory("RewardToken");
        [owner, addr1, addr2] = await ethers.getSigners();
        rewardToken = await ethers.deployContract("RewardToken",[]);
    });
    it("Should set the right name", async function () {
        const {expect} = await import('chai');
        expect(await rewardToken.name()).to.equal("RewardToken");
    });
    it("Should set the right symbol", async () => {
        const {expect} = await import('chai');
        expect(await rewardToken.symbol()).to.equal("RT");
    });
    // it("Should set the right total supply", async () => {
    //     const {expect} = await import('chai');
    //     expect(await rewardToken.totalSupply()).to.equal(1000000);
    // });
});
