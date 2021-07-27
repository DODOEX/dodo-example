import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { PMMState } from './pmm/PMMState'
import { PMMHelper } from './pmm/PMMHelper'

/*
    You can use 'ts-node pmmOffchainCalc.ts' to run the example
*/

//For Example(BSC)
var web3 = new Web3(new Web3.providers.HttpProvider("https://bsc-dataseed.binance.org"));

DODOV1PmmOffchainCalc()
DODOV2PmmOffchainCalc()

async function DODOV2PmmOffchainCalc() {
    var DODOV2_ABI = require('./ABI/IDODOV2.json');
    var pmmHelper = new PMMHelper();
    /*
        Note: In DODOV2. The same trading pair can have multiple pools. 
    */

    /*
        Specify the pool address, obtain and use pmm state to calc price
    */
    var POOL_ADDRESS = "0xD534fAE679f7F02364D177E9D44F1D15963c0Dd7"; //For example (DODO-WBNB)
    var baseTokenDecimal = 18; //DODO
    var quoteTokenDecimal = 18; //WBNB
    var poolInsntance = new web3.eth.Contract(DODOV2_ABI, POOL_ADDRESS);

    //Fetch PMMState and FeeRate
    var pmm = await poolInsntance.methods.getPMMStateForCall().call();
    // Currently feeRate for any address is the same, so you can pass in an zero address as userAccount
    var feeRate = await poolInsntance.methods.getUserFeeRate("0x0000000000000000000000000000000000000000").call();
    var pmmState: PMMState = new PMMState(
        {
            i: fromWei(pmm.i, 18 - baseTokenDecimal + quoteTokenDecimal),
            K: fromWei(pmm.K, 18),
            B: fromWei(pmm.B, baseTokenDecimal),
            Q: fromWei(pmm.Q, quoteTokenDecimal),
            B0: fromWei(pmm.B0, baseTokenDecimal),
            Q0: fromWei(pmm.Q0, quoteTokenDecimal),
            R: parseInt(pmm.R),
            lpFeeRate: fromWei(feeRate.lpFeeRate, 18),
            mtFeeRate: fromWei(feeRate.mtFeeRate, 18)
        }
    )

    //If selling 100 baseToken (DODO)
    var receivedQuoteAmount = pmmHelper.QuerySellBase(new BigNumber(100), pmmState);
    console.log("receivedQuoteAmount:" + receivedQuoteAmount.toFixed(quoteTokenDecimal));

    //If selling 1 quoteToken (WBNB)
    var receivedBaseAmount = pmmHelper.QuerySellQuote(new BigNumber(1), pmmState);
    console.log("receivedBaseAmount:" + receivedBaseAmount.toFixed(baseTokenDecimal));


    /*
        Specify the base and quote Token, obtain all pools and use pmm state to calc price


        We provide a helper contract to help user easily get all DODOV2 pools by base and quote token.

        function getPairDetail(address token0,address token1,address userAddr) external view returns (PairDetail[] memory res)

        Helper Contract address on multi chain:
            - ETH: 0x0672952Fab6BD1336C57AE09E49DB6D3e78B1896
            - BSC: 0xC1CCE4C003B10052f168072A4c3c02051053d957
            - Polygon: 0x324c747885a88EA6f8115C46E0605C828ed527D3
            - HECO: 0x67166F14E9aCf43A822BE147eA59CdDd01A7C00d
    */
    var POOLS_HELPER = "0xC1CCE4C003B10052f168072A4c3c02051053d957"; //BSC Helper
    var registryInsntance = new web3.eth.Contract(DODOV2_ABI, POOLS_HELPER);
    var BASE_TOKEN = "0x67ee3Cb086F8a16f34beE3ca72FAD36F7Db929e2"; //DODO 
    var QUOTE_TOKEN = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; //WBNB
    baseTokenDecimal = 18; //DODO
    quoteTokenDecimal = 18; //WBNB
    // Currently feeRate for any address is the same, so you can pass in an zero address as userAccount
    var results = await registryInsntance.methods.getPairDetail(BASE_TOKEN, QUOTE_TOKEN, "0x0000000000000000000000000000000000000000").call();

    for (var i = 0; i < results.length; i++) {
        var curPool = results[i];
        var curPoolAddress = curPool.curPair;
        var curPmmState: PMMState = new PMMState(
            {
                i: fromWei(curPool.i, 18 - baseTokenDecimal + quoteTokenDecimal),
                K: fromWei(curPool.K, 18),
                B: fromWei(curPool.B, baseTokenDecimal),
                Q: fromWei(curPool.Q, quoteTokenDecimal),
                B0: fromWei(curPool.B0, baseTokenDecimal),
                Q0: fromWei(curPool.Q0, quoteTokenDecimal),
                R: parseInt(curPool.R),
                lpFeeRate: fromWei(curPool.lpFeeRate, 18),
                mtFeeRate: fromWei(curPool.mtFeeRate, 18)
            }
        )
        console.log("poolAddress:", curPoolAddress)
        //If selling 100 baseToken (DODO)
        var receivedQuoteAmount = pmmHelper.QuerySellBase(new BigNumber(100), curPmmState);
        console.log("receivedQuoteAmount:" + receivedQuoteAmount.toFixed(quoteTokenDecimal));

        //If selling 1 quoteToken (WBNB)
        var receivedBaseAmount = pmmHelper.QuerySellQuote(new BigNumber(1), curPmmState);
        console.log("receivedBaseAmount:" + receivedBaseAmount.toFixed(baseTokenDecimal));
    }
}


