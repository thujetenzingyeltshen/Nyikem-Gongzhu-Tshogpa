/* ------------------------------
   NGT Shared App Logic
------------------------------ */
const STORAGE_KEYS = {
  members: "ngt_members",
  announcements: "ngt_announcements",
  documents: "ngt_documents"
};

const SUPPORT_EMAIL = "ngt-secretariat@gmail.com";
const DEFAULT_SUPABASE_CONFIG = {
  url: "",
  anonKey: "",
  membersTable: "members",
  adminUsersTable: "admin_users",
  announcementsTable: "announcements"
};
let supabaseClient = null;

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

function sanitizeImageUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url)) return url;
  if (/^(?:\.\/|\.\.\/|\/)[^\s]+$/i.test(url)) return url;
  return "";
}

function sanitizeFileName(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "image";
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

function getSupabaseConfig() {
  const raw = window.NGT_SUPABASE_CONFIG || {};
  return {
    ...DEFAULT_SUPABASE_CONFIG,
    ...raw
  };
}

function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(
    config.url &&
      config.anonKey &&
      window.supabase &&
      typeof window.supabase.createClient === "function"
  );
}

function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (supabaseClient) return supabaseClient;

  const config = getSupabaseConfig();
  supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  return supabaseClient;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeYear(value) {
  return normalizeText(value).replace(/[^\d]/g, "").slice(0, 4);
}

function parseYearValue(value) {
  const normalized = normalizeYear(value);
  return normalized ? Number(normalized) : null;
}

function mapRemoteMember(row) {
  return {
    id: row.id,
    serialId: normalizeText(row.serial_id),
    fullName: normalizeText(row.full_name),
    serviceYear: normalizeYear(row.service_year),
    nyikemYear: normalizeYear(row.nyikem_year),
    resignationYear: normalizeYear(row.resignation_year),
    joinedYear: normalizeYear(row.joined_year),
    cidNo: normalizeText(row.cid_no),
    dateOfBirth: normalizeText(row.date_of_birth),
    address: normalizeText(row.address),
    phone: normalizeText(row.phone),
    email: normalizeText(row.email),
    lastPost: normalizeText(row.last_post),
    spouseOrKin: normalizeText(row.spouse_or_kin),
    knowledge: normalizeText(row.knowledge)
  };
}

function mapMemberToRemote(member) {
  return {
    serial_id: normalizeText(member.serialId),
    full_name: normalizeText(member.fullName),
    service_year: normalizeYear(member.serviceYear),
    nyikem_year: normalizeYear(member.nyikemYear),
    resignation_year: normalizeYear(member.resignationYear),
    joined_year: normalizeYear(member.joinedYear),
    cid_no: normalizeText(member.cidNo),
    date_of_birth: normalizeText(member.dateOfBirth),
    address: normalizeText(member.address),
    phone: normalizeText(member.phone),
    email: normalizeText(member.email),
    last_post: normalizeText(member.lastPost),
    spouse_or_kin: normalizeText(member.spouseOrKin),
    knowledge: normalizeText(member.knowledge)
  };
}

function mapRemoteAnnouncement(row) {
  return {
    id: row.id,
    title: normalizeText(row.title),
    date: normalizeText(row.date),
    imageUrl: sanitizeImageUrl(row.image_url),
    body: normalizeText(row.body)
  };
}

function mapAnnouncementToRemote(item) {
  return {
    title: normalizeText(item.title),
    date: normalizeText(item.date),
    image_url: sanitizeImageUrl(item.imageUrl),
    body: normalizeText(item.body)
  };
}

async function refreshMembersFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return false;

  const config = getSupabaseConfig();
  const { data, error } = await client
    .from(config.membersTable)
    .select("*")
    .order("serial_id", { ascending: true });

  if (error) {
    throw error;
  }

  const remoteMembers = Array.isArray(data) ? data.map(mapRemoteMember) : [];
  const existingLocalMembers = getData(STORAGE_KEYS.members, []);
  if (remoteMembers.length || !existingLocalMembers.length) {
    setData(STORAGE_KEYS.members, remoteMembers);
  }
  return true;
}

async function refreshAnnouncementsFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return false;

  const config = getSupabaseConfig();
  const { data, error } = await client
    .from(config.announcementsTable)
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    throw error;
  }

  const remoteAnnouncements = Array.isArray(data) ? data.map(mapRemoteAnnouncement) : [];
  const existingLocalAnnouncements = getData(STORAGE_KEYS.announcements, []);
  if (remoteAnnouncements.length || !existingLocalAnnouncements.length) {
    setData(STORAGE_KEYS.announcements, remoteAnnouncements);
  }
  return true;
}

async function saveMemberToSupabase(member, existingMember = null) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const config = getSupabaseConfig();
  const payload = mapMemberToRemote(member);

  if (existingMember?.id) {
    const { error } = await client.from(config.membersTable).update(payload).eq("id", existingMember.id);
    if (error) throw error;
    return existingMember.id;
  }

  const { data, error } = await client.from(config.membersTable).insert(payload).select("id").single();
  if (error) throw error;
  return data?.id || null;
}

