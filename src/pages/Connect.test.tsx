import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { Connect } from "../pages/Connect";
import { authEngine } from "../engines/auth";

vi.mock("../engines/auth", () => ({
  authEngine: {
    list: vi.fn(),
    connectAndSignIn: vi.fn(),
  },
}));

const mockList = vi.mocked(authEngine.list);
const mockConnectAndSignIn = vi.mocked(authEngine.connectAndSignIn);

function renderConnect(onComplete = vi.fn()) {
  return render(
    <BrowserRouter>
      <Connect onComplete={onComplete} />
    </BrowserRouter>
  );
}

describe("Connect page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockList.mockResolvedValue([
      { name: "Solflare", icon: "", readyState: "Installed" },
      { name: "Backpack", icon: "", readyState: "Installed" },
    ]);
    mockConnectAndSignIn.mockResolvedValue({
      publicKey: "test-pubkey",
      address: "test-pubkey",
      network: "devnet",
    });
  });

  it("renders wallet list and connect buttons", async () => {
    renderConnect();

    await waitFor(() => {
      expect(screen.getByText("Connect your wallet")).toBeTruthy();
    });

    // Get buttons by role and filter for wallet buttons (exclude Try again button)
    const buttons = screen.getAllByRole("button").filter(b => b.textContent?.includes("Solflare") || b.textContent?.includes("Backpack"));
    expect(buttons).toHaveLength(2);
  });

  it("shows message when no wallets detected", async () => {
    mockList.mockResolvedValueOnce([]);
    renderConnect();

    await waitFor(() => {
      expect(screen.getByText("No wallets detected. Install a Solana wallet and refresh.")).toBeTruthy();
    });
  });
});