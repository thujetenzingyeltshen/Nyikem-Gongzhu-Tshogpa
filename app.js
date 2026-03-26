/* ------------------------------
   NGT Shared App Logic
------------------------------ */
const STORAGE_KEYS = {
  members: "ngt_members",
  announcements: "ngt_announcements",
  documents: "ngt_documents",
  contact: "ngt_contact_messages",
  admin: "ngt_admin_auth"
};

const ADMIN_CREDENTIAL = {
  username: "admin",
  password: "ngt@2026"
};

const page = document.body.dataset.page || "";

function getData(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function setupDefaults() {
  if (!localStorage.getItem(STORAGE_KEYS.announcements)) {
    setData(STORAGE_KEYS.announcements, [
      {
        id: crypto.randomUUID(),
        title: "Annual General Meeting Notice",
        date: "2026-04-15",
        body: "All registered members are requested to attend the AGM in Thimphu."
      },
      {
        id: crypto.randomUUID(),
        title: "Regional Service Initiative",
        date: "2026-05-02",
        body: "NGT regional coordinators will lead volunteer activities in all dzongkhags."
      }
    ]);
  }

  const seededMembers = Array.isArray(window.NGT_MEMBERS_SEED) ? window.NGT_MEMBERS_SEED : [];
  const existingMembers = getData(STORAGE_KEYS.members, []);
  if (!localStorage.getItem(STORAGE_KEYS.members) || (!existingMembers.length && seededMembers.length)) {
    setData(STORAGE_KEYS.members, seededMembers);
  }

  if (!localStorage.getItem(STORAGE_KEYS.documents)) {
    setData(STORAGE_KEYS.documents, []);
  }
}

function setupNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  if (toggle && nav) {
    toggle.addEventListener("click", () => nav.classList.toggle("open"));
  }
}

function setupLanguagePlaceholder() {
  const btn = document.getElementById("langToggle");
  if (!btn) return;

  let dzongkhaMode = false;
  btn.addEventListener("click", () => {
    dzongkhaMode = !dzongkhaMode;
    btn.textContent = dzongkhaMode ? "English" : "Dzongkha Placeholder";
    alert(
      dzongkhaMode
        ? "Dzongkha mode placeholder enabled."
        : "English mode enabled."
    );
  });
}

/* ------------------------------
   Announcement Helpers
------------------------------ */
function getAnnouncementsSorted() {
  const announcements = getData(STORAGE_KEYS.announcements, []);
  return announcements.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderAnnouncementCard(item) {
  return `
    <article class="announcement-item">
      <h3>${item.title}</h3>
      <p class="muted">${item.date}</p>
      <p>${item.body}</p>
    </article>
  `;
}

function initHomePage() {
  const wrapper = document.getElementById("announcementPreview");
  const heroSlider = document.getElementById("heroSlider");
  const heroTitle = document.getElementById("heroTitle");
  const heroText = document.getElementById("heroText");
  const heroCaption = document.getElementById("heroCaption");

  if (wrapper) {
    const items = getAnnouncementsSorted().slice(0, 3);
    wrapper.innerHTML = items.length
      ? items.map(renderAnnouncementCard).join("")
      : "<p>No announcements available.</p>";
  }

  if (!heroSlider || !heroTitle || !heroText || !heroCaption) return;

  const slides = [
    {
      theme: "service",
      image: "./cover pic/472057341_10162040474453260_5092529835833910460_n.jpg",
      title: "Nyikem Gongzhu Tshogpa (NGT)",
      text:
        "A national association of retired Nyikem recipients committed to service, unity, and Bhutanese values.",
      tag: "Service",
      caption:
        "Association of Retired Red Scarf Officers"
    },
    {
      theme: "unity",
      image: "./cover pic/bf01ff50-c098-4083-8ef5-31413f2dfca8.jpg",
      title: "Strengthening Fellowship and Collective Responsibility",
      text:
        "A respectful national platform that keeps members connected through solidarity, shared purpose, and service.",
      tag: "Unity",
      caption:
        "Building a dignified collective voice across Bhutan."
    },
    {
      theme: "heritage",
      image: "./cover pic/NGT WITH HM2025-11-08 at 21.02.54.jpeg",
      title: "Preserving Bhutanese Values and Cultural Identity",
      text:
        "NGT protects heritage, discipline, and a culture of meaningful service for future generations.",
      tag: "Heritage",
      caption:
        "Safeguarding values, tradition, and continuity."
    }
  ];

  let currentSlide = 0;

  function renderHeroSlide(index) {
    const slide = slides[index];
    const stage = heroSlider.querySelector(".hero-slide");
    if (!stage) return;

    stage.dataset.theme = slide.theme;
    stage.style.setProperty("--hero-image", `url("${slide.image}")`);
    heroTitle.textContent = slide.title;
    heroText.textContent = slide.text;
    heroCaption.textContent = slide.caption;
  }

  renderHeroSlide(currentSlide);
  window.setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    renderHeroSlide(currentSlide);
  }, 7000);
}

