import {
  IWebAuthn,
  SSXClientConfig,
  SSXClientSession,
  SSXWebAuthnConfig
} from '@spruceid/ssx-core/client';
import { initialized, ssxSession } from '@spruceid/ssx-sdk-wasm';
import { generateNonce } from 'siwe';

export class WebAuthn extends IWebAuthn implements IWebAuthn {

  private webAuthnConfig: SSXWebAuthnConfig;

  constructor(config: SSXClientConfig) {
    super();
    this.config = config;
    this.webAuthnConfig = config.webAuthn
  }

  hasCredential(): boolean {
    return !!!this.credential;
  }

  async register(
    userId: BufferSource,
    name: string,
    displayName: string,
    createOptions?: { signal?: AbortSignal }
  ): Promise<Credential> {
    // https://w3c.github.io/webauthn/#dictionary-makecredentialoptions
    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
    {
      rp: this.webAuthnConfig?.creation?.rp,
      user: this.getUser(userId, name, displayName),
      challenge: this.generateChallenge(this.webAuthnConfig?.creation?.generateChallenge),
      pubKeyCredParams: this.getPubKeyCredParams(),
      timeout: this.webAuthnConfig?.creation?.timeout,
      excludeCredentials: this.webAuthnConfig?.creation?.excludeCredentials,
      authenticatorSelection: this.webAuthnConfig?.creation?.authenticatorSelection,
      attestation: this.webAuthnConfig?.creation?.attestation,
      // attestationFormats: this.webAuthnConfig?.attestationFormats, TODO: Missing types
      extensions: this.webAuthnConfig?.creation?.extensions,
    };

    return navigator.credentials
      .create({
        publicKey: publicKeyCredentialCreationOptions,
        signal: createOptions?.signal,
      })
      .then(credential => {
        this.credential = credential;
        return this.credential;
      });
  }

  /** Generates an Uint8Array from a 96 bits nonce */
  public generateChallenge = (customGenerateChallenge: () => BufferSource): BufferSource => {
    const challenge: BufferSource = customGenerateChallenge?.();
    return challenge ?? new TextEncoder().encode(generateNonce());
  };

  protected getUser = (
    id: BufferSource,
    name: string,
    displayName: string
  ): PublicKeyCredentialUserEntity => {
    return {
      id,
      name,
      displayName,
    };
  };

  // https://datatracker.ietf.org/doc/html/rfc9053#section-2.1
  // https://www.iana.org/assignments/cose/cose.xhtml
  protected getPubKeyCredParams = (): Array<PublicKeyCredentialParameters> => {
    if (this.webAuthnConfig?.creation?.pubKeyCredParams?.length === 0) {
      throw new Error('`pubKeyCredParams` must have at least one algorithm.');
    }

    const defaultPubKeyCredParams: Array<PublicKeyCredentialParameters> = [
      // ECDSA w/ SHA-256
      {
        type: 'public-key',
        alg: -7,
      },
      // EdDSA
      {
        type: 'public-key',
        alg: -8,
      },
      // ECDSA w/ SHA-384
      {
        type: 'public-key',
        alg: -35,
      },
      // ECDSA w/ SHA-512
      {
        type: 'public-key',
        alg: -36,
      },
      // RSASSA-PKCS1-v1_5 using SHA-256
      {
        type: 'public-key',
        alg: -257,
      },
    ];

    const pubKeyCredParams = this.webAuthnConfig?.creation?.pubKeyCredParams;
    return pubKeyCredParams ?? defaultPubKeyCredParams;
  };

  async signUp(
    userId: BufferSource,
    name: string,
    displayName: string,
    createOptions?: { signal?: AbortSignal }
  ): Promise<Credential> {
    return this.register(userId, name, displayName, createOptions);
  }

  async signIn(
    allowCredentials?: Array<PublicKeyCredentialDescriptor>,
    requestOptions?: {
      mediation?: CredentialMediationRequirement,
      signal?: AbortSignal
    }
  ): Promise<Credential> {
    // https://w3c.github.io/webauthn/#dom-publickeycredentialcreationoptions-rp
    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge: this.generateChallenge(this.webAuthnConfig?.request?.generateChallenge),
      timeout: this.webAuthnConfig?.request?.timeout,
      rpId: this.webAuthnConfig?.request?.rpId,
      allowCredentials,
      userVerification: this.webAuthnConfig?.request?.userVerification,
      // attestation: this.webAuthnConfig.request.attestation, TODO: Missing types
      // attestationFormat: this.webAuthnConfig.request.attestationFormat, TODO: Missing types
      extensions: this.webAuthnConfig?.request?.extensions,
    };

    const credential = navigator.credentials
      .get({
        publicKey: publicKeyCredentialRequestOptions,
        signal: requestOptions?.signal,
      })
      .then(credential => {
        this.credential = credential;
        return this.credential;
      });

    let builder;
    try {
      builder = await initialized.then(
        () => new ssxSession.SSXSessionManager()
      );
    } catch (err) {
      // SSX wasm related error
      console.error(err);
      throw err;
    }

    this.builder = builder;

    const sessionKey = this.builder.jwk();
    console.log(sessionKey);

    return credential
  }

  signOut(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  getSigner() {
    throw new Error('Method not implemented.');
  }

  getSession() {
    throw new Error('Method not implemented.');
  }

  getClientSession(): SSXClientSession {
    throw new Error('Method not implemented.');
  }
}
