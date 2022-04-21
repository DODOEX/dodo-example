/*

    Copyright 2021 DODO ZOO.
    SPDX-License-Identifier: Apache-2.0

*/

pragma solidity 0.6.9;

import {IERC20} from "./intf/IERC20.sol";
import {SafeERC20} from "./lib/SafeERC20.sol";

contract DODOApiEncapsulation {
    using SafeERC20 for IERC20;
    
    address constant _ETH_ADDRESS_ = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;


    receive() external payable {}

    //Compatible with ETH=>ERC20, ERC20=>ETH
    function useDodoApiData(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        address dodoApprove, // targetApproveAddr
        address dodoProxy, // to (DODOV2Proxy or DODORouteProxy，should not be fixed)
        bytes memory dodoApiData // data
    )
        external
        payable
    {
        if (fromToken != _ETH_ADDRESS_) {
            IERC20(fromToken).transferFrom(msg.sender, address(this), fromAmount);
            _generalApproveMax(fromToken, dodoApprove, fromAmount);
        } else {
            require(fromAmount == msg.value);
        }

        //Notice: need to add dodoProxy to the whitelist.
        // require(isWhiteListed[dodoProxy], "DODOApiEncapsulation: Not Whitelist Contract");
        (bool success, ) = dodoProxy.call{value: fromToken == _ETH_ADDRESS_ ? fromAmount : 0}(dodoApiData);
        require(success, "API_SWAP_FAILED");

        uint256 returnAmount = _generalBalanceOf(toToken, address(this));

        _generalTransfer(toToken, msg.sender, returnAmount);
    }


    function _generalApproveMax(
        address token,
        address to,
        uint256 amount
    ) internal {
        uint256 allowance = IERC20(token).allowance(address(this), to);
        if (allowance < amount) {
            if (allowance > 0) {
                IERC20(token).safeApprove(to, 0);
            }
            IERC20(token).safeApprove(to, uint256(-1));
        }
    }

    function _generalTransfer(
        address token,
        address payable to,
        uint256 amount
    ) internal {
        if (amount > 0) {
            if (token == _ETH_ADDRESS_) {
                to.transfer(amount);
            } else {
                IERC20(token).safeTransfer(to, amount);
            }
        }
    }

    function _generalBalanceOf(
        address token, 
        address who
    ) internal view returns (uint256) {
        if (token == _ETH_ADDRESS_ ) {
            return who.balance;
        } else {
            return IERC20(token).balanceOf(who);
        }
    }

}