function initNewsPage() {
  const list = document.getElementById("announcementList");
  if (!list) return;

  const items = getAnnouncementsSorted();
  list.innerHTML = items.length
    ? items.map(renderAnnouncementCard).join("")
    : "<p>No announcements available.</p>";
}

/* ------------------------------
   Member Records (CRUD)
------------------------------ */
function generateSerialId(members) {
  const max = members.reduce((acc, member) => {
    const match = /NGT-(\d+)/.exec(member.serialId || "");
    const num = match ? Number(match[1]) : 0;
    return Math.max(acc, num);
  }, 0);
  return `NGT-${String(max + 1).padStart(3, "0")}`;
}

function validateMemberYears(serviceYear, nyikemYear, resignationYear, joinedYear) {
  if (serviceYear > nyikemYear) return "Service year cannot be after Nyikem year.";
  if (nyikemYear > resignationYear) return "Nyikem year cannot be after resignation year.";
  if (joinedYear < resignationYear) return "Joined NGT year should be same or after resignation year.";
  return "";
}

function initMembersPage() {
  const tableBody = document.getElementById("memberTableBody");
  const searchInput = document.getElementById("memberSearch");
  const yearFilter = document.getElementById("yearFilter");
  const modal = document.getElementById("profileModal");
  const profileContent = document.getElementById("profileContent");
  const closeProfile = document.getElementById("closeProfile");

  if (!tableBody || !searchInput || !yearFilter || !modal || !profileContent) return;

  const getMembers = () => getData(STORAGE_KEYS.members, []);

  function populateYearFilter() {
    const years = [...new Set(getMembers().map((m) => m.joinedYear))].sort();
    yearFilter.innerHTML = `<option value="">All Joined Years</option>${years
      .map((year) => `<option value="${year}">${year}</option>`)
      .join("")}`;
  }

  function renderTable() {
    const keyword = searchInput.value.trim().toLowerCase();
    const selectedYear = yearFilter.value;
    let members = getMembers();

    members = members.filter((m) => {
      const matchesSearch =
        m.fullName.toLowerCase().includes(keyword) ||
        m.serialId.toLowerCase().includes(keyword);
      const matchesYear = !selectedYear || String(m.joinedYear) === selectedYear;
      return matchesSearch && matchesYear;
    });

    if (!members.length) {
      tableBody.innerHTML = "<tr><td colspan='7'>No members found.</td></tr>";
      return;
    }

    tableBody.innerHTML = members
      .map(
        (member) => `
      <tr>
        <td>${member.serialId}</td>
        <td>${member.fullName}</td>
          <td>${member.serviceYear || "--"}</td>
          <td>${member.nyikemYear || "--"}</td>
          <td>${member.resignationYear || "--"}</td>
          <td>${member.joinedYear || "--"}</td>
          <td>
            <button class="btn" data-action="view" data-id="${member.id}" type="button">View Profile</button>
          </td>
        </tr>
      `
        )
        .join("");
    }

  tableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;

    const members = getMembers();
    const selected = members.find((m) => m.id === id);
    if (!selected) return;

    if (action === "view") {
      profileContent.innerHTML = `
        <p><strong>Serial ID:</strong> ${selected.serialId}</p>
        <p><strong>Full Name:</strong> ${selected.fullName}</p>
        <p><strong>Year of Service:</strong> ${selected.serviceYear || "--"}</p>
        <p><strong>Year Received Nyikem:</strong> ${selected.nyikemYear || "--"}</p>
        <p><strong>Year of Resignation:</strong> ${selected.resignationYear || "--"}</p>
        <p><strong>Year Joined NGT:</strong> ${selected.joinedYear || "--"}</p>
        <p><strong>Phone No.:</strong> ${selected.phone || "--"}</p>
        <p><strong>Email:</strong> ${selected.email || "--"}</p>
        <p><strong>Address:</strong> ${selected.address || "--"}</p>
        <p><strong>Last Post Held:</strong> ${selected.lastPost || "--"}</p>
        <p><strong>Knowledge / Experience:</strong> ${selected.knowledge || "--"}</p>
        <hr />
        <p><strong>Member ID Card Preview</strong></p>
        <div class="card">
          <p class="eyebrow">Member Card</p>
          <h3>${selected.fullName}</h3>
          <p><strong>${selected.serialId}</strong></p>
          <p class="muted">Retired Nyikem Recipient | Nyikem Gongzhu Tshogpa</p>
        </div>
      `;
        modal.showModal();
      }
    });

  closeProfile?.addEventListener("click", () => modal.close());

  searchInput.addEventListener("input", renderTable);
  yearFilter.addEventListener("change", renderTable);

  populateYearFilter();
  renderTable();
}

