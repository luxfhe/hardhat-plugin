declare module "@luxfhe/sdk/node" {
  export interface FHEError {
    code: string;
    message: string;
  }

  export type Result<T> =
    | { success: true; data: T; error: null }
    | { success: false; data: null; error: FHEError };

  export interface Permit {
    serialize(): object;
    getHash(): string;
  }

  export type Environment = "MOCK" | "LOCAL" | "TESTNET" | "MAINNET";

  export interface AbstractProvider {
    getChainId(): Promise<string>;
    call(tx: { to: string; data: string }): Promise<string>;
    send(method: string, params: unknown[]): Promise<unknown>;
  }

  export interface AbstractSigner {
    getAddress(): Promise<string>;
    signTypedData(
      domain: object,
      types: Record<string, Array<object>>,
      value: object
    ): Promise<string>;
    provider: AbstractProvider;
    sendTransaction(tx: { to: string; data: string }): Promise<string>;
  }

  export interface InitializationParams {
    provider: AbstractProvider;
    signer?: AbstractSigner;
    securityZones?: number[];
    environment?: Environment;
    fheServerUrl?: string;
    verifierUrl?: string;
    thresholdNetworkUrl?: string;
    tfhePublicKeySerializer?: (buff: Uint8Array) => void;
    compactPkeCrsSerializer?: (buff: Uint8Array) => void;
    mockConfig?: {
      decryptDelay?: number;
      zkvSigner?: AbstractSigner;
    };
  }

  export const luxfhe: {
    initialize(params: InitializationParams): Promise<Permit | undefined>;
  };
}
