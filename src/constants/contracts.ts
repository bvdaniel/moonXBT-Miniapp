export const A0X_CONTRACT_ADDRESS = '0x820C5F0fB255a1D18fd0eBB0F1CCefbC4D546dA7' as const;
export const AUCTION_CONTRACT_ADDRESS = '0x...' as const; // Replace with actual auction contract address

export const AUCTION_ABI = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256'
      }
    ],
    name: 'placeBid',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const; 