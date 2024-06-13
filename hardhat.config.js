require("@matterlabs/hardhat-zksync-solc");
require("dotenv").config({path:'./.env'});
require("@nomicfoundation/hardhat-verify");
require("@nomiclabs/hardhat-waffle");
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  zksolc: {
    version: "1.3.9",
    compilerSource: "binary",
    settings: {
      optimizer: {
        enabled: true,
      },
    },
  },
  networks: {
    zksync_testnet: {
      url: "https://zksync2-testnet.zksync.dev",
      ethNetwork: "goerli",
      chainId: 280,
      zksync: true,
    },
    zksync_mainnet: {
      url: "https://zksync2-mainnet.zksync.io/",
      ethNetwork: "mainnet",
      chainId: 324,
      zksync: true,
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: process.env.PRIVATE_KEY_TESTNET !== undefined ? [process.env.PRIVATE_KEY_TESTNET] : [],
    },
  },
  paths: {
    artifacts: "./artifacts-zk",
    cache: "./cache-zk",
    sources: "./contracts",
    tests: "./test",
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    apiKey: {
      bscTestnet: process.env.BSCSCAN_API_KEY
    },
  },
  sourcify: {
    enabled: true
  },
  gasReporter: {
    currency: 'USD',
    L2: "arbitrum",
    coinmarketcap: "8279b31e-0a00-4e5f-8c38-b10412d17159",
    enabled: true
  }
};
