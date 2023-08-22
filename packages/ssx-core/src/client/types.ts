/* eslint-disable no-shadow */
import { ssxSession } from '@spruceid/ssx-sdk-wasm';
import { AxiosInstance } from 'axios';
import { Signer, providers } from 'ethers';
import {
  SSXEnsData,
  SSXEnsResolveOptions,
  SSXLensProfilesResponse,
  SSXRPCProvider,
  SSXServerRoutes,
} from '../types';

/** Core config for SSX. */
export interface SSXClientConfig {
  /** Web3 wallet provider */
  web3?: SSXWeb3Config;
  /** WebAuthn config */
  webAuthn?: SSXWebAuthnConfig;
  /** Optional reference to server running ssx-server.
   * Providing this field enables communication with ssx-server */
  server?: SSXProviderServer;
  /** Optional modules available */
  modules?: SSXModuleConfig;
}

/**
 * Configuration for managing SSX Modules
 */
export interface SSXModuleConfig {
  storage?: boolean | { [key: string]: any };
  credentials?: boolean;
}

/** Representation of an active SSXSession. */
export type SSXClientSession = {
  /** User address */
  address: string;
  /** User address without delegation */
  walletAddress: string;
  chainId: number;
  /** Key to identify the session */
  sessionKey: string;
  /** The message that can be obtained by SiweMessage.prepareMessage() */
  siwe: string;
  /** The signature of the siwe message */
  signature: string;
  /** ENS data supported by SSX */
  ens?: SSXEnsData;
  /** Lens Profiles */
  lens?: string | SSXLensProfilesResponse;
};

/** The URL of the server running ssx-server. Providing this field enables SIWE server communication */
export type SSXServerHost = string;

/** The ssx-powered server configuration settings */
export type SSXProviderServer = {
  host: SSXServerHost;
  /** Optional configuration for the server's routes. */
  routes?: SSXServerRoutes;
};

/** Web3 provider configuration settings */
export interface SSXProviderWeb3 {
  /**
   * window.ethereum for Metamask;
   * web3modal.connect() for Web3Modal;
   * const signer = useSigner(); const provider = signer.provider; from Wagmi for Rainbowkit
   * */
  driver: any;
  /** JSON RPC provider configurations */
  rpc?: SSXRPCProvider;
}

/** Optional session configuration for the SIWE message. */
export interface SiweConfig extends Partial<ssxSession.SiweConfig> {}

/** Extra SIWE fields. */
export type ExtraFields = ssxSession.ExtraFields;

/** Overrides for the session configuration. */
export type ConfigOverrides = {
  siwe?: SiweConfig;
};

/** ENS options supported by SSX. */
export interface SSXEnsConfig {
  /** Enable the ENS resolution on server instead of on client. */
  resolveOnServer?: boolean;
  /** ENS resolution options. True means resolve all. */
  resolve: SSXEnsResolveOptions;
}

/** Interface for an extension to SSX. */
export interface SSXExtension {
  /** [recap] Capability namespace. */
  namespace?: string;
  /** [recap] Default delegated actions in capability namespace. */
  defaultActions?(): Promise<string[]>;
  /** [recap] Delegated actions by target in capability namespace. */
  targetedActions?(): Promise<{ [target: string]: string[] }>;
  /** [recap] Extra metadata to help validate the capability. */
  extraFields?(): Promise<ExtraFields>;
  /** Hook to run after SSX has connected to the user's wallet.
   * This can return an object literal to override the session configuration before the user
   * signs in. */
  afterConnect?(ssx: IWeb3Auth): Promise<ConfigOverrides>;
  /** Hook to run after SSX has signed in. */
  afterSignIn?(session: SSXClientSession): Promise<void>;
}

/**
 * IAuth
 * All auth modules must implement/extend the IAuth interface.
 * Only these methods will be available in the root object.
 */

export abstract class IAuth {
  /** Extensions for the SSXClientSession. */
  protected extensions: SSXExtension[] = [];

  abstract signUp(...params): Promise<any>;
  abstract signIn(...params): Promise<any>;
  abstract signOut(...params): Promise<any>;
  abstract getSigner(): any;
  abstract getSession(): any;
  abstract getClientSession(): SSXClientSession;

  /**
   * Extends SSX with a functions that are called after connecting and signing in.
   */
  public extend(extension: SSXExtension): void {
    this.extensions.push(extension);
  }
}

export abstract class IWeb3Auth extends IAuth {
  /** The Ethereum provider */
  protected provider: providers.Web3Provider;

  /** An SSX Signer abstraction */
  protected signer: IWeb3Signer;

  /** Web3AuthUtils instance */
  protected web3AuthUtils: IWeb3AuthUtils;

  /** The user session representation (once signed in). */
  public userSession?: SSXClientSession;

  /** The SSXClientConfig object. */
  protected config: SSXClientConfig;

  /** Instance of SSXSessionManager */
  public builder: ssxSession.SSXSessionManager;

  /**
   * Promise that is initialized on construction of this class to run the "afterConnect" methods
   * of the extensions.
   */
  public afterConnectHooksPromise: Promise<void>;

