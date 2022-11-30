---
'@spruceid/ssx-core': major
---

Update supported networks according to [ethers.js v5.7.2](https://github.com/ethers-io/ethers.js/releases/tag/v5.7.2).

## @spruceid/ssx-core:

- SSXEtherscanProviderNetworks:
  - Add: SEPOLIA, ARBITRUM, ARBITRUM_GOERLI, POLYGON, POLYGON_MUMBAI, OPTIMISM, OPTIMISM_GOERLI
  - Remove: ROPSTEN, RINKEBY, KOVAN
- SSXInfuraProviderNetworks:
  - Add: SEPOLIA, ARBITRUM_GOERLI, OPTIMISM_GOERLI
  - Remove: ROPSTEN, RINKEBY, KOVAN, ARBITRUM_RINKEBY, OPTIMISM_KOVAN
- SSXAlchemyProviderNetworks:
  - Add: ARBITRUM_GOERLI, OPTIMISM_GOERLI
  - Remove: ROPSTEN, RINKEBY, KOVAN, OPTIMISM_KOVAN, ARBITRUM_RINKEBY
- SSXPocketProviderNetworks:
  - Add: KOVAN, POLYGON, POLYGON_MUMBAI
- SSXAnkrProviderNetworks:
  - Add: ROPSTEN, RINKEBY, GOERLI
