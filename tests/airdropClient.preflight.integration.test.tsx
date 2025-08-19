import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./utils/renderWithProviders";
import { airdropApi } from "@/services/airdropApi";
// NOTE: We will dynamically import AirdropClient AFTER mocks are defined to avoid hoisting issues
let AirdropClient: any;

// Mock the UI Button import used by the component to avoid Tailwind specifics
vi.mock("@/components/ui/Button", () => ({
  Button: (props: any) => <button {...props} />,
}));

// Mock tooltip exports
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

// Mock farcaster SDK
vi.mock("@farcaster/frame-sdk", () => ({
  default: {
    actions: { ready: vi.fn(), openUrl: vi.fn(), composeCast: vi.fn() },
    isInMiniApp: vi.fn(async () => false),
    context: Promise.resolve({ user: null }),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

// Mock image component
vi.mock("next/image", () => ({
  default: (props: any) => <img alt={props.alt || ""} />,
}));

// Mock Privy hooks
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ready: true, authenticated: true, login: vi.fn() }),
  useWallets: () => ({ wallets: [{ address: "0xabc" }] }),
  useLogout: () => ({ logout: vi.fn() }),
}));

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xabc", isConnected: true }),
  useReadContract: () => ({ data: BigInt(12_000_000), isLoading: false }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
}));

// Mock airdropApi snapshot (define inside factory to avoid hoist reference errors)
vi.mock("@/services/airdropApi", () => {
  return {
    airdropApi: {
      verifyFarcasterFollow: vi.fn(),
      verifyFarcasterFollowByUsername: vi.fn(),
      initializeParticipant: vi.fn(),
      verifyTwitterFollow: vi.fn(),
      registerSocialTask: vi.fn(),
      updateBalance: vi.fn(),
      getParticipantSnapshot: vi.fn(async () => ({
        success: true,
        fid: 1,
        tasks: {
          "follow-farcaster": { completed: true },
          "follow-twitter": { completed: true },
          "share-social": { completed: false },
        },
      })),
    },
  };
});

describe("AirdropClient preflight integration", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks claim with missing tasks (web path)", async () => {
    // Dynamically import after mocks are set up
    const mod = await import("@/components/AirdropClient");
    AirdropClient = (mod as any).default;
    const apiMod = await import("@/services/airdropApi");
    const api = (apiMod as any).airdropApi;
    renderWithProviders(<AirdropClient sharedFid={null} />);
    const claim = await screen.findByRole("button", { name: /claim airdrop/i });
    fireEvent.click(claim);
    // Assert spinner text shows (indicates handleClaimAirdrop kicked off)
    await screen.findByText(/checking requirements/i);

    await waitFor(
      () => {
        expect(api.getParticipantSnapshot).toHaveBeenCalled();
      },
      { timeout: 5000 }
    );
  }, 20000);
});
