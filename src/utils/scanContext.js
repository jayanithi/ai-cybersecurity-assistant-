// src/utils/scanContext.js

// ============================================================
// STORAGE KEYS
// ============================================================

const SCAN_CONTEXT_STORAGE_KEY =
  "ai_cybersecurity_latest_scan_context";

const LEGACY_SCAN_CONTEXT_KEY =
  "ai_security_scan_context";

const SCAN_CONTEXT_UPDATED_EVENT =
  "ai-cybersecurity-scan-context-updated";


// ============================================================
// HELPER - GET FIRST VALID VALUE
// ============================================================

const getFirstValue = (...values) => {
  for (const value of values) {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      return value;
    }
  }

  return null;
};


// ============================================================
// NORMALIZE ONE VULNERABILITY
// ============================================================

export const normalizeVulnerability = (
  item = {},
  index = 0
) => {
  if (
    !item ||
    typeof item !== "object" ||
    Array.isArray(item)
  ) {
    return null;
  }

  // ----------------------------------------------------------
  // Nested vulnerability object
  // ----------------------------------------------------------

  const vulnerability =
    item?.vulnerability &&
    typeof item.vulnerability === "object" &&
    !Array.isArray(item.vulnerability)
      ? item.vulnerability
      : {};

  // ----------------------------------------------------------
  // Nested location object
  // ----------------------------------------------------------

  const location =
    item?.location &&
    typeof item.location === "object" &&
    !Array.isArray(item.location)
      ? item.location
      : {};

  // ----------------------------------------------------------
  // Vulnerability type
  // ----------------------------------------------------------

  const vulnerabilityType =
    typeof item?.vulnerability === "string"
      ? item.vulnerability
      : null;

  const nestedVulnerabilityType =
    typeof vulnerability?.vulnerability === "string"
      ? vulnerability.vulnerability
      : null;

  // ----------------------------------------------------------
  // Normalize vulnerability
  // ----------------------------------------------------------

  return {
    // --------------------------------------------------------
    // ID
    // --------------------------------------------------------

    id: getFirstValue(
      item?.id,
      item?._id,
      item?.vulnerability_id,
      item?.vulnerabilityId,

      vulnerability?.id,
      vulnerability?._id,
      vulnerability?.vulnerability_id,
      vulnerability?.vulnerabilityId,

      `vulnerability-${index}`
    ),

    // --------------------------------------------------------
    // TYPE
    // --------------------------------------------------------

    type: getFirstValue(
      item?.type,
      item?.name,
      item?.title,
      vulnerabilityType,
      item?.vulnerability_type,
      item?.vulnerabilityType,

      vulnerability?.type,
      vulnerability?.name,
      vulnerability?.title,
      nestedVulnerabilityType,
      vulnerability?.vulnerability_type,
      vulnerability?.vulnerabilityType,

      "Security Vulnerability"
    ),

    // --------------------------------------------------------
    // SEVERITY
    // --------------------------------------------------------

    severity: getFirstValue(
      item?.severity,
      item?.level,
      item?.risk,

      vulnerability?.severity,
      vulnerability?.level,
      vulnerability?.risk,

      "Unknown"
    ),

    // --------------------------------------------------------
    // LINE
    // --------------------------------------------------------

    line: getFirstValue(
      item?.line,
      item?.lineNumber,
      item?.line_number,
      item?.startLine,
      item?.start_line,
      item?.lineStart,
      item?.line_start,

      location?.line,
      location?.lineNumber,
      location?.line_number,
      location?.startLine,
      location?.start_line,

      vulnerability?.line,
      vulnerability?.lineNumber,
      vulnerability?.line_number,
      vulnerability?.startLine,
      vulnerability?.start_line,

      "Unknown"
    ),

    // --------------------------------------------------------
    // END LINE
    // --------------------------------------------------------

    endLine: getFirstValue(
      item?.endLine,
      item?.end_line,
      item?.lineEnd,
      item?.line_end,

      location?.endLine,
      location?.end_line,

      vulnerability?.endLine,
      vulnerability?.end_line,

      null
    ),

    // --------------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------------

    description: getFirstValue(
      item?.description,
      item?.message,
      item?.problem,
      item?.issue,
      item?.details,
      item?.reason,

      vulnerability?.description,
      vulnerability?.message,
      vulnerability?.problem,
      vulnerability?.issue,
      vulnerability?.details,
      vulnerability?.reason,

      "Security issue detected in the source code."
    ),

    // --------------------------------------------------------
    // PROBLEM
    // --------------------------------------------------------

    problem: getFirstValue(
      item?.problem,
      item?.issue,
      item?.message,
      item?.description,

      vulnerability?.problem,
      vulnerability?.issue,
      vulnerability?.message,
      vulnerability?.description,

      "Potential security vulnerability detected."
    ),

    // --------------------------------------------------------
    // RECOMMENDATION
    // --------------------------------------------------------

    recommendation: getFirstValue(
      item?.recommendation,
      item?.recommendations,
      item?.fix,
      item?.solution,
      item?.remediation,
      item?.secure_fix,
      item?.secureFix,

      vulnerability?.recommendation,
      vulnerability?.recommendations,
      vulnerability?.fix,
      vulnerability?.solution,
      vulnerability?.remediation,
      vulnerability?.secure_fix,
      vulnerability?.secureFix,

      "Review the vulnerable code and apply secure coding practices."
    ),

    // --------------------------------------------------------
    // CWE
    // --------------------------------------------------------

    cwe: getFirstValue(
      item?.cwe,
      item?.CWE,
      item?.cwe_id,
      item?.cweId,

      vulnerability?.cwe,
      vulnerability?.CWE,
      vulnerability?.cwe_id,
      vulnerability?.cweId,

      null
    ),

    // --------------------------------------------------------
    // OWASP
    // --------------------------------------------------------

    owasp: getFirstValue(
      item?.owasp,
      item?.owasp_category,
      item?.owaspCategory,

      vulnerability?.owasp,
      vulnerability?.owasp_category,
      vulnerability?.owaspCategory,

      null
    ),

    // --------------------------------------------------------
    // CATEGORY
    // --------------------------------------------------------

    category: getFirstValue(
      item?.category,
      vulnerability?.category,

      null
    ),

    // --------------------------------------------------------
    // CODE / SNIPPET
    // --------------------------------------------------------

    code: getFirstValue(
      item?.code,
      item?.codeSnippet,
      item?.code_snippet,
      item?.snippet,
      item?.source,

      vulnerability?.code,
      vulnerability?.codeSnippet,
      vulnerability?.code_snippet,
      vulnerability?.snippet,

      ""
    ),

    // --------------------------------------------------------
    // CONFIDENCE
    // --------------------------------------------------------

    confidence: getFirstValue(
      item?.confidence,
      vulnerability?.confidence,

      null
    ),
  };
};


