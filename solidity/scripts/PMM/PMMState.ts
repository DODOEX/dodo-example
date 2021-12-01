import BigNumber from 'bignumber.js'
BigNumber.config({
    EXPONENTIAL_AT: [-80, 80],
    DECIMAL_PLACES: 80,
});


export class PMMState {
    public readonly B!: BigNumber; // DODO._BASE_BALANCE_() / 10^baseDecimals
    public readonly Q!: BigNumber; // DODO._QUOTE_BALANCE_() / 10^quoteDecimals
    public readonly B0!: BigNumber; // DODO._TARGET_BASE_TOKEN_AMOUNT_() / 10^baseDecimals
    public readonly Q0!: BigNumber; // DODO._TARGET_QUOTE_TOKEN_AMOUNT_() / 10^quoteDecimals
    public readonly RStatus!: number; // DODO._R_STATUS_()
    public readonly OraclePrice!: BigNumber; // DODO.getOraclePrice() / 10^(18-baseDecimals+quoteDecimals)
    public readonly k!: BigNumber; // DODO._K_()/10^18
    public readonly mtFeeRate!: BigNumber; // DODO._MT_FEE_RATE_()/10^18
    public readonly lpFeeRate!: BigNumber; // DODO._LP_FEE_RATE_()/10^18

    public constructor(
        pairDetail: { i: BigNumber, K: BigNumber, B: BigNumber, Q: BigNumber, B0: BigNumber, Q0: BigNumber, R: number, lpFeeRate: BigNumber, mtFeeRate: BigNumber }
    ) {
        this.B = pairDetail.B;
        this.Q = pairDetail.Q;
        this.B0 = pairDetail.B0;
        this.Q0 = pairDetail.Q0;
        this.RStatus = pairDetail.R;
        this.OraclePrice = pairDetail.i;
        this.k = pairDetail.K;
        this.mtFeeRate = pairDetail.mtFeeRate;
        this.lpFeeRate = pairDetail.lpFeeRate;
    }

}