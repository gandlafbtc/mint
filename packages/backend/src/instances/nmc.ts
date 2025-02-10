import { SimplePool, finalizeEvent, nip04, type Event, type UnsignedEvent } from "nostr-tools"
import type { SubCloser } from "nostr-tools/abstract-pool"
import { getSettingByKey } from "../persistence/settings"
import { getInfo } from "../mintCommands/getInfo"
import { EncryptedDirectMessage } from "nostr-tools/kinds"
import { hexToBytes } from "@noble/hashes/utils";
import { log } from "../logger"
import { getActiveKeys, getKeysetById } from "../persistence/keysets"
import { getKeysets } from "../mintCommands/getKeysets"
import { mint } from "./mint"
import { CheckStateEnum, type SerializedBlindedMessage } from "@cashu/cashu-ts"
import type { SerializedProof } from '@cashu/crypto/modules/common';

type NMCCommand = {
  command: 'create_mint_quote' | 'create_melt_quote' | 'get_mint_quote' | 'get_melt_quote' | 'melt' | 'mint' | 'get_info' | 'get_keys' | 'get_keysets' | 'swap' | 'check_state' | 'restore'
  data?: unknown
}


export class NMC {
  private static instance: NMC | undefined

  private _relays: string[] = []
  private _pool: SimplePool | undefined
  private _sub: SubCloser

  private constructor(mintPubKey: string, relays: string[]) {
    this._relays = relays
    this._pool = new SimplePool()

    this._sub = this._pool.subscribeMany(this._relays, [{ "#p": [mintPubKey] }], {
      onevent: async (e: Event) => {
        log.debug(`received nmc event`)
        const { value: sk } = await getSettingByKey('mint-priv-key')
        const payload = await nip04.decrypt(sk, e.pubkey, e.content)
        this.handleCommand(payload, e.pubkey)
      }
    })
  }