// ============================================================
// GET RAW VULNERABILITIES
// ============================================================

const getRawVulnerabilities = (
  scanResult = {}
) => {
  if (
    !scanResult ||
    typeof scanResult !== "object" ||
    Array.isArray(scanResult)
  ) {
    return [];
  }

  // ----------------------------------------------------------
  // vulnerabilities
  // ----------------------------------------------------------

  if (
    Array.isArray(
      scanResult?.vulnerabilities
    )
  ) {
    return scanResult.vulnerabilities;
  }

  // ----------------------------------------------------------
  // issues
  // ----------------------------------------------------------

  if (
    Array.isArray(
      scanResult?.issues
    )
  ) {
    return scanResult.issues;
  }

  // ----------------------------------------------------------
  // findings
  // ----------------------------------------------------------

  if (
    Array.isArray(
      scanResult?.findings
    )
  ) {
    return scanResult.findings;
  }

  // ----------------------------------------------------------
  // results
  // ----------------------------------------------------------

  if (
    Array.isArray(
      scanResult?.results
    )
  ) {
    return scanResult.results;
  }

  return [];
};


// ============================================================
// NORMALIZE ALL VULNERABILITIES
// ============================================================

export const normalizeVulnerabilities = (
  scanResult = {}
) => {
  const rawVulnerabilities =
    getRawVulnerabilities(
      scanResult
    );

  return rawVulnerabilities
    .map(
      (item, index) =>
        normalizeVulnerability(
          item,
          index
        )
    )
    .filter(Boolean);
};


// ============================================================
// GET SCAN VULNERABILITIES
// ============================================================

export const getScanVulnerabilities = (
  scanResult = {}
) => {
  return normalizeVulnerabilities(
    scanResult
  );
};


// ============================================================
// CREATE SCAN CONTEXT
// ============================================================

