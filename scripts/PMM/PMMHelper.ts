import BigNumber from 'bignumber.js';
BigNumber.config({
    EXPONENTIAL_AT: [-80, 80],
    DECIMAL_PLACES: 80,
});

import { PMMState } from './PMMState'

export const RStatusOne = 0;
export const RStatusAboveOne = 1;
export const RStatusBelowOne = 2;

export class PMMHelper {
    // return received quote amount (fee deducted)
    public QuerySellBase(amount: BigNumber, state: PMMState): BigNumber {
        try {
            let result: BigNumber;
            if (state.RStatus === RStatusOne) {
                result = this.ROneSellBase(amount, state);
            } else if (state.RStatus === RStatusAboveOne) {
                let backToOnePayBase: BigNumber = state.B0.minus(state.B)
                let backToOneReceiveQuote: BigNumber = state.Q.minus(state.Q0)
                if (amount.lt(backToOnePayBase)) {
                    result = this.RAboveSellBase(amount, state);
                    if (result.gt(backToOneReceiveQuote)) {
                        result = backToOneReceiveQuote
                    }
                } else if (amount.eq(backToOnePayBase)) {
                    result = backToOneReceiveQuote
                } else {
                    result = backToOneReceiveQuote.plus(this.ROneSellBase(amount.minus(backToOnePayBase), state))
                }
            } else {
                result = this.RBelowSellBase(amount, state)
            }
            let mtFee = result.multipliedBy(state.mtFeeRate);
            let lpFee = result.multipliedBy(state.lpFeeRate);

            const quote = result.minus(mtFee).minus(lpFee);

            return quote
        } catch (error) {
            return new BigNumber(0);
        }
    }

    // return received base amount (fee deducted)
    public QuerySellQuote(amount: BigNumber, state: PMMState): BigNumber {
        try {
            let result: BigNumber;
            if (state.RStatus === RStatusOne) {
                result = this.ROneSellQuote(amount, state);
            } else if (state.RStatus === RStatusAboveOne) {
                result = this.RAboveSellQuote(amount, state);
            } else {
                let backToOneReceiveBase = state.B.minus(state.B0);
                let backToOnePayQuote = state.Q0.minus(state.Q);

                if (amount.lt(backToOnePayQuote)) {
                    result = this.RBelowSellQuote(amount, state);
                    if (result.gt(backToOneReceiveBase)) result = backToOneReceiveBase;
                } else if (amount.eq(backToOnePayQuote)) {
                    result = backToOneReceiveBase
                } else {
                    result = backToOneReceiveBase.plus(this.ROneSellQuote(amount.minus(backToOnePayQuote), state))
                }
            }
            let mtFee = result.multipliedBy(state.mtFeeRate);
            let lpFee = result.multipliedBy(state.lpFeeRate);

            const base = result.minus(mtFee).minus(lpFee);

            return base;
        } catch (error) {
            return new BigNumber(0);
        }
    }

    // return getMidPrice
    public GetMidPrice(state: PMMState): BigNumber {
        if (state.RStatus == RStatusBelowOne) {
            let r = (state.Q0.multipliedBy(state.Q0).div(state.Q)).div(state.Q)
            r = new BigNumber(1).minus(state.k).plus(state.k.multipliedBy(r))
            return state.OraclePrice.div(r)
        } else {
            let r = (state.B0.multipliedBy(state.B0).div(state.B)).div(state.B)
            r = new BigNumber(1).minus(state.k).plus(state.k.multipliedBy(r))
            return state.OraclePrice.multipliedBy(r)
        }
    }

    // =========== helper ROne ===========
    private ROneSellBase(amount: BigNumber, state: PMMState): BigNumber {
        return solveQuadraticFunctionForTrade(
            state.Q0,
            state.Q0,
            amount,
            state.OraclePrice,
            state.k
        );
    }

    private ROneSellQuote(amount: BigNumber, state: PMMState): BigNumber {
        return solveQuadraticFunctionForTrade(
            state.B0,
            state.B0,
            amount,
            new BigNumber(1).div(state.OraclePrice),
            state.k
        );
    }