/* ------------------------------
   Admin Panel
------------------------------ */
function isAdminAuthenticated() {
  return sessionStorage.getItem(STORAGE_KEYS.admin) === "true";
}

function initAdminPage() {
  const loginBox = document.getElementById("loginBox");
  const adminControls = document.getElementById("adminControls");
  const loginForm = document.getElementById("adminLoginForm");
  const logoutBtn = document.getElementById("logoutAdmin");
  const announcementForm = document.getElementById("announcementForm");
  const listWrap = document.getElementById("announcementAdminList");
  const cancelEdit = document.getElementById("cancelAnnouncementEdit");

  if (!loginBox || !adminControls || !loginForm || !announcementForm || !listWrap) return;

  const fields = {
    editId: document.getElementById("announcementEditId"),
    title: document.getElementById("announcementTitle"),
    date: document.getElementById("announcementDate"),
    body: document.getElementById("announcementBody")
  };

  function refreshAuthView() {
    if (isAdminAuthenticated()) {
      loginBox.classList.add("hidden");
      adminControls.classList.remove("hidden");
      renderAdminAnnouncements();
    } else {
      loginBox.classList.remove("hidden");
      adminControls.classList.add("hidden");
    }
  }

  function resetAnnouncementForm() {
    announcementForm.reset();
    fields.editId.value = "";
  }

  function renderAdminAnnouncements() {
    const items = getAnnouncementsSorted();
    listWrap.innerHTML = items.length
      ? items
          .map(
            (item) => `
      <article class="admin-list-item">
        <h4>${item.title}</h4>
        <p class="muted">${item.date}</p>
        <p>${item.body}</p>
        <button class="btn btn-outline" data-admin-action="edit" data-id="${item.id}" type="button">Edit</button>
        <button class="btn btn-outline" data-admin-action="delete" data-id="${item.id}" type="button">Delete</button>
      </article>
    `
          )
          .join("")
      : "<p>No announcements available.</p>";
  }

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = document.getElementById("adminUser").value.trim();
    const pass = document.getElementById("adminPass").value;

    if (user === ADMIN_CREDENTIAL.username && pass === ADMIN_CREDENTIAL.password) {
      sessionStorage.setItem(STORAGE_KEYS.admin, "true");
      refreshAuthView();
      return;
    }

    alert("Invalid username or password.");
  });

  logoutBtn?.addEventListener("click", () => {
    sessionStorage.removeItem(STORAGE_KEYS.admin);
    refreshAuthView();
  });

  announcementForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const payload = {
      title: fields.title.value.trim(),
      date: fields.date.value,
      body: fields.body.value.trim()
    };

    if (!payload.title || !payload.date || !payload.body) {
      alert("Please complete all announcement fields.");
      return;
    }

    const items = getData(STORAGE_KEYS.announcements, []);
    const editId = fields.editId.value;

    if (editId) {
      setData(
        STORAGE_KEYS.announcements,
        items.map((item) => (item.id === editId ? { ...item, ...payload } : item))
      );
    } else {
      items.push({ id: crypto.randomUUID(), ...payload });
      setData(STORAGE_KEYS.announcements, items);
    }

    resetAnnouncementForm();
    renderAdminAnnouncements();
  });

  listWrap.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.adminAction;
    const id = target.dataset.id;
    if (!action || !id) return;

    const items = getData(STORAGE_KEYS.announcements, []);
    const selected = items.find((item) => item.id === id);
    if (!selected) return;

    if (action === "delete") {
      if (!confirm("Delete this announcement?")) return;
      setData(
        STORAGE_KEYS.announcements,
        items.filter((item) => item.id !== id)
      );
      renderAdminAnnouncements();
      return;
    }

    if (action === "edit") {
      fields.editId.value = selected.id;
      fields.title.value = selected.title;
      fields.date.value = selected.date;
      fields.body.value = selected.body;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  cancelEdit?.addEventListener("click", resetAnnouncementForm);

  refreshAuthView();
}

