/* ------------------------------
   NGT Shared App Logic
------------------------------ */
const STORAGE_KEYS = {
  members: "ngt_members",
  announcements: "ngt_announcements",
  documents: "ngt_documents"
};

const SUPPORT_EMAIL = "ngt-secretariat@gmail.com";

const SITE_PAGE_INDEX = [
  {
    type: "Page",
    title: "Home",
    href: "index.html",
    summary: "Official platform, mission in service of Tsa-Wa-Sum, impact stats, and latest announcements.",
    keywords:
      "home nyikem gongzhu tshogpa official platform mission service unity heritage institutional reach members dzongkhags years established announcements"
  },
  {
    type: "Page",
    title: "About NGT",
    href: "about.html",
    summary: "Institutional purpose, history and formation, organizational structure, and core aims of NGT.",
    keywords:
      "about institutional purpose national responsibility history formation organizational structure executive committee unity solidarity bhutanese values traditions tsa-wa-sum royal command"
  },
  {
    type: "Page",
    title: "Member Records",
    href: "members.html",
    summary: "Structured member directory with serial ID, service year, nyikem year, resignation year, and joined year.",
    keywords:
      "members member records structured directory register serial id service year nyikem year resignation year joined ngt phone email address last post knowledge"
  },
  {
    type: "Page",
    title: "Services",
    href: "services.html",
    summary: "Service lists, GMC duty volunteers, De-Suup list, batch selection, and duty information.",
    keywords:
      "services service lists duty information gmc volunteers fifth gmc de-suup batch selection thimphu residence chairman secretary treasurer"
  },
  {
    type: "Page",
    title: "News & Events",
    href: "news.html",
    summary: "Official announcements, AGM updates, meetings, notices, and activity updates.",
    keywords:
      "news events official announcements communications agm meetings notices updates activities"
  },
  {
    type: "Page",
    title: "Documents",
    href: "documents.html",
    summary: "Archive of official files including constitution, forms, notices, circulars, and downloadable records.",
    keywords:
      "documents archive upload pdf repository constitution forms notices circulars downloadable records"
  },
  {
    type: "Page",
    title: "Contact",
    href: "contact.html",
    summary: "Secretariat office, Motithang Thimphu address, email, and executive contact numbers.",
    keywords:
      "contact secretariat communication desk office details office of nyikem gongzhu tshogpa motithang thimphu bhutan ngt-secretariat@gmail.com chairman vice chairman secretary treasurer phone email postal address"
  }
];

const page = document.body.dataset.page || "";

function getSiteContent() {
  return window.NGT_SITE_CONTENT || {};
}

function getConfiguredAnnouncements() {
  const announcements = getSiteContent().announcements;
  return Array.isArray(announcements) ? announcements : [];
}

function getConfiguredDocuments() {
  const documents = getSiteContent().documents;
  return Array.isArray(documents) ? documents : [];
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDisplayDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value ?? "");
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function sanitizeDocumentHref(value) {
  const href = String(value ?? "").trim();
  if (!href) return "";

  if (/^data:application\/pdf;base64,/i.test(href)) {
    return href;
  }

  if (/^(?:\.\/|\.\.\/|\/)?[A-Za-z0-9 _./-]+\.pdf$/i.test(href)) {
    return href;
  }

  return "";
}

function getReadonlyDocuments() {
  const staticDocs = getConfiguredDocuments().map((doc) => ({
    title: doc.title,
    fileName: doc.fileName,
    href: sanitizeDocumentHref(doc.href),
    uploadedAt: doc.uploadedAt || "",
    source: "static"
  })).filter((doc) => doc.href);

  const storedDocs = getData(STORAGE_KEYS.documents, [])
    .map((doc) => ({
      title: doc.title,
      fileName: doc.fileName,
      href: sanitizeDocumentHref(doc.dataUrl),
      uploadedAt: doc.uploadedAt || "",
      source: "browser"
    }))
    .filter((doc) => doc.href);

  return [...staticDocs, ...storedDocs];
}

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
  const seededMembers = Array.isArray(window.NGT_MEMBERS_SEED) ? window.NGT_MEMBERS_SEED : [];
  const existingMembers = getData(STORAGE_KEYS.members, []);
  if (!localStorage.getItem(STORAGE_KEYS.members) || (!existingMembers.length && seededMembers.length)) {
    setData(STORAGE_KEYS.members, seededMembers);
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

  btn.textContent = "Dzongkha Coming Soon";
  btn.disabled = true;
  btn.setAttribute("aria-disabled", "true");
  btn.title = "Dzongkha translation is not published yet.";
}