async function deleteMemberFromSupabase(memberId) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const config = getSupabaseConfig();
  const { error } = await client.from(config.membersTable).delete().eq("id", memberId);
  if (error) throw error;
}

async function saveAnnouncementToSupabase(item, existingItem = null) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const config = getSupabaseConfig();
  const payload = mapAnnouncementToRemote(item);

  if (existingItem?.id) {
    const { error } = await client.from(config.announcementsTable).update(payload).eq("id", existingItem.id);
    if (error) throw error;
    return existingItem.id;
  }

  const { data, error } = await client.from(config.announcementsTable).insert(payload).select("id").single();
  if (error) throw error;
  return data?.id || null;
}

async function deleteAnnouncementFromSupabase(announcementId) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const config = getSupabaseConfig();
  const { error } = await client.from(config.announcementsTable).delete().eq("id", announcementId);
  if (error) throw error;
}

async function uploadAnnouncementImage(file) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  if (!(file instanceof File)) {
    return "";
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("Please upload an image smaller than 5 MB.");
  }

  const config = getSupabaseConfig();
  const extension = sanitizeFileName(file.name).split(".").pop();
  const path = `announcements/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const { error: uploadError } = await client.storage
    .from(config.announcementImagesBucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

  if (uploadError) {
    if (/bucket not found/i.test(uploadError.message || "")) {
      throw new Error("Announcement image upload is not ready yet. Run the Supabase storage setup SQL to create the announcement-images bucket.");
    }
    throw uploadError;
  }

  const { data } = client.storage.from(config.announcementImagesBucket).getPublicUrl(path);
  return data?.publicUrl || "";
}

async function getCurrentSupabaseUser() {
  const client = getSupabaseClient();
  if (!client) return null;

  const {
    data: { user },
    error
  } = await client.auth.getUser();

  if (error) {
    throw error;
  }

  return user || null;
}

async function isSupabaseAdminUser(userId) {
  const client = getSupabaseClient();
  if (!client || !userId) return false;

  const config = getSupabaseConfig();
  const { data, error } = await client
    .from(config.adminUsersTable)
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.user_id);
}

function setupDefaults() {
  const seededMembers = Array.isArray(window.NGT_MEMBERS_SEED) ? window.NGT_MEMBERS_SEED : [];
  const existingMembers = getData(STORAGE_KEYS.members, []);
  if (!localStorage.getItem(STORAGE_KEYS.members) || (!existingMembers.length && seededMembers.length)) {
    setData(STORAGE_KEYS.members, seededMembers);
  }

  const seededAnnouncements = getConfiguredAnnouncements();
  const existingAnnouncements = getData(STORAGE_KEYS.announcements, []);
  if (!localStorage.getItem(STORAGE_KEYS.announcements) || (!existingAnnouncements.length && seededAnnouncements.length)) {
    setData(STORAGE_KEYS.announcements, seededAnnouncements);
  }
}

function setupNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".main-nav");

  if (toggle && nav) {
    const closeNav = () => {
      nav.classList.remove("open");
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      document.body.classList.toggle("nav-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeNav);
    });

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!nav.classList.contains("open")) return;
      if (nav.contains(target) || toggle.contains(target)) return;
      closeNav();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeNav();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) {
        closeNav();
      }
    });
  }
}

function setupLanguagePlaceholder() {
  const btn = document.getElementById("langToggle");
  if (!btn) return;

  btn.textContent = "རྫོང་ཁ coming soon";
  btn.disabled = true;
  btn.setAttribute("aria-disabled", "true");
  btn.title = "Dzongkha translation is not published yet.";
}

/* ------------------------------
   Announcement Helpers
------------------------------ */
function getAnnouncementsSorted() {
  const storedAnnouncements = getData(STORAGE_KEYS.announcements, []);
  const configuredAnnouncements = getConfiguredAnnouncements();
  const announcements = storedAnnouncements.length ? storedAnnouncements : configuredAnnouncements;
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

function inferAnnouncementCategory(item) {
  const haystack = `${item.title || ""} ${item.body || ""}`.toLowerCase();
  if (haystack.includes("agm")) return "AGM";
  if (haystack.includes("meeting")) return "Meeting";
  if (haystack.includes("policy")) return "Policy";
  if (haystack.includes("event") || haystack.includes("activity")) return "Event";
  if (haystack.includes("notice")) return "Notice";
  return "Update";
}

function getAnnouncementExcerpt(item, maxLength = 150) {
  const source = String(item.body || "").trim();
  if (!source) return "";
  if (source.length <= maxLength) return source;
  return `${source.slice(0, maxLength).trimEnd()}...`;
}

function renderAnnouncementCard(item, options = {}) {
  const mode = options.mode || "news";
  const category = inferAnnouncementCategory(item);
  const excerpt = getAnnouncementExcerpt(item, mode === "preview" ? 120 : 170);
  const detailHref = `news.html?announcement=${encodeURIComponent(item.id)}`;
  const actionMarkup =
    mode === "news"
      ? `<div class="announcement-actions"><a class="announcement-read-more" href="${detailHref}">Read More -&gt;</a></div>`
      : `<div class="announcement-actions"><a class="announcement-read-more" href="${detailHref}">Read More -&gt;</a></div>`;

  return `
    <article class="announcement-item">
      <div class="announcement-meta">
        <span class="badge">${escapeHTML(category)}</span>
        <p class="announcement-date">${escapeHTML(formatDisplayDate(item.date))}</p>
      </div>
      <h3>${escapeHTML(item.title)}</h3>
      <p class="announcement-excerpt">${escapeHTML(excerpt)}</p>
      ${actionMarkup}
    </article>
  `;
}

function renderAnnouncementDetail(item) {
  const category = inferAnnouncementCategory(item);
  return `
    <section class="news-detail-shell">
      <a class="btn btn-outline news-detail-back back-btn" href="news.html">Back to News</a>
      <article class="news-detail-card">
        <div class="announcement-meta news-detail-meta">
          <span class="badge">${escapeHTML(category)}</span>
          <p class="announcement-date">${escapeHTML(formatDisplayDate(item.date))}</p>
        </div>
        <h2>${escapeHTML(item.title)}</h2>
        ${item.imageUrl ? `<div class="announcement-photo-wrap"><img class="announcement-photo" src="${escapeHTML(item.imageUrl)}" alt="${escapeHTML(item.title)}" loading="eager" decoding="async" /></div>` : ""}
        <p class="announcement-full">${escapeHTML(item.body)}</p>
      </article>
    </section>
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
  const featuredAnnouncementMeta = document.getElementById("featuredAnnouncementMeta");
  const featuredAnnouncementTitle = document.getElementById("featuredAnnouncementTitle");
  const featuredAnnouncementBody = document.getElementById("featuredAnnouncementBody");

  const items = getAnnouncementsSorted();
  const featuredAnnouncement = items[0];

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
          .map((item, index) =>
            renderAnnouncementCard(item, { mode: "preview" }).replace(
              'class="announcement-item"',
              `class="announcement-item ${index === 0 ? "announcement-item-featured" : ""}"`
            )
          )
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
        <a class="search-result-card" href="news.html?announcement=${encodeURIComponent(item.id)}">
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
  const listView = document.getElementById("newsListView");
  const detailView = document.getElementById("newsDetailView");
  const summary = document.getElementById("newsResultSummary");
  if (!list) return;

  const items = getAnnouncementsSorted();
  const params = new URLSearchParams(window.location.search);
  const selectedAnnouncementId = params.get("announcement");
  const selectedAnnouncement = selectedAnnouncementId
    ? items.find((item) => String(item.id) === selectedAnnouncementId)
    : null;

  if (selectedAnnouncement && detailView && listView) {
    listView.classList.add("hidden");
    detailView.classList.remove("hidden");
    detailView.innerHTML = renderAnnouncementDetail(selectedAnnouncement);
    return;
  }

  if (detailView && listView) {
    detailView.classList.add("hidden");
    detailView.innerHTML = "";
    listView.classList.remove("hidden");
  }

  if (summary) {
    summary.textContent = `${items.length} official update${items.length === 1 ? "" : "s"} available`;
  }
  list.innerHTML = items.length
    ? items.map((item) => renderAnnouncementCard(item, { mode: "news" })).join("")
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
  const service = parseYearValue(serviceYear);
  const nyikem = parseYearValue(nyikemYear);
  const resignation = parseYearValue(resignationYear);
  const joined = parseYearValue(joinedYear);

  if (service && nyikem && service > nyikem) return "Service year cannot be after Nyikem year.";
  if (nyikem && resignation && nyikem > resignation) return "Nyikem year cannot be after resignation year.";
  if (joined && resignation && joined < resignation) return "Joined NGT year should be same or after resignation year.";
  return "";
}

