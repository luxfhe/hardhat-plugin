import { HardhatRuntimeEnvironment } from "hardhat/types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import {
  AbstractProvider,
  AbstractSigner,
  luxfhe,
  Environment,
  InitializationParams,
} from "@luxfhe/sdk/node";
import { TypedDataField } from "ethers";
import { MOCK_ZK_VERIFIER_SIGNER_ADDRESS } from "./const";

export const getLuxFHEEnvironmentFromNetwork = (
  network: string,
): Environment => {
  switch (network) {
    case "localluxfhe":
      return "LOCAL";
    case "hardhat":
    case "localhost":
      return "MOCK";
    case "arb-sepolia":
    case "eth-sepolia":
      return "TESTNET";
    default:
      throw new Error(`Unsupported network: ${network}`);
  }
};

export const isPermittedLuxFHEEnvironment = (
  hre: HardhatRuntimeEnvironment,
  env: string,
) => {
  switch (env) {
    case "LOCAL":
      return ["localluxfhe"].includes(hre.network.name);
    case "MOCK":
      return ["hardhat", "localhost"].includes(hre.network.name);
    case "TESTNET":
      return ["arb-sepolia", "eth-sepolia"].includes(hre.network.name);
    default:
      return false;
  }
};

export type HHSignerInitializationParams = Omit<
  InitializationParams,
  | "tfhePublicKeySerializer"
  | "compactPkeCrsSerializer"
  | "signer"
  | "provider"
  | "mockConfig"
> & {
  generatePermit?: boolean;
  environment?: Environment;
};

const hhSignerToLuxFHEProvider = (
  signer: HardhatEthersSigner,
): AbstractProvider => {
  const provider: AbstractProvider = {
    call: async (...args) => {
      try {
        return signer.provider.call(...args);
      } catch (e) {
        throw new Error(`luxfhe initializeWithHHSigner :: call :: ${e}`);
      }
    },
    getChainId: async () =>
      (await signer.provider.getNetwork()).chainId.toString(),
    send: async (...args) => {
      try {
        return signer.provider.send(...args);
      } catch (e) {
        throw new Error(`luxfhe initializeWithHHSigner :: send :: ${e}`);
      }
    },
  };
  return provider;
};

const hhSignerToLuxFHESigner = (
  signer: HardhatEthersSigner,
  provider: AbstractProvider,
): AbstractSigner => {
  const abstractSigner: AbstractSigner = {
    signTypedData: async (domain, types, value) =>
      signer.signTypedData(
        domain,
        types as Record<string, TypedDataField[]>,
        value,
      ),
    getAddress: async () => signer.getAddress(),
    provider,
    sendTransaction: async (...args) => {
      try {
        const tx = await signer.sendTransaction(...args);
        return tx.hash;
      } catch (e) {
        throw new Error(
          `luxfhe initializeWithHHSigner :: sendTransaction :: ${e}`,
        );
      }
    },
  };
  return abstractSigner;
};

export const luxfhe_initializeWithHardhatSigner = async (
  hre: HardhatRuntimeEnvironment,
  signer: HardhatEthersSigner,
  params?: HHSignerInitializationParams,
) => {
  const abstractProvider = hhSignerToLuxFHEProvider(signer);
  const abstractSigner = hhSignerToLuxFHESigner(signer, abstractProvider);

  const zkvHhSigner = await hre.ethers.getImpersonatedSigner(
    MOCK_ZK_VERIFIER_SIGNER_ADDRESS,
  );
  const zkvSigner = hhSignerToLuxFHESigner(zkvHhSigner, abstractProvider);

  return luxfhe.initialize({
    ...(params ?? {}),
    environment:
      params?.environment ??
      getLuxFHEEnvironmentFromNetwork((await signer.provider.getNetwork()).name),
    provider: abstractProvider,
    signer: abstractSigner,
    mockConfig: {
      zkvSigner,
    },
  });
};
