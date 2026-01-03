# Google Drive: Share Link to Direct Link with JS

A compact guide on programmatically converting Google Drive preview URLs into direct download links.

## The Logic

Google Drive share links display a preview page. To trigger a download, we must extract the unique `FILE_ID` and construct a specific API-like URL.

1.  **Input:** `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
2.  **Extract:** `FILE_ID` (The string between `/d/` and `/view`)
3.  **Output:** `https://drive.google.com/uc?export=download&id=FILE_ID`

---

## JavaScript Implementation

### 1. The Regex Pattern
We need a RegExp that captures the ID regardless of URL parameters.

```javascript
// Matches: /d/ID or id=ID
const driveRegex = /\/d\/([a-zA-Z0-9_-]+)|\?id=([a-zA-Z0-9_-]+)/;
```

### 2. The Converter Function
Here is a reusable function that handles the extraction and formatting.

```javascript
/**
 * Converts a Google Drive share link to a direct download link.
 * @param {string} url - The original share URL.
 * @returns {string|null} - The direct download URL or null if invalid.
 */
function getDirectLink(url) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)|\?id=([a-zA-Z0-9_-]+)/);

    // match[1] handles standard /d/ links
    // match[2] handles legacy ?id= links
    const fileId = match ? (match[1] || match[2]) : null;

    if (!fileId) return null;

    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}
```

### 3. Usage Example

```javascript
const input = "https://drive.google.com/file/d/1ABC123XYZ789/view?usp=sharing";
const directLink = getDirectLink(input);

if (directLink) {
    console.log("Download URL:", directLink);
    // Output: https://drive.google.com/uc?export=download&id=1ABC123XYZ789
} else {
    console.error("Invalid Google Drive URL");
}
```

## Important Notes

*   **Permissions:** The file on Google Drive must be set to **"Anyone with the link"** (Public) for the direct download to work.
*   **Large Files:** For files larger than 100MB, Google may interrupt the direct download to warn about virus scanning. This script does not bypass that specific warning page.