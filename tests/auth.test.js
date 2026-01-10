import { describe, expect, it, vi } from "vitest";

// We need to test the pure functions from auth.js
// Import them after mocking dependencies
vi.mock("./database", () => ({}));
vi.mock("passport", () => ({
  default: { use: vi.fn(), serializeUser: vi.fn(), deserializeUser: vi.fn() },
}));
vi.mock("passport-local", () => ({ Strategy: vi.fn() }));
vi.mock("bcrypt", () => ({ hash: vi.fn(), compare: vi.fn() }));

const {
  canResendVerification,
  getResendWaitMinutes,
  canResendReset,
  getResetWaitMinutes,
  isTokenExpired,
  RESEND_RATE_LIMIT_MINUTES,
  RESET_RATE_LIMIT_MINUTES,
} = require("../auth");

describe("Auth Helper Functions", () => {
  describe("isTokenExpired", () => {
    it("should return true when expiryDate is null", () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    it("should return true when expiryDate is undefined", () => {
      expect(isTokenExpired(undefined)).toBe(true);
    });

    it("should return true when token has expired", () => {
      const pastDate = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      expect(isTokenExpired(pastDate)).toBe(true);
    });

    it("should return false when token has not expired", () => {
      const futureDate = new Date(Date.now() + 60000).toISOString(); // 1 minute from now
      expect(isTokenExpired(futureDate)).toBe(false);
    });

    it("should handle edge case at exact expiry time", () => {
      // Token expires right now - should be considered expired
      const now = new Date().toISOString();
      // Due to execution time, this might be true or false, so we just check it doesn't throw
      expect(() => isTokenExpired(now)).not.toThrow();
    });
  });

  describe("canResendVerification", () => {
    it("should return true when verificationSentAt is null", () => {
      expect(canResendVerification(null)).toBe(true);
    });

    it("should return true when verificationSentAt is undefined", () => {
      expect(canResendVerification(undefined)).toBe(true);
    });

    it("should return false when less than rate limit minutes have passed", () => {
      const recentTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
      expect(canResendVerification(recentTime)).toBe(false);
    });

    it("should return true when more than rate limit minutes have passed", () => {
      const oldTime = new Date(
        Date.now() - (RESEND_RATE_LIMIT_MINUTES + 1) * 60000,
      ).toISOString();
      expect(canResendVerification(oldTime)).toBe(true);
    });

    it("should return true when exactly rate limit minutes have passed", () => {
      const exactTime = new Date(
        Date.now() - RESEND_RATE_LIMIT_MINUTES * 60000,
      ).toISOString();
      expect(canResendVerification(exactTime)).toBe(true);
    });
  });

  describe("getResendWaitMinutes", () => {
    it("should return 0 when verificationSentAt is null", () => {
      expect(getResendWaitMinutes(null)).toBe(0);
    });

    it("should return 0 when verificationSentAt is undefined", () => {
      expect(getResendWaitMinutes(undefined)).toBe(0);
    });

    it("should return remaining minutes when recently sent", () => {
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const waitMinutes = getResendWaitMinutes(oneMinuteAgo);
      // Should be approximately RESEND_RATE_LIMIT_MINUTES - 1
      expect(waitMinutes).toBeGreaterThan(0);
      expect(waitMinutes).toBeLessThanOrEqual(RESEND_RATE_LIMIT_MINUTES);
    });

    it("should return 0 or negative when enough time has passed", () => {
      const longAgo = new Date(
        Date.now() - (RESEND_RATE_LIMIT_MINUTES + 5) * 60000,
      ).toISOString();
      const waitMinutes = getResendWaitMinutes(longAgo);
      expect(waitMinutes).toBeLessThanOrEqual(0);
    });
  });

  describe("canResendReset", () => {
    it("should return true when resetTokenExpires is null", () => {
      expect(canResendReset(null)).toBe(true);
    });

    it("should return true when resetTokenExpires is undefined", () => {
      expect(canResendReset(undefined)).toBe(true);
    });

    it("should return false when reset was recently requested", () => {
      // Token expires in 1 hour (RESET_TOKEN_EXPIRY_HOURS = 1)
      // So if we set expiry to 1 hour from now, it means it was just sent
      const expiresInOneHour = new Date(
        Date.now() + 60 * 60 * 1000,
      ).toISOString();
      expect(canResendReset(expiresInOneHour)).toBe(false);
    });

    it("should return true when enough time has passed since reset request", () => {
      // If expiry is in the past, the token was sent more than 1 hour ago
      // which is definitely more than RESET_RATE_LIMIT_MINUTES
      const expiredLongAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      expect(canResendReset(expiredLongAgo)).toBe(true);
    });
  });

  describe("getResetWaitMinutes", () => {
    it("should return 0 when resetTokenExpires is null", () => {
      expect(getResetWaitMinutes(null)).toBe(0);
    });

    it("should return 0 when resetTokenExpires is undefined", () => {
      expect(getResetWaitMinutes(undefined)).toBe(0);
    });

    it("should return remaining minutes when recently requested", () => {
      // Token expires in 1 hour means it was just sent
      const expiresInOneHour = new Date(
        Date.now() + 60 * 60 * 1000,
      ).toISOString();
      const waitMinutes = getResetWaitMinutes(expiresInOneHour);
      expect(waitMinutes).toBeGreaterThan(0);
      expect(waitMinutes).toBeLessThanOrEqual(RESET_RATE_LIMIT_MINUTES);
    });
  });
});