/* ------------------------------
   Documents Page
------------------------------ */
function initDocumentsPage() {
  const form = document.getElementById("documentForm");
  const list = document.getElementById("documentList");
  if (!form || !list) return;

  const titleField = document.getElementById("docTitle");
  const fileField = document.getElementById("docFile");

  function renderDocuments() {
    const docs = getData(STORAGE_KEYS.documents, []);
    list.innerHTML = docs.length
      ? docs
          .map(
            (doc) => `
      <article class="doc-item">
        <h3>${doc.title}</h3>
        <p class="muted">File: ${doc.fileName}</p>
        <p class="muted">Uploaded: ${new Date(doc.uploadedAt).toLocaleString()}</p>
        <a class="btn" href="${doc.dataUrl}" target="_blank" rel="noopener">Open PDF</a>
        <a class="btn btn-outline" href="${doc.dataUrl}" download="${doc.fileName}">Download</a>
        <button class="btn btn-outline" type="button" data-doc-delete="${doc.id}">Delete</button>
      </article>
    `
          )
          .join("")
      : "<p>No documents uploaded yet.</p>";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleField.value.trim();
    const file = fileField.files?.[0];

    if (!title || !file) {
      alert("Please provide title and PDF file.");
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const docs = getData(STORAGE_KEYS.documents, []);
      docs.push({
        id: crypto.randomUUID(),
        title,
        fileName: file.name,
        dataUrl: String(reader.result),
        uploadedAt: new Date().toISOString()
      });
      setData(STORAGE_KEYS.documents, docs);
      form.reset();
      renderDocuments();
    };

    reader.readAsDataURL(file);
  });

  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const id = target.dataset.docDelete;
    if (!id) return;

    if (!confirm("Delete this document?")) return;
    setData(
      STORAGE_KEYS.documents,
      getData(STORAGE_KEYS.documents, []).filter((doc) => doc.id !== id)
    );
    renderDocuments();
  });

  renderDocuments();
}

