/**
 * ISSXSigner
 * A class (or interface) representing signing capabilities, specifically 
 * turning SessionConfig and InvocationParams into signed and serialized 
 * messages. This should abstract over siwe/ucan, the resulting string can
 * be either one. This will probably be a largely internal-use interface, 
 * with the signer passed in to SSX and SSXSession being converted into it.
 */
export abstract class ISSXSigner {
  /** The DID the signer represents */
  protected did: string;

  /** The key ID within the DID Doc the signer is for */
  protected keyId: string;

  /**
   * Signs a message using the private key of the connected address.
   * @returns signature;
   */
  abstract sign(message: string): Promise<string>;

  /**
   * async delegate(sessionConfig: SessionConfig) => string
   * Creates, signs and serializes a delegation based on the provided 
   * SessionConfig. Should not bother checking if the capabilities are 
   * actually authorized by any parent delegations.
   */
  abstract delegate(): Promise<any>;


  /**
   * async invoke(invocationParams: InvocationParams) => string
   * Creates, signs and serializes an invocation based on the provided 
   * InvocationParamsShould not bother checking if the actions are 
   * actually authorized by any parent delegations.
   */
  abstract invoke(): Promise<any>;
}