    // =========== helper RAbove ===========
    private RAboveSellBase(amount: BigNumber, state: PMMState): BigNumber {
        return integrate(state.B0, state.B.plus(amount), state.B, state.OraclePrice, state.k);
    }

    private RAboveSellQuote(amount: BigNumber, state: PMMState): BigNumber {
        return solveQuadraticFunctionForTrade(
            state.B0,
            state.B,
            amount,
            new BigNumber(1).div(state.OraclePrice),
            state.k
        );
    }

    // =========== helper RBelow ===========
    private RBelowSellQuote(amount: BigNumber, state: PMMState): BigNumber {
        return integrate(state.Q0, state.Q.plus(amount), state.Q, new BigNumber(1).div(state.OraclePrice), state.k);
    }

    private RBelowSellBase(amount: BigNumber, state: PMMState): BigNumber {
        return solveQuadraticFunctionForTrade(
            state.Q0,
            state.Q,
            amount,
            state.OraclePrice,
            state.k
        );
    }
}

export const integrate = (V0: BigNumber, V1: BigNumber, V2: BigNumber, i: BigNumber, k: BigNumber): BigNumber => {
    if (V0.lte(0)) throw new Error("TARGET_IS_ZERO");
    let fairAmount = i.multipliedBy(V1.minus(V2));
    if (k.eq(0)) return fairAmount;
    let penalty = V0.multipliedBy(V0)
        .div(V1)
        .div(V2)
        .multipliedBy(k);
    return fairAmount.multipliedBy(new BigNumber(1).minus(k).plus(penalty));
};

export const solveQuadraticFunctionForTrade = (
    V0: BigNumber,
    V1: BigNumber,
    delta: BigNumber,
    i: BigNumber,
    k: BigNumber
): BigNumber => {
    if (V0.lte(0)) throw new Error("TARGET_IS_ZERO");
    if (delta.eq(0)) return delta;

    if (k.eq(0)) {
        return delta.multipliedBy(i).gt(V1) ? V1 : delta.multipliedBy(i)
    }

    if (k.eq(1)) {
        let tmp = i.multipliedBy(delta).multipliedBy(V1).div(V0.multipliedBy(V0));
        return V1.multipliedBy(tmp).div(tmp.plus(1))
    }

    let part2 = k.multipliedBy(V0).div(V1).multipliedBy(V0).plus(i.multipliedBy(delta));
    let bAbs = new BigNumber(1).minus(k).multipliedBy(V1);

    let bSig: Boolean

    if (bAbs.gte(part2)) {
        bAbs = bAbs.minus(part2)
        bSig = false
    } else {
        bAbs = part2.minus(bAbs)
        bSig = true;
    }

    let squareRoot = new BigNumber(4)
        .multipliedBy(new BigNumber(1).minus(k))
        .multipliedBy(k)
        .multipliedBy(V0)
        .multipliedBy(V0);
    squareRoot = bAbs
        .multipliedBy(bAbs)
        .plus(squareRoot)
        .sqrt();

    let denominator = new BigNumber(2).multipliedBy(new BigNumber(1).minus(k));
    let numerator: BigNumber;
    if (bSig) {
        numerator = squareRoot.minus(bAbs)
    } else {
        numerator = bAbs.plus(squareRoot)
    }
    return V1.minus(numerator.div(denominator))
};

export const solveQuadraticFunctionForTarget = (
    V1: BigNumber,
    delta: BigNumber,
    i: BigNumber,
    k: BigNumber
): BigNumber => {
    if (V1.eq(0)) return new BigNumber(0);
    if (k.eq(0)) {
        return V1.plus(i.multipliedBy(delta))
    }
    let sqrt = k.multipliedBy(4).multipliedBy(i).multipliedBy(delta).div(V1).plus(1).sqrt()
    let premium = sqrt.minus(1).div(k.multipliedBy(2)).plus(1)
    return V1.multipliedBy(premium)
};