/* ------------------------------
   Announcement Helpers
------------------------------ */
function getAnnouncementsSorted() {
  const configuredAnnouncements = getConfiguredAnnouncements();
  const announcements = configuredAnnouncements.length
    ? configuredAnnouncements
    : getData(STORAGE_KEYS.announcements, []);
  return [...announcements].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSearchTokens(term) {
  return term
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
}

function getMatchScore(values, term) {
  const normalizedTerm = term.trim().toLowerCase();
  const tokens = getSearchTokens(term);
  let score = 0;

  values.filter(Boolean).forEach((value) => {
    const text = String(value).toLowerCase();
    if (!text) return;

    if (text === normalizedTerm) score += 160;
    if (text.startsWith(normalizedTerm)) score += 110;
    if (text.includes(normalizedTerm)) score += 80;

    tokens.forEach((token) => {
      if (text === token) score += 40;
      else if (text.startsWith(token)) score += 24;
      else if (text.includes(token)) score += 14;
    });
  });

  return score;
}

function highlightMatch(text, term) {
  const rawText = String(text ?? "");
  const tokens = getSearchTokens(term);
  if (!rawText || !tokens.length) return escapeHTML(rawText);

  const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "ig");
  return rawText
    .split(pattern)
    .map((part) => {
      if (!part) return "";
      const isMatch = tokens.some((token) => token === part.toLowerCase());
      return isMatch ? `<mark>${escapeHTML(part)}</mark>` : escapeHTML(part);
    })
    .join("");
}

function getSearchSnippet(values, term) {
  const source = values.find((value) => String(value ?? "").toLowerCase().includes(term.toLowerCase())) || values.find(Boolean) || "";
  return highlightMatch(source, term);
}

function renderAnnouncementCard(item) {
  return `
    <article class="announcement-item">
      <div class="announcement-meta">
        <span class="badge">New</span>
        <p class="muted">${escapeHTML(formatDisplayDate(item.date))}</p>
      </div>
      <h3>${escapeHTML(item.title)}</h3>
      <p>${escapeHTML(item.body)}</p>
    </article>
  `;
}

function setupGlobalSearchNav() {
  const searchToggle = document.getElementById("globalSearchToggle");
  const searchForm = document.getElementById("globalSearchForm");
  const searchInput = document.getElementById("globalSearchInput");

  if (!searchToggle || !searchForm || !searchInput) return;

  searchToggle.addEventListener("click", () => {
    const isHidden = searchForm.classList.toggle("hidden");
    searchToggle.setAttribute("aria-expanded", String(!isHidden));
    if (!isHidden) searchInput.focus();
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const term = searchInput.value.trim();
    if (!term) return;
    window.location.href = `search.html?q=${encodeURIComponent(term)}`;
  });
}