  async handleCommand(payload: string, pubKey: string) {
    try {
      const { command, data } = JSON.parse(payload) as NMCCommand
      let responseData = undefined
      if (!command) {
        throw new Error("No command found");
      }
      else if (command === 'get_info') {
        responseData = await getInfo()
      }
      else if (command === 'get_keys') {
        let keysRes
        if (data?.keysetId) {
          keysRes = await getKeysetById(data.keysetId)
        }
        else {
          keysRes = await getActiveKeys()
        }
        responseData = { keysets: keysRes }
      }
      else if (command === 'get_keysets') {
        const keysets = await getKeysets()
        responseData = keysets
      }
      else if (command === 'create_mint_quote') {
        try {
          console.log(data)
          const { amount, unit, description } = data as {
            amount: number;
            unit?: string;
            description?: string;
            // pubkey?: string;
          }
          const {
            quote,
            request,
            state,
            expiry
          } = await mint.mintQuote(amount, "bolt11", 'sat')
          responseData = { quote, request, state, expiry }
        } catch (error) {
          log.error('Error: {error}', { error })
          responseData = {
            error
          };
        }
      }

      else if (command === 'check_state') {
        try {
          const { Ys } = data as {Ys: string[]}
          const states = await mint.checkToken(Ys)
          for (const y of Ys) {
              if (!states.find(s => s.Y === y)) {
                  states.push({ Y: y, state: CheckStateEnum.UNSPENT })
              }
          }
          responseData = { states }
      } catch (error) {
          log.error('Error: {error}', { error })
          responseData = {
            error
          };
      }
      }

      else if (command === 'create_melt_quote') {
        try {
          const { unit, request } = data as { unit: string, request: string }

          const { quote: q, amount, fee_reserve, state, expiry, payment_preimage } = await mint.meltQuote(request, unit)
          responseData = {
              quote: q, amount, fee_reserve, state, expiry, payment_preimage
          }
      } catch (error) {
          log.error('Error: {error}', { error })
          responseData = {
            error
          };
      }
      }

      else if (command === 'get_melt_quote') {

        try {
          const { quote } = data as { quote: string }
          const { quote: q, amount, fee_reserve, state, expiry, payment_preimage } = await mint.getMeltQuote(quote)
          const change = await mint.getChange(quote)
          responseData = {
            quote: q, amount, fee_reserve, state, expiry, payment_preimage, change: change.map(c => { return { C_: c.C_, id: c.id, amount: c.amount } })
          }
        } catch (error) {
          log.error('Error: {error}', { error })
          responseData = {
            error
          };
        }
      }

      else if (command === 'get_mint_quote') {
        const { quote } = data as { quote: string }
        const {
          quote: q,
          request,
          state,
          expiry
        } = await mint.getMintQuote(quote)
        responseData = {
          quote: q,
          request,
          state,
          expiry
        }
      }

      else if (command === 'melt') {
        try {
          const { quote, inputs, outputs } = data as { quote: string, inputs: SerializedProof[], outputs?: SerializedBlindedMessage[] }
          const updatedQuote = await mint.melt(quote, inputs, outputs)
          responseData = updatedQuote
      } catch (error) {
          log.error('Error: {error}', { error })
          return {
            error
          };
      }
      }

      else if (command === 'mint') {
        try {
          const { outputs, quote } = data as {
              outputs: SerializedBlindedMessage[];
              quote: string;
          }
          const signatures = await mint.mint(quote, outputs)
          responseData = { signatures }
      } catch (error) {
          log.error('Error: {error}', { error })
          responseData = {
            error
          };
      }
      }
      else if (command === 'restore') {
        try {
          const { outputs } = data as {outputs: SerializedBlindedMessage[]}
          const restoredOutputs = await mint.restore(outputs)
          responseData = restoredOutputs
      } catch (error) {
          log.error('Error: {error}', { error })
          responseData = {
            error
          };
      }
      }
      else if (command === 'swap') {
        try {
          const { outputs, inputs } = data as {
              outputs: SerializedBlindedMessage[];
              inputs: SerializedProof[];
          }
          const signatures = await mint.swap(inputs, outputs)
          responseData = { signatures }
      } catch (error) {
          log.error('Error: {error}', { error })
          responseData = {
              error
          };
      }
      }
      else {
        throw new Error(`Unknown command: ${command}`);
      }
      this.handleResponse({
        command,
        data: responseData,
      },
        pubKey
      )
    } catch (error) {
      console.error(error)
    }
  }

  async handleResponse(command: NMCCommand, pubkey: string) {
    const { value: sk } = await getSettingByKey('mint-priv-key')
    const { value: mintPubKey } = await getSettingByKey('mint-pub-key')
    if (!sk) {
      throw new Error("Could not handle response: no mint priv key set");
    }
    const commandString = JSON.stringify(command)
    const event: UnsignedEvent = {
      kind: EncryptedDirectMessage,
      //@ts-ignore
      tags: [['p', pubkey]],
      content: await nip04.encrypt(sk, pubkey, commandString),
      created_at: Math.floor(Date.now() / 1000),
      pubkey: mintPubKey
    };
    const signedEvent = finalizeEvent(event, hexToBytes(sk))
    await this._pool?.publish(this._relays, signedEvent)
  }

  public static async getInstance(): Promise<NMC> {
    log.debug`get nmc instance`
    if (!NMC.instance) {
      log.debug`creating new nmc instance`

      const { value: pubKey } = await getSettingByKey('mint-pub-key')
      if (!pubKey) {
        throw new Error("could not create nmc instance: no public key set");
      }
      const nwcInstance = new NMC(pubKey, ['wss://ploofa.gandlaf.com'])
      NMC.instance = nwcInstance
    }
    return NMC.instance
  }

  public static destroyInstance() {
    NMC.instance = undefined
  }
  public static async recreateInstance(): Promise<NMC> {
    NMC.destroyInstance()
    return NMC.getInstance()
  }
}