export const createScanContext = ({
  scanResult = {},
  code = "",
  language = "",
  fileName = "Source Code",
  selectedVulnerability = null,
} = {}) => {
  if (
    !scanResult ||
    typeof scanResult !== "object" ||
    Array.isArray(scanResult)
  ) {
    return null;
  }

  // ----------------------------------------------------------
  // Vulnerabilities
  // ----------------------------------------------------------

  const vulnerabilities =
    normalizeVulnerabilities(
      scanResult
    );

  // ----------------------------------------------------------
  // Selected vulnerability
  // ----------------------------------------------------------

  const normalizedSelected =
    selectedVulnerability
      ? normalizeVulnerability(
          selectedVulnerability,
          -1
        )
      : null;

  // ----------------------------------------------------------
  // Scan ID
  // ----------------------------------------------------------

  const scanId =
    getFirstValue(
      scanResult?.scanId,
      scanResult?.scan_id,
      scanResult?.id,
      scanResult?._id,

      `scan-${Date.now()}`
    );

  // ----------------------------------------------------------
  // Language
  // ----------------------------------------------------------

  const normalizedLanguage =
    getFirstValue(
      language,
      scanResult?.language,
      scanResult?.programmingLanguage,
      scanResult?.programming_language,

      "Unknown"
    );

  // ----------------------------------------------------------
  // File name
  // ----------------------------------------------------------

  const normalizedFileName =
    getFirstValue(
      fileName,
      scanResult?.fileName,
      scanResult?.file_name,

      "Source Code"
    );

  // ----------------------------------------------------------
  // Source code
  // ----------------------------------------------------------

  const sourceCode =
    getFirstValue(
      code,
      scanResult?.sourceCode,
      scanResult?.source_code,
      scanResult?.code,

      ""
    );

  // ----------------------------------------------------------
  // Risk score
  // ----------------------------------------------------------

  const riskScore =
    getFirstValue(
      scanResult?.riskScore,
      scanResult?.risk_score,

      0
    );

  // ----------------------------------------------------------
  // Total issues
  // ----------------------------------------------------------

  const totalIssues =
    getFirstValue(
      scanResult?.totalIssues,
      scanResult?.total_issues,
      scanResult?.issueCount,
      scanResult?.issue_count,

      vulnerabilities.length,

      0
    );

  // ----------------------------------------------------------
  // Status
  // ----------------------------------------------------------

  const status =
    getFirstValue(
      scanResult?.status,

      vulnerabilities.length > 0
        ? "Unsafe"
        : "Safe"
    );

  // ----------------------------------------------------------
  // Grade
  // ----------------------------------------------------------

  const grade =
    getFirstValue(
      scanResult?.grade,
      scanResult?.securityGrade,
      scanResult?.security_grade,

      "Unknown"
    );

  // ----------------------------------------------------------
  // Confidence
  // ----------------------------------------------------------

  const confidence =
    getFirstValue(
      scanResult?.confidence,

      null
    );

  // ----------------------------------------------------------
  // Summary
  // ----------------------------------------------------------

  const summary =
    getFirstValue(
      scanResult?.summary,

      ""
    );

  // ----------------------------------------------------------
  // Scanned At
  // ----------------------------------------------------------

  const scannedAt =
    getFirstValue(
      scanResult?.scannedAt,
      scanResult?.scanned_at,
      scanResult?.createdAt,
      scanResult?.created_at,

      new Date().toISOString()
    );

  // ----------------------------------------------------------
  // Created At
  // ----------------------------------------------------------

  const createdAt =
    getFirstValue(
      scanResult?.createdAt,
      scanResult?.created_at,

      new Date().toISOString()
    );

  // ----------------------------------------------------------
  // FINAL SCAN CONTEXT
  // ----------------------------------------------------------

  return {
    scanId,

    language:
      normalizedLanguage,

    file_name:
      normalizedFileName,

    // Compatibility alias
    fileName:
      normalizedFileName,

    sourceCode,

    // Original backend scan response
    scanResult,

    riskScore,

    status,

    confidence,

    totalIssues,

    grade,

    summary,

    vulnerabilities,

    selectedVulnerability:
      normalizedSelected,

    scannedAt,

    // Older version compatibility
    createdAt,
  };
};


// ============================================================
// SAVE SCAN CONTEXT
// ============================================================

export const saveScanContext = (
  context
) => {
  if (
    !context ||
    typeof context !== "object" ||
    Array.isArray(context)
  ) {
    return false;
  }

  try {
    const serializedContext =
      JSON.stringify(
        context
      );

    // --------------------------------------------------------
    // Current localStorage
    // --------------------------------------------------------

    localStorage.setItem(
      SCAN_CONTEXT_STORAGE_KEY,
      serializedContext
    );

    // --------------------------------------------------------
    // Legacy localStorage
    // --------------------------------------------------------

    localStorage.setItem(
      LEGACY_SCAN_CONTEXT_KEY,
      serializedContext
    );

    // --------------------------------------------------------
    // Legacy sessionStorage compatibility
    // --------------------------------------------------------

    try {
      sessionStorage.setItem(
        LEGACY_SCAN_CONTEXT_KEY,
        serializedContext
      );
    } catch (sessionError) {
      console.warn(
        "Unable to sync scan context to sessionStorage:",
        sessionError
      );
    }

    // --------------------------------------------------------
    // Notify components
    // --------------------------------------------------------

    if (
      typeof window !== "undefined" &&
      typeof window.dispatchEvent === "function"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          SCAN_CONTEXT_UPDATED_EVENT,
          {
            detail: context,
          }
        )
      );
    }

    console.log(
      "Latest Scan Context Saved:",
      context
    );

    return true;
  } catch (error) {
    console.error(
      "Failed to save scan context:",
      error
    );

    return false;
  }
};


