import { Signer } from "ethers";
import { IWeb3Signer } from "@spruceid/ssx-core/client"

export class Web3Signer extends IWeb3Signer implements IWeb3Signer {

  constructor(
    did: string,
    keyId: string,
    signer: Signer
  ) {
    super();
    this.did = did;
    this.keyId = keyId;
    this.signer = signer;
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

  public async signMessage(message: string): Promise<string> {
    return this.signer.signMessage(message);
  }

  public async delegate() {
    throw new Error('Method not implemented.');
  }

  public async invoke() {
    throw new Error('Method not implemented.');
  }
}