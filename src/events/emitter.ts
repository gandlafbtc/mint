import { EventEmitter } from "events";

class CustomEmitter extends EventEmitter {

}

export const eventEmitter = new CustomEmitter()