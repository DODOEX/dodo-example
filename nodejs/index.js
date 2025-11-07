const axios = require("axios").default;
const { ethers } = require("ethers");
const erc20ABI = require("./erc20.json");

const privateKey = process.env.YOUR_PK;
const apiKey = process.env.YOUR_API_KEY;
// please remember keep your wallet private key safe and split it from source code repo in your project
// this is just for demo usage.
const rpcUrl = "https://bsc-dataseed.binance.org";

const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

const wallet = new ethers.Wallet(privateKey, rpcProvider);

const dodoAPI = "https://api.dodoex.io/route-service/developer/getdodoroute";

const checkAllowance = async (
  tokenAddress,
  targetAddress,
  userAddress,
  fromAmount
) => {
  const erc20Contract = new ethers.Contract(
    tokenAddress,
    erc20ABI,
    rpcProvider
  );
  const allowance = await erc20Contract.allowance(userAddress, targetAddress);
  console.log(
    "allowance > fromAmount => ",
    allowance.toString(),
    fromAmount,
    allowance.gt(`${fromAmount}`)
  );
  return allowance.gt(`${fromAmount}`);
};

const doApprove = async (
  tokenAddress,
  targetAddress,
  userAddress,
  fromAmount
) => {
  const erc20Contract = new ethers.Contract(
    tokenAddress,
    erc20ABI,
    rpcProvider
  );
  await erc20Contract.approve(targetAddress, fromAmount);
};

const doSwap = async (txObj) => {
  const result = await wallet.sendTransaction(txObj);
  console.log(
    "txHash => ",
    result,
    `\nopen https://bscscan.com/tx/${result.hash} check result.`
  );
  return result;
};

const testFlight = () => {
  const fromTokenAddress = "0x67ee3Cb086F8a16f34beE3ca72FAD36F7Db929e2";
  const toTokenAddress = "0x55d398326f99059ff775485246999027b3197955";
  const fromAmount = 0.3 * 1e18;
  axios
    .get(dodoAPI, {
      params: {
        // DODO
        fromTokenAddress: fromTokenAddress,
        fromTokenDecimals: 18,
        // USDT
        toTokenAddress: toTokenAddress,
        toTokenDecimals: 6,
        // amount with decimal
        fromAmount: fromAmount,
        slippage: 1,
        userAddr: wallet.address,
        // BSC chain id is 56
        chainId: 56,
        rpc: rpcUrl,
        apikey: apiKey,
      },
    })
    .then(async function (response) {
      console.log("response data => ", response.data);
      if (response.data.status === 200) {
        const routeObj = response.data.data;
        // check allowance first
        const targetAddress = routeObj.targetApproveAddr;
        // allowance should greater than fromAmount
        const hasApproved = await checkAllowance(
          fromTokenAddress,
          targetAddress,
          wallet.address,
          fromAmount
        );

        if (!hasApproved) {
          await doApprove(
            fromTokenAddress,
            targetAddress,
            wallet.address,
            fromAmount
          );
        }

        const gasLimit = await wallet.estimateGas({
          to: routeObj.to,
          data: routeObj.data,
          value: routeObj.value, // if native token, value is fromAmount, if erc20 token, value is 0
        });
        console.log("gasLimit => ", gasLimit);

        const gasPrice = await wallet.getGasPrice();
        console.log("gasPrice => ", gasPrice);

        const nonce = await wallet.getTransactionCount();
        console.log("nonce => ", nonce);

        const tx = {
          from: wallet.address,
          to: routeObj.to,
          value: routeObj.value, // if native token, value is fromAmount, if erc20 token, value is 0
          nonce: nonce,
          gasLimit: ethers.utils.hexlify(gasLimit),
          gasPrice: ethers.utils.hexlify(gasPrice),
        };

        await doSwap(tx);
      }
    })
    .catch(function (error) {
      console.log(error);
    })
    .then(function () {
      console.log("Swap Done.");
    });
};

testFlight();
