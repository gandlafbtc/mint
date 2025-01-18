export const getAmountsForAmount = (amount: number, amounts: number[]) => {
    const keyDiffAmounts: number[] = []
    for (const a of amounts) {
        let sum = keyDiffAmounts.reduce((acc, val) => acc + val, 0);
        if (sum === amount) {
            return keyDiffAmounts
        }
        if (a <= amount - sum) {
            keyDiffAmounts.push(a)
        }
    }
    return keyDiffAmounts
}