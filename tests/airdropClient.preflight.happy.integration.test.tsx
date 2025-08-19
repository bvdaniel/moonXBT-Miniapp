import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "./utils/renderWithProviders";

// Mock atoms used by the component
vi.mock("@/components/ui/Button", () => ({
  Button: (p: any) => <button {...p} />,
}));
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));
vi.mock("next/image", () => ({
  default: (props: any) => <img alt={props.alt || ""} />,
}));

// Mock external env
vi.mock("@farcaster/frame-sdk", () => ({
  default: {
    actions: { ready: vi.fn(), openUrl: vi.fn(), composeCast: vi.fn() },
    isInMiniApp: vi.fn(async () => false),
    context: Promise.resolve({ user: null }),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ ready: true, authenticated: true, login: vi.fn() }),
  useWallets: () => ({ wallets: [{ address: "0xabc" }] }),
  useLogout: () => ({ logout: vi.fn() }),
}));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xabc", isConnected: true }),
  // Simulate 12,000,000 tokens with 18 decimals (ERC20)
  useReadContract: () => ({
    data: BigInt(12_000_000) * 10n ** 18n,
    isLoading: false,
  }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
}));

// Mock airdropApi with all required tasks completed for web
vi.mock("@/services/airdropApi", () => ({
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
        "follow-twitter": { completed: true },
        "share-social": { completed: true },
      },
    })),
  },
}));

describe("AirdropClient claim happy path integration", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.restoreAllMocks());

  it("proceeds to claim when all required are complete (web)", async () => {
    const mod = await import("@/components/AirdropClient");
    const AirdropClient = (mod as any).default;
    renderWithProviders(<AirdropClient sharedFid={null} />);

    const claim = await screen.findByRole("button", { name: /claim airdrop/i });
    fireEvent.click(claim);

    // spinner text shows
    await screen.findByText(/checking requirements/i, { timeout: 5000 });
    // success message appears (from demo stub) – be flexible to wrapping
    const container = await screen.findByText(/AIRDROP/i, { selector: "h1" });
    // Walk up to the main container
    const root = container.closest("main") as HTMLElement;
    await waitFor(
      () => {
        const text = root.textContent || "";
        const ok =
          /initiated/i.test(text) ||
          /All required tasks are complete/i.test(text);
        expect(ok).toBe(true);
      },
      { timeout: 5000 }
    );
  }, 20000);
});