async function DODOV1PmmOffchainCalc() {
    var DODOV1_ABI = require('./ABI/IDODOV1.json');
    var pmmHelper = new PMMHelper();
    /*
        Specify the pool address, obtain and use pmm state to calc price

        We provide a helper contract to help user easily get DODOV1 pool’s pmmState by pool address

        function getPairDetail(address pool) external view returns (PairDetail[] memory res)

        Helper Contract address on multi chain:
            - ETH: 0x6373ceB657C83C91088d328622573FB766064Ac4
            - BSC: 0x2BBD66fC4898242BDBD2583BBe1d76E8b8f71445
            - Polygon: 0x18DFdE99F578A0735410797e949E8D3e2AFCB9D2
            - HECO: 0xFB973C79C665C0AC69E74C67be90D4C7A6f23c59
    */
    var POOL_HELPER = "0x2BBD66fC4898242BDBD2583BBe1d76E8b8f71445"; //BSC Helper
    var helperInsntance = new web3.eth.Contract(DODOV1_ABI, POOL_HELPER);
    var POOL_ADDRESS = "0xBe60d4c4250438344bEC816Ec2deC99925dEb4c7" //BSC (BUSD-USDT)
    var baseTokenDecimal = 18; //BUSD
    var quoteTokenDecimal = 18; //USDT
    var result = await helperInsntance.methods.getPairDetail(POOL_ADDRESS).call();
    var pmmState: PMMState = new PMMState(
        {
            i: fromWei(result[0].i, 18 - baseTokenDecimal + quoteTokenDecimal),
            K: fromWei(result[0].K, 18),
            B: fromWei(result[0].B, baseTokenDecimal),
            Q: fromWei(result[0].Q, quoteTokenDecimal),
            B0: fromWei(result[0].B0, baseTokenDecimal),
            Q0: fromWei(result[0].Q0, quoteTokenDecimal),
            R: parseInt(result[0].R),
            lpFeeRate: fromWei(result[0].lpFeeRate, 18),
            mtFeeRate: fromWei(result[0].mtFeeRate, 18)
        }
    )
    //If selling 100 baseToken (BUSD)
    var receivedQuoteAmount = pmmHelper.QuerySellBase(new BigNumber(100), pmmState);
    console.log("receivedQuoteAmount:" + receivedQuoteAmount.toFixed(quoteTokenDecimal));

    //If selling 100 quoteToken (USDT)
    var receivedBaseAmount = pmmHelper.QuerySellQuote(new BigNumber(100), pmmState);
    console.log("receivedBaseAmount:" + receivedBaseAmount.toFixed(baseTokenDecimal));

}


function fromWei(numStr: string, decimals: number): BigNumber {
    return new BigNumber(numStr).div(new BigNumber(10 ** decimals));
}


