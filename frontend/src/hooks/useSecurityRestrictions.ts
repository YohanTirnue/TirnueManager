import { onMounted, onUnmounted, watch } from "vue";
import { useUserPermissions } from "./useUserPermissions";

/**
 * Composable for applying global security restrictions based on user permissions
 * Handles: disable right-click, keyboard shortcuts, text selection, copy, paste
 */
export function useSecurityRestrictions() {
  const {
    disableRightClick,
    disableKeyboardShortcuts,
    disableTextSelection,
    disableCopy,
    disablePaste
  } = useUserPermissions();

  // Prevent right-click context menu
  const handleContextMenu = (e: MouseEvent) => {
    if (disableRightClick.value) {
      e.preventDefault();
      return false;
    }
  };

  // Prevent keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if (disableKeyboardShortcuts.value) {
      // Block common shortcuts: Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+S, etc.
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        return false;
      }
      // Also block F12 (DevTools), Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toUpperCase() === "U")
      ) {
        e.preventDefault();
        return false;
      }
    }
  };

  // Prevent copy
  const handleCopy = (e: ClipboardEvent) => {
    if (disableCopy.value) {
      e.preventDefault();
      return false;
    }
  };

  // Prevent paste
  const handlePaste = (e: ClipboardEvent) => {
    if (disablePaste.value) {
      e.preventDefault();
      return false;
    }
  };

  // Apply/remove text selection CSS
  const applyTextSelectionCSS = () => {
    const style = document.getElementById("security-text-selection-style");
    if (disableTextSelection.value) {
      if (!style) {
        const styleElement = document.createElement("style");
        styleElement.id = "security-text-selection-style";
        styleElement.textContent = `
          * {
            user-select: none !important;
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
          }
          input, textarea {
            user-select: text !important;
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
          }
        `;
        document.head.appendChild(styleElement);
      }
    } else {
      if (style) {
        style.remove();
      }
    }
  };

  // Setup event listeners
  const setupListeners = () => {
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    applyTextSelectionCSS();
  };

  // Remove event listeners
  const cleanupListeners = () => {
    document.removeEventListener("contextmenu", handleContextMenu);
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("copy", handleCopy);
    document.removeEventListener("paste", handlePaste);
    const style = document.getElementById("security-text-selection-style");
    if (style) {
      style.remove();
    }
  };

  // Watch for permission changes and update restrictions
  watch(
    [disableRightClick, disableKeyboardShortcuts, disableTextSelection, disableCopy, disablePaste],
    () => {
      applyTextSelectionCSS();
    }
  );

  onMounted(() => {
    setupListeners();
  });

  onUnmounted(() => {
    cleanupListeners();
  });

  return {
    setupListeners,
    cleanupListeners
  };
}
