import { MintInfo } from "@cashu/cashu-ts/dist/lib/es5/model/MintInfo";
import { MintPreferences } from "../models/Internal";

export const getInfo = async (): Promise<MintInfo|{test: 'test'}>  => {
    const settings = await loadSettings()
    return {test: 'test'}
}

const loadSettings = async (): Promise<MintPreferences> => {
    const mintPreferences = new MintPreferences()
    return mintPreferences
}