function buildMemberPayload(source, existingMembers, currentMember = null) {
  const serialId = normalizeText(source.serialId) || currentMember?.serialId || generateSerialId(existingMembers);
  const fullName = normalizeText(source.fullName);
  const email = normalizeText(source.email);

  return {
    id: currentMember?.id || `member-${Date.now()}`,
    serialId,
    fullName,
    serviceYear: normalizeYear(source.serviceYear),
    nyikemYear: normalizeYear(source.nyikemYear),
    resignationYear: normalizeYear(source.resignationYear),
    joinedYear: normalizeYear(source.joinedYear),
    cidNo: normalizeText(source.cidNo),
    dateOfBirth: normalizeText(source.dateOfBirth),
    address: normalizeText(source.address),
    phone: normalizeText(source.phone),
    email,
    lastPost: normalizeText(source.lastPost),
    spouseOrKin: normalizeText(source.spouseOrKin),
    knowledge: normalizeText(source.knowledge)
  };
}

function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function membersToCsv(members) {
  const headers = [
    "Serial ID",
    "Full Name",
    "Service Year",
    "Nyikem Year",
    "Resignation Year",
    "Joined NGT",
    "CID No",
    "Date of Birth",
    "Address",
    "Phone",
    "Email",
    "Last Post",
    "Spouse / Next of Kin",
    "Knowledge / Experience"
  ];
  const rows = members.map((member) => [
    member.serialId,
    member.fullName,
    member.serviceYear,
    member.nyikemYear,
    member.resignationYear,
    member.joinedYear,
    member.cidNo,
    member.dateOfBirth,
    member.address,
    member.phone,
    member.email,
    member.lastPost,
    member.spouseOrKin,
    member.knowledge
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
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
        <td data-label="Serial ID">${escapeHTML(member.serialId)}</td>
        <td data-label="Full Name">${escapeHTML(member.fullName)}</td>
          <td data-label="Service Year">${escapeHTML(member.serviceYear || "--")}</td>
          <td data-label="Nyikem Year">${escapeHTML(member.nyikemYear || "--")}</td>
          <td data-label="Resignation Year">${escapeHTML(member.resignationYear || "--")}</td>
          <td data-label="Joined NGT">${escapeHTML(member.joinedYear || "--")}</td>
          <td data-label="Actions">
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
  const loginForm = document.getElementById("adminLoginForm");
  const emailInput = document.getElementById("adminLoginEmail");
  const passwordInput = document.getElementById("adminPassword");
  const logoutBtn = document.getElementById("adminLogoutBtn");
  const workspace = document.getElementById("adminWorkspace");
  const memberForm = document.getElementById("memberAdminForm");
  const formResetBtn = document.getElementById("memberFormResetBtn");
  const memberStatus = document.getElementById("memberAdminStatus");
  const memberCount = document.getElementById("memberAdminCount");
  const tableBody = document.getElementById("memberAdminTableBody");
  const memberIdInput = document.getElementById("memberId");
  const serialIdInput = document.getElementById("adminSerialId");
  const totalMembersOutput = document.getElementById("adminTotalMembers");
  const emailCoverageOutput = document.getElementById("adminEmailCoverage");
  const latestJoinedOutput = document.getElementById("adminLatestJoinedYear");
  const adminSearchInput = document.getElementById("adminMemberSearch");
  const adminJoinedFilter = document.getElementById("adminJoinedFilter");
  const adminSortSelect = document.getElementById("adminAdminSort");
  const refreshBtn = document.getElementById("adminRefreshMembersBtn");
  const showMembersBtn = document.getElementById("adminShowMembersBtn");
  const showNewsBtn = document.getElementById("adminShowNewsBtn");
  const adminWorkspaceNote = document.getElementById("adminWorkspaceNote");
  const memberAdminPanel = document.getElementById("memberAdminPanel");
  const newsAdminPanel = document.getElementById("newsAdminPanel");
  const announcementForm = document.getElementById("announcementAdminForm");
  const announcementIdInput = document.getElementById("announcementId");
  const announcementCurrentImageUrlInput = document.getElementById("announcementCurrentImageUrl");
  const announcementTitleInput = document.getElementById("announcementTitle");
  const announcementDateInput = document.getElementById("announcementDate");
  const announcementImageFileInput = document.getElementById("announcementImageFile");
  const announcementImagePreviewWrap = document.getElementById("announcementImagePreviewWrap");
  const announcementImagePreview = document.getElementById("announcementImagePreview");
  const announcementBodyInput = document.getElementById("announcementBody");
  const announcementFormResetBtn = document.getElementById("announcementFormResetBtn");
  const announcementStatus = document.getElementById("announcementAdminStatus");
  const announcementSearchInput = document.getElementById("announcementSearch");
  const announcementSortSelect = document.getElementById("announcementSort");
  const announcementRefreshBtn = document.getElementById("announcementRefreshBtn");
  const announcementList = document.getElementById("announcementAdminList");
  let adminSessionBootstrapComplete = false;

  if (
    !status ||
    !loginForm ||
    !emailInput ||
    !passwordInput ||
    !logoutBtn ||
    !workspace ||
    !memberForm ||
    !formResetBtn ||
    !memberStatus ||
    !memberCount ||
    !tableBody ||
    !memberIdInput ||
    !serialIdInput ||
    !totalMembersOutput ||
    !emailCoverageOutput ||
    !latestJoinedOutput ||
    !adminSearchInput ||
    !adminJoinedFilter ||
    !adminSortSelect ||
    !refreshBtn ||
    !showMembersBtn ||
    !showNewsBtn ||
    !adminWorkspaceNote ||
    !memberAdminPanel ||
    !newsAdminPanel ||
    !announcementForm ||
    !announcementIdInput ||
    !announcementCurrentImageUrlInput ||
    !announcementTitleInput ||
    !announcementDateInput ||
    !announcementImageFileInput ||
    !announcementImagePreviewWrap ||
    !announcementImagePreview ||
    !announcementBodyInput ||
    !announcementFormResetBtn ||
    !announcementStatus ||
    !announcementSearchInput ||
    !announcementSortSelect ||
    !announcementRefreshBtn ||
    !announcementList
  ) {
    return;
  }

  const formFields = {
    fullName: document.getElementById("adminFullName"),
    serviceYear: document.getElementById("adminServiceYear"),
    nyikemYear: document.getElementById("adminNyikemYear"),
    resignationYear: document.getElementById("adminResignationYear"),
    joinedYear: document.getElementById("adminJoinedYear"),
    cidNo: document.getElementById("adminCidNo"),
    dateOfBirth: document.getElementById("adminDateOfBirth"),
    phone: document.getElementById("adminPhone"),
    email: document.getElementById("adminEmail"),
    address: document.getElementById("adminAddress"),
    lastPost: document.getElementById("adminLastPost"),
    spouseOrKin: document.getElementById("adminSpouseOrKin"),
    knowledge: document.getElementById("adminKnowledge")
  };

  const getMembers = () => getData(STORAGE_KEYS.members, []);
  const getAnnouncements = () => getData(STORAGE_KEYS.announcements, []);

  function setAdminSection(section) {
    const showMembers = section === "members";
    const showNews = section === "news";
    memberAdminPanel.classList.toggle("hidden", !showMembers);
    newsAdminPanel.classList.toggle("hidden", !showNews);
    showMembersBtn.classList.toggle("btn-primary", showMembers);
    showMembersBtn.classList.toggle("btn-outline", !showMembers);
    showMembersBtn.classList.toggle("is-active", showMembers);
    showNewsBtn.classList.toggle("btn-primary", showNews);
    showNewsBtn.classList.toggle("btn-outline", !showNews);
    showNewsBtn.classList.toggle("is-active", showNews);
    adminWorkspaceNote.textContent = showMembers
      ? "You are managing member records."
      : showNews
        ? "You are managing public news and announcements."
        : "Choose which section you want to manage.";
  }

  function compareAdminMembers(a, b, sortValue) {
    if (sortValue === "joined-desc") return Number(b.joinedYear || 0) - Number(a.joinedYear || 0);
    if (sortValue === "serial-asc") return String(a.serialId || "").localeCompare(String(b.serialId || ""), undefined, { numeric: true });
    return String(a.fullName || "").localeCompare(String(b.fullName || ""));
  }

  function getFilteredAdminMembers() {
    const keyword = adminSearchInput.value.trim().toLowerCase();
    const joinedYear = adminJoinedFilter.value;
    const sortValue = adminSortSelect.value;

    return getMembers()
      .filter((member) => {
        const matchesSearch =
          !keyword ||
          [
            member.serialId,
            member.fullName,
            member.phone,
            member.email,
            member.address,
            member.lastPost
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(keyword));
        const matchesJoinedYear = !joinedYear || String(member.joinedYear || "") === joinedYear;
        return matchesSearch && matchesJoinedYear;
      })
      .sort((a, b) => compareAdminMembers(a, b, sortValue));
  }

  function renderAdminSummary() {
    const members = getMembers();
    const withEmail = members.filter((member) => {
      const email = String(member.email || "").trim();
      return email && email !== "-";
    }).length;
    const latestJoined = members.reduce((latest, member) => {
      const value = Number(member.joinedYear || 0);
      return value > latest ? value : latest;
    }, 0);

    totalMembersOutput.textContent = String(members.length);
    emailCoverageOutput.textContent = `${withEmail}/${members.length || 0}`;
    latestJoinedOutput.textContent = latestJoined ? String(latestJoined) : "--";
  }

  function fillAnnouncementForm(item = null) {
    announcementIdInput.value = item?.id || "";
    announcementCurrentImageUrlInput.value = item?.imageUrl || "";
    announcementTitleInput.value = item?.title || "";
    announcementDateInput.value = item?.date || "";
    announcementImageFileInput.value = "";
    announcementBodyInput.value = item?.body || "";
    announcementImagePreview.src = item?.imageUrl || "";
    announcementImagePreviewWrap.classList.toggle("hidden", !item?.imageUrl);
    announcementStatus.textContent = item
      ? `Editing announcement: ${item.title}`
      : "Create or update a news item for the public News page.";
  }

  function getFilteredAnnouncements() {
    const keyword = announcementSearchInput.value.trim().toLowerCase();
    const sortValue = announcementSortSelect.value;
    const items = getAnnouncements().filter((item) => {
      if (!keyword) return true;
      return [item.title, item.body]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });

    if (sortValue === "date-asc") {
      return items.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    if (sortValue === "title-asc") {
      return items.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    }
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function renderAnnouncementAdminList() {
    const items = getFilteredAnnouncements();
    if (!items.length) {
      announcementList.innerHTML = "<p>No announcements matched the current filters.</p>";
      return;
    }

    announcementList.innerHTML = items
      .map(
        (item) => `
          <article class="announcement-item">
            <div class="announcement-meta">
              <span class="badge">News</span>
              <p class="muted">${escapeHTML(formatDisplayDate(item.date))}</p>
            </div>
            ${item.imageUrl ? `<img class="announcement-photo" src="${escapeHTML(item.imageUrl)}" alt="${escapeHTML(item.title)}" loading="lazy" decoding="async" />` : ""}
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.body)}</p>
            <div class="form-actions top-gap">
              <button class="btn" data-action="edit-announcement" data-id="${escapeHTML(item.id)}" type="button">Edit</button>
              <button class="btn btn-outline" data-action="delete-announcement" data-id="${escapeHTML(item.id)}" type="button">Delete</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function populateAdminJoinedFilter() {
    const years = [...new Set(getMembers().map((member) => member.joinedYear).filter(Boolean))]
      .sort((a, b) => Number(b) - Number(a));
    const currentValue = adminJoinedFilter.value;
    adminJoinedFilter.innerHTML = `<option value="">All Joined Years</option>${years
      .map((year) => `<option value="${escapeHTML(year)}">${escapeHTML(year)}</option>`)
      .join("")}`;
    adminJoinedFilter.value = years.includes(currentValue) ? currentValue : "";
  }

  function fillForm(member = null) {
    const members = getMembers();
    memberIdInput.value = member?.id || "";
    serialIdInput.value = member?.serialId || generateSerialId(members);

    Object.entries(formFields).forEach(([key, field]) => {
      if (field) field.value = member?.[key] || "";
    });

    memberStatus.textContent = member
      ? `Editing ${member.fullName}. Save when you are ready.`
      : "Fill in the form and save to create a new member record.";
  }

  function renderAdminTable() {
    const members = getFilteredAdminMembers();
    memberCount.textContent = `${members.length} member${members.length === 1 ? "" : "s"} shown`;

    if (!members.length) {
      tableBody.innerHTML = "<tr><td colspan='6'>No members matched the current filters.</td></tr>";
      return;
    }

    tableBody.innerHTML = members
      .map(
        (member) => `
          <tr>
            <td data-label="Serial ID">${escapeHTML(member.serialId || "--")}</td>
            <td data-label="Full Name">${escapeHTML(member.fullName || "--")}</td>
            <td data-label="Joined">${escapeHTML(member.joinedYear || "--")}</td>
            <td data-label="Phone">${escapeHTML(member.phone || "--")}</td>
            <td data-label="Email">${escapeHTML(member.email || "--")}</td>
            <td data-label="Actions">
              <button class="btn" data-action="edit-member" data-id="${escapeHTML(member.id)}" type="button">Edit</button>
              <button class="btn btn-outline" data-action="delete-member" data-id="${escapeHTML(member.id)}" type="button">Delete</button>
            </td>
          </tr>
        `
      )
      .join("");
  }

  function resetAdminWorkspace(message) {
    workspace.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    memberForm.reset();
    memberIdInput.value = "";
    serialIdInput.value = "";
    adminSearchInput.value = "";
    adminJoinedFilter.innerHTML = `<option value="">All Joined Years</option>`;
    adminSortSelect.value = "name-asc";
    tableBody.innerHTML = "";
    memberCount.textContent = "0 members";
    totalMembersOutput.textContent = "0";
    emailCoverageOutput.textContent = "0";
    latestJoinedOutput.textContent = "--";
    memberStatus.textContent = message;
    announcementForm.reset();
    announcementIdInput.value = "";
    announcementCurrentImageUrlInput.value = "";
    announcementImagePreview.src = "";
    announcementImagePreviewWrap.classList.add("hidden");
    announcementList.innerHTML = "";
    announcementSearchInput.value = "";
    announcementSortSelect.value = "date-desc";
    announcementStatus.textContent = message;
    setAdminSection("none");
  }

  async function syncAdminView() {
    if (!isSupabaseConfigured()) {
      status.textContent =
        "Supabase is not configured yet. Add your project URL and anon key in supabase-config.js first.";
      resetAdminWorkspace("Supabase is not configured.");
      return;
    }

    let user = null;
    try {
      user = await getCurrentSupabaseUser();
    } catch (error) {
      status.textContent = error.message || "Could not check the current admin session.";
      resetAdminWorkspace("Could not verify admin session.");
      return;
    }

    if (!user) {
      status.textContent = "Sign in with your admin email and password each time you open this page to edit member records.";
      resetAdminWorkspace("Admin is not signed in.");
      return;
    }

    let isAdmin = false;
    try {
      isAdmin = await isSupabaseAdminUser(user.id);
    } catch (error) {
      status.textContent = error.message || "Could not verify admin permissions.";
      resetAdminWorkspace("Could not verify admin permissions.");
      logoutBtn.classList.remove("hidden");
      return;
    }

    if (!isAdmin) {
      status.textContent = `${user.email || "This account"} is signed in, but it does not have admin access.`;
      resetAdminWorkspace("This account is not authorized to edit members.");
      logoutBtn.classList.remove("hidden");
      return;
    }

    try {
      await refreshMembersFromSupabase();
    } catch (error) {
      status.textContent = error.message || "Could not load member records from Supabase.";
      resetAdminWorkspace("Could not load member records.");
      logoutBtn.classList.remove("hidden");
      return;
    }

    workspace.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    emailInput.value = user.email || "";
    passwordInput.value = "";
    status.textContent = `Signed in as ${user.email || "admin user"}. Online member editing is active.`;
    renderAdminSummary();
    populateAdminJoinedFilter();
    renderAdminTable();
    fillForm();
    try {
      await refreshAnnouncementsFromSupabase();
    } catch {
      // Keep existing local/static announcements if remote refresh is not available yet.
    }
    renderAnnouncementAdminList();
    fillAnnouncementForm();
    setAdminSection("none");
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isSupabaseConfigured()) {
      status.textContent = "Supabase is not configured yet.";
      return;
    }

    const client = getSupabaseClient();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      status.textContent = "Enter both email and password.";
      return;
    }

    status.textContent = "Signing in...";

    const { error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      status.textContent = error.message || "Sign in failed.";
      return;
    }

    await syncAdminView();
  });

  logoutBtn.addEventListener("click", async () => {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client.auth.signOut();
    if (error) {
      status.textContent = error.message || "Sign out failed.";
      return;
    }

    emailInput.value = "";
    passwordInput.value = "";
    await syncAdminView();
  });

  formResetBtn.addEventListener("click", () => fillForm());

  memberForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isSupabaseConfigured()) {
      memberStatus.textContent = "Supabase is not configured.";
      return;
    }

    const members = getMembers();
    const editingId = memberIdInput.value;
    const existingMember = members.find((member) => member.id === editingId) || null;
    const formData = new FormData(memberForm);
    const source = Object.fromEntries(formData.entries());
    const payload = buildMemberPayload(source, members, existingMember);

    if (!payload.fullName) {
      memberStatus.textContent = "Full name is required.";
      return;
    }

    const yearError = validateMemberYears(
      payload.serviceYear,
      payload.nyikemYear,
      payload.resignationYear,
      payload.joinedYear
    );
    if (yearError) {
      memberStatus.textContent = yearError;
      return;
    }

    const duplicateSerial = members.find((member) => member.serialId === payload.serialId && member.id !== payload.id);
    if (duplicateSerial) {
      memberStatus.textContent = "That serial ID already exists. Clear the form and try again.";
      return;
    }

    try {
      memberStatus.textContent = existingMember ? "Updating member..." : "Saving new member...";
      await saveMemberToSupabase(payload, existingMember);
      await refreshMembersFromSupabase();
      renderAdminTable();
      fillForm();
      memberStatus.textContent = existingMember
        ? `${payload.fullName} was updated successfully.`
        : `${payload.fullName} was added successfully.`;
      renderAdminSummary();
      populateAdminJoinedFilter();
    } catch (error) {
      memberStatus.textContent = error.message || "Could not save the member record.";
      await refreshMembersFromSupabase().catch(() => {});
      renderAdminSummary();
      populateAdminJoinedFilter();
      renderAdminTable();
    }
  });

  tableBody.addEventListener("click", async (event) => {
    const rawTarget = event.target;
    if (!(rawTarget instanceof HTMLElement)) return;
    const target = rawTarget.closest("[data-action]");
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.action;
    const memberId = target.dataset.id;
    if (!action || !memberId) return;

    const members = getMembers();
    const selected = members.find((member) => member.id === memberId);
    if (!selected) return;

    if (action === "edit-member") {
      fillForm(selected);
      memberForm.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "delete-member") {
      const confirmed = window.confirm(`Delete ${selected.fullName}? This will remove the member from this browser's records.`);
      if (!confirmed) return;

      try {
        memberStatus.textContent = `Deleting ${selected.fullName}...`;
        await deleteMemberFromSupabase(memberId);
        await refreshMembersFromSupabase();
        renderAdminSummary();
        populateAdminJoinedFilter();
        renderAdminTable();
        fillForm();
        memberStatus.textContent = `${selected.fullName} was deleted.`;
      } catch (error) {
        memberStatus.textContent = error.message || "Could not delete the member record.";
      }
    }
  });

  const client = getSupabaseClient();
  client?.auth.onAuthStateChange(() => {
    window.setTimeout(() => {
      syncAdminView();
    }, 0);
  });

  async function bootstrapAdminSession() {
    if (adminSessionBootstrapComplete) return;
    adminSessionBootstrapComplete = true;

    if (!client) {
      await syncAdminView();
      return;
    }

    try {
      await client.auth.signOut();
    } catch {
      // Ignore stale session cleanup errors and continue with a fresh sign-in prompt.
    }

    emailInput.value = "";
    passwordInput.value = "";
    await syncAdminView();
  }

  adminSearchInput.addEventListener("input", renderAdminTable);
  adminJoinedFilter.addEventListener("change", renderAdminTable);
  adminSortSelect.addEventListener("change", renderAdminTable);

  refreshBtn.addEventListener("click", async () => {
    try {
      memberStatus.textContent = "Refreshing member records from Supabase...";
      await refreshMembersFromSupabase();
      renderAdminSummary();
      populateAdminJoinedFilter();
      renderAdminTable();
      memberStatus.textContent = "Member records were refreshed successfully.";
    } catch (error) {
      memberStatus.textContent = error.message || "Could not refresh member records.";
    }
  });

  showMembersBtn.addEventListener("click", () => setAdminSection("members"));
  showNewsBtn.addEventListener("click", () => setAdminSection("news"));

  announcementFormResetBtn.addEventListener("click", () => fillAnnouncementForm());

  announcementSearchInput.addEventListener("input", renderAnnouncementAdminList);
  announcementSortSelect.addEventListener("change", renderAnnouncementAdminList);

  announcementRefreshBtn.addEventListener("click", async () => {
    try {
      announcementStatus.textContent = "Refreshing announcements from Supabase...";
      await refreshAnnouncementsFromSupabase();
      renderAnnouncementAdminList();
      announcementStatus.textContent = "Announcements were refreshed successfully.";
    } catch (error) {
      announcementStatus.textContent = error.message || "Could not refresh announcements.";
    }
  });

  announcementForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isSupabaseConfigured()) {
      announcementStatus.textContent = "Supabase is not configured.";
      return;
    }

    const announcements = getAnnouncements();
    const editingId = announcementIdInput.value;
    const existingItem = announcements.find((item) => item.id === editingId) || null;
    const payload = {
      id: existingItem?.id || `announcement-${Date.now()}`,
      title: normalizeText(announcementTitleInput.value),
      date: normalizeText(announcementDateInput.value),
      imageUrl: normalizeText(announcementCurrentImageUrlInput.value),
      body: normalizeText(announcementBodyInput.value)
    };

    if (!payload.title || !payload.date || !payload.body) {
      announcementStatus.textContent = "Title, date, and body are required.";
      return;
    }

    try {
      if (announcementImageFileInput.files?.[0]) {
        announcementStatus.textContent = "Uploading photo...";
        payload.imageUrl = await uploadAnnouncementImage(announcementImageFileInput.files[0]);
      }

      announcementStatus.textContent = existingItem ? "Publishing updated news..." : "Publishing news...";
      await saveAnnouncementToSupabase(payload, existingItem);
      await refreshAnnouncementsFromSupabase();
      renderAnnouncementAdminList();
      fillAnnouncementForm();
      setAdminSection("news");
      announcementStatus.textContent = existingItem
        ? "News was updated successfully."
        : "News was published successfully.";
    } catch (error) {
      announcementStatus.textContent = error.message || "Could not publish the news.";
    }
  });

  announcementList.addEventListener("click", async (event) => {
    const rawTarget = event.target;
    if (!(rawTarget instanceof HTMLElement)) return;
    const target = rawTarget.closest("[data-action]");
    if (!(target instanceof HTMLElement)) return;

    const action = target.dataset.action;
    const announcementId = target.dataset.id;
    if (!action || !announcementId) return;

    const announcements = getAnnouncements();
    const selected = announcements.find((item) => item.id === announcementId);
    if (!selected) return;

    if (action === "edit-announcement") {
      fillAnnouncementForm(selected);
      setAdminSection("news");
      announcementForm.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (action === "delete-announcement") {
      const confirmed = window.confirm(`Delete announcement "${selected.title}"?`);
      if (!confirmed) return;

      try {
        announcementStatus.textContent = `Deleting ${selected.title}...`;
        await deleteAnnouncementFromSupabase(announcementId);
        await refreshAnnouncementsFromSupabase();
        renderAnnouncementAdminList();
        fillAnnouncementForm();
        setAdminSection("news");
        announcementStatus.textContent = `${selected.title} was deleted.`;
      } catch (error) {
        announcementStatus.textContent = error.message || "Could not delete the announcement.";
      }
    }
  });

  announcementImageFileInput.addEventListener("change", () => {
    const file = announcementImageFileInput.files?.[0];
    if (!file) {
      announcementImagePreview.src = announcementCurrentImageUrlInput.value || "";
      announcementImagePreviewWrap.classList.toggle("hidden", !announcementImagePreview.src);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    announcementImagePreview.src = previewUrl;
    announcementImagePreviewWrap.classList.remove("hidden");
  });

  bootstrapAdminSession();
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
async function init() {
  setupDefaults();
  if (isSupabaseConfigured()) {
    try {
      await refreshMembersFromSupabase();
    } catch {
      // Keep local seeded data as a fallback if remote loading is unavailable.
    }
    try {
      await refreshAnnouncementsFromSupabase();
    } catch {
      // Keep local/static announcements as a fallback if remote loading is unavailable.
    }
  }
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
