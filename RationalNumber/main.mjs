/** ================================================================================================
 * holorhysm/js-libraries - RationalNumber > main.mjs
 * ------------------------------------------------------------------------------------------------
 * 有理数を表すクラス RationalNumber を提供します。
================================================================================================= */

// @ts-check

/**
 * @typedef {{n: bigint, d: bigint}} RationalLike - 有理数のようなもの。nは分子、dは分母
 */

/** @type {(a:bigint, b:bigint) => bigint} - 最大公約数を求める */
const gcd = (a, b) => {
    if (typeof a !== "bigint" || typeof b !== "bigint") {
        throw new Error("Invalid arguments.");
    }
    return a < 0n ? gcd(-a, b) : b < 0n ? gcd(a, -b) : b === 0n ? a : a < b ? gcd(b, a) : gcd(b, a % b);
};

/** @type {(num: number) => string} - numberを「そのnumberがIEE 754倍精度浮動小数点数ではどのようなビット列で表現されるか」を表すstringに変換 */
const numberToBinaryStr = (num) => {
    const buffer = new ArrayBuffer(64);
    const view = new DataView(buffer);
    view.setFloat64(0, num);
    let str = "";
    for (let i = 0; i < 8; i++) {
        str += view.getUint8(i).toString(2).padStart(8, "0");
    }
    return str;
};

/** @type {(binary: string) => {n: bigint, d: bigint}} - binaryは0か1で構成された64文字の文字列。binaryで表されるビット列をIEEE754倍精度浮動小数点数として読んだときのnumberに等しい有理数n/dのnとdを返す */
const binaryStrToRationalNumber = (binary) => {
    const signStr = binary[0];
    const expoStr = binary.substring(1, 12);
    const mantStr = binary.substring(12, 64);

    const mant_n = BigInt(`0b1${mantStr}`);
    const mant_d = 2n ** 52n;

    const expo_unoffset = BigInt(`0b${expoStr}`) - 1023n;
    let expo_n, expo_d;
    if (expo_unoffset >= 0n) {
        expo_n = 2n ** expo_unoffset;
        expo_d = 1n;
    } else {
        expo_n = 1n;
        expo_d = 2n ** (expo_unoffset * -1n);
    }

    const modulus_n = expo_n * mant_n;
    const modulus_d = expo_d * mant_d;

    const irreducible_modulus_n = modulus_n / gcd(modulus_n, modulus_d);
    const irreducible_modulus_d = modulus_d / gcd(modulus_n, modulus_d);

    if (signStr == "0") {
        return { "n": irreducible_modulus_n, "d": irreducible_modulus_d };
    } else {
        return { "n": -1n * irreducible_modulus_n, "d": irreducible_modulus_d };
    }
};

/** @type {(decimal: string) => {n: bigint, d: bigint}} - 10進数小数表記の文字列を分数に変換する(約分と符号移動をしないので注意) */
const decimalStrToRationalNumber = (decimal) => {
    const [intPart, decPart] = decimal.split(".");
    const intPartN = BigInt(intPart);
    const decPartN = BigInt(decPart);
    const decPartD = 10n ** BigInt(decPart.length);
    const n = intPartN * decPartD + decPartN;
    const d = decPartD;
    return { n, d };
};

/** 
 * RationalNumberクラス
 * @extends {RationalLike}
 */