/* ------------------------------
   Contact Page
------------------------------ */
function initContactPage() {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("contactStatus");
  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const message = document.getElementById("contactMessage").value.trim();

    if (!name || !email || !message) {
      status.textContent = "Please complete all fields.";
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = "Please enter a valid email address.";
      return;
    }

    if (message.length < 10) {
      status.textContent = "Message should be at least 10 characters.";
      return;
    }

    const messages = getData(STORAGE_KEYS.contact, []);
    messages.push({
      id: crypto.randomUUID(),
      name,
      email,
      message,
      createdAt: new Date().toISOString()
    });
    setData(STORAGE_KEYS.contact, messages);

    form.reset();
    status.textContent = "Thank you. Your message has been recorded successfully.";
  });
}

function initServicesPage() {
  const select = document.getElementById("serviceBatchSelect");
  const yearFilter = document.getElementById("serviceYearFilter");
  const searchInput = document.getElementById("serviceSearch");
  const sections = document.querySelectorAll(".service-batch");
  const tableBody = document.getElementById("gmcDutyTableBody");
  const totalMembers = document.getElementById("gmcTotalMembers");
  const modal = document.getElementById("serviceProfileModal");
  const profileContent = document.getElementById("serviceProfileContent");
  const closeProfile = document.getElementById("closeServiceProfile");
  if (!select || !sections.length) return;

  function renderSelectedBatch() {
    const selected = select.value;
    sections.forEach((section) => {
      const isMatch = section.getAttribute("data-batch") === selected;
      section.classList.toggle("hidden", !isMatch);
      section.classList.toggle("is-active", isMatch);
    });
  }

  function renderGmcTable() {
    if (!tableBody) return;
    const term = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const currentOnly = yearFilter ? yearFilter.value : "";
    const rows = Array.from(tableBody.querySelectorAll("tr"));
    let visibleCount = 0;

    rows.forEach((row) => {
      const haystack = [
        row.dataset.name,
        row.dataset.post,
        row.dataset.residence,
        row.dataset.remarks
      ].join(" ").toLowerCase();
      const matchesSearch = !term || haystack.includes(term);
      const matchesYear = !currentOnly || currentOnly === "current";
      const show = matchesSearch && matchesYear;
      row.classList.toggle("hidden", !show);
      if (show) visibleCount += 1;
    });

    if (totalMembers) {
      totalMembers.textContent = String(visibleCount);
    }
  }

  tableBody?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList.contains("service-view-btn")) return;
    const row = target.closest("tr");
    if (!(row instanceof HTMLElement) || !modal || !profileContent) return;

    profileContent.innerHTML = `
      <p><strong>Name:</strong> ${row.dataset.name || "--"}</p>
      <p><strong>Post Held on Gongzhu:</strong> ${row.dataset.post || "--"}</p>
      <p><strong>Residence:</strong> ${row.dataset.residence || "--"}</p>
      <p><strong>CID No.:</strong> ${row.dataset.cid || "--"}</p>
      <p><strong>Age:</strong> ${row.dataset.age || "--"}</p>
      <p><strong>Mobile:</strong> ${row.dataset.mobile || "--"}</p>
      <p><strong>Email:</strong> ${row.dataset.email || "--"}</p>
      <p><strong>Remarks:</strong> ${row.dataset.remarks || "--"}</p>
    `;
    modal.showModal();
  });

  searchInput?.addEventListener("input", renderGmcTable);
  yearFilter?.addEventListener("change", renderGmcTable);
  closeProfile?.addEventListener("click", () => modal?.close());
  select.addEventListener("change", renderSelectedBatch);
  renderSelectedBatch();
  renderGmcTable();
}

/* ------------------------------
   Initialize by Page
------------------------------ */
function init() {
  setupDefaults();
  setupNavigation();
  setupLanguagePlaceholder();

  if (page === "home") initHomePage();
  if (page === "news") initNewsPage();
  if (page === "members") initMembersPage();
  if (page === "admin") initAdminPage();
  if (page === "documents") initDocumentsPage();
  if (page === "contact") initContactPage();
  if (page === "services") initServicesPage();
}

init();
