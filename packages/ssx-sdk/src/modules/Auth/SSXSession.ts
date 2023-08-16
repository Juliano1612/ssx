// import { 
//   // SSXClientConfig, 
//   SSXClientSession
// } from "@spruceid/ssx-core/client";
// import { ISSXSigner } from "./SSXSigner";

// /** =======SUGGESTION===== */
// /** Core config for SSX. */
// export interface SSXClientConfig {
//     web3: {
//       driver?: SSXProviderWeb3 | SSXRPCProvider,
//       enableDaoLogin?: boolean;
//       siweConfig?: SiweConfig;
//       resolveEns?: boolean | SSXEnsConfig;
//       resolveLens?: boolean | 'onServer';
//       modules?: SSXModuleConfig
//     },
//     server: {
//       host: string;
//       routes?: any;
//     },
//     webAuthn: {
//       usePRF: boolean;
//       userVerification: any;
//       register: {
//         authenticatorAttachment: any;
//         residentKey: any;
//         attestation: any;
//       },
//       login: {
//         transports: any;
//         autoFill: boolean;
//       },
//       modules?: SSXModuleConfig
//     },
//     modules?: SSXModuleConfig;
// }

// /**
//  * ISSXSession
//  * A class representing an active session, instantiated from
//  * either SSX.signIn or directly via constructor (e.g. when 
//  * using a sharing link)
//  */
// export interface ISSXSession {
//   ssxConfig: SSXClientConfig;
//   ssxClientSession: SSXClientSession;
//   ssxSigner: ISSXSigner;
// }
