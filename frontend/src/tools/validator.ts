import { t } from "@/lang/i18n";
import { notification } from "ant-design-vue";
import { h } from "vue";
import { CloseCircleOutlined, WarningOutlined } from "@ant-design/icons-vue";

export function emptyValueValidator(value: string | number) {
  if (String(value).trim() === "") throw new Error(t("TXT_CODE_cb08d342"));
  return Promise.resolve();
}

export function isNumberValidator(value: any) {
  if (!value || isNaN(Number(value))) throw new Error(t("TXT_CODE_a9bcbde9"));
  return Promise.resolve();
}

export function getValidatorErrorMsg(error: any, def: string = "") {
  if (error.message) {
    return error.message;
  }
  if (error.errorFields instanceof Array) {
    return String(error.errorFields[0]?.errors[0] || "");
  }
  if (error === null || error === undefined) {
    return def;
  }
  return String(error);
}

// Modern industrial error notification
function showIndustrialError(errorMsg: string, isValidation: boolean = false) {
  notification.open({
    message: h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#fff',
        fontWeight: '600',
        fontSize: '16px'
      }
    }, [
      h(isValidation ? WarningOutlined : CloseCircleOutlined, {
        style: {
          fontSize: '24px',
          color: isValidation ? '#faad14' : '#ff4d4f'
        }
      }),
      isValidation ? 'Validation Error' : 'Error'
    ]),
    description: h('div', {
      style: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: '14px',
        lineHeight: '1.6',
        marginTop: '8px',
        padding: '12px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        borderLeft: `3px solid ${isValidation ? '#faad14' : '#ff4d4f'}`
      }
    }, errorMsg),
    style: {
      background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.98) 0%, rgba(40, 40, 40, 0.98) 100%)',
      border: `1px solid ${isValidation ? 'rgba(250, 173, 20, 0.5)' : 'rgba(255, 77, 79, 0.5)'}`,
      borderRadius: '12px',
      boxShadow: `0 8px 32px ${isValidation ? 'rgba(250, 173, 20, 0.3)' : 'rgba(255, 77, 79, 0.3)'}`,
      padding: '16px 20px'
    },
    duration: 4.5,
    placement: 'topRight'
  });
}

export function reportValidatorError(error: any) {
  console.error("Function reportValidatorError():", error);
  const errorMsg = getValidatorErrorMsg(error, t("TXT_CODE_6a365d01"));
  showIndustrialError(errorMsg, true);
}

export function reportErrorMsg(error: any = {}) {
  console.error("Function reportErrorMsg():", error);
  const errorMsg = getValidatorErrorMsg(error, t("TXT_CODE_6a365d01"));
  showIndustrialError(errorMsg, false);
}

export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\x00-\x7F]{9,36}$/;

export function isLocalNetworkIP(ip: string): boolean {
  // Return false if empty string or invalid format
  if (!ip || typeof ip !== "string") {
    return false;
  }

  // Trim leading and trailing whitespace
  ip = ip.trim();

  // IPv4 address format check
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    const parts = ip.split(".").map(Number);

    // Check if valid IPv4 address (each part should be in 0-255 range)
    if (parts.some((part) => part < 0 || part > 255)) {
      return false;
    }

    const [first, second, third, fourth] = parts;

    // Private network address ranges
    // 10.0.0.0/8 (Class A)
    if (first === 10) {
      return true;
    }

    // 172.16.0.0/12 (Class B)
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }

    // 192.168.0.0/16 (Class C)
    if (first === 192 && second === 168) {
      return true;
    }

    // Loopback address 127.0.0.0/8
    if (first === 127) {
      return true;
    }

    // Link-local address 169.254.0.0/16
    if (first === 169 && second === 254) {
      return true;
    }

    // Multicast address 224.0.0.0/4
    if (first >= 224 && first <= 239) {
      return true;
    }

    // Reserved addresses
    // 0.0.0.0/8 (current network)
    if (first === 0) {
      return true;
    }

    // 255.255.255.255 (broadcast address)
    if (first === 255 && second === 255 && third === 255 && fourth === 255) {
      return true;
    }
  }

  // IPv6 address check
  if (ip.includes(":")) {
    // Local loopback address
    if (ip === "::1") {
      return true;
    }

    // Link-local address fe80::/10
    if (
      ip.toLowerCase().startsWith("fe80:") ||
      ip.toLowerCase().startsWith("fe8") ||
      ip.toLowerCase().startsWith("fe9") ||
      ip.toLowerCase().startsWith("fea") ||
      ip.toLowerCase().startsWith("feb")
    ) {
      return true;
    }

    // Unique local address fc00::/7
    if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd")) {
      return true;
    }

    // Site-local address fec0::/10 (deprecated but still need to check)
    if (
      ip.toLowerCase().startsWith("fec") ||
      ip.toLowerCase().startsWith("fed") ||
      ip.toLowerCase().startsWith("fee") ||
      ip.toLowerCase().startsWith("fef")
    ) {
      return true;
    }

    // Multicast address ff00::/8
    if (ip.toLowerCase().startsWith("ff")) {
      return true;
    }

    // Unspecified address
    if (ip === "::" || ip === "0:0:0:0:0:0:0:0") {
      return true;
    }
  }

  return false;
}
