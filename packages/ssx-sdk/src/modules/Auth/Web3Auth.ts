import { providers } from 'ethers';
import {
  SSXEnsData,
  SSXEnsResolveOptions,
  SSXLensProfilesResponse,
  isSSXRouteConfig,
  ssxResolveEns,
  ssxResolveLens,
} from '@spruceid/ssx-core';
import {
  SSXClientConfig,
  SSXClientSession,
  GnosisDelegation,
  IWeb3Auth,
  IWeb3AuthUtils,
} from '@spruceid/ssx-core/client';
import { initialized, ssxSession } from '@spruceid/ssx-sdk-wasm';
import axios, { AxiosInstance } from 'axios';
import merge from 'lodash.merge';
import { generateNonce } from 'siwe';
import { Web3Signer } from './Web3Signer';

const SSX_DEFAULT_WEB3_CONFIG: SSXClientConfig = {
  providers: {
    web3: {
      driver: globalThis.ethereum,
    },
  },
};

export class Web3Auth extends IWeb3Auth implements IWeb3Auth {
  constructor(config: SSXClientConfig = SSX_DEFAULT_WEB3_CONFIG) {
    super();
    this.config = {
      ...config,
      providers: {
        ...SSX_DEFAULT_WEB3_CONFIG.providers,
        ...config?.providers,
      },
    };

    this.web3AuthUtils = new Web3AuthUtils(this.config);

    if (this.config.enableDaoLogin) {
      const gnosis = new GnosisDelegation();
      this.extend(gnosis);
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  /** Verifies if extension is enabled. */
  public isExtensionEnabled = (namespace: string) =>
    this.extensions.filter(e => e.namespace === namespace).length === 1;

  public async connect(): Promise<void> {
    if (this.isConnected()) {
      return;
    }
    let provider: providers.Web3Provider;

    // eslint-disable-next-line no-underscore-dangle
    if (!this.config.providers.web3.driver?._isProvider) {
      try {
        provider = new providers.Web3Provider(
          this.config.providers.web3.driver
        );
      } catch (err) {
        // Provider creation error
        console.error(err);
        throw err;
      }
    } else {
      provider = this.config.providers.web3.driver;
    }

    if (
      !this.config.providers.web3?.driver?.bridge?.includes('walletconnect')
    ) {
      const connectedAccounts = await provider.listAccounts();
      if (connectedAccounts.length === 0) {
        try {
          await provider.send('wallet_requestPermissions', [
            { eth_accounts: {} },
          ]);
        } catch (err) {
          // Permission rejected error
          console.error(err);
          throw err;
        }
      }
    }

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
    this.provider = provider;

    this.afterConnectHooksPromise = this.applyExtensions();

    this.connected = true;
  }

  /** Applies the "afterConnect" methods and the delegated capabilities of the extensions. */
  public async applyExtensions(): Promise<void> {
    for (const extension of this.extensions) {
      if (extension.afterConnect) {
        const overrides = await extension.afterConnect(this);
        this.config = {
          ...this.config,
          siweConfig: { ...this.config?.siweConfig, ...overrides?.siwe },
        };
      }

      if (extension.namespace && extension.defaultActions) {
        const defaults = await extension.defaultActions();
        this.builder.addDefaultActions(extension.namespace, defaults);
      }

      if (extension.namespace && extension.extraFields) {
        const defaults = await extension.extraFields();
        this.builder.addExtraFields(extension.namespace, defaults);
      }

      if (extension.namespace && extension.targetedActions) {
        const targetedActions = await extension.targetedActions();
        for (const target in targetedActions) {
          this.builder.addTargetedActions(
            extension.namespace,
            target,
            targetedActions[target]
          );
        }
      }
    }
  }

  /**
   * ENS data supported by SSX.
   * @param address - User address.
   * @param resolveEnsOpts - Options to resolve ENS.
   * @returns Object containing ENS data.
   */
  public async resolveEns(
    /** User address */
    address: string,
    resolveEnsOpts: SSXEnsResolveOptions = {
      domain: true,
      avatar: true,
    }
  ): Promise<SSXEnsData> {
    return ssxResolveEns(this.provider, address, resolveEnsOpts);
  }

  /**
   * Resolves Lens profiles owned by the given Ethereum Address. Each request is
   * limited by 10. To get other pages you must to pass the pageCursor parameter.
   *
   * Lens profiles can be resolved on the Polygon Mainnet (matic) or Mumbai Testnet
   * (maticmum). Visit https://docs.lens.xyz/docs/api-links for more information.
   *
   * @param address - Ethereum User address.
   * @param pageCursor - Page cursor used to paginate the request. Default to
   * first page. Visit https://docs.lens.xyz/docs/get-profiles#api-details for more
   * information.
   * @returns Object containing Lens profiles items and pagination info.
   */
  public async resolveLens(
    /* Ethereum User Address. */
    address: string,
    /* Page cursor used to paginate the request. Default to first page. */
    pageCursor = '{}'
  ): Promise<string | SSXLensProfilesResponse> {
    return ssxResolveLens(this.provider, address, pageCursor);
  }

  /** Returns the address of the current signer */
  public address(): string | undefined {
    return this.userSession?.address;
  }

  /** Returns the current connected chain id */
  public chainId(): number | undefined {
    return this.userSession?.chainId;
  }

  public async getProvider(): Promise<providers.Web3Provider> {
    return this.provider;
  }

  public signUp(): Promise<any> {
    throw new Error('Method not implemented.');
  }

  public async signIn(): Promise<any> {
    await this.connect();
    try {
      // this.userSession = await this.connection.signIn();
      await this.afterConnectHooksPromise;
      const sessionKey = this.builder.jwk();
      if (sessionKey === undefined) {
        return Promise.reject(new Error('unable to retrieve session key'));
      }
      // const signer = await this.provider.getSigner();
      this.signer = new Web3Signer('', '', await this.provider.getSigner());
      const walletAddress = await this.signer.getAddress();
      const defaults = {
        address: this.config.siweConfig?.address ?? walletAddress,
        walletAddress,
        chainId: await this.signer.getChainId(),
        domain: globalThis.location.hostname,
        issuedAt: new Date().toISOString(),
        nonce: generateNonce(),
      };

      const serverNonce = await this.web3AuthUtils.ssxServerNonce(defaults);
      if (serverNonce) defaults.nonce = serverNonce;

      const siweConfig = merge(defaults, this.config.siweConfig);
      const siwe = await this.builder.build(siweConfig);
      const signature = await this.signer.signMessage(siwe);

      let session = {
        address: siweConfig.address,
        walletAddress,
        chainId: siweConfig.chainId,
        sessionKey,
        siwe,
        signature,
      };

      const response = await this.web3AuthUtils.ssxServerLogin(
        session,
        this.isExtensionEnabled
      );

      session = {
        ...session,
        ...response,
      };

      await this.afterSignIn(session);
      this.userSession = session;
    } catch (err) {
      // Request to /ssx-login went wrong
      console.error(err);
      throw err;
    }
    const promises = [];

    let resolveEnsOnClient = false;
    if (this.config.resolveEns) {
      if (this.config.resolveEns === true) {
        resolveEnsOnClient = true;
        promises.push(this.resolveEns(this.userSession.address));
      } else if (!this.config.resolveEns.resolveOnServer) {
        resolveEnsOnClient = true;

        promises.push(
          this.resolveEns(
            this.userSession.address,
            this.config.resolveEns.resolve
          )
        );
      }
    }

    const resolveLensOnClient = this.config.resolveLens === true;
    if (resolveLensOnClient) {
      promises.push(this.resolveLens(this.userSession.address));
    }

    await Promise.all(promises).then(([ens, lens]) => {
      if (!resolveEnsOnClient && resolveLensOnClient) {
        [ens, lens] = [undefined, ens];
      }
      if (ens) {
        this.userSession.ens = ens;
      }
      if (lens) {
        this.userSession.lens = lens;
      }
    });

    return this.userSession;
  }

  /**
   * Applies the "afterSignIn" methods of the extensions.
   * @param session - SSXClientSession object.
   */
  public async afterSignIn(session: SSXClientSession): Promise<void> {
    for (const extension of this.extensions) {
      if (extension.afterSignIn) {
        await extension.afterSignIn(session);
      }
    }
  }

  public async signOut(): Promise<any> {
    try {
      await this.web3AuthUtils.ssxServerLogout(this.userSession);
    } catch (err) {
      // request to /ssx-logout went wrong
      console.error(err);
      throw err;
    }
    this.userSession = undefined;
    this.connected = false;
  }

  public getSigner(): Web3Signer {
    return this.signer;
  }

  public getSession(): any {
    throw new Error('Method not implemented.');
  }

  public getClientSession(): SSXClientSession {
    return this.userSession;
  }

  public getConfig(): SSXClientConfig {
    return this.config;
  }
}

class Web3AuthUtils extends IWeb3AuthUtils implements IWeb3AuthUtils {
  /** Axios instance. */
  public api?: AxiosInstance;

  constructor(config: SSXClientConfig) {
    super();
    this.config = config;
    if (config.providers?.server?.host) {
      this.api = axios.create({
        baseURL: config.providers.server.host,
        withCredentials: true,
      });
    }
  }

  /**
   * Requests nonce from server.
   * @param params - Request params.
   * @returns Promise with nonce.
   */
  public async ssxServerNonce(params: Record<string, any>): Promise<string> {
    const route = this.config.providers?.server?.routes?.nonce ?? '/ssx-nonce';
    const requestConfig = isSSXRouteConfig(route)
      ? {
          customAPIOperation: undefined,
          ...route,
        }
      : {
          customAPIOperation: undefined,
          url: route,
        };

    const { customAPIOperation } = requestConfig;
    if (customAPIOperation) {
      return customAPIOperation(params);
    }

    if (this.api) {
      let nonce;

      try {
        nonce = (
          await this.api.request({
            method: 'get',
            url: '/ssx-nonce',
            ...requestConfig,
            params,
          })
        ).data;
      } catch (error) {
        console.error(error);
        throw error;
      }
      if (!nonce) {
        throw new Error('Unable to retrieve nonce from server.');
      }
      return nonce;
    }
  }

  /**
   * Requests sign in from server and returns session.
   * @param session - SSXClientSession object.
   * @returns Promise with server session data.
   */
  public async ssxServerLogin(
    session: SSXClientSession,
    isExtensionEnabled: (string) => boolean
  ): Promise<any> {
    const route = this.config.providers?.server?.routes?.login ?? '/ssx-login';
    const requestConfig = isSSXRouteConfig(route)
      ? {
          customAPIOperation: undefined,
          ...route,
        }
      : {
          customAPIOperation: undefined,
          url: route,
        };
    const { customAPIOperation } = requestConfig;

    if (customAPIOperation) {
      return customAPIOperation(session);
    }

    if (this.api) {
      let resolveEns: boolean | SSXEnsResolveOptions = false;
      if (
        typeof this.config.resolveEns === 'object' &&
        this.config.resolveEns.resolveOnServer
      ) {
        resolveEns = this.config.resolveEns.resolve;
      }

      const resolveLens: boolean = this.config.resolveLens === 'onServer';

      try {
        const data = {
          signature: session.signature,
          siwe: session.siwe,
          address: session.address,
          walletAddress: session.walletAddress,
          chainId: session.chainId,
          daoLogin: isExtensionEnabled('delegationRegistry'),
          resolveEns,
          resolveLens,
        };
        // TODO: figure out how to send a custom sessionKey
        return this.api
          .request({
            method: 'post',
            url: '/ssx-login',
            ...requestConfig,
            data,
          })
          .then(response => response.data);
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  }

  public async ssxServerLogout(session: SSXClientSession): Promise<void> {
    // get request configuration
    const route =
      this.config.providers?.server?.routes?.logout ?? '/ssx-logout';
    const requestConfig = isSSXRouteConfig(route)
      ? {
          customAPIOperation: undefined,
          ...route,
        }
      : {
          customAPIOperation: undefined,
          url: route,
        };
    // check if we should run a custom operation instead
    const { customAPIOperation } = requestConfig;

    if (customAPIOperation) {
      return customAPIOperation(session);
    }

    if (this.api) {
      try {
        const data = { ...session };

        await this.api.request({
          method: 'post',
          url: '/ssx-logout',
          ...requestConfig,
          data,
        });
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  }
}
