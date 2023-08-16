import {
  SSXClientSession,
} from '@spruceid/ssx-core/client';
// import { ISSXSigner } from './SSXSigner';
// import { ISSXSession } from './SSXSession';

/** 
 * IAuth
 * All auth modules must implement/extend the IAuth interface.
 * Only these methods will be available in the root object. 
 */
export abstract class IAuth {
  abstract signUp(): Promise<any>;
  abstract signIn(): Promise<any>;
  abstract signOut(): Promise<any>;
  abstract getSigner(): any;
  abstract getSession(): any;
  abstract getClientSession(): SSXClientSession;
}
