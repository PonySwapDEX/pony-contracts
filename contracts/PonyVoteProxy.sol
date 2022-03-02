// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./libs/IBEP20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

interface IMasterChef {
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
        uint256 rewardLockedUp;
        uint256 nextHarvestUntil;
    }

    function userInfo(uint256 pid, address user) external view returns (UserInfo memory);
}

contract PonyVoteProxy {
    using SafeMath for uint256;

    // Pony Token
    address public pony = 0x1f546aD641B56b86fD9dCEAc473d1C7a357276B7;
    // Master Chef
    address public masterChef = 0x058451C62B96c594aD984370eDA8B6FD7197bbd4;
    uint256 public ponyPoolPid = 9;
    // Trading Pairs
    address public ponyBNB = 0xC24AD5197DaeFD97DF28C70AcbDF17d9fF92a49B;
    uint256 public ponyBNBFarmPid = 17;
    address public ponyBUSD = 0x9287F5Ad55D7eE8EAE90B865718EB9A7cF3fb71A;
    uint256 public ponyBUSDFarmPid = 16;
    // Vaults
    address public autoSharkPonyPool = 0x2Bc66d715FB0887A8708eCa5d83826eB063ba551;

    function decimals() external pure returns (uint8) {
        return uint8(18);
    }

    function name() external pure returns (string memory) {
        return "PonyToken Vote Proxy";
    }

    function symbol() external pure returns (string memory) {
        return "PONY-VOTE";
    }

    function totalSupply() external view returns (uint256) {
        return IBEP20(pony).totalSupply();
    }

    function balanceOf(address _voter) external view returns (uint256) {
        uint256 balance;

        // pony in wallet
        balance = balance.add(IBEP20(pony).balanceOf(_voter));
        // pony in pony pool
        balance = balance.add(IMasterChef(masterChef).userInfo(ponyPoolPid, _voter).amount);
        // pony in PONY-BNB liquidity pool
        balance = balance.add(balanceInLiquidityPoolAndFarm(ponyBNB, ponyBNBFarmPid, _voter));
        // pony in PONY-BUSD liquidity pool
        balance = balance.add(balanceInLiquidityPoolAndFarm(ponyBUSD, ponyBUSDFarmPid, _voter));
        // pony in vaults
        balance = balance.add(IBEP20(autoSharkPonyPool).balanceOf(_voter));

        return balance;
    }

    function balanceInLiquidityPoolAndFarm(address pair, uint256 pid, address _voter) private view returns (uint256) {
        uint256 lpTotalSupply = IBEP20(pair).totalSupply();
        uint256 voterLpBalance = IBEP20(pair).balanceOf(_voter).add(IMasterChef(masterChef).userInfo(pid, _voter).amount);
        uint256 ponyInLp = IBEP20(pony).balanceOf(pair);

        if (lpTotalSupply > 0) {
            return voterLpBalance.mul(1e8).div(lpTotalSupply).mul(ponyInLp).div(1e8);
        }

        return 0;
    }
}