function findSiteSearchResults(term) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) {
    return { members: [], announcements: [], pages: [], documents: [] };
  }

  const members = getData(STORAGE_KEYS.members, [])
    .map((member) => {
      const values = [member.fullName, member.serialId, member.lastPost, member.knowledge, member.address];
      const score = getMatchScore(values, normalized);
      return score
        ? {
            ...member,
            score,
            snippet: getSearchSnippet([member.lastPost, member.knowledge, member.address, member.serialId], normalized)
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || String(a.fullName).localeCompare(String(b.fullName)));

  const announcements = getAnnouncementsSorted()
    .map((item) => {
      const values = [item.title, item.body];
      const score = getMatchScore(values, normalized);
      return score
        ? {
            ...item,
            score,
            snippet: getSearchSnippet([item.body, item.title], normalized)
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || new Date(b.date) - new Date(a.date));

  const pages = SITE_PAGE_INDEX
    .map((pageEntry) => {
      const values = [pageEntry.title, pageEntry.summary, pageEntry.keywords];
      const score = getMatchScore(values, normalized);
      return score
        ? {
            ...pageEntry,
            score,
            snippet: getSearchSnippet([pageEntry.summary, pageEntry.keywords], normalized)
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title)));

  const documents = getReadonlyDocuments()
    .map((doc) => {
      const values = [doc.title, doc.fileName];
      const score = getMatchScore(values, normalized);
      return score
        ? {
            ...doc,
            score,
            snippet: getSearchSnippet([doc.title, doc.fileName], normalized)
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || String(a.title).localeCompare(String(b.title)));

  return { members, announcements, pages, documents };
}

function initHomePage() {
  const wrapper = document.getElementById("announcementPreview");
  const heroSlider = document.getElementById("heroSlider");
  const heroTitle = document.getElementById("heroTitle");
  const heroSubtitle = document.getElementById("heroSubtitle");
  const heroText = document.getElementById("heroText");
  const heroCaption = document.getElementById("heroCaption");
  const quickUpdateLabel = document.getElementById("quickUpdateLabel");
  const featuredAnnouncementMeta = document.getElementById("featuredAnnouncementMeta");
  const featuredAnnouncementTitle = document.getElementById("featuredAnnouncementTitle");
  const featuredAnnouncementBody = document.getElementById("featuredAnnouncementBody");

  const items = getAnnouncementsSorted();
  const featuredAnnouncement = items[0];

  if (quickUpdateLabel) quickUpdateLabel.textContent = featuredAnnouncement ? formatDisplayDate(featuredAnnouncement.date) : "No updates";
  if (featuredAnnouncementMeta) {
    featuredAnnouncementMeta.textContent = featuredAnnouncement
      ? `Latest official update | ${formatDisplayDate(featuredAnnouncement.date)}`
      : "Official updates will appear here";
  }
  if (featuredAnnouncementTitle) {
    featuredAnnouncementTitle.textContent = featuredAnnouncement ? featuredAnnouncement.title : "No announcements published yet";
  }
  if (featuredAnnouncementBody) {
    featuredAnnouncementBody.textContent = featuredAnnouncement
      ? featuredAnnouncement.body
      : "Publish announcements in site-content.js to feature them across the homepage and news page.";
  }

  if (wrapper) {
    const previewItems = items.slice(0, 3);
    wrapper.innerHTML = previewItems.length
      ? previewItems
          .map((item, index) => `
            <article class="announcement-item ${index === 0 ? "announcement-item-featured" : ""}">
              <div class="announcement-meta">
                <span class="badge">${index === 0 ? "Latest" : "New"}</span>
                <p class="muted">${escapeHTML(formatDisplayDate(item.date))}</p>
              </div>
              <h3>${escapeHTML(item.title)}</h3>
              <p>${escapeHTML(item.body)}</p>
            </article>
          `)
          .join("")
      : "<p>No announcements available.</p>";
  }

  if (!heroSlider || !heroTitle || !heroSubtitle || !heroText || !heroCaption) return;

  const slides = [
    {
      theme: "service",
      image: "./cover pic/472057341_10162040474453260_5092529835833910460_n.jpg",
      title: "Nyikem Gongzhu Tshogpa",
      subtitle: "Association of Retired Red Scarf Officers",
      text:
        "A national association of retired Nyikem recipients committed to service, unity, and Bhutanese values.",
      tag: "Service",
      caption:
        "A respected national platform for solidarity, continuity, and meaningful service."
    },
    {
      theme: "unity",
      image: "./cover pic/bf01ff50-c098-4083-8ef5-31413f2dfca8.jpg",
      title: "Strengthening Fellowship and Collective Responsibility",
      subtitle: "Association of Retired Red Scarf Officers",
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
      subtitle: "Association of Retired Red Scarf Officers",
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
    heroSubtitle.textContent = slide.subtitle;
    heroText.textContent = slide.text;
    heroCaption.textContent = slide.caption;
  }

  renderHeroSlide(currentSlide);
  window.setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    renderHeroSlide(currentSlide);
  }, 9000);
}

function initSearchPage() {
  const queryHeading = document.getElementById("searchQueryHeading");
  const queryCount = document.getElementById("searchResultCount");
  const resultsWrap = document.getElementById("searchResultsGrid");
  const searchForm = document.getElementById("searchPageForm");
  const searchInput = document.getElementById("searchPageInput");

  if (!queryHeading || !queryCount || !resultsWrap || !searchForm || !searchInput) return;

  function renderSearchResults(term) {
    const cleanTerm = term.trim();
    const { members, announcements, pages, documents } = findSiteSearchResults(cleanTerm);
    const total = members.length + announcements.length + pages.length + documents.length;

    queryHeading.textContent = cleanTerm ? `Results for "${cleanTerm}"` : "Search the NGT website";
    queryCount.textContent = cleanTerm
      ? `${total} result${total === 1 ? "" : "s"} found`
      : "Enter a keyword to explore pages, members, announcements, and documents.";

    if (!cleanTerm) {
      resultsWrap.innerHTML = `
        <article class="search-empty card">
          <p>Try a member name, serial ID, announcement title, or keyword.</p>
        </article>
      `;
      return;
    }

    const memberCards = members.map(
      (member) => `
        <a class="search-result-card" href="members.html?member=${encodeURIComponent(member.id)}&q=${encodeURIComponent(cleanTerm)}">
          <span class="search-result-type">Member</span>
          <strong>${highlightMatch(member.fullName, cleanTerm)}</strong>
          <p>${escapeHTML(member.serialId || "--")}</p>
          <p class="search-result-snippet">${member.snippet}</p>
        </a>
      `
    );

    const announcementCards = announcements.map(
      (item) => `
        <a class="search-result-card" href="news.html">
          <span class="search-result-type">Announcement</span>
          <strong>${highlightMatch(item.title, cleanTerm)}</strong>
          <p>${escapeHTML(formatDisplayDate(item.date))}</p>
          <p class="search-result-snippet">${item.snippet}</p>
        </a>
      `
    );

    const pageCards = pages.map(
      (pageEntry) => `
        <a class="search-result-card" href="${pageEntry.href}">
          <span class="search-result-type">${pageEntry.type}</span>
          <strong>${highlightMatch(pageEntry.title, cleanTerm)}</strong>
          <p class="search-result-snippet">${pageEntry.snippet}</p>
        </a>
      `
    );

    const documentCards = documents.map(
      (doc) => `
        <a class="search-result-card" href="${doc.href || "documents.html"}">
          <span class="search-result-type">Document</span>
          <strong>${highlightMatch(doc.title, cleanTerm)}</strong>
          <p class="search-result-snippet">${doc.snippet}</p>
        </a>
      `
    );

    const sections = [
      { title: "Pages", cards: pageCards },
      { title: "Members", cards: memberCards },
      { title: "Announcements", cards: announcementCards },
      { title: "Documents", cards: documentCards }
    ].filter((section) => section.cards.length);

    resultsWrap.innerHTML = sections.length
      ? sections
          .map(
            (section) => `
              <section class="search-result-section">
                <div class="search-section-head">
                  <h2>${section.title}</h2>
                  <p>${section.cards.length} match${section.cards.length === 1 ? "" : "es"}</p>
                </div>
                <div class="search-section-grid">
                  ${section.cards.join("")}
                </div>
              </section>
            `
          )
          .join("")
      : `<article class="search-empty card"><p>No matching pages, members, announcements, or documents were found.</p></article>`;
  }

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") || "";
  searchInput.value = initialQuery;
  renderSearchResults(initialQuery);

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const term = searchInput.value.trim();
    const url = term ? `search.html?q=${encodeURIComponent(term)}` : "search.html";
    window.history.replaceState({}, "", url);
    renderSearchResults(term);
  });
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
  const nyikemFilter = document.getElementById("nyikemFilter");
  const sortSelect = document.getElementById("memberSort");
  const resultCount = document.getElementById("memberResultCount");
  const modal = document.getElementById("profileModal");
  const profileContent = document.getElementById("profileContent");
  const closeProfile = document.getElementById("closeProfile");

  if (!tableBody || !searchInput || !yearFilter || !nyikemFilter || !sortSelect || !resultCount || !modal || !profileContent) return;

  const getMembers = () => getData(STORAGE_KEYS.members, []);

  function profileField(label, value, extraClass = "") {
    const className = ["profile-item", extraClass].filter(Boolean).join(" ");
    return `
      <div class="${className}">
        <span class="profile-label">${escapeHTML(label)}</span>
        <p class="profile-value">${escapeHTML(value || "--")}</p>
      </div>
    `;
  }

  function populateYearFilter() {
    const years = [...new Set(getMembers().map((m) => m.joinedYear))].sort();
    yearFilter.innerHTML = `<option value="">All Joined Years</option>${years
      .map((year) => `<option value="${escapeHTML(year)}">${escapeHTML(year)}</option>`)
      .join("")}`;
  }

  function populateNyikemFilter() {
    const years = [...new Set(getMembers().map((m) => m.nyikemYear).filter(Boolean))].sort((a, b) => Number(b) - Number(a));
    nyikemFilter.innerHTML = `<option value="">All Nyikem Years</option>${years
      .map((year) => `<option value="${escapeHTML(year)}">${escapeHTML(year)}</option>`)
      .join("")}`;
  }

  function compareMembers(a, b, sortValue) {
    if (sortValue === "joined-desc") return Number(b.joinedYear || 0) - Number(a.joinedYear || 0);
    if (sortValue === "nyikem-desc") return Number(b.nyikemYear || 0) - Number(a.nyikemYear || 0);
    if (sortValue === "serial-asc") return String(a.serialId).localeCompare(String(b.serialId), undefined, { numeric: true });
    return String(a.fullName).localeCompare(String(b.fullName));
  }

  function openMemberProfile(memberId) {
    const selected = getMembers().find((member) => member.id === memberId);
    if (!selected) return;

    profileContent.innerHTML = `
      <div class="profile-layout">
        <section class="profile-header-card">
          <p class="profile-overline">Member Profile</p>
          <h2>${escapeHTML(selected.fullName)}</h2>
          <p class="profile-id">${escapeHTML(selected.serialId)}</p>
          <p class="profile-header-note">Structured member record for Nyikem Gongzhu Tshogpa.</p>
        </section>

        <section class="profile-section">
          <h3>Basic Info</h3>
          <div class="profile-grid">
            ${profileField("Service Year", selected.serviceYear)}
            ${profileField("Nyikem Year", selected.nyikemYear)}
            ${profileField("Resignation Year", selected.resignationYear)}
            ${profileField("Joined NGT", selected.joinedYear)}
          </div>
        </section>

        <section class="profile-section">
          <h3>Contact Info</h3>
          <div class="profile-grid">
            ${profileField("Phone", selected.phone)}
            ${profileField("Email", selected.email)}
            ${profileField("Address", selected.address, "full")}
          </div>
        </section>

        <section class="profile-section">
          <h3>Experience</h3>
          <div class="profile-grid">
            ${profileField("Last Post Held", selected.lastPost)}
            ${profileField("Knowledge / Experience", selected.knowledge, "full")}
          </div>
        </section>

        <section class="profile-card-preview">
          <p class="profile-overline">Member Card</p>
          <h4>${escapeHTML(selected.fullName)}</h4>
          <p><strong>${escapeHTML(selected.serialId)}</strong></p>
          <p class="muted">Retired Nyikem Recipient | Nyikem Gongzhu Tshogpa</p>
        </section>
      </div>
    `;
    modal.showModal();
  }

  function renderTable() {
    const keyword = searchInput.value.trim().toLowerCase();
    const selectedYear = yearFilter.value;
    const selectedNyikemYear = nyikemFilter.value;
    const selectedSort = sortSelect.value;
    let members = getMembers();

    members = members.filter((m) => {
      const matchesSearch =
        !keyword ||
        [m.fullName, m.serialId, m.lastPost, m.address]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesYear = !selectedYear || String(m.joinedYear) === selectedYear;
      const matchesNyikemYear = !selectedNyikemYear || String(m.nyikemYear) === selectedNyikemYear;
      return matchesSearch && matchesYear && matchesNyikemYear;
    });

    members = members.sort((a, b) => compareMembers(a, b, selectedSort));
    resultCount.textContent = `${members.length} member record${members.length === 1 ? "" : "s"} shown`;

    if (!members.length) {
      tableBody.innerHTML = "<tr><td colspan='7'>No members found.</td></tr>";
      return;
    }

    tableBody.innerHTML = members
      .map(
        (member) => `
      <tr>
        <td>${escapeHTML(member.serialId)}</td>
        <td>${escapeHTML(member.fullName)}</td>
          <td>${escapeHTML(member.serviceYear || "--")}</td>
          <td>${escapeHTML(member.nyikemYear || "--")}</td>
          <td>${escapeHTML(member.resignationYear || "--")}</td>
          <td>${escapeHTML(member.joinedYear || "--")}</td>
          <td>
            <button class="btn" data-action="view" data-id="${escapeHTML(member.id)}" type="button">View Profile</button>
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

    if (action === "view") {
      openMemberProfile(id);
    }
    });

  closeProfile?.addEventListener("click", () => modal.close());

  searchInput.addEventListener("input", renderTable);
  yearFilter.addEventListener("change", renderTable);
  nyikemFilter.addEventListener("change", renderTable);
  sortSelect.addEventListener("change", renderTable);

  populateYearFilter();
  populateNyikemFilter();
  renderTable();

  const params = new URLSearchParams(window.location.search);
  const requestedMember = params.get("member");
  const requestedSearch = params.get("q");
  if (requestedSearch) searchInput.value = requestedSearch;
  renderTable();
  if (requestedMember) {
    openMemberProfile(requestedMember);
  }
}

function initAdminPage() {
  const status = document.getElementById("adminStatus");
  const listWrap = document.getElementById("announcementAdminList");
  if (!status || !listWrap) return;

  function renderAdminAnnouncements() {
    const items = getAnnouncementsSorted();
    listWrap.innerHTML = items.length
      ? items
          .map(
            (item) => `
      <article class="admin-list-item">
        <h4>${escapeHTML(item.title)}</h4>
        <p class="muted">${escapeHTML(formatDisplayDate(item.date))}</p>
        <p>${escapeHTML(item.body)}</p>
      </article>
    `
          )
          .join("")
      : "<p>No announcements available.</p>";
  }

  status.textContent =
    "Secure browser-based administration has been disabled in this static build. To update announcements safely, edit site-content.js or connect a real backend with server-side authentication.";
  renderAdminAnnouncements();
}

/* ------------------------------
   Documents Page
------------------------------ */
function initDocumentsPage() {
  const status = document.getElementById("documentStatus");
  const list = document.getElementById("documentList");
  if (!status || !list) return;

  function renderDocuments() {
    const docs = getReadonlyDocuments();
    list.innerHTML = docs.length
      ? docs
          .map(
            (doc) => `
      <article class="doc-item">
        <h3>${escapeHTML(doc.title)}</h3>
        <p class="muted">File: ${escapeHTML(doc.fileName || "Document")}</p>
        <p class="muted">Available: ${escapeHTML(doc.uploadedAt ? formatDisplayDate(doc.uploadedAt) : "Published document")}</p>
        <a class="btn" href="${doc.href}" target="_blank" rel="noopener">Open PDF</a>
        <a class="btn btn-outline" href="${doc.href}" download="${escapeHTML(doc.fileName || "document.pdf")}">Download</a>
      </article>
    `
          )
          .join("")
      : "<p>No documents are published yet.</p>";
  }
  status.textContent =
    "Web uploads have been disabled in the public static site. Publish PDFs in site-content.js or connect a secure backend so every visitor sees the same vetted documents.";
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

    form.reset();
    status.textContent = "Your email app should open now. If it does not, email ngt-secretariat@gmail.com directly.";
    window.location.href =
      `mailto:${encodeURIComponent(SUPPORT_EMAIL)}?subject=${encodeURIComponent(`NGT Website Inquiry from ${name}`)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`;
  });
}

function initServicesPage() {
  const select = document.getElementById("serviceBatchSelect");
  const yearFilter = document.getElementById("serviceYearFilter");
  const searchInput = document.getElementById("serviceSearch");
  const sections = document.querySelectorAll(".service-batch");
  const tableBody = document.getElementById("gmcDutyTableBody");
  const totalMembers = document.getElementById("gmcTotalMembers");
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

  searchInput?.addEventListener("input", renderGmcTable);
  yearFilter?.addEventListener("change", renderGmcTable);
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
  setupGlobalSearchNav();

  if (page === "home") initHomePage();
  if (page === "news") initNewsPage();
  if (page === "members") initMembersPage();
  if (page === "admin") initAdminPage();
  if (page === "documents") initDocumentsPage();
  if (page === "contact") initContactPage();
  if (page === "services") initServicesPage();
  if (page === "search") initSearchPage();
}

init();
