(() => {
  const repoOwner = "ashbennett14";
  const repoName = "surrey-1837-club";
  const branch = "main";
  const managedFile = "calendar-events.json";
  const managedScriptFile = "calendar-events.js";
  const emptyData = { socialEvents: [], lodgeEvents: [], chapterEvents: [] };
  const state = structuredClone(emptyData);

  const form = document.querySelector("#eventForm");
  const calendarType = document.querySelector("#calendarType");
  const nameLabelText = document.querySelector("#nameLabelText");
  const numberLabelText = document.querySelector("#numberLabelText");
  const meetingOnly = [...document.querySelectorAll(".meeting-only")];
  const socialOnly = [...document.querySelectorAll(".social-only")];
  const bulkInput = document.querySelector("#bulkInput");
  const importBulk = document.querySelector("#importBulk");
  const loadCurrent = document.querySelector("#loadCurrent");
  const downloadJson = document.querySelector("#downloadJson");
  const downloadJs = document.querySelector("#downloadJs");
  const eventImageFile = document.querySelector("#eventImageFile");
  const eventPoster = document.querySelector("#eventPoster");
  const imagePreview = document.querySelector("#imagePreview");
  const copyJson = document.querySelector("#copyJson");
  const clearManaged = document.querySelector("#clearManaged");
  const publishGithub = document.querySelector("#publishGithub");
  const githubToken = document.querySelector("#githubToken");
  const rememberToken = document.querySelector("#rememberToken");
  const managedList = document.querySelector("#managedList");
  const managerSummary = document.querySelector("#managerSummary");
  const managerStatus = document.querySelector("#managerStatus");
  const validationSummary = document.querySelector("#validationSummary");
  const publishPlan = document.querySelector("#publishPlan");
  const pendingAssets = new Map();
  const socialCategories = new Set(["1837 Club Event", "Community Event"]);
  const meetingTypes = new Set([
    "Installation",
    "Initiation",
    "Passing",
    "Raising",
    "Other",
    "Royal Arch",
    "Initiation & Passing",
  ]);

  const savedToken = localStorage.getItem("surrey1837GithubToken");
  if (savedToken) {
    githubToken.value = savedToken;
    rememberToken.checked = true;
  }

  calendarType.addEventListener("change", syncCalendarFields);
  form.addEventListener("submit", addSingleEvent);
  importBulk.addEventListener("click", importBulkEvents);
  loadCurrent.addEventListener("click", loadManagedFile);
  downloadJson.addEventListener("click", downloadManagedJson);
  downloadJs.addEventListener("click", downloadManagedJs);
  copyJson.addEventListener("click", copyManagedJson);
  clearManaged.addEventListener("click", clearManagedEvents);
  publishGithub.addEventListener("click", publishToGithub);
  eventImageFile.addEventListener("change", updateImagePreview);
  eventPoster.addEventListener("input", updateImagePreview);
  rememberToken.addEventListener("change", () => {
    if (!rememberToken.checked) {
      localStorage.removeItem("surrey1837GithubToken");
    }
  });

  syncCalendarFields();
  loadManagedFile();

  function syncCalendarFields() {
    const isSocial = calendarType.value === "socialEvents";
    const isChapter = calendarType.value === "chapterEvents";
    meetingOnly.forEach((element) => {
      element.hidden = isSocial;
    });
    socialOnly.forEach((element) => {
      element.hidden = !isSocial;
    });
    nameLabelText.textContent = isSocial ? "Event title" : isChapter ? "Chapter name" : "Lodge name";
    numberLabelText.textContent = isChapter ? "Chapter number" : "Lodge number";
  }

  function addSingleEvent(event) {
    event.preventDefault();
    const formData = new FormData(form);
    const key = formData.get("calendarType");
    const isSocial = key === "socialEvents";
    const title = clean(formData.get("title"));
    const date = clean(formData.get("date"));
    const location = clean(formData.get("location"));
    const lodgeNumber = clean(formData.get("lodgeNumber"));
    const degree = clean(formData.get("degree"));

    if (!title || !date || !location) {
      setStatus("Add a title, date, and location before adding the item.", true);
      return;
    }

    if (!isSocial && (!lodgeNumber || !degree)) {
      setStatus("Add the lodge or chapter number and meeting type before adding the item.", true);
      return;
    }

    const record = isSocial
      ? buildSocialEvent(formData, key)
      : buildMeetingEvent(formData, key);

    addManagedEvent(key, record);
    form.reset();
    calendarType.value = key;
    syncCalendarFields();
    updateImagePreview();
    setStatus(`${record.title} added to the managed file.`);
  }

  function buildSocialEvent(formData, key) {
    const title = clean(formData.get("title"));
    const category = clean(formData.get("category")) || "Community Event";
    const poster = getManagedImagePath(formData, title);

    return removeEmpty({
      id: createId(formData.get("date"), title),
      date: clean(formData.get("date")),
      title,
      time: clean(formData.get("time")),
      location: clean(formData.get("location")),
      host: clean(formData.get("host")) || "Surrey 1837 Club",
      type: "social",
      category,
      poster,
      posterAlt: poster ? `${title} poster` : "",
      tags: splitTags(formData.get("tags")) || [category, clean(formData.get("location"))],
      description: clean(formData.get("description")),
    });
  }

  function buildMeetingEvent(formData, key) {
    const lodgeName = clean(formData.get("title"));
    const lodgeNumber = clean(formData.get("lodgeNumber"));
    const degree =
      key === "chapterEvents" ? clean(formData.get("degree")) || "Royal Arch" : clean(formData.get("degree")) || "Other";
    const poster = getManagedImagePath(formData, lodgeName);
    const type = key === "chapterEvents" ? "chapter" : "lodge";
    const host = `${lodgeName}${lodgeNumber ? ` No. ${lodgeNumber}` : ""}`;

    return removeEmpty({
      id: createId(formData.get("date"), `${lodgeName}-${degree}`),
      date: clean(formData.get("date")),
      title: lodgeName,
      lodgeName,
      lodgeNumber,
      degree,
      time: clean(formData.get("time")) || "TBC",
      location: clean(formData.get("location")),
      host: clean(formData.get("host")) || host,
      type,
      poster,
      posterAlt: poster ? `${host} crest` : "",
      tags: splitTags(formData.get("tags")) || [degree, lodgeNumber ? `No. ${lodgeNumber}` : "", clean(formData.get("location"))].filter(Boolean),
      description:
        clean(formData.get("description")) ||
        `${host} meeting in ${clean(formData.get("location"))}${degree ? ` for ${degree}.` : "."}`,
    });
  }

  function importBulkEvents() {
    const rows = parseTable(bulkInput.value);
    if (rows.length === 0) {
      setStatus("Paste a header row and at least one event row before importing.", true);
      return;
    }

    rows.forEach((row) => {
      const key = normalizeCalendarKey(row.calendar || row["calendar type"] || row.type || row.calendarType);
      const record =
        key === "socialEvents" ? buildSocialFromRow(row) : buildMeetingFromRow(row, key);
      addManagedEvent(key, record);
    });

    bulkInput.value = "";
    setStatus(`${rows.length} item${rows.length === 1 ? "" : "s"} imported.`);
  }

  function buildSocialFromRow(row) {
    const title = clean(row.title || row.event || row.name);
    const category = clean(row.category) || "Community Event";
    const poster = clean(row.poster || row.image);

    return removeEmpty({
      id: clean(row.id) || createId(row.date, title),
      date: normalizeDate(row.date),
      title,
      time: clean(row.time),
      location: clean(row.location),
      host: clean(row.host) || "Surrey 1837 Club",
      type: "social",
      category,
      poster,
      posterAlt: poster ? `${title} poster` : clean(row.posterAlt),
      tags: splitTags(row.tags) || [category, clean(row.location)].filter(Boolean),
      description: clean(row.description || row.details),
    });
  }

  function buildMeetingFromRow(row, key) {
    const lodgeName = clean(
      row.lodgeName ||
        row["lodge name"] ||
        row.chapterName ||
        row["chapter name"] ||
        row.title ||
        row.lodge ||
        row.chapter ||
        row.name,
    );
    const lodgeNumber = clean(
      row.lodgeNumber ||
        row["lodge number"] ||
        row.chapterNumber ||
        row["chapter number"] ||
        row.number ||
        row["lodge no."] ||
        row["lodge no"] ||
        row["lodge no."],
    );
    const degreeValue = clean(
      row.degree ||
        row.meetingType ||
        row["meeting type"] ||
        row["type of ceremony"] ||
        row.category,
    );
    const degree = key === "chapterEvents" ? degreeValue || "Royal Arch" : degreeValue || "Other";
    const poster = clean(row.poster || row.crest || row.logo || row.image);
    const host = `${lodgeName}${lodgeNumber ? ` No. ${lodgeNumber}` : ""}`;

    return removeEmpty({
      id: clean(row.id) || createId(row.date, `${lodgeName}-${degree}`),
      date: normalizeDate(row.date),
      title: lodgeName,
      lodgeName,
      lodgeNumber,
      degree,
      time: clean(row.time) || "TBC",
      location: clean(row.location),
      host: clean(row.host) || host,
      type: key === "chapterEvents" ? "chapter" : "lodge",
      poster,
      posterAlt: poster ? `${host} crest` : clean(row.posterAlt),
      tags: splitTags(row.tags) || [degree, lodgeNumber ? `No. ${lodgeNumber}` : "", clean(row.location)].filter(Boolean),
      description:
        clean(row.description || row.details) ||
        `${host} meeting in ${clean(row.location)}${degree ? ` for ${degree}.` : "."}`,
    });
  }

  function addManagedEvent(key, record) {
    if (!record.date || !record.title || !record.location) {
      throw new Error("Managed event needs date, title, and location.");
    }

    const index = state[key].findIndex((event) => event.id === record.id);
    if (index >= 0) {
      state[key][index] = record;
    } else {
      state[key].push(record);
    }
    sortManagedEvents();
    renderManagedEvents();
  }

  async function loadManagedFile() {
    try {
      if (window.surrey1837ManagedCalendarData) {
        loadState(window.surrey1837ManagedCalendarData);
        setStatus(
          window.location.protocol === "file:"
            ? "Managed preview data loaded. Use Publish or download both files after making changes."
            : "Managed preview data loaded.",
        );
      }

      if (window.location.protocol === "file:") {
        renderManagedEvents();
        return;
      }

      const response = await fetch(managedFile, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error("Managed file was not found.");
      }
      const data = await response.json();
      loadState(data);
      setStatus("Managed file loaded.");
    } catch (error) {
      renderManagedEvents();
      setStatus("No managed events file was loaded yet. You can start a new one here.", true);
    }
  }

  function loadState(data) {
    Object.assign(state, {
      socialEvents: Array.isArray(data.socialEvents) ? data.socialEvents : [],
      lodgeEvents: Array.isArray(data.lodgeEvents) ? data.lodgeEvents : [],
      chapterEvents: Array.isArray(data.chapterEvents) ? data.chapterEvents : [],
    });
    sortManagedEvents();
    renderManagedEvents();
  }

  function renderManagedEvents() {
    const total = state.socialEvents.length + state.lodgeEvents.length + state.chapterEvents.length;
    managerSummary.innerHTML = `
      <span><b>${state.socialEvents.length}</b> social</span>
      <span><b>${state.lodgeEvents.length}</b> lodge</span>
      <span><b>${state.chapterEvents.length}</b> chapter</span>
      <span><b>${total}</b> total</span>
    `;
    renderValidationSummary();
    renderPublishPlan();

    const allEvents = [
      ...state.socialEvents.map((event) => ({ ...event, key: "socialEvents", label: "Social" })),
      ...state.lodgeEvents.map((event) => ({ ...event, key: "lodgeEvents", label: "Lodge" })),
      ...state.chapterEvents.map((event) => ({ ...event, key: "chapterEvents", label: "Chapter" })),
    ].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

    managedList.innerHTML =
      allEvents.length === 0
        ? `<p class="manager-empty">No managed items yet.</p>`
        : allEvents
            .map(
              (event) => `
                <article class="managed-item">
                  <span class="managed-type">${event.label}</span>
                  <div>
                    <b>${escapeHtml(event.title)}</b>
                    <span>${formatDate(event.date)} · ${escapeHtml(event.degree || event.category || "")} · ${escapeHtml(event.location)}</span>
                  </div>
                  <button type="button" data-remove-key="${event.key}" data-remove-id="${event.id}" aria-label="Remove ${escapeHtml(event.title)}">Remove</button>
                </article>
              `,
            )
            .join("");

    managedList.querySelectorAll("[data-remove-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state[button.dataset.removeKey] = state[button.dataset.removeKey].filter(
          (event) => event.id !== button.dataset.removeId,
        );
        renderManagedEvents();
      });
    });
  }

  function clearManagedEvents() {
    if (!confirm("Clear all managed items in this browser? This will not publish until you choose Publish.")) {
      return;
    }
    state.socialEvents = [];
    state.lodgeEvents = [];
    state.chapterEvents = [];
    renderManagedEvents();
    setStatus("Managed items cleared locally.");
  }

  function downloadManagedJson() {
    downloadFile(managedFile, stringifyState(), "application/json");
  }

  function downloadManagedJs() {
    downloadFile(managedScriptFile, stringifyManagedScript(), "text/javascript");
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function copyManagedJson() {
    await navigator.clipboard.writeText(stringifyState());
    setStatus("Managed JSON copied to your clipboard.");
  }

  async function publishToGithub() {
    const token = githubToken.value.trim();
    if (!token) {
      setStatus("Add a fine-grained GitHub token before publishing.", true);
      return;
    }

    if (rememberToken.checked) {
      localStorage.setItem("surrey1837GithubToken", token);
    }

    setStatus("Checking managed items before publishing...");
    publishGithub.disabled = true;

    try {
      const validation = await validateForPublish();
      renderValidationSummary(validation);
      renderPublishPlan();

      if (validation.errors.length > 0) {
        throw new Error("Fix the validation errors before publishing.");
      }

      setStatus("Publishing to GitHub...");

      if (pendingAssets.size > 0) {
        setStatus(`Uploading ${pendingAssets.size} image${pendingAssets.size === 1 ? "" : "s"}...`);
      }

      for (const [path, asset] of pendingAssets) {
        const base64Content = await asset.contentPromise;
        await updateGithubFile(token, path, base64Content, `Upload calendar image ${path}`, true);
      }

      await updateGithubFile(token, managedFile, stringifyState(), "Update managed calendar events");
      await updateGithubFile(
        token,
        managedScriptFile,
        stringifyManagedScript(),
        "Update managed calendar event preview data",
      );

      setStatus("Published calendar-events.json, calendar-events.js, and any uploaded images. GitHub Pages should update shortly.");
      pendingAssets.clear();
      renderValidationSummary();
      renderPublishPlan();
    } catch (error) {
      setStatus(`Publish failed: ${error.message}`, true);
    } finally {
      publishGithub.disabled = false;
    }
  }

  function parseTable(value) {
    const lines = value
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return [];
    }

    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader);

    return lines.slice(1).map((line) => {
      const cells = splitDelimitedLine(line, delimiter);
      return headers.reduce((row, header, index) => {
        row[header] = clean(cells[index]);
        return row;
      }, {});
    });
  }

  function splitDelimitedLine(line, delimiter) {
    if (delimiter === "\t") {
      return line.split("\t");
    }

    const cells = [];
    let cell = "";
    let insideQuotes = false;

    for (const character of line) {
      if (character === '"') {
        insideQuotes = !insideQuotes;
      } else if (character === "," && !insideQuotes) {
        cells.push(cell);
        cell = "";
      } else {
        cell += character;
      }
    }

    cells.push(cell);
    return cells.map((value) => value.replace(/^"|"$/g, ""));
  }

  function normalizeCalendarKey(value) {
    const key = clean(value).toLowerCase();
    if (key.includes("chapter")) return "chapterEvents";
    if (key.includes("lodge")) return "lodgeEvents";
    return "socialEvents";
  }

  function normalizeHeader(value) {
    return clean(value).toLowerCase().replace(/\s+/g, " ").replace(/[_-]/g, " ");
  }

  function normalizeDate(value) {
    const cleaned = clean(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return cleaned;
    }

    const match = cleaned.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\s+(\d{2,4})$/i);
    if (!match) {
      return cleaned;
    }

    const months = {
      jan: "01",
      january: "01",
      feb: "02",
      february: "02",
      mar: "03",
      march: "03",
      apr: "04",
      april: "04",
      may: "05",
      jun: "06",
      june: "06",
      jul: "07",
      july: "07",
      aug: "08",
      august: "08",
      sep: "09",
      september: "09",
      oct: "10",
      october: "10",
      nov: "11",
      november: "11",
      dec: "12",
      december: "12",
    };
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${months[match[2].toLowerCase()]}-${match[1].padStart(2, "0")}`;
  }

  function sortManagedEvents() {
    Object.keys(state).forEach((key) => {
      state[key].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
    });
  }

  function createId(date, title) {
    return [normalizeDate(date), title]
      .filter(Boolean)
      .join("-")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function splitTags(value) {
    const tags = clean(value)
      .split(/[,|]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    return tags.length > 0 ? tags : null;
  }

  function removeEmpty(record) {
    return Object.fromEntries(
      Object.entries(record).filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== "";
      }),
    );
  }

  function stringifyState() {
    return `${JSON.stringify(state, null, 2)}\n`;
  }

  function stringifyManagedScript() {
    return `window.surrey1837ManagedCalendarData = ${JSON.stringify(state, null, 2)};\n`;
  }

  function renderValidationSummary(validation = validateState(false)) {
    if (!validationSummary) return;

    const issues = [
      ...validation.errors.map((message) => ({ message, type: "error" })),
      ...validation.warnings.map((message) => ({ message, type: "warning" })),
    ];

    validationSummary.innerHTML = issues.length
      ? `
        <p><b>${validation.errors.length}</b> error${validation.errors.length === 1 ? "" : "s"} · <b>${validation.warnings.length}</b> warning${validation.warnings.length === 1 ? "" : "s"}</p>
        <ul>
          ${issues
            .slice(0, 8)
            .map((issue) => `<li data-state="${issue.type}">${escapeHtml(issue.message)}</li>`)
            .join("")}
        </ul>
      `
      : `<p class="manager-empty">Validation passed. Managed items are ready to publish.</p>`;
  }

  function renderPublishPlan() {
    if (!publishPlan) return;
    const assetCount = pendingAssets.size;
    publishPlan.innerHTML = `
      <p class="manager-help">Publishing will update:</p>
      <ul>
        <li><code>${managedFile}</code> as the single calendar data source</li>
        <li><code>${managedScriptFile}</code> for local <code>file://</code> preview fallback</li>
        <li>${assetCount} uploaded image asset${assetCount === 1 ? "" : "s"}</li>
      </ul>
    `;
  }

  function validateState(checkImages) {
    const errors = [];
    const warnings = [];
    const seenIds = new Map();
    const seenDuplicates = new Map();

    const add = (list, key, record, message) => {
      const label = record?.title || record?.lodgeName || record?.id || key;
      list.push(`${label}: ${message}`);
    };

    const dateIsValid = (value) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
      const [year, month, day] = value.split("-").map(Number);
      const parsed = new Date(year, month - 1, day);
      return (
        parsed.getFullYear() === year &&
        parsed.getMonth() === month - 1 &&
        parsed.getDate() === day
      );
    };

    Object.entries(state).forEach(([key, records]) => {
      records.forEach((record) => {
        const isSocial = key === "socialEvents";
        const isMeeting = key === "lodgeEvents" || key === "chapterEvents";
        const required = isSocial
          ? ["id", "date", "title", "location", "category"]
          : ["id", "date", "title", "lodgeName", "lodgeNumber", "degree", "location"];

        required.forEach((field) => {
          if (!clean(record[field])) add(errors, key, record, `missing ${field}`);
        });

        if (!dateIsValid(record.date)) add(errors, key, record, `invalid date "${record.date || ""}"`);

        if (record.id && seenIds.has(record.id)) {
          add(errors, key, record, `duplicate ID also used by ${seenIds.get(record.id)}`);
        } else if (record.id) {
          seenIds.set(record.id, record.title || key);
        }

        const duplicateKey = [key, record.date, record.title, record.location]
          .map((value) => clean(value).toLowerCase())
          .join("|");
        if (seenDuplicates.has(duplicateKey)) {
          add(warnings, key, record, "possible duplicate event on the same date and location");
        } else {
          seenDuplicates.set(duplicateKey, record.id);
        }

        if (isSocial && !socialCategories.has(record.category)) {
          add(errors, key, record, `category must be 1837 Club Event or Community Event`);
        }

        if (isMeeting && !meetingTypes.has(record.degree)) {
          add(errors, key, record, `meeting type is not recognised`);
        }

        if (checkImages && record.poster) {
          if (!pendingAssets.has(record.poster) && !record.poster.startsWith("assets/") && !/^https?:\/\//i.test(record.poster)) {
            add(warnings, key, record, "image path should normally be inside assets/");
          }
        }
      });
    });

    for (const [path, asset] of pendingAssets) {
      if (asset.size > 4 * 1024 * 1024) {
        errors.push(`${path}: uploaded image is over 4 MB; please resize it before publishing`);
      } else if (asset.size > 750 * 1024) {
        warnings.push(`${path}: uploaded image is large; run the display image optimiser after publishing`);
      }
    }

    return { errors, warnings };
  }

  async function validateForPublish() {
    const validation = validateState(true);
    const imageChecks = [];

    Object.entries(state).forEach(([key, records]) => {
      records.forEach((record) => {
        ["poster", "displayPoster"].forEach((field) => {
          const imagePath = clean(record[field]);
          if (!imagePath || pendingAssets.has(imagePath) || /^https?:\/\//i.test(imagePath)) return;
          imageChecks.push(
            imageLoads(imagePath).then((loads) => {
              if (!loads) {
                const label = record.title || record.lodgeName || record.id || key;
                validation.errors.push(`${label}: ${field} does not load (${imagePath})`);
              }
            }),
          );
        });
      });
    });

    await Promise.all(imageChecks);
    return validation;
  }

  function imageLoads(src) {
    return new Promise((resolve) => {
      const image = new Image();
      const timeout = window.setTimeout(() => resolve(false), 5000);
      image.onload = () => {
        window.clearTimeout(timeout);
        resolve(true);
      };
      image.onerror = () => {
        window.clearTimeout(timeout);
        resolve(false);
      };
      image.src = src;
    });
  }

  async function updateGithubFile(token, path, content, message, contentIsBase64 = false) {
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${path}`;
    const currentResponse = await fetch(`${apiUrl}?ref=${branch}`, {
      headers: githubHeaders(token),
    });
    const currentFile = currentResponse.ok ? await currentResponse.json() : {};
    const body = {
      message,
      content: contentIsBase64 ? content : toBase64Unicode(content),
      branch,
      sha: currentFile.sha,
    };

    const updateResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: githubHeaders(token),
      body: JSON.stringify(body),
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json().catch(() => ({}));
      throw new Error(error.message || `GitHub rejected the update for ${path}.`);
    }
  }

  function getManagedImagePath(formData, title) {
    const selectedFile = eventImageFile.files[0];
    if (!selectedFile) {
      return clean(formData.get("poster"));
    }

    const extension = getFileExtension(selectedFile);
    const path = `assets/${createId(formData.get("date"), title)}${extension}`;
    pendingAssets.set(path, { contentPromise: fileToBase64(selectedFile), size: selectedFile.size });
    return path;
  }

  function updateImagePreview() {
    if (!imagePreview) return;
    const image = imagePreview.querySelector("img");
    const label = imagePreview.querySelector("span");
    const selectedFile = eventImageFile.files[0];
    const typedPath = clean(eventPoster.value);

    if (selectedFile) {
      image.src = URL.createObjectURL(selectedFile);
      image.alt = `${selectedFile.name} preview`;
      label.textContent = `${selectedFile.name} · ${Math.round(selectedFile.size / 1024)} KB`;
      imagePreview.hidden = false;
      return;
    }

    if (typedPath) {
      image.src = typedPath;
      image.alt = "Existing website image preview";
      label.textContent = typedPath;
      imagePreview.hidden = false;
      return;
    }

    image.removeAttribute("src");
    image.alt = "";
    label.textContent = "No image selected.";
    imagePreview.hidden = true;
  }

  function getFileExtension(file) {
    const fromName = file.name.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase();
    if (fromName) {
      return fromName;
    }

    const extensionByType = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    return extensionByType[file.type] || ".png";
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve(String(reader.result).split(",")[1]);
      });
      reader.addEventListener("error", () => reject(reader.error));
      reader.readAsDataURL(file);
    });
  }

  function githubHeaders(token) {
    return {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  function toBase64Unicode(value) {
    return btoa(unescape(encodeURIComponent(value)));
  }

  function setStatus(message, isError = false) {
    managerStatus.textContent = message;
    managerStatus.dataset.state = isError ? "error" : "ok";
  }

  function formatDate(date) {
    if (!date) return "No date";
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
