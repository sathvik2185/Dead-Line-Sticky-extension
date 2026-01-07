function renderDeadlines() {
  const existing = document.getElementById("deadline-sticky");
  if (existing) existing.remove();

  chrome.storage.local.get(
    ["deadlines", "isMinimized", "urgencySettings", "widgetCorner"],
    (data) => {
      if (!data.deadlines || data.deadlines.length === 0) return;

      const isMinimized = data.isMinimized || false;
      const settings = data.urgencySettings || {
        urgentDays: 2,
        warningDays: 5
      };
      const corner = data.widgetCorner || "right-bottom";

      const today = new Date();
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

      const theme = {
        bg: isDark ? "#1e1e1e" : "#ffffff",
        header: isDark ? "#2a2a2a" : "#f8f9fa",
        border: isDark ? "#444" : "#ddd",
        text: isDark ? "#f1f1f1" : "#000",
        shadow: isDark
          ? "0 6px 14px rgba(0,0,0,0.6)"
          : "0 6px 14px rgba(0,0,0,0.15)"
      };

      // Container
      const container = document.createElement("div");
      container.id = "deadline-sticky";
      container.style.position = "fixed";
      container.style.background = theme.bg;
      container.style.color = theme.text;
      container.style.border = `1px solid ${theme.border}`;
      container.style.borderRadius = "10px";
      container.style.fontSize = "14px";
      container.style.zIndex = "9999";
      container.style.maxWidth = "280px";
      container.style.boxShadow = theme.shadow;
      container.style.transition = "all 0.25s ease";
      container.style.opacity = "0";
      container.style.transform = "translateY(10px)";

      // Apply corner position
      const offset = "10px";
      if (corner.includes("left")) container.style.left = offset;
      if (corner.includes("right")) container.style.right = offset;
      if (corner.includes("top")) container.style.top = offset;
      if (corner.includes("bottom")) container.style.bottom = offset;

      // Header (drag handle)
      const header = document.createElement("div");
      header.style.display = "flex";
      header.style.justifyContent = "space-between";
      header.style.alignItems = "center";
      header.style.padding = "10px";
      header.style.fontWeight = "bold";
      header.style.background = theme.header;
      header.style.borderBottom = `1px solid ${theme.border}`;
      header.style.borderRadius = "10px 10px 0 0";
      header.style.cursor = "grab";
      header.title = "Drag towards a corner to move";

      const title = document.createElement("span");
      title.innerText = `📌 Deadlines (${data.deadlines.length})`;

      const toggleBtn = document.createElement("button");
      toggleBtn.innerText = isMinimized ? "➕" : "➖";
      toggleBtn.style.border = "none";
      toggleBtn.style.background = "transparent";
      toggleBtn.style.cursor = "pointer";
      toggleBtn.style.fontSize = "16px";
      toggleBtn.style.color = theme.text;

      header.appendChild(title);
      header.appendChild(toggleBtn);
      container.appendChild(header);

      // Content
      const content = document.createElement("div");
      content.style.padding = "8px 12px";
      content.style.overflow = "hidden";
      content.style.transition = "max-height 0.25s ease, opacity 0.2s ease";

      if (isMinimized) {
        content.style.maxHeight = "0";
        content.style.opacity = "0";
      } else {
        content.style.maxHeight = "400px";
        content.style.opacity = "1";
      }

      data.deadlines.forEach((item, index) => {
        const deadlineDate = new Date(item.date);
        const daysLeft = Math.ceil(
          (deadlineDate - today) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft < 0) return;

        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.marginBottom = "6px";
        row.style.padding = "6px";
        row.style.borderLeft = "5px solid";
        row.style.borderRadius = "4px";

        if (daysLeft <= settings.urgentDays) {
          row.style.borderLeftColor = "#dc3545";
        } else if (daysLeft <= settings.warningDays) {
          row.style.borderLeftColor = "#fd7e14";
        } else {
          row.style.borderLeftColor = "#28a745";
        }

        const text = document.createElement("span");
        text.innerText = `${item.subject} – ${daysLeft} day(s)`;

        const deleteBtn = document.createElement("button");
        deleteBtn.innerText = "❌";
        deleteBtn.style.border = "none";
        deleteBtn.style.background = "transparent";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.color = theme.text;

        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          chrome.storage.local.get("deadlines", (res) => {
            const updated = res.deadlines.filter((_, i) => i !== index);
            chrome.storage.local.set({ deadlines: updated }, renderDeadlines);
          });
        });

        row.appendChild(text);
        row.appendChild(deleteBtn);
        content.appendChild(row);
      });

      container.appendChild(content);
      document.body.appendChild(container);

      // Entry animation
      requestAnimationFrame(() => {
        container.style.opacity = "1";
        container.style.transform = "translateY(0)";
      });

      // Minimize toggle
      toggleBtn.addEventListener("click", () => {
        chrome.storage.local.set(
          { isMinimized: !isMinimized },
          renderDeadlines
        );
      });

      // 🧲 Corner-drag logic (with text-selection fix)
      let isDragging = false;

      header.addEventListener("mousedown", (e) => {
        isDragging = true;
        header.style.cursor = "grabbing";
        container.style.opacity = "0.85";

        // 🔒 Disable background text selection
        document.body.style.userSelect = "none";
        document.body.style.webkitUserSelect = "none";
      });

      document.addEventListener("mouseup", (e) => {
        if (!isDragging) return;
        isDragging = false;

        header.style.cursor = "grab";
        container.style.opacity = "1";

        // 🔓 Re-enable text selection
        document.body.style.userSelect = "";
        document.body.style.webkitUserSelect = "";

        const midX = window.innerWidth / 2;
        const midY = window.innerHeight / 2;

        const newCorner =
          e.clientX < midX
            ? e.clientY < midY
              ? "left-top"
              : "left-bottom"
            : e.clientY < midY
            ? "right-top"
            : "right-bottom";

        chrome.storage.local.set({ widgetCorner: newCorner }, renderDeadlines);
      });
    }
  );
}

// Initial render
renderDeadlines();

// Listen for popup/settings updates
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "updateDeadlines") {
    renderDeadlines();
  }
});
