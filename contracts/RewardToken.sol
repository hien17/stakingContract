// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract RewardToken is ERC20, AccessControl {
    // Remember to grant StakingManager MINTER_ROLE after its deployment
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    constructor() ERC20("RewardToken", "RT") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        // require(hasRole(MINTER_ROLE, msg.sender) || hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not a minter");
        _mint(to, amount);
    }

    function grantMintRole(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MINTER_ROLE, account);
    }
}