import { LNDBackend } from "../backend/LNDImpl";
import { CashuMint } from "../mint/business/Mint";
import { MintPersistenceImpl } from "../mint/persistence/MintPersistence";

export const mint = new CashuMint(new LNDBackend())
export const persistence = new MintPersistenceImpl()