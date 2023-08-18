import { IWebAuthn, SSXClientSession } from '@spruceid/ssx-core/client';
import { generateNonce } from 'siwe';

interface pubKeyCredOptions {
  attestation?: 'direct' | 'enterprise' | 'indirect' | 'none'; // AttestationConveyancePreference
  authenticatorSelection?: {
    authenticatorAttachment?: 'cross-platform' | 'platform'; // AuthenticatorAttachment
    requireResidentKey?: boolean;
    residentKey?: 'discouraged' | 'preferred' | 'required'; // ResidentKeyRequirement
    userVerification?: 'discouraged' | 'preferred' | 'required'; // UserVerificationRequirement
  };
  challenge: BufferSource;
  excludeCredentials?: Array<{
    id: BufferSource;
    transports?: AuthenticatorTransport[];
    type: PublicKeyCredentialType;
  }>; // PublicKeyCredentialDescriptor[]
  extensions?: Array<{
    appid?: string;
    credProps?: boolean;
    hmacCreateSecret?: boolean;
  }>; // AuthenticationExtensionsClientInputs
  pubKeyCredParams: Array<{
    alg: COSEAlgorithmIdentifier;
    type: PublicKeyCredentialType;
  }>; //PublicKeyCredentialParameters[]
  rp: {
    id?: string;
    name: string;
  }; // PublicKeyCredentialRpEntity
  timeout?: number;
  user: {
    displayName: string;
    id: BufferSource;
    name: string;
  }; //PublicKeyCredentialUserEntity
}

export class WebAuthn extends IWebAuthn implements IWebAuthn {
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
        rp: this.config.rp,
        user: this.getUser(userId, name, displayName),
        challenge: this.generateChallenge(),
        pubKeyCredParams: this.getPubKeyCredParams(),
        timeout: this.config?.timeout,
        excludeCredentials: this.config?.excludeCredentials,
        authenticatorSelection: this.config?.authenticatorSelection,
        attestation: this.config?.attestation,
        // attestationFormats: this.config?.attestationFormats, TODO: Missing types
        extensions: this.config?.extensions,
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
  public generateChallenge = (): BufferSource => {
    const challenge: BufferSource = this.config?.generateChallenge();
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
    if (this.config?.pubKeyCredParams.length === 0) {
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

    const pubKeyCredParasms = this.config?.pubKeyCredParams;
    return pubKeyCredParasms ?? defaultPubKeyCredParams;
  };

  signUp(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  async signIn(): Promise<any> {
    ////// START server generated info //////
    // Usually the below publicKey object is constructed on your server
    // here for DEMO purposes only
    const rawId = localStorage.getItem('rawId');
    const publicKey: PublicKeyCredentialRequestOptions = {
      // your domain
      rpId: 'localhost',
      challenge: this.generateChallenge(),
      userVerification: 'preferred',
      allowCredentials: [
        {
          id: strToBin(rawId),
          type: 'public-key',
        },
      ],
    };
    ////// END server generated info //////
    const credential = await navigator.credentials.get({
      publicKey: publicKey,
    });
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
