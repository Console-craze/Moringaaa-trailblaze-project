"use strict";

(() => {
  const students = [
    { id: "STU001", name: "Amara Okafor", color: "rose", status: "present", time: "8:02 AM" },
    { id: "STU002", name: "Chinedu Eze", color: "blue", status: "present", time: "8:05 AM" },
    { id: "STU003", name: "Zara Bello", color: "gold", status: "unmarked" },
    { id: "STU004", name: "Tomi Adeyemi", color: "mint", status: "present", time: "8:12 AM" },
    { id: "STU005", name: "Kelechi Nwosu", color: "lavender", status: "absent" },
    { id: "STU006", name: "Adaeze Obi", color: "peach", status: "present", time: "8:18 AM" },
    { id: "STU007", name: "Femi Adebayo", color: "teal", status: "unmarked" },
    { id: "STU008", name: "Ngozi Umeh", color: "pink", status: "present", time: "8:24 AM" },
  ];
  const labels = { present: "Present", absent: "Absent", unmarked: "Not marked" };
  const clock = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  const byId = (id) => document.getElementById(id);
  const tableBody = byId("student-rows");
  const search = byId("student-search");
  const saveButton = byId("save");
  const dialog = byId("workspace-dialog");
  const rows = new Map();
  let lastSave = null;

  function announce(message) {
    byId("announcement").textContent = message;
  }

  function updateRow(row, student) {
    const badge = row.querySelector(".status-badge");
    const unmarked = student.status === "unmarked";
    badge.className = `status-badge ${student.status}`;
    badge.querySelector("[data-status-label]").textContent = labels[student.status];
    badge.querySelector("svg").toggleAttribute("hidden", unmarked);
    badge.querySelector("use").setAttribute("href", student.status === "present" ? "#check" : "#cross");
    badge.querySelector(".status-empty").hidden = !unmarked;

    const time = row.querySelector("[data-time]");
    time.textContent = student.time || "—";
    time.classList.toggle("not-checked", !student.time);
    row.querySelector(".time-dot").hidden = !student.time;

    for (const button of row.querySelectorAll("[data-mark]")) {
      const selected = button.dataset.mark === student.status;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("selected", selected);
    }
  }

  function loadRoster() {
    const template = byId("student-row");
    const fragment = document.createDocumentFragment();
    students.forEach((student, index) => {
      const row = template.content.firstElementChild.cloneNode(true);
      row.dataset.id = student.id;
      row.querySelector(".row-number").textContent = String(index + 1).padStart(2, "0");
      row.querySelector(".student-name").textContent = student.name;
      row.querySelector(".student-id").textContent = student.id;
      const avatar = row.querySelector(".student-avatar");
      avatar.textContent = student.name.split(" ").map((part) => part[0]).join("");
      avatar.classList.add(student.color);
      for (const button of row.querySelectorAll("[data-mark]")) {
        button.setAttribute("aria-label", `Mark ${student.name} ${button.dataset.mark}`);
      }
      updateRow(row, student);
      rows.set(student.id, row);
      fragment.append(row);
    });
    tableBody.replaceChildren(fragment);
    for (const total of document.querySelectorAll("[data-total]")) total.textContent = students.length;
  }

  function updateTotals() {
    const counts = { present: 0, absent: 0, unmarked: 0 };
    for (const student of students) counts[student.status]++;
    for (const card of document.querySelectorAll("[data-summary]")) {
      const count = counts[card.dataset.summary];
      const percent = students.length ? (count / students.length) * 100 : 0;
      card.querySelector("[data-count]").textContent = count;
      card.querySelector(".stat-progress span").style.width = `${percent}%`;
      if (card.dataset.summary === "present") byId("present-percent").textContent = `${Math.round(percent)}%`;
    }
  }

  function filterRoster() {
    const query = search.value.trim().toLowerCase();
    let matches = 0;
    for (const student of students) {
      const visible = `${student.name} ${student.id}`.toLowerCase().includes(query);
      rows.get(student.id).hidden = !visible;
      if (visible) matches++;
    }
    byId("matching-count").textContent = matches;
    const empty = byId("empty-results");
    empty.hidden = matches > 0;
    empty.querySelector("td").textContent = matches ? "" : `No students match "${search.value}".`;
  }

  function showSaveState(saved) {
    saveButton.classList.toggle("is-saved", saved);
    saveButton.querySelector("span").textContent = saved ? "Attendance saved" : "Save attendance";
    saveButton.querySelector("use").setAttribute("href", saved ? "#check" : "#clipboard");
  }

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-mark]");
    if (!button) return;
    const row = button.closest("tr");
    const student = students.find((item) => item.id === row.dataset.id);
    student.status = student.status === button.dataset.mark ? "unmarked" : button.dataset.mark;
    student.time = student.status === "present" ? clock.format(new Date()) : null;
    updateRow(row, student);
    updateTotals();
    showSaveState(false);
    announce(`${student.name}: ${labels[student.status]}.`);
  });

  search.addEventListener("input", filterRoster);
  document.addEventListener("keydown", (event) => {
    if (event.isComposing || event.keyCode === 229 || dialog.open) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      search.focus();
      search.select();
    }
  });

  saveButton.addEventListener("click", () => {
    lastSave = { time: clock.format(new Date()), students: students.map((student) => ({ ...student })) };
    showSaveState(true);
    announce("Attendance saved in this tab. Export a CSV to keep a permanent copy.");
  });

  function csvCell(value) {
    const text = String(value ?? "");
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  byId("export").addEventListener("click", () => {
    const records = [
      ["Student ID", "Student name", "Status", "Check-in time"],
      ...students.map((student) => [student.id, student.name, student.status, student.time]),
    ];
    const csv = records.map((record) => record.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "class-attendance.csv";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("CSV report exported for the whole class.");
  });

  function openDetails(title, description, snapshot = null) {
    byId("dialog-title").textContent = title;
    byId("dialog-description").textContent = description;
    byId("snapshot-register").hidden = !snapshot;
    const body = byId("snapshot-rows");
    body.replaceChildren();
    if (snapshot) {
      for (const student of snapshot.students) {
        const row = body.insertRow();
        for (const value of [student.name, labels[student.status], student.time || "—"]) {
          row.insertCell().textContent = value;
        }
      }
    }
    dialog.showModal();
  }

  document.querySelector(".side-nav").addEventListener("click", (event) => {
    const selected = event.target.closest("[data-view]");
    if (!selected) return;
    for (const button of document.querySelectorAll("[data-view]")) {
      button.classList.toggle("active", button === selected);
      if (button === selected) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    byId("active-view").textContent = selected.getAttribute("aria-label");
    switch (selected.dataset.view) {
      case "overview": byId("overview").scrollIntoView({ block: "nearest" }); break;
      case "attendance": byId("attendance").focus(); break;
      case "roster": search.focus(); break;
      case "history":
        openDetails("Attendance history", lastSave
          ? `Most recent save in this tab: ${lastSave.time}. Export the register before leaving this page.`
          : "No attendance has been saved in this tab yet. Mark the register, then choose Save attendance.", lastSave);
        break;
    }
  });

  const details = {
    profile: ["Prefect profile", "Jordan Mensah · Class prefect at Riverside Academy, Grade 10, Room 204."],
    notifications: ["Notifications", "There are no new notifications for this register."],
    date: ["Register date", "Monday, November 16, 2026 · Morning check-in for Grade 10, Room 204. This is a sample class register."],
  };
  for (const button of document.querySelectorAll("[data-info]")) {
    button.addEventListener("click", () => openDetails(...details[button.dataset.info]));
  }

  loadRoster();
  updateTotals();
  filterRoster();
})();
