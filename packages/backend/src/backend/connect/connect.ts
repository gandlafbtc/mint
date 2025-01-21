import { getLNDSettings, LND } from "../../instances/lnd"
import { mint } from "../../instances/mint"
import { getNWCSettings, NWC } from "../../instances/nwc"
import { settings } from "../../mint/business/Settings"
import { getSettingByKey } from "../../persistence/settings"
import { LNDBackend } from "../LNDImpl"
import { NWCImpl } from "../NWCImpl"

export const connectBackend = async () => {
    const backendType = await getSettingByKey('backend-type')
    let inst 
    if (backendType.value === 'LND') {
        inst = new LNDBackend()
        await LND.recreateInstance()
    }
    else if (backendType.value === 'NWC') {
        inst = new NWCImpl()
        await NWC.recreateInstance()
    }
    else {
        throw new Error("No lightning backend configured");
    }
    mint.setLightningInterface(inst)
}