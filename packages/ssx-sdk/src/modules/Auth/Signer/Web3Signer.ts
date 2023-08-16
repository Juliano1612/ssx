import { Signer } from "ethers";
import { ISSXSigner } from "./SSXSigner";

export class Web3Signer extends ISSXSigner implements ISSXSigner {

  constructor(
    did: string,
    keyId: string,
    private signer: Signer
  ) {
    super();
    this.did = did;
    this.keyId = keyId;
  }

  public getDID(): string {
    return this.did;
  }

  public getKeyId(): string {
    return this.keyId;
  }

  public async getAddress(): Promise<string> {
    return this.signer.getAddress()
  }

  public async getChainId(): Promise<number> {
    return this.signer.getChainId();
  }

  public async sign(message: string): Promise<string> {
    return this.signer.signMessage(message);
  }

  public async delegate() {
    throw new Error('Method not implemented.');
  }

  public async invoke() {
    throw new Error('Method not implemented.');
  }
}