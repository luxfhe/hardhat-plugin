import { FHE_NETWORK_ADDRESS, ZK_VERIFIER_ADDRESS } from "./addresses";
import { expect } from "chai";
import { ethers } from "ethers";
import { HardhatEthersProvider } from "@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider";

const mock_checkIsTestnet = async (
  fnName: string,
  provider: HardhatEthersProvider | ethers.JsonRpcProvider,
) => {
  // Testnet is checked by testing if MockZkVerifier is deployed

  // Get bytecode at ZK_VERIFIER_ADDRESS
  const bytecode = await provider.getCode(ZK_VERIFIER_ADDRESS);

  // If bytecode is empty, we are on a testnet
  const isTestnet = bytecode.length === 0;

  // Log if we are on a testnet
  if (isTestnet) {
    console.log(`${fnName} - skipped on non-testnet chain`);
  }

  return isTestnet;
};

export const mock_getPlaintext = async (
  provider: HardhatEthersProvider | ethers.JsonRpcProvider,
  ctHash: bigint,
) => {
  // Skip with log if called on a non-testnet chain
  if (await mock_checkIsTestnet(mock_getPlaintext.name, provider)) return;

  // Connect to MockFHENetwork (contract still named TaskManager in Solidity)
  const fheNetwork = new ethers.Contract(
    FHE_NETWORK_ADDRESS,
    ["function mockStorage(uint256) view returns (uint256)"],
    provider,
  );

  // Fetch the plaintext
  const plaintext = await fheNetwork.mockStorage(ctHash);

  return plaintext;
};

export const mock_getPlaintextExists = async (
  provider: HardhatEthersProvider | ethers.JsonRpcProvider,
  ctHash: bigint,
) => {
  // Skip with log if called on a non-testnet chain
  if (await mock_checkIsTestnet(mock_getPlaintextExists.name, provider)) return;

  // Connect to MockFHENetwork (contract still named TaskManager in Solidity)
  const fheNetwork = new ethers.Contract(
    FHE_NETWORK_ADDRESS,
    ["function inMockStorage(uint256) view returns (bool)"],
    provider,
  );

  // Fetch the plaintext exists
  const plaintextExists = await fheNetwork.inMockStorage(ctHash);

  return plaintextExists;
};

export const mock_expectPlaintext = async (
  provider: HardhatEthersProvider | ethers.JsonRpcProvider,
  ctHash: bigint,
  expectedValue: bigint,
) => {
  // Skip with log if called on a non-testnet chain
  if (await mock_checkIsTestnet(mock_expectPlaintext.name, provider)) return;

  // Expect the plaintext to exist
  const plaintextExists = await mock_getPlaintextExists(provider, ctHash);
  expect(plaintextExists).equal(true, "Plaintext does not exist");

  // Expect the plaintext to have the expected value
  const plaintext = await mock_getPlaintext(provider, ctHash);
  expect(plaintext).equal(expectedValue, "Plaintext value is incorrect");
};
