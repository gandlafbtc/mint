import { CashuMint, CashuWallet, getDecodedToken, getEncodedTokenV4, type Proof, type Token } from "@cashu/cashu-ts";
import { log } from "./logger";

        const START_TOKEN = 'cashuBo2FtdWh0dHA6Ly9sb2NhbGhvc3Q6MzAwMGF1Y3NhdGF0gaJhaUgAXcQPCg-epGFwg6NhYQRhc3hANDc3MzQ0YThjZmY3MzRmOGVmZWUwZTdkZTk3MzM3NTU1MjVlN2M5OTFlZmMyOTNhNjk5ZWJiMGQxNmQ1N2UwZmFjWCED0pGNfEB-9PzMnhZfhHoNRztwl2WJcGw1544y2pUYojSjYWEEYXN4QDlhMmQ4NTMzZmI3MzE2MGRiZjBiNzE0Nzk0ZWEzYjIzNWRlZjkyM2MxMTc0Yzk3ODkzZmM2MGIzMjM2YjZmNjNhY1ghA1IBpv1qjfQ5e3ogSpGwZIc4uruvYE3XCuWUG0sie2Cjo2FhAmFzeEA5ZjFlMDk4ZTM1NDA4YmQzODg2ZGUxYTRiMzMwYWQzYzcwZjcyOThmMjk0OGE0ZTk3Njk5NDlmYTk3N2Q4MWFjYWNYIQN4kHj5XSa3WVEDqoZJesrs2SiHnQoqlrLUIFj5OiPAtw'

        const startDate = Date.now()
        log.info`start`
        const mintUrl = 'http://localhost:3000'
		const mint = new CashuMint(mintUrl);
		const wallet = new CashuWallet(mint);
		await wallet.loadMint();
        const MAX_CYCLES = 1000
        let lastCycle = Date.now()
        
		const receiveEcash = async (cashuString: string, cycle = 0) => {
            
            const received = await wallet.receive(cashuString);
            const token: Token = {
                mint: mintUrl,
				proofs: received
			};
            if (cycle>=MAX_CYCLES) {
                return
            }

            if (cycle % 10 === 0) {
                const currentCycle = Date.now()
                const progress = Math.floor((cycle/MAX_CYCLES)*100)+''
                log.info`${progress}% - ${currentCycle-startDate} ms - delta: ${currentCycle-lastCycle} ms`
                lastCycle = currentCycle
            }

            cycle++
            await receiveEcash(getEncodedTokenV4(token), cycle)
		};
        
        receiveEcash(START_TOKEN)