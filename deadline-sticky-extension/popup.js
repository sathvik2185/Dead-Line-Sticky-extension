document.getElementById("save").addEventListener("click", () => {
  const subject = document.getElementById("subject").value;
  const date = document.getElementById("date").value;

  if (!subject || !date) {
    document.getElementById("status").innerText = "Please fill all fields";
    return;
  }

  chrome.storage.local.get("deadlines", (data) => {
    const deadlines = data.deadlines || [];
    deadlines.push({ subject, date });

    chrome.storage.local.set({ deadlines }, () => {
      document.getElementById("status").innerText = "Deadline added!";
      document.getElementById("subject").value = "";
      document.getElementById("date").value = "";

      // 🔔 Tell the current tab to update immediately
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: "updateDeadlines" });
      });
    });
  });
});