// ============================================================
// GET SCAN CONTEXT
// ============================================================

export const getScanContext = () => {
  try {
    let storedContext = null;
    let source = null;

    // --------------------------------------------------------
    // 1. Current localStorage
    // --------------------------------------------------------

    storedContext =
      localStorage.getItem(
        SCAN_CONTEXT_STORAGE_KEY
      );

    if (storedContext) {
      source =
        "current-localStorage";
    }

    // --------------------------------------------------------
    // 2. Legacy localStorage
    // --------------------------------------------------------

    if (!storedContext) {
      storedContext =
        localStorage.getItem(
          LEGACY_SCAN_CONTEXT_KEY
        );

      if (storedContext) {
        source =
          "legacy-localStorage";
      }
    }

    // --------------------------------------------------------
    // 3. Legacy sessionStorage
    // --------------------------------------------------------

    if (!storedContext) {
      try {
        storedContext =
          sessionStorage.getItem(
            LEGACY_SCAN_CONTEXT_KEY
          );

        if (storedContext) {
          source =
            "legacy-sessionStorage";
        }
      } catch (sessionError) {
        console.warn(
          "Unable to read scan context from sessionStorage:",
          sessionError
        );
      }
    }

    // --------------------------------------------------------
    // Nothing found
    // --------------------------------------------------------

    if (!storedContext) {
      return null;
    }

    // --------------------------------------------------------
    // Parse JSON
    // --------------------------------------------------------

    const context =
      JSON.parse(
        storedContext
      );

    // --------------------------------------------------------
    // Validate object
    // --------------------------------------------------------

    if (
      !context ||
      typeof context !== "object" ||
      Array.isArray(context)
    ) {
      return null;
    }

    // --------------------------------------------------------
    // Migrate legacy context to current storage
    // --------------------------------------------------------

    if (
      source === "legacy-localStorage" ||
      source === "legacy-sessionStorage"
    ) {
      try {
        localStorage.setItem(
          SCAN_CONTEXT_STORAGE_KEY,
          JSON.stringify(context)
        );
      } catch (migrationError) {
        console.warn(
          "Unable to migrate legacy scan context:",
          migrationError
        );
      }
    }

    return context;
  } catch (error) {
    console.error(
      "Failed to load scan context:",
      error
    );

    return null;
  }
};


// ============================================================
// CLEAR SCAN CONTEXT
// ============================================================

export const clearScanContext = () => {
  try {
    // --------------------------------------------------------
    // Remove current localStorage
    // --------------------------------------------------------

    localStorage.removeItem(
      SCAN_CONTEXT_STORAGE_KEY
    );

    // --------------------------------------------------------
    // Remove legacy localStorage
    // --------------------------------------------------------

    localStorage.removeItem(
      LEGACY_SCAN_CONTEXT_KEY
    );

    // --------------------------------------------------------
    // Remove legacy sessionStorage
    // --------------------------------------------------------

    try {
      sessionStorage.removeItem(
        SCAN_CONTEXT_STORAGE_KEY
      );

      sessionStorage.removeItem(
        LEGACY_SCAN_CONTEXT_KEY
      );
    } catch (sessionError) {
      console.warn(
        "Unable to clear sessionStorage scan context:",
        sessionError
      );
    }

    // --------------------------------------------------------
    // Notify components
    // --------------------------------------------------------

    if (
      typeof window !== "undefined" &&
      typeof window.dispatchEvent === "function"
    ) {
      window.dispatchEvent(
        new CustomEvent(
          SCAN_CONTEXT_UPDATED_EVENT,
          {
            detail: null,
          }
        )
      );
    }

    console.log(
      "Scan Context Cleared"
    );

    return true;
  } catch (error) {
    console.error(
      "Failed to clear scan context:",
      error
    );

    return false;
  }
};


// ============================================================
// GET EVENT NAME
// ============================================================

export const getScanContextEventName = () =>
  SCAN_CONTEXT_UPDATED_EVENT;


// ============================================================
// CURRENT STORAGE KEY EXPORT
// ============================================================

export const SCAN_CONTEXT_KEY =
  SCAN_CONTEXT_STORAGE_KEY;


// ============================================================
// EVENT NAME EXPORT
// ============================================================

export const SCAN_CONTEXT_EVENT =
  SCAN_CONTEXT_UPDATED_EVENT;


// ============================================================
// LEGACY STORAGE KEY EXPORT
// ============================================================

export const LEGACY_SCAN_CONTEXT_STORAGE_KEY =
  LEGACY_SCAN_CONTEXT_KEY;