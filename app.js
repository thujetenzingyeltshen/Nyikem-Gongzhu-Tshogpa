/* ------------------------------
   NGT Shared App Logic
------------------------------ */
const STORAGE_KEYS = {
  members: "ngt_members",
  membersSeedSignature: "ngt_members_seed_signature",
  announcements: "ngt_announcements",
  documents: "ngt_documents",
  services: "ngt_services"
};

const SUPPORT_EMAIL = "ngt-secretariat@gmail.com";
const DEFAULT_SUPABASE_CONFIG = {
  url: "",
  anonKey: "",
  membersTable: "members",
  adminUsersTable: "admin_users",
  announcementsTable: "announcements",
  servicesTable: "service_batches"
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
    title: "History",
    href: "history.html",
    summary: "History and formation of NGT, its royal mandate, institutional roots, and continued purpose.",
    keywords:
      "history formation origin royal command privy council nyikem gongzhu tshogpa institutional legacy red scarf bhutan service tsa-wa-sum"
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

function getConfiguredServices() {
  const services = getSiteContent().services;
  return Array.isArray(services) ? services : [];
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

function sanitizeServiceEntry(entry) {
  return {
    name: normalizeText(entry?.name),
    post: normalizeText(entry?.post),
    residence: normalizeText(entry?.residence),
    remarks: normalizeText(entry?.remarks)
  };
}

function sanitizeServiceBatch(batch, index = 0) {
  const slug = normalizeText(batch?.slug) || `service-batch-${index + 1}`;
  const rawSortOrder = normalizeText(batch?.sortOrder);
  const sortOrderNumber = Number(rawSortOrder);
  const entries = Array.isArray(batch?.entries)
    ? batch.entries
        .map(sanitizeServiceEntry)
        .filter((entry) => entry.name || entry.post || entry.residence || entry.remarks)
    : [];

  return {
    id: normalizeText(batch?.id) || slug,
    slug,
    eyebrow: normalizeText(batch?.eyebrow) || "Service List",
    title: normalizeText(batch?.title) || slug,
    summary: normalizeText(batch?.summary),
    location: normalizeText(batch?.location),
    batchLabel: normalizeText(batch?.batchLabel),
    isCurrent: Boolean(batch?.isCurrent),
    isPlaceholder: Boolean(batch?.isPlaceholder),
    placeholderStatus: normalizeText(batch?.placeholderStatus),
    placeholderNote: normalizeText(batch?.placeholderNote),
    sortOrder: rawSortOrder === "" || Number.isNaN(sortOrderNumber) ? index : sortOrderNumber,
    entries
  };
}

function sortServiceBatches(a, b) {
  return Number(a.sortOrder || 0) - Number(b.sortOrder || 0) || String(a.title || "").localeCompare(String(b.title || ""));
}

function getStoredServiceBatches() {
  const configuredServices = getConfiguredServices()
    .map((batch, index) => sanitizeServiceBatch(batch, index))
    .sort(sortServiceBatches);
  const storedServices = getData(STORAGE_KEYS.services, []);

  if (!Array.isArray(storedServices) || !storedServices.length) {
    return configuredServices;
  }

  return storedServices.map((batch, index) => sanitizeServiceBatch(batch, index)).sort(sortServiceBatches);
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
      persistSession: true,
      autoRefreshToken: true
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

function isIgnorableAuthSessionError(error) {
  const message = normalizeText(error?.message).toLowerCase();
  return message.includes("auth session missing");
}

function isMissingSupabaseRelation(error, relationName) {
  const message = normalizeText(error?.message).toLowerCase();
  const normalizedRelation = normalizeText(relationName).toLowerCase();
  if (!normalizedRelation) return false;

  return (
    error?.code === "42P01" ||
    message.includes(`relation "${normalizedRelation}" does not exist`) ||
    message.includes(`relation "public.${normalizedRelation}" does not exist`) ||
    message.includes(`table '${normalizedRelation}'`) ||
    message.includes(`table 'public.${normalizedRelation}'`)
  );
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
    serviceStatus: normalizeText(row.service_status),
    lifeStatus: normalizeText(row.life_status),
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
    service_status: normalizeText(member.serviceStatus),
    life_status: normalizeText(member.lifeStatus),
    last_post: normalizeText(member.lastPost),
    spouse_or_kin: normalizeText(member.spouseOrKin),
    knowledge: normalizeText(member.knowledge)
  };
}

function mergeMembersWithSeed(remoteMembers, seededMembers) {
  const seedBySerialId = new Map(
    seededMembers
      .filter((member) => normalizeText(member.serialId))
      .map((member) => [normalizeText(member.serialId), member])
  );
  const remoteBySerialId = new Map(
    remoteMembers
      .filter((member) => normalizeText(member.serialId))
      .map((member) => [normalizeText(member.serialId), member])
  );

  const mergedMembers = seededMembers.map((seededMember) => {
    const serialId = normalizeText(seededMember.serialId);
    const remoteMember = remoteBySerialId.get(serialId);
    if (!remoteMember) {
      return seededMember;
    }

    return {
      ...seededMember,
      ...remoteMember,
      id: remoteMember.id || seededMember.id
    };
  });

  remoteMembers.forEach((remoteMember) => {
    const serialId = normalizeText(remoteMember.serialId);
    if (serialId && seedBySerialId.has(serialId)) {
      return;
    }
    mergedMembers.push(remoteMember);
  });

  return mergedMembers;
}

function mapRemoteAnnouncement(row) {
  return {
    id: row.id,
    title: normalizeText(row.title),
    date: normalizeText(row.date),
    category: normalizeText(row.category),
    imageUrl: sanitizeImageUrl(row.image_url),
    body: normalizeText(row.body)
  };
}

function mapAnnouncementToRemote(item) {
  return {
    title: normalizeText(item.title),
    date: normalizeText(item.date),
    category: normalizeText(item.category),
    image_url: sanitizeImageUrl(item.imageUrl),
    body: normalizeText(item.body)
  };
}

function mapRemoteServiceBatch(row) {
  return sanitizeServiceBatch({
    id: normalizeText(row.id) || normalizeText(row.slug),
    slug: normalizeText(row.slug) || normalizeText(row.id),
    sortOrder: row.sort_order,
    eyebrow: normalizeText(row.eyebrow),
    title: normalizeText(row.title),
    summary: normalizeText(row.summary),
    location: normalizeText(row.location),
    batchLabel: normalizeText(row.batch_label),
    isCurrent: Boolean(row.is_current),
    isPlaceholder: Boolean(row.is_placeholder),
    placeholderStatus: normalizeText(row.placeholder_status),
    placeholderNote: normalizeText(row.placeholder_note),
    entries: Array.isArray(row.entries) ? row.entries : []
  });
}

function mapServiceBatchToRemote(batch) {
  const sanitizedBatch = sanitizeServiceBatch(batch);
  return {
    id: normalizeText(sanitizedBatch.id) || normalizeText(sanitizedBatch.slug),
    slug: normalizeText(sanitizedBatch.slug),
    sort_order: Number(sanitizedBatch.sortOrder || 0),
    eyebrow: normalizeText(sanitizedBatch.eyebrow),
    title: normalizeText(sanitizedBatch.title),
    summary: normalizeText(sanitizedBatch.summary),
    location: normalizeText(sanitizedBatch.location),
    batch_label: normalizeText(sanitizedBatch.batchLabel),
    is_current: Boolean(sanitizedBatch.isCurrent),
    is_placeholder: Boolean(sanitizedBatch.isPlaceholder),
    placeholder_status: normalizeText(sanitizedBatch.placeholderStatus),
    placeholder_note: normalizeText(sanitizedBatch.placeholderNote),
    entries: sanitizedBatch.entries.map((entry) => sanitizeServiceEntry(entry))
  };
}

function getServiceSupabaseErrorMessage(error, action = "load") {
  if (isMissingSupabaseRelation(error, getSupabaseConfig().servicesTable)) {
    return "Service lists were saved in this browser only. Run supabase-services-upgrade.sql or supabase-setup.sql to enable shared online service editing.";
  }

  return error?.message || `Could not ${action} service lists.`;
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
  const seededMembers = Array.isArray(window.NGT_MEMBERS_SEED) ? window.NGT_MEMBERS_SEED : [];
  const mergedMembers = mergeMembersWithSeed(remoteMembers, seededMembers);
  if (mergedMembers.length || !existingLocalMembers.length) {
    setData(STORAGE_KEYS.members, mergedMembers);
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
  setData(STORAGE_KEYS.announcements, remoteAnnouncements);
  return true;
}

async function refreshServicesFromSupabase() {
  const client = getSupabaseClient();
  if (!client) return false;

  const config = getSupabaseConfig();
  const { data, error } = await client
    .from(config.servicesTable)
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  const remoteServices = Array.isArray(data) ? data.map(mapRemoteServiceBatch).sort(sortServiceBatches) : [];
  setData(STORAGE_KEYS.services, remoteServices);
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

async function saveServiceBatchesToSupabase(serviceBatches) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const config = getSupabaseConfig();
  const payload = serviceBatches.map((batch) => mapServiceBatchToRemote(batch));
  const { error } = await client.from(config.servicesTable).upsert(payload, {
    onConflict: "id"
  });
  if (error) throw error;
}

async function deleteAnnouncementFromSupabase(announcementId) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  const config = getSupabaseConfig();
  const { data, error } = await client.from(config.announcementsTable).delete().eq("id", announcementId).select("id");
  if (error) throw error;
  if (!Array.isArray(data) || !data.length) {
    throw new Error("News could not be deleted. Refresh the page and try again.");
  }
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
    if (isIgnorableAuthSessionError(error)) {
      return null;
    }
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
  const seededMembersSignature = JSON.stringify(seededMembers);
  const storedMembersSignature = localStorage.getItem(STORAGE_KEYS.membersSeedSignature) || "";
  if (
    !localStorage.getItem(STORAGE_KEYS.members) ||
    (!existingMembers.length && seededMembers.length) ||
    (seededMembers.length && storedMembersSignature !== seededMembersSignature)
  ) {
    setData(STORAGE_KEYS.members, seededMembers);
    localStorage.setItem(STORAGE_KEYS.membersSeedSignature, seededMembersSignature);
  }

  const seededAnnouncements = getConfiguredAnnouncements();
  const existingAnnouncements = getData(STORAGE_KEYS.announcements, []);
  if (!localStorage.getItem(STORAGE_KEYS.announcements) || (!existingAnnouncements.length && seededAnnouncements.length)) {
    setData(STORAGE_KEYS.announcements, seededAnnouncements);
  }

  const seededServices = getConfiguredServices().map((batch, index) => sanitizeServiceBatch(batch, index));
  const existingServices = getData(STORAGE_KEYS.services, []);
  if (!localStorage.getItem(STORAGE_KEYS.services) || (!existingServices.length && seededServices.length)) {
    setData(STORAGE_KEYS.services, seededServices);
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

function updateFooterYear() {
  const footerBottom = document.querySelector(".footer-bottom");
  if (!footerBottom) return;
  const year = new Date().getFullYear();
  footerBottom.textContent = `© ${year} Nyikem Gongzhu Tshogpa | Kingdom of Bhutan`;
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
  const explicitCategory = normalizeText(item.category);
  if (explicitCategory) return explicitCategory;
  const haystack = `${item.title || ""} ${item.body || ""}`.toLowerCase();
  if (
    haystack.includes("obituary") ||
    haystack.includes("in loving memory") ||
    haystack.includes("passed away") ||
    haystack.includes("demise") ||
    haystack.includes("late ")
  ) {
    return "Obituary";
  }
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
  const categoryClass = `badge-${category.toLowerCase().replace(/\s+/g, "-")}`;
  const imageMarkup =
    mode === "news" && item.imageUrl
      ? `<div class="announcement-photo-wrap news-card-photo-wrap"><img class="announcement-photo news-card-photo" src="${escapeHTML(item.imageUrl)}" alt="${escapeHTML(item.title)}" loading="lazy" decoding="async" /></div>`
      : "";
  const actionMarkup = `<div class="announcement-actions"><a class="announcement-read-more read-btn" href="${detailHref}">View Full Notice</a></div>`;

  return `
    <article class="announcement-item">
      ${imageMarkup}
      <div class="announcement-meta">
        <span class="badge ${escapeHTML(categoryClass)}">${escapeHTML(category)}</span>
        <p class="announcement-date">${escapeHTML(formatDisplayDate(item.date))}</p>
      </div>
      <h3>${escapeHTML(item.title)}</h3>
      <p class="announcement-excerpt preview-text">${escapeHTML(excerpt)}</p>
      ${actionMarkup}
    </article>
  `;
}

function renderAnnouncementDetail(item) {
  const category = inferAnnouncementCategory(item);
  const categoryClass = `badge-${category.toLowerCase().replace(/\s+/g, "-")}`;
  const isObituary = category === "Obituary";
  const paragraphs = String(item.body || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const detailParagraphs = paragraphs.length ? paragraphs : [String(item.body || "").trim()].filter(Boolean);
  const visibleParagraphs = detailParagraphs.filter((paragraph) => !/^credit\b/i.test(paragraph) && !/^source\b/i.test(paragraph));
  const bodyMarkup = visibleParagraphs
    .map((paragraph, index) => {
      const paragraphClass = [
        "announcement-full",
        "news-content-paragraph",
        index === 0 ? "lead-paragraph" : ""
      ]
        .filter(Boolean)
        .join(" ");
      return `<p class="${paragraphClass}">${escapeHTML(paragraph)}</p>`;
    })
    .join("");
  return `
    <section class="news-detail-shell">
      <a class="btn btn-outline news-detail-back back-btn" href="news.html">Back to News</a>
      <article class="news-detail-card ${isObituary ? "news-detail-card-obituary" : ""}">
        ${isObituary ? '<p class="memorial-title">In Loving Memory</p>' : ""}
        <div class="announcement-meta news-detail-meta">
          <span class="badge ${escapeHTML(categoryClass)}">${escapeHTML(category)}</span>
          <p class="announcement-date">${escapeHTML(formatDisplayDate(item.date))}</p>
        </div>
        <h2>${escapeHTML(item.title)}</h2>
        ${item.imageUrl ? `<div class="announcement-photo-wrap ${isObituary ? "obituary-image-wrap" : ""}"><img class="announcement-photo ${isObituary ? "obituary-image" : ""}" src="${escapeHTML(item.imageUrl)}" alt="${escapeHTML(item.title)}" loading="eager" decoding="async" /></div>` : ""}
        <div class="news-content">${bodyMarkup}</div>
      </article>
    </section>
  `;
}

function setupGlobalSearchNav() {
  const searchToggle = document.getElementById("globalSearchToggle");
  const searchForm = document.getElementById("globalSearchForm");
  const searchInput = document.getElementById("globalSearchInput");

  if (!searchToggle || !searchForm || !searchInput) return;

  const closeSearch = () => {
    if (!searchForm.classList.contains("hidden")) {
      searchForm.classList.add("hidden");
      searchToggle.setAttribute("aria-expanded", "false");
      searchToggle.setAttribute("aria-label", "Open search");
    }
  };

  searchToggle.addEventListener("click", () => {
    const isHidden = searchForm.classList.toggle("hidden");
    searchToggle.setAttribute("aria-expanded", String(!isHidden));
    searchToggle.setAttribute("aria-label", isHidden ? "Open search" : "Close search");
    if (!isHidden) {
      searchInput.focus();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (searchForm.classList.contains("hidden")) return;
    if (searchForm.contains(target) || searchToggle.contains(target)) return;
    closeSearch();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSearch();
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
  const featuredAnnouncementReadMore = document.getElementById("featuredAnnouncementReadMore");

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
      ? getAnnouncementExcerpt(featuredAnnouncement, 260)
      : "Publish announcements in site-content.js to feature them across the homepage and news page.";
  }
  if (featuredAnnouncementReadMore) {
    featuredAnnouncementReadMore.href = featuredAnnouncement
      ? `news.html?announcement=${encodeURIComponent(featuredAnnouncement.id)}`
      : "news.html";
    featuredAnnouncementReadMore.textContent = featuredAnnouncement ? "Read More" : "View News";
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
      titleHtml: 'Nyikem <span class="hero-highlight">Gongzhu</span> Tshogpa',
      subtitle: "Association of Retired Red Scarf Officers",
      text:
        "A national association of retired Nyikem recipients committed to service, unity, and Bhutanese values.",
      tag: "Service",
      imagePosition: "62% center",
      caption:
        "A respected national platform for solidarity, continuity, and meaningful service."
    },
    {
      theme: "unity",
      image: "./cover pic/bf01ff50-c098-4083-8ef5-31413f2dfca8.jpg",
      titleHtml: 'Strengthening <span class="hero-highlight">Fellowship</span> and Collective Responsibility',
      subtitle: "Association of Retired Red Scarf Officers",
      text:
        "A respectful national platform that keeps members connected through solidarity, shared purpose, and service.",
      tag: "Unity",
      imagePosition: "74% 48%",
      caption:
        "Building a dignified collective voice across Bhutan."
    },
    {
      theme: "heritage",
      image: "./cover pic/NGT WITH HM2025-11-08 at 21.02.54.jpeg",
      titleHtml: 'Preserving <span class="hero-highlight">Bhutanese Values</span> and Cultural Identity',
      subtitle: "Association of Retired Red Scarf Officers",
      text:
        "NGT protects heritage, discipline, and a culture of meaningful service for future generations.",
      tag: "Heritage",
      imagePosition: "58% center",
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
    stage.style.setProperty("--hero-position", slide.imagePosition || "center");
    heroTitle.innerHTML = slide.titleHtml || slide.title;
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
    summary.textContent = `Showing ${items.length} official notice${items.length === 1 ? "" : "s"}`;
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
    serviceStatus: normalizeText(source.serviceStatus).toLowerCase(),
    lifeStatus: normalizeText(source.lifeStatus).toLowerCase(),
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
    "Service Status",
    "Life Status",
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
    member.serviceStatus,
    member.lifeStatus,
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
  const statusFilter = document.getElementById("statusFilter");
  const sortSelect = document.getElementById("memberSort");
  const resultCount = document.getElementById("memberResultCount");
  const modal = document.getElementById("profileModal");
  const profileContent = document.getElementById("profileContent");
  const closeProfile = document.getElementById("closeProfile");
  const totalRedScarfCount = document.getElementById("totalRedScarfCount");
  const inServiceCount = document.getElementById("inServiceCount");
  const livingCount = document.getElementById("livingCount");
  const deceasedCount = document.getElementById("deceasedCount");
  const memberStrengthNote = document.getElementById("memberStrengthNote");

  if (!tableBody || !searchInput || !yearFilter || !nyikemFilter || !sortSelect || !resultCount || !modal || !profileContent) return;

  const getMembers = () => getData(STORAGE_KEYS.members, []);
  function getLifeStatus(member) {
    const explicitStatus = normalizeText(member.lifeStatus).toLowerCase();
    if (["deceased", "dead", "late", "passed away"].includes(explicitStatus)) return "deceased";
    if (["living", "alive"].includes(explicitStatus)) return "living";

    const text = [member.fullName, member.lastPost, member.spouseOrKin].filter(Boolean).join(" ").toLowerCase();
    if (/\b(deceased|dead|late|passed away)\b/.test(text)) return "deceased";
    return "living";
  }

  function getServiceStatus(member) {
    const explicitStatus = normalizeText(member.serviceStatus).toLowerCase();
    if (["in-service", "in service", "serving", "active"].includes(explicitStatus)) return "in-service";
    if (["retired", "not in service", "former"].includes(explicitStatus)) return "retired";

    const text = [member.serviceStatus, member.lastPost].filter(Boolean).join(" ").toLowerCase();
    if (/\b(in service|in-service|serving|active service)\b/.test(text)) return "in-service";
    if (normalizeText(member.resignationYear) || /\bretired\b/.test(text)) return "retired";
    return "retired";
  }

  function matchesStatusFilter(member, selectedStatus) {
    if (!selectedStatus) return true;
    if (selectedStatus === "in-service") return getServiceStatus(member) === "in-service";
    if (selectedStatus === "deceased") return getLifeStatus(member) === "deceased";
    if (selectedStatus === "living") return getLifeStatus(member) === "living";
    return true;
  }

  function renderStrengthSummary(allMembers) {
    if (!totalRedScarfCount || !inServiceCount || !livingCount || !deceasedCount) return;

    const total = allMembers.length;
    const living = allMembers.filter((member) => getLifeStatus(member) === "living").length;
    const deceased = allMembers.filter((member) => getLifeStatus(member) === "deceased").length;
    const inService = allMembers.filter((member) => getServiceStatus(member) === "in-service").length;

    const formatStatCount = (value) => (Number(value) === 0 ? "0 (No records)" : String(value));
    totalRedScarfCount.textContent = formatStatCount(total);
    livingCount.textContent = formatStatCount(living);
    deceasedCount.textContent = formatStatCount(deceased);
    inServiceCount.textContent = formatStatCount(inService);

    if (memberStrengthNote) {
      memberStrengthNote.textContent =
        "Auto-generated from member records. For best accuracy, maintain optional fields like serviceStatus and lifeStatus.";
    }
  }

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
            ${profileField("Service Status", selected.serviceStatus)}
            ${profileField("Life Status", selected.lifeStatus)}
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
    const selectedStatus = statusFilter?.value || "";
    const selectedSort = sortSelect.value;
    const allMembers = getMembers();
    let members = allMembers;

    renderStrengthSummary(allMembers);

    members = members.filter((m) => {
      const matchesSearch =
        !keyword ||
        [m.fullName, m.serialId, m.lastPost, m.address]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(keyword));
      const matchesYear = !selectedYear || String(m.joinedYear) === selectedYear;
      const matchesNyikemYear = !selectedNyikemYear || String(m.nyikemYear) === selectedNyikemYear;
      const matchesStatus = matchesStatusFilter(m, selectedStatus);
      return matchesSearch && matchesYear && matchesNyikemYear && matchesStatus;
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
  statusFilter?.addEventListener("change", renderTable);
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
  const loginSubmitBtn = loginForm?.querySelector('button[type="submit"]');
  const emailField = emailInput?.closest("label");
  const passwordField = passwordInput?.closest("label");
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
  const showServicesBtn = document.getElementById("adminShowServicesBtn");
  const adminWorkspaceNote = document.getElementById("adminWorkspaceNote");
  const memberAdminPanel = document.getElementById("memberAdminPanel");
  const newsAdminPanel = document.getElementById("newsAdminPanel");
  const serviceAdminPanel = document.getElementById("serviceAdminPanel");
  const announcementForm = document.getElementById("announcementAdminForm");
  const announcementIdInput = document.getElementById("announcementId");
  const announcementCurrentImageUrlInput = document.getElementById("announcementCurrentImageUrl");
  const announcementTitleInput = document.getElementById("announcementTitle");
  const announcementDateInput = document.getElementById("announcementDate");
  const announcementCategoryInput = document.getElementById("announcementCategory");
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
  const announcementDeleteStatus = document.getElementById("announcementDeleteStatus");
  const serviceForm = document.getElementById("serviceAdminForm");
  const serviceBatchIdInput = document.getElementById("serviceBatchId");
  const serviceBatchSlugInput = document.getElementById("serviceBatchSlug");
  const serviceBatchSortOrderInput = document.getElementById("serviceBatchSortOrder");
  const serviceBatchEyebrowInput = document.getElementById("serviceBatchEyebrow");
  const serviceBatchTitleInput = document.getElementById("serviceBatchTitle");
  const serviceBatchSummaryInput = document.getElementById("serviceBatchSummary");
  const serviceBatchLocationInput = document.getElementById("serviceBatchLocation");
  const serviceBatchLabelInput = document.getElementById("serviceBatchLabel");
  const serviceBatchCurrentInput = document.getElementById("serviceBatchCurrent");
  const serviceBatchPlaceholderInput = document.getElementById("serviceBatchPlaceholder");
  const servicePlaceholderFields = document.getElementById("servicePlaceholderFields");
  const servicePlaceholderStatusInput = document.getElementById("servicePlaceholderStatus");
  const servicePlaceholderNoteInput = document.getElementById("servicePlaceholderNote");
  const serviceMemberFields = document.getElementById("serviceMemberFields");
  const serviceRowsBuilder = document.getElementById("serviceRowsBuilder");
  const serviceAddRowBtn = document.getElementById("serviceAddRowBtn");
  const serviceBatchRowsInput = document.getElementById("serviceBatchRows");
  const serviceFormResetBtn = document.getElementById("serviceFormResetBtn");
  const serviceStatus = document.getElementById("serviceAdminStatus");
  const serviceSelect = document.getElementById("serviceAdminSelect");
  const serviceSummary = document.getElementById("serviceAdminSummary");
  const announcementDraftKey = "ngt_admin_announcement_draft";
  let adminSessionBootstrapComplete = false;
  let shouldRevealAdminWorkspace = false;
  const setAdminStatus = (message) => {
    if (!status) return;
    const text = String(message || "").trim();
    status.textContent = text;
    status.classList.toggle("hidden", !text);
    status.classList.toggle("is-error", /failed|could not|not authorized|not configured|enter both|invalid|error|denied|unauthorized/i.test(text));
  };

  if (
    !loginForm ||
    !emailInput ||
    !passwordInput ||
    !logoutBtn ||
    !loginSubmitBtn ||
    !emailField ||
    !passwordField ||
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
    !showServicesBtn ||
    !adminWorkspaceNote ||
    !memberAdminPanel ||
    !newsAdminPanel ||
    !serviceAdminPanel ||
    !announcementForm ||
    !announcementIdInput ||
    !announcementCurrentImageUrlInput ||
    !announcementTitleInput ||
    !announcementDateInput ||
    !announcementCategoryInput ||
    !announcementImageFileInput ||
    !announcementImagePreviewWrap ||
    !announcementImagePreview ||
    !announcementBodyInput ||
    !announcementFormResetBtn ||
    !announcementStatus ||
    !announcementSearchInput ||
    !announcementSortSelect ||
    !announcementRefreshBtn ||
    !announcementList ||
    !announcementDeleteStatus ||
    !serviceForm ||
    !serviceBatchIdInput ||
    !serviceBatchSlugInput ||
    !serviceBatchSortOrderInput ||
    !serviceBatchEyebrowInput ||
    !serviceBatchTitleInput ||
    !serviceBatchSummaryInput ||
    !serviceBatchLocationInput ||
    !serviceBatchLabelInput ||
    !serviceBatchCurrentInput ||
    !serviceBatchPlaceholderInput ||
    !servicePlaceholderFields ||
    !servicePlaceholderStatusInput ||
    !servicePlaceholderNoteInput ||
    !serviceMemberFields ||
    !serviceRowsBuilder ||
    !serviceAddRowBtn ||
    !serviceBatchRowsInput ||
    !serviceFormResetBtn ||
    !serviceStatus ||
    !serviceSelect ||
    !serviceSummary
  ) {
    return;
  }

  function setAnnouncementDeleteStatus(message = "", isError = false) {
    announcementDeleteStatus.textContent = message;
    announcementDeleteStatus.classList.toggle("hidden", !message);
    announcementDeleteStatus.classList.toggle("status-note-error", Boolean(message && isError));
  }

  function setAdminLoginState(isSignedIn) {
    emailField.classList.toggle("hidden", isSignedIn);
    passwordField.classList.toggle("hidden", isSignedIn);
    loginSubmitBtn.classList.toggle("hidden", isSignedIn);
    logoutBtn.classList.toggle("hidden", !isSignedIn);
    loginForm.classList.toggle("is-signed-in", isSignedIn);
  }

  function readAnnouncementDraft() {
    try {
      const raw = localStorage.getItem(announcementDraftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function hasAnnouncementDraft(draft = readAnnouncementDraft()) {
    if (!draft) return false;
    return Boolean(
      normalizeText(draft.id) ||
        normalizeText(draft.title) ||
        normalizeText(draft.date) ||
        normalizeText(draft.category) ||
        normalizeText(draft.body) ||
        normalizeText(draft.imageUrl)
    );
  }

  function saveAnnouncementDraft() {
    const draft = {
      id: normalizeText(announcementIdInput.value),
      imageUrl: normalizeText(announcementCurrentImageUrlInput.value),
      title: normalizeText(announcementTitleInput.value),
      date: normalizeText(announcementDateInput.value),
      category: normalizeText(announcementCategoryInput.value),
      body: normalizeText(announcementBodyInput.value)
    };

    if (!hasAnnouncementDraft(draft)) {
      localStorage.removeItem(announcementDraftKey);
      return;
    }
    localStorage.setItem(announcementDraftKey, JSON.stringify(draft));
  }

  function clearAnnouncementDraft() {
    localStorage.removeItem(announcementDraftKey);
  }

  function restoreAnnouncementDraft() {
    const draft = readAnnouncementDraft();
    if (!hasAnnouncementDraft(draft)) return false;

    announcementIdInput.value = draft.id || "";
    announcementCurrentImageUrlInput.value = draft.imageUrl || "";
    announcementTitleInput.value = draft.title || "";
    announcementDateInput.value = draft.date || "";
    announcementCategoryInput.value = draft.category || "";
    announcementBodyInput.value = draft.body || "";
    announcementImageFileInput.value = "";
    announcementImagePreview.src = draft.imageUrl || "";
    announcementImagePreviewWrap.classList.toggle("hidden", !draft.imageUrl);
    announcementStatus.textContent = "Draft restored. Continue editing and publish when ready.";
    return true;
  }

  const formFields = {
    fullName: document.getElementById("adminFullName"),
    serviceYear: document.getElementById("adminServiceYear"),
    nyikemYear: document.getElementById("adminNyikemYear"),
    resignationYear: document.getElementById("adminResignationYear"),
    joinedYear: document.getElementById("adminJoinedYear"),
    serviceStatus: document.getElementById("adminServiceStatus"),
    lifeStatus: document.getElementById("adminLifeStatus"),
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
  const getServices = () => getStoredServiceBatches();

  function serializeServiceRows(entries) {
    return entries
      .map((entry) => [entry.name, entry.post, entry.residence, entry.remarks].map((value) => normalizeText(value)).join(" | "))
      .join("\n");
  }

  function parseServiceRows(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|").map((part) => part.trim());
        return sanitizeServiceEntry({
          name: parts[0] || "",
          post: parts[1] || "",
          residence: parts[2] || "",
          remarks: parts.slice(3).join(" | ")
        });
      })
      .filter((entry) => entry.name || entry.post || entry.residence || entry.remarks);
  }

  function getBlankServiceEntry() {
    return {
      name: "",
      post: "",
      residence: "",
      remarks: ""
    };
  }

  function readServiceRowsFromEditor() {
    return Array.from(serviceRowsBuilder.querySelectorAll(".service-member-row"))
      .map((row) =>
        sanitizeServiceEntry({
          name: row.querySelector('[data-field="name"]')?.value || "",
          post: row.querySelector('[data-field="post"]')?.value || "",
          residence: row.querySelector('[data-field="residence"]')?.value || "",
          remarks: row.querySelector('[data-field="remarks"]')?.value || ""
        })
      )
      .filter((entry) => entry.name || entry.post || entry.residence || entry.remarks);
  }

  function syncServiceRowsInput() {
    serviceBatchRowsInput.value = serializeServiceRows(readServiceRowsFromEditor());
  }

  function renderServiceRowsEditor(entries = []) {
    const safeEntries = entries.length ? entries.map((entry) => sanitizeServiceEntry(entry)) : [];

    if (!safeEntries.length) {
      serviceRowsBuilder.innerHTML = `
        <div class="service-rows-empty">
          <p>No service members added yet.</p>
          <p class="muted">Use "Add Member" to start building this list.</p>
        </div>
      `;
      syncServiceRowsInput();
      return;
    }

    serviceRowsBuilder.innerHTML = safeEntries
      .map(
        (entry, index) => `
          <article class="service-member-row" data-index="${index}">
            <div class="service-member-row-head">
              <strong>Member ${index + 1}</strong>
              <button class="btn btn-outline service-member-remove" data-action="remove-service-row" type="button">Remove</button>
            </div>
            <div class="service-member-grid">
              <label>
                Name
                <input type="text" data-field="name" value="${escapeHTML(entry.name)}" placeholder="Member name" />
              </label>
              <label>
                Post
                <input type="text" data-field="post" value="${escapeHTML(entry.post)}" placeholder="Post or role" />
              </label>
              <label>
                Residence
                <input type="text" data-field="residence" value="${escapeHTML(entry.residence)}" placeholder="Residence" />
              </label>
              <label>
                Remarks
                <input type="text" data-field="remarks" value="${escapeHTML(entry.remarks)}" placeholder="Optional remarks" />
              </label>
            </div>
          </article>
        `
      )
      .join("");

    syncServiceRowsInput();
  }

  function updateServiceFormMode() {
    const isPlaceholder = serviceBatchPlaceholderInput.checked;
    servicePlaceholderFields.classList.toggle("hidden", !isPlaceholder);
    serviceMemberFields.classList.toggle("hidden", isPlaceholder);
    serviceBatchCurrentInput.disabled = isPlaceholder;

    if (!isPlaceholder && !serviceRowsBuilder.querySelector(".service-member-row")) {
      renderServiceRowsEditor(parseServiceRows(serviceBatchRowsInput.value));
    }
  }

  function renderServiceSelectionSummary(batch = null) {
    if (!batch) {
      serviceSummary.innerHTML = "<p class='muted'>No service lists are available yet.</p>";
      return;
    }

    serviceSummary.innerHTML = `
      <article class="service-selection-card">
        <div class="service-selection-meta">
          <span class="badge">${batch.isPlaceholder ? "Status" : "Services"}</span>
          <p class="muted">${batch.isCurrent ? "Current batch" : "Saved list"}</p>
        </div>
        <h4>${escapeHTML(batch.title)}</h4>
        <p>${escapeHTML(batch.summary || batch.placeholderNote || "No extra summary added yet.")}</p>
        <p class="muted">${escapeHTML(batch.entries.length)} member${batch.entries.length === 1 ? "" : "s"} | ${escapeHTML(batch.slug)}</p>
      </article>
    `;
  }

  function fillServiceForm(batch = null) {
    const services = getServices();
    const selectedBatch = batch || services[0] || null;

    serviceBatchIdInput.value = selectedBatch?.id || "";
    serviceBatchSlugInput.value = selectedBatch?.slug || "";
    serviceBatchSortOrderInput.value = String(selectedBatch?.sortOrder ?? "");
    serviceBatchEyebrowInput.value = selectedBatch?.eyebrow || "";
    serviceBatchTitleInput.value = selectedBatch?.title || "";
    serviceBatchSummaryInput.value = selectedBatch?.summary || "";
    serviceBatchLocationInput.value = selectedBatch?.location || "";
    serviceBatchLabelInput.value = selectedBatch?.batchLabel || "";
    serviceBatchCurrentInput.checked = Boolean(selectedBatch?.isCurrent);
    serviceBatchPlaceholderInput.checked = Boolean(selectedBatch?.isPlaceholder);
    servicePlaceholderStatusInput.value = selectedBatch?.placeholderStatus || "";
    servicePlaceholderNoteInput.value = selectedBatch?.placeholderNote || "";
    serviceBatchRowsInput.value = selectedBatch ? serializeServiceRows(selectedBatch.entries) : "";
    renderServiceRowsEditor(selectedBatch?.entries || []);
    updateServiceFormMode();
    renderServiceAdminList(selectedBatch?.id || "");
    serviceStatus.textContent = selectedBatch
      ? `Editing service list: ${selectedBatch.title}`
      : "Select a service list to begin editing.";
  }

  function renderServiceAdminList(selectedId = "") {
    const services = getServices();
    if (!services.length) {
      serviceSelect.innerHTML = `<option value="">No service lists available</option>`;
      renderServiceSelectionSummary(null);
      return;
    }

    const selectedBatch = services.find((batch) => batch.id === selectedId) || services[0];
    serviceSelect.innerHTML = services
      .map(
        (batch) =>
          `<option value="${escapeHTML(batch.id)}">${escapeHTML(batch.title)}${batch.isCurrent ? " (Current)" : ""}</option>`
      )
      .join("");
    serviceSelect.value = selectedBatch.id;
    renderServiceSelectionSummary(selectedBatch);
  }

  function setAdminSection(section) {
    const showMembers = section === "members";
    const showNews = section === "news";
    const showServices = section === "services";
    memberAdminPanel.classList.toggle("hidden", !showMembers);
    newsAdminPanel.classList.toggle("hidden", !showNews);
    serviceAdminPanel.classList.toggle("hidden", !showServices);
    showMembersBtn.classList.toggle("btn-primary", showMembers);
    showMembersBtn.classList.toggle("btn-outline", !showMembers);
    showMembersBtn.classList.toggle("is-active", showMembers);
    showNewsBtn.classList.toggle("btn-primary", showNews);
    showNewsBtn.classList.toggle("btn-outline", !showNews);
    showNewsBtn.classList.toggle("is-active", showNews);
    showServicesBtn.classList.toggle("btn-primary", showServices);
    showServicesBtn.classList.toggle("btn-outline", !showServices);
    showServicesBtn.classList.toggle("is-active", showServices);
    adminWorkspaceNote.textContent = showMembers
      ? "You are managing member records."
      : showNews
        ? "You are managing public news and announcements."
        : showServices
          ? "You are managing public service lists."
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
    announcementCategoryInput.value = item?.category || "";
    announcementImageFileInput.value = "";
    announcementBodyInput.value = item?.body || "";
    announcementImagePreview.src = item?.imageUrl || "";
    announcementImagePreviewWrap.classList.toggle("hidden", !item?.imageUrl);
    announcementStatus.textContent = item
      ? `Editing announcement: ${item.title}`
      : "Create or update a news item for the public News page.";
    saveAnnouncementDraft();
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
    shouldRevealAdminWorkspace = false;
    workspace.classList.add("hidden");
    setAdminLoginState(false);
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
    setAnnouncementDeleteStatus("");
    serviceForm.reset();
    serviceBatchIdInput.value = "";
    serviceBatchSlugInput.value = "";
    serviceBatchRowsInput.value = "";
    renderServiceRowsEditor([]);
    updateServiceFormMode();
    serviceSelect.innerHTML = `<option value="">No service lists available</option>`;
    serviceSummary.innerHTML = "";
    serviceStatus.textContent = message;
    setAdminSection("none");
  }

  async function syncAdminView() {
    if (!isSupabaseConfigured()) {
      setAdminStatus(
        "Supabase is not configured yet. Add your project URL and anon key in supabase-config.js first."
      );
      resetAdminWorkspace("Supabase is not configured.");
      return;
    }

    let user = null;
    try {
      user = await getCurrentSupabaseUser();
    } catch (error) {
      if (isIgnorableAuthSessionError(error)) {
        setAdminStatus("");
        resetAdminWorkspace("Admin is not signed in.");
        return;
      }
      setAdminStatus(error.message || "Could not check the current admin session.");
      resetAdminWorkspace("Could not verify admin session.");
      return;
    }

    if (!user) {
      setAdminLoginState(false);
      setAdminStatus("");
      resetAdminWorkspace("Admin is not signed in.");
      return;
    }

    setAdminLoginState(true);
    let isAdmin = false;
    try {
      isAdmin = await isSupabaseAdminUser(user.id);
    } catch (error) {
      setAdminStatus(error.message || "Could not verify admin permissions.");
      resetAdminWorkspace("Could not verify admin permissions.");
      setAdminLoginState(true);
      return;
    }

    if (!isAdmin) {
      setAdminStatus(`${user.email || "This account"} is signed in, but is not authorized yet. Add this user to admin_users in Supabase.`);
      resetAdminWorkspace("This account is not authorized to edit members.");
      setAdminLoginState(true);
      return;
    }

    try {
      await refreshMembersFromSupabase();
    } catch (error) {
      setAdminStatus(error.message || "Could not load member records from Supabase.");
      resetAdminWorkspace("Could not load member records.");
      setAdminLoginState(true);
      return;
    }

    workspace.classList.remove("hidden");
    setAdminLoginState(true);
    emailInput.value = user.email || "";
    passwordInput.value = "";
    setAdminStatus(`Signed in as ${user.email || "admin user"}.`);
    renderAdminSummary();
    populateAdminJoinedFilter();
    renderAdminTable();
    fillForm();
    try {
      await refreshAnnouncementsFromSupabase();
    } catch {
      // Keep existing local/static announcements if remote refresh is not available yet.
    }
    try {
      await refreshServicesFromSupabase();
    } catch {
      // Keep existing local/static service lists if remote refresh is not available yet.
    }
    renderAnnouncementAdminList();
    renderServiceAdminList();
    fillServiceForm();
    if (restoreAnnouncementDraft()) {
      setAdminSection("news");
    } else {
      fillAnnouncementForm();
      setAdminSection("members");
    }

    if (shouldRevealAdminWorkspace) {
      shouldRevealAdminWorkspace = false;
      window.setTimeout(() => {
        workspace.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 0);
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isSupabaseConfigured()) {
      setAdminStatus("Supabase is not configured yet.");
      return;
    }

    const client = getSupabaseClient();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setAdminStatus("Enter both email and password.");
      return;
    }

    setAdminStatus("Signing in...");

    const { error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setAdminStatus(error.message || "Sign in failed.");
      return;
    }

    shouldRevealAdminWorkspace = true;
    await syncAdminView();
  });

  logoutBtn.addEventListener("click", async () => {
    const client = getSupabaseClient();
    if (!client) return;

    const { error } = await client.auth.signOut();
    if (error && !isIgnorableAuthSessionError(error)) {
      setAdminStatus(error.message || "Sign out failed.");
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
  showServicesBtn.addEventListener("click", () => setAdminSection("services"));

  announcementFormResetBtn.addEventListener("click", () => fillAnnouncementForm());
  serviceFormResetBtn.addEventListener("click", () => {
    const selectedBatch = getServices().find((batch) => batch.id === serviceSelect.value) || null;
    fillServiceForm(selectedBatch);
  });
  serviceBatchPlaceholderInput.addEventListener("change", () => {
    updateServiceFormMode();
    syncServiceRowsInput();
  });

  serviceAddRowBtn.addEventListener("click", () => {
    const entries = readServiceRowsFromEditor();
    entries.push(getBlankServiceEntry());
    renderServiceRowsEditor(entries);
  });

  serviceRowsBuilder.addEventListener("input", () => {
    syncServiceRowsInput();
  });

  serviceRowsBuilder.addEventListener("click", (event) => {
    const rawTarget = event.target;
    if (!(rawTarget instanceof HTMLElement)) return;
    const target = rawTarget.closest("[data-action]");
    if (!(target instanceof HTMLElement)) return;
    if (target.dataset.action !== "remove-service-row") return;

    const row = target.closest(".service-member-row");
    if (!(row instanceof HTMLElement)) return;

    const index = Number(row.dataset.index);
    const entries = readServiceRowsFromEditor();
    if (Number.isNaN(index)) return;
    entries.splice(index, 1);
    renderServiceRowsEditor(entries);
  });

  [announcementTitleInput, announcementDateInput, announcementCategoryInput, announcementBodyInput].forEach((field) => {
    field.addEventListener("input", saveAnnouncementDraft);
  });

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
      category: normalizeText(announcementCategoryInput.value),
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
      clearAnnouncementDraft();
      fillAnnouncementForm();
      setAdminSection("news");
      setAnnouncementDeleteStatus("");
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
      setAnnouncementDeleteStatus("");
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
        announcementStatus.textContent = "News list updated.";
        setAnnouncementDeleteStatus(`News deleted: ${selected.title}`);
      } catch (error) {
        announcementStatus.textContent = error.message || "Could not delete the announcement.";
        setAnnouncementDeleteStatus(error.message || "Could not delete the news.", true);
      }
    }
  });

  announcementImageFileInput.addEventListener("change", () => {
      const file = announcementImageFileInput.files?.[0];
      if (!file) {
        announcementImagePreview.src = announcementCurrentImageUrlInput.value || "";
        announcementImagePreviewWrap.classList.toggle("hidden", !announcementImagePreview.src);
        saveAnnouncementDraft();
        return;
      }

    const previewUrl = URL.createObjectURL(file);
    announcementImagePreview.src = previewUrl;
    announcementImagePreviewWrap.classList.remove("hidden");
  });

  serviceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isSupabaseConfigured()) {
      serviceStatus.textContent = "Supabase is not configured.";
      return;
    }

    const services = getServices();
    const editingId = serviceBatchIdInput.value;
    const existingBatch = services.find((batch) => batch.id === editingId) || null;
    if (!existingBatch) {
      serviceStatus.textContent = "Select a saved service list before updating it.";
      return;
    }

    const isPlaceholder = serviceBatchPlaceholderInput.checked;
    const payload = sanitizeServiceBatch(
      {
        id: existingBatch.id,
        slug: existingBatch.slug,
        sortOrder: serviceBatchSortOrderInput.value,
        eyebrow: serviceBatchEyebrowInput.value,
        title: serviceBatchTitleInput.value,
        summary: serviceBatchSummaryInput.value,
        location: serviceBatchLocationInput.value,
        batchLabel: serviceBatchLabelInput.value,
        isCurrent: !isPlaceholder && serviceBatchCurrentInput.checked,
        isPlaceholder,
        placeholderStatus: servicePlaceholderStatusInput.value,
        placeholderNote: servicePlaceholderNoteInput.value,
        entries: isPlaceholder ? [] : readServiceRowsFromEditor()
      },
      existingBatch.sortOrder
    );

    if (!payload.title) {
      serviceStatus.textContent = "Service title is required.";
      return;
    }

    const nextServices = services
      .map((batch) => {
        if (batch.id === payload.id) return payload;
        return payload.isCurrent ? { ...batch, isCurrent: false } : batch;
      })
      .sort(sortServiceBatches);

    try {
      serviceStatus.textContent = `Saving ${payload.title}...`;
      await saveServiceBatchesToSupabase(nextServices);
      await refreshServicesFromSupabase();
      renderServiceAdminList();
      fillServiceForm(getServices().find((batch) => batch.id === payload.id) || payload);
      setAdminSection("services");
      serviceStatus.textContent = `${payload.title} was updated successfully.`;
    } catch (error) {
      if (isMissingSupabaseRelation(error, getSupabaseConfig().servicesTable)) {
        setData(STORAGE_KEYS.services, nextServices);
        renderServiceAdminList(payload.id);
        fillServiceForm(nextServices.find((batch) => batch.id === payload.id) || payload);
        setAdminSection("services");
        serviceStatus.textContent = getServiceSupabaseErrorMessage(error, "save");
        return;
      }

      await refreshServicesFromSupabase().catch(() => {});
      renderServiceAdminList();
      fillServiceForm(getServices().find((batch) => batch.id === existingBatch.id) || existingBatch);
      serviceStatus.textContent = getServiceSupabaseErrorMessage(error, "save");
    }
  });

  serviceSelect.addEventListener("change", () => {
    const selectedBatch = getServices().find((batch) => batch.id === serviceSelect.value);
    if (!selectedBatch) return;

    setAdminSection("services");
    fillServiceForm(selectedBatch);
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
  const resultSummary = document.getElementById("serviceResultSummary");
  const batchContainer = document.getElementById("serviceBatchContainer");
  if (!select || !batchContainer) return;

  let batches = getStoredServiceBatches();

  function renderServiceBatch(batch) {
    if (batch.isPlaceholder) {
      return `
        <article class="card elevated-card top-gap service-batch hidden" data-batch="${escapeHTML(batch.slug)}">
          <p class="eyebrow">${escapeHTML(batch.eyebrow)}</p>
          <h2 class="section-title">${escapeHTML(batch.title)}</h2>
          <div class="service-list-card">
            <p><strong>Status:</strong> ${escapeHTML(batch.placeholderStatus || "List to be updated")}</p>
            <p class="muted">${escapeHTML(batch.placeholderNote || "Add official names or deployment details here when available.")}</p>
          </div>
        </article>
      `;
    }

    const entries = batch.entries.length
      ? batch.entries
          .map(
            (entry, index) => `
              <tr
                data-name="${escapeHTML(entry.name)}"
                data-post="${escapeHTML(entry.post)}"
                data-residence="${escapeHTML(entry.residence)}"
                data-remarks="${escapeHTML(entry.remarks)}">
                <td>${index + 1}</td>
                <td>${escapeHTML(entry.name || "--")}</td>
                <td>${escapeHTML(entry.post || "--")}</td>
                <td>${escapeHTML(entry.residence || "--")}</td>
                <td>${escapeHTML(entry.remarks || "--")}</td>
              </tr>
            `
          )
          .join("")
      : "<tr><td colspan='5'>No service members have been added yet.</td></tr>";

    return `
      <article class="card elevated-card top-gap service-batch hidden" data-batch="${escapeHTML(batch.slug)}"${batch.isCurrent ? ' data-current="true"' : ""}>
        <p class="eyebrow">${escapeHTML(batch.eyebrow)}</p>
        <h2 class="section-title">${escapeHTML(batch.title)}</h2>
        <p class="muted">${escapeHTML(batch.summary)}</p>
        <div class="service-summary-grid top-gap">
          <article class="service-summary-card">
            <span class="service-summary-label">Total Members</span>
            <strong class="gmc-total-members">${batch.entries.length}</strong>
            <p>Attendees listed in this batch.</p>
          </article>
          <article class="service-summary-card">
            <span class="service-summary-label">Location</span>
            <strong>${escapeHTML(batch.location || "--")}</strong>
            <p>Primary residence and service base.</p>
          </article>
          <article class="service-summary-card">
            <span class="service-summary-label">Batch</span>
            <strong>${escapeHTML(batch.batchLabel || "--")}</strong>
            <p>Current visible volunteer batch.</p>
          </article>
        </div>
        <div class="table-wrap top-gap">
          <table class="service-table">
            <thead>
              <tr>
                <th>Sl. No.</th>
                <th>Name</th>
                <th>Post Held on Gongzhu</th>
                <th>Residence</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody class="gmc-duty-table-body">
              ${entries}
            </tbody>
          </table>
        </div>
      </article>
    `;
  }

  function renderBatchOptions(selectedValue = "") {
    select.innerHTML = `
      <option value="">Select a service list</option>
      ${batches
        .map((batch) => `<option value="${escapeHTML(batch.slug)}">${escapeHTML(batch.title)}</option>`)
        .join("")}
    `;

    select.value = batches.some((batch) => batch.slug === selectedValue) ? selectedValue : "";
  }

  function renderBatchSections() {
    batchContainer.innerHTML = batches.map((batch) => renderServiceBatch(batch)).join("");
  }

  function getSections() {
    return Array.from(batchContainer.querySelectorAll(".service-batch"));
  }

  function getTableBodies() {
    return Array.from(batchContainer.querySelectorAll(".gmc-duty-table-body"));
  }

  function renderSelectedBatch() {
    const selected = select.value;
    getSections().forEach((section) => {
      const isMatch = section.getAttribute("data-batch") === selected;
      section.classList.toggle("hidden", !isMatch);
      section.classList.toggle("is-active", isMatch);
    });
  }

  function renderGmcTable() {
    const tableBodies = getTableBodies();
    if (!tableBodies.length) return;
    const term = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const currentOnly = yearFilter ? yearFilter.value : "";
    const selected = select.value;
    let activeVisibleCount = 0;
    let activeBatchIsCurrent = false;

    tableBodies.forEach((tableBody) => {
      const batchSection = tableBody.closest(".service-batch");
      if (!batchSection) return;
      const isActiveBatch = batchSection.getAttribute("data-batch") === selected;
      const isCurrentBatch = batchSection.getAttribute("data-current") === "true";
      const rows = Array.from(tableBody.querySelectorAll("tr"));
      let visibleCount = 0;

      if (isActiveBatch) {
        activeBatchIsCurrent = isCurrentBatch;
      }

      rows.forEach((row) => {
        const haystack = [row.dataset.name, row.dataset.post, row.dataset.residence, row.dataset.remarks]
          .join(" ")
          .toLowerCase();
        const matchesSearch = !term || haystack.includes(term);
        const matchesYear = currentOnly !== "current" || isCurrentBatch;
        const show = isActiveBatch && selected.startsWith("gmc-") && matchesSearch && matchesYear;
        row.classList.toggle("hidden", !show);
        if (show) visibleCount += 1;
      });

      if (isActiveBatch) {
        activeVisibleCount = visibleCount;
      }

      const totalMembers = batchSection.querySelector(".gmc-total-members");
      if (totalMembers && selected.startsWith("gmc-") && isActiveBatch) {
        totalMembers.textContent = String(visibleCount);
      }
    });

    if (resultSummary) {
      const label = select.options[select.selectedIndex]?.textContent?.trim() || "selected list";
      if (!selected) {
        resultSummary.textContent = "Select a service list to view members.";
      } else if (selected === "desuup-list") {
        resultSummary.textContent = "List of NGT De-Suup is currently being updated.";
      } else if (currentOnly === "current" && !activeBatchIsCurrent) {
        resultSummary.textContent = `${label} is not marked as the current batch. Select the current GMC batch or switch back to All Records.`;
      } else if (term && activeVisibleCount === 0) {
        resultSummary.textContent = "No matching members found. Try another keyword.";
      } else {
        resultSummary.textContent = `Showing ${activeVisibleCount} member${activeVisibleCount === 1 ? "" : "s"} in ${label}.`;
      }
    }
  }

  renderBatchOptions(select.value);
  renderBatchSections();
  searchInput?.addEventListener("input", renderGmcTable);
  yearFilter?.addEventListener("change", renderGmcTable);
  select.addEventListener("change", () => {
    renderSelectedBatch();
    renderGmcTable();
  });
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
    if (page === "services" || page === "admin") {
      try {
        await refreshServicesFromSupabase();
      } catch {
        // Keep local/static service lists as a fallback if remote loading is unavailable.
      }
    }
  }
  setupNavigation();
  setupLanguagePlaceholder();
  setupGlobalSearchNav();
  updateFooterYear();

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
