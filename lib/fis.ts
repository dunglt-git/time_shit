import https from "node:https";
import axios, { AxiosError } from "axios";

export const LOGIN_ENDPOINT = "https://ddc.fis.vn/fis0/api/login";
export const LOGIN_AZURE_ENDPOINT =
  "https://ddc.fis.vn/fis0/api/login_azure";
export const CHECK_IN_ENDPOINT = "https://ddc.fis.vn/fis0/api/checkin_all";
export const CHECK_OUT_ENDPOINT = "https://ddc.fis.vn/fis0/api/checkout_all";

// The FIS endpoint occasionally has cert chain issues; allow self-signed
// in this self-hosted, single-user tool. Keep this server-only.
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Device payload defaults (override via env if needed).
const env = (key: string, fallback: string) => process.env[key] ?? fallback;

const DEVICE = {
  deviceId: env("FIS_DEVICE_ID", "4275BB8E-48ED-4C33-81D9-E504158D3ABC"),
  deviceName: env("FIS_DEVICE_NAME", "iPhone16,2"),
  ipGateway: env("FIS_IP_GATEWAY", "10.15.0.1"),
  dataPrivate: env(
    "FIS_DATA_PRIVATE",
    "ShclQENH41t87LEgRpnp7zK8u6hehDklJG2PIQJ4MlErAOuraoanaHl+JJD0rJhw\r\nWg9LKcCgCofgUKrgWsnOK4N4msxqs/vG1yORA+hf2xISZHh6yMW6CrOLjpBAbgPz\r\nrYhcg6/Poo7lfbnciQF2T2MrJtxYwBPo22mlEW03yi8="
  ),
};

const LOGIN_EXTRA = {
  buildNumber: env("FIS_BUILD_NUMBER", "11258"),
  version: env("FIS_VERSION", "1.131"),
  deviceIP: env("FIS_DEVICE_IP", "10.15.0.182"),
  deviceModel: env("FIS_DEVICE_MODEL", "unknown"),
  osVersion: env("FIS_OS_VERSION", "17.6.1"),
};

const AZURE_LOGIN_EXTRA = {
  buildNumber: env("FIS_AZURE_BUILD_NUMBER", "11318"),
  version: env("FIS_AZURE_VERSION", "1.154"),
};

const buildHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    Host: "ddc.fis.vn",
    Connection: "keep-alive",
    Accept: "*/*",
    "User-Agent": "FIS/11229 CFNetwork/1474 Darwin/23.0.0",
    "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const buildAzureHeaders = () => ({
  ...buildHeaders(),
  "User-Agent": env(
    "FIS_AZURE_USER_AGENT",
    "FIS/11318 CFNetwork/3860.500.112 Darwin/25.4.0",
  ),
});

const extractLoginToken = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const root = data as Record<string, unknown>;
  const nested = root.data;
  if (nested && typeof nested === "object") {
    const inner = nested as Record<string, unknown>;
    if (typeof inner.token === "string" && inner.token) return inner.token;
    if (typeof inner.access_token === "string" && inner.access_token) {
      return inner.access_token;
    }
  }
  if (typeof root.token === "string" && root.token) return root.token;
  if (typeof root.access_token === "string" && root.access_token) {
    return root.access_token;
  }
  return undefined;
};

const normalizeError = (err: unknown) => {
  if (err instanceof AxiosError) {
    return {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    };
  }
  if (err instanceof Error) return { message: err.message };
  return { message: "Unknown error" };
};

export type LoginResult =
  | { ok: true; token: string; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

export const login = async (
  username: string,
  password: string
): Promise<LoginResult> => {
  try {
    const { data } = await axios.post(
      LOGIN_ENDPOINT,
      { username, password, ...LOGIN_EXTRA },
      { httpsAgent, headers: buildHeaders(), timeout: 15_000 }
    );
    const token = extractLoginToken(data);
    if (!token) {
      return {
        ok: false,
        error: data?.message || "Login failed: no token returned",
        raw: data,
      };
    }
    return { ok: true, token, raw: data };
  } catch (err) {
    const e = normalizeError(err);
    return { ok: false, error: e.message, raw: e.data };
  }
};

export const loginAzure = async (
  refreshToken: string,
): Promise<LoginResult> => {
  try {
    const { data } = await axios.post(
      LOGIN_AZURE_ENDPOINT,
      {
        username: null,
        password: null,
        azure: true,
        token: refreshToken,
        type: "refresh_token",
        ...AZURE_LOGIN_EXTRA,
      },
      { httpsAgent, headers: buildAzureHeaders(), timeout: 15_000 },
    );
    const token = extractLoginToken(data);
    if (!token) {
      return {
        ok: false,
        error:
          (typeof data === "object" &&
            data !== null &&
            "message" in data &&
            typeof (data as { message?: unknown }).message === "string" &&
            (data as { message: string }).message) ||
          "Azure login failed: no access token returned",
        raw: data,
      };
    }
    return { ok: true, token, raw: data };
  } catch (err) {
    const e = normalizeError(err);
    return { ok: false, error: e.message, raw: e.data };
  }
};

export type CheckAction = "in" | "out";

export type CheckResult = {
  ok: boolean;
  message: string;
  raw?: unknown;
};

export const check = async (
  token: string,
  action: CheckAction
): Promise<CheckResult> => {
  const url = action === "in" ? CHECK_IN_ENDPOINT : CHECK_OUT_ENDPOINT;
  try {
    const { data } = await axios.post(
      url,
      { ...DEVICE, type: 0, isCheckDevice: false },
      { httpsAgent, headers: buildHeaders(token), timeout: 15_000 }
    );

    // FIS uses resultCode: 1 = success, -1 = failure (except the
    // "already checked in" message which we treat as success).
    const alreadyDone =
      data?.resultCode === -1 &&
      typeof data?.message === "string" &&
      /đã check/i.test(data.message);

    const ok = data?.resultCode === 1 || alreadyDone;
    return {
      ok,
      message: data?.message || (ok ? "Success" : "Failed"),
      raw: data,
    };
  } catch (err) {
    const e = normalizeError(err);
    return { ok: false, message: e.message, raw: e.data };
  }
};