const RationalNumber = class {
    /**
     * 有理数クラスインスタンスの生成
     * 
     * @overload
     * @param {number} numerator - 有理数に変換するnumber
     * @return {RationalNumber} - 生成された有理数インスタンス
     * 
     * @overload
     * @param {bigint} numerator - 有理数に変換するbigint
     * @return {RationalNumber} - 生成された有理数インスタンス
     * 
     * @overload
     * @param {`${number}`|`${number}/${number}`} numerator - 有理数に変換するstring
     * @return {RationalNumber} - 生成された有理数インスタンス
     * 
     * @overload
     * @param {number} numerator - 分子
     * @param {number} denominator - 分母
     * @return {RationalNumber} - 生成された有理数インスタンス
     * 
     * @overload
     * @param {bigint} numerator - 分子
     * @param {bigint} denominator - 分母
     * @return {RationalNumber} - 生成された有理数インスタンス
     * 
     * @param {number|bigint|string} numerator - 有理数に変換するnumber, bigint, string
     * @param {number|bigint} [denominator] - 分母
     * @throws {Error} - 引数が不正な場合
     */
    constructor(numerator, denominator) {
        /** number → numberが表している値と同値な分数に変換 */
        if (arguments.length === 1 && typeof numerator === "number") {
            const binary = numberToBinaryStr(numerator);
            const { n, d } = binaryStrToRationalNumber(binary);
            /** @type {bigint} */
            this.n = n;
            /** @type {bigint} */
            this.d = d;
        }
        /** bigint → 分子がそれ、分母は1 */
        else if (arguments.length === 1 && typeof numerator === "bigint") {
            this.n = numerator;
            this.d = 1n;
        }
        /** string → "/"が含まれているならその前後をそれぞれRationalNumberにして割り算。整数ならそのままBigIntに、小数なら小数点以下の桁数を見ながら自力変換 */
        else if (arguments.length === 1 && typeof numerator === "string") {
            if (numerator.includes("/")) {
                /** @type {`${number}`[]} */
                // @ts-ignore - なります、なるんです
                const [numStr, denStr] = numerator.split("/");
                const num = new RationalNumber(numStr);
                const den = new RationalNumber(denStr);
                this.n = num.n * den.d;
                this.d = num.d * den.n;
            } else {
                if (numerator.includes(".")) {
                    const { n, d } = decimalStrToRationalNumber(numerator);
                    this.n = n;
                    this.d = d;
                } else {
                    this.n = BigInt(numerator);
                    this.d = 1n;
                }
            }
        }
        /** number, number → 両方とも整数であることを確認してBigIntに変換 */
        else if (arguments.length === 2 && typeof numerator === "number" && typeof denominator === "number") {
            if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) {
                throw new Error("Invalid arguments.");
            }
            this.n = BigInt(numerator);
            this.d = BigInt(denominator);
        }
        /** bigint, bigint → そのまま */
        else if (arguments.length === 2 && typeof numerator === "bigint" && typeof denominator === "bigint") {
            this.n = numerator;
            this.d = denominator;
        }
        /** それ以外 → 例外 */
        else {
            throw new Error("Invalid arguments.");
        }
        /** 符号は必ずn(分子)に移す */
        if (this.d < 0n) {
            this.n *= -1n;
            this.d *= -1n;
        }
        /** 約分 */
        const g = gcd(this.n, this.d);
        this.n /= g;
        this.d /= g;
    }
    /**
     * a + b。a, bは{n: bigint, d: bigint}を持っていればOK
     * @param {RationalLike} a - 加算する有理数
     * @param {RationalLike} b - 加算する有理数
     * @returns {RationalNumber} - a + b
     */
    static add(a, b) {
        return new RationalNumber(a.n * b.d + a.d * b.n, a.d * b.d);
    }
    /**
     * a - b。a, bは{n: bigint, d: bigint}を持っていればOK
     * @param {RationalLike} a - 減算する有理数
     * @param {RationalLike} b - 減算する有理数
     * @returns {RationalNumber} - a - b
     */
    static sub(a, b) {
        return new RationalNumber(a.n * b.d - a.d * b.n, a.d * b.d);
    }
    /**
     * a * b。a, bは{n: bigint, d: bigint}を持っていればOK
     * @param {RationalLike} a - 乗算する有理数
     * @param {RationalLike} b - 乗算する有理数
     * @returns {RationalNumber} - a * b
     */
    static mul(a, b) {
        return new RationalNumber(a.n * b.n, a.d * b.d);
    }
    /**
     * a / b。a, bは{n: bigint, d: bigint}を持っていればOK
     * @param {RationalLike} a - 除算する有理数
     * @param {RationalLike} b - 除算する有理数
     * @returns {RationalNumber} - a / b
     */
    static div(a, b) {
        return new RationalNumber(a.n * b.d, a.d * b.n);
    }
    /**
     * a mod b。a, bは{n: bigint, d: bigint}を持っていればOK
     * @param {RationalLike} a - 剰余を求める有理数
     * @param {RationalLike} b - 剰余を求める有理数
     * @returns {RationalNumber} - a mod b
     */
    static mod(a, b) {
        // a - (b * floor(a / b))
        return RationalNumber.sub(a, RationalNumber.mul(b, RationalNumber.floor(RationalNumber.div(a, b))));
    }
    /**
     * trunc(a)。aは{n: bigint, d: bigint}を持っていればOK
     * @param {RationalLike} a - a
     * @returns {RationalNumber} - trunc(a)
     */
    static trunc(a) {
        return new RationalNumber(a.n / a.d);
    }
    /**
     * floor(a)。aは{n: bigint, d: bigint}を持っていればOK
     * @param {RationalLike} a - a
     * @returns {RationalNumber} - floor(a)
     */
    static floor(a) {
        // 0→0, 正→trunc(a), 負→trunc(a) - 1
        return a.n >= 0n ? RationalNumber.trunc(a) : RationalNumber.sub(RationalNumber.trunc(a), new RationalNumber(1n));
    }
    /**
     * ceil(a)。aは{n: bigint, d: bigint}を持っていればOK
     * @param {RationalLike} a - a
     * @returns {RationalNumber} - ceil(a)
     */
    static ceil(a) {
        // 0→0, 正→trunc(a) + 1, 負→trunc(a)
        return a.n >= 0n ? RationalNumber.add(RationalNumber.trunc(a), new RationalNumber(1n)) : RationalNumber.trunc(a);
    }
    /**
     * round(a)。aは{n: bigint, d: bigint}を持っていればOK
     * @param {RationalLike} a - a
     * @returns {RationalNumber} - round(a)
     */
    static round(a) {
        // 0→0, 正→trunc(a + 0.5), 負→trunc(a - 0.5)
        return a.n >= 0n ? RationalNumber.trunc(RationalNumber.add(a, new RationalNumber(1n, 2n))) : RationalNumber.trunc(RationalNumber.sub(a, new RationalNumber(1n, 2n)));
    }
    /**
     * numberに変換
     * @returns {number} - numberに変換された値
     */
    valueOf() {
        return Number(this.n) / Number(this.d);
    }
    /**
     * stringに変換
     * @returns {string} - stringに変換された値
     */
    toString() {
        return `${this.n}/${this.d}`;
    }
};

/** RationalNumberをexport */
export { RationalNumber };