  /** If there is a connection with a Web3Wallet */
  protected connected: boolean;

  abstract isConnected(): boolean;

  abstract connect(): Promise<void>;
  /**
   * ENS data supported by SSX.
   * @param address - User address.
   * @param resolveEnsOpts - Options to resolve ENS.
   * @returns Object containing ENS data.
   */
  abstract resolveEns(
    /** User address */
    address: string,
    resolveEnsOpts: SSXEnsResolveOptions
  ): Promise<SSXEnsData>;
  /**
   * Resolves Lens profiles owned by the given Ethereum Address. Each request is
   * limited by 10. To get other pages you must pass the pageCursor parameter.
   *
   * Lens profiles can be resolved on the Polygon Mainnet (matic) or Mumbai
   * Testnet (maticmum). Visit https://docs.lens.xyz/docs/api-links for more
   * information.
   *
   * @param address - Ethereum User address.
   * @param pageCursor - Page cursor used to paginate the request. Default to
   * first page. Visit https://docs.lens.xyz/docs/get-profiles#api-details for
   * more information.
   * @returns Object containing Lens profiles items and pagination info.
   */
  abstract resolveLens(
    /* Ethereum User Address. */
    address: string,
    /* Page cursor used to paginate the request. Default to first page. */
    pageCursor: string
  ): Promise<string | SSXLensProfilesResponse>;
  abstract address(): string | undefined;
  abstract chainId(): number | undefined;
  abstract getProvider(): Promise<providers.Web3Provider>;
  abstract getConfig(): SSXClientConfig;
}

export interface SSXWeb3Config {
  /** Connection to a cryptographic keypair and/or network. */
  provider?: SSXProviderWeb3;
  /** Whether or not daoLogin is enabled. */
  enableDaoLogin?: boolean;
  /** Optional session configuration for the SIWE message. */
  siweConfig?: SiweConfig;
  /** Whether or not ENS resolution is enabled. True means resolve all on client. */
  resolveEns?: boolean | SSXEnsConfig;
  /** Whether or not Lens resolution is enabled. True means resolve on client. */
  resolveLens?: boolean | 'onServer';
}

// https://w3c.github.io/webauthn/#dictionary-makecredentialoptions
export abstract class IWebAuthn extends IAuth {
  /** Webauthn public key */
  protected publicKey: IWeb3AuthUtils;

  /** The credential for the current session */
  protected credential: Credential;

  /** The WebAuthn object. */
  // TODO: Maybe a hook?
  protected config: SSXClientConfig;

  /** Instance of SSXSessionManager */
  public builder: ssxSession.SSXSessionManager;

  /**
   * Promise that is initialized on construction of this class to run the "afterConnect" methods
   * of the extensions.
   */
  // TODO: Maybe a hook?
  public afterConnectHooksPromise: Promise<void>;

  abstract hasCredential(): boolean;

  abstract register(
    userId: BufferSource,
    name: string,
    displayName: string,
    createOptions: { signal: AbortSignal }
  ): Promise<Credential>;

  abstract generateChallenge(customGenerateChallenge: () => BufferSource): BufferSource;

  public getCredential = () => this.credential;
}

export interface SSXWebAuthnConfig {
  creation: {
    rp: PublicKeyCredentialRpEntity;
    generateChallenge?: () => BufferSource;
    pubKeyCredParams?: Array<PublicKeyCredentialParameters>;
    timeout?: number;
    excludeCredentials?: Array<PublicKeyCredentialDescriptor>;
    authenticatorSelection?: AuthenticatorSelectionCriteria;
    attestation?: AttestationConveyancePreference;
    extensions?: AuthenticationExtensionsClientInputs;
  }
  // request: Partial<PublicKeyCredentialRequestOptions>
  request?: {
    generateChallenge?: () => BufferSource;
    timeout?: number;
    rpId?: string;
    allowCredentials?: Array<PublicKeyCredentialDescriptor>;
    userVerification?: UserVerificationRequirement;
    extensions?: AuthenticationExtensionsClientInputs;
  }
}

export abstract class IWeb3AuthUtils {
  /** Axios instance. */
  protected api?: AxiosInstance;

  protected config: SSXClientConfig;

  /**
   * Requests nonce from server.
   * @param params - Request params.
   * @returns Promise with nonce.
   */
  abstract ssxServerNonce(params: Record<string, any>): Promise<string>;

  /**
   * Requests sign in from server and returns session.
   * @param session - SSXClientSession object.
   * @returns Promise with server session data.
   */
  abstract ssxServerLogin(
    session: SSXClientSession,
    isExtensionEnabled: (string) => boolean
  ): Promise<any>;

  abstract ssxServerLogout(session: SSXClientSession): Promise<void>;
}

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
  abstract signMessage(message: string): Promise<string>;

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

export abstract class IWeb3Signer extends ISSXSigner implements ISSXSigner {
  protected signer: Signer;

  abstract getDID(): string;

  abstract getKeyId(): string;

  abstract getAddress(): Promise<string>;

  abstract getChainId(): Promise<number>;
}
