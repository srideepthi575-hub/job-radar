/* ===========================================================
   JOB RADAR — DEMO LOGIC
   All job data below is MOCK data for hackathon/demo purposes.
   To go live, replace `JOBS` with results from a real job API
   (e.g. your own backend aggregating from job board APIs),
   and replace analyzeResumeText() with a real resume-parsing
   / LLM call on your backend.
=========================================================== */

const JOBS = [
  { id: 1, title: "Frontend Developer", company: "Google", logo: "G", location: "Bangalore, India", mode: "Hybrid", type: "Full-Time", exp: "2-4 Years", salary: "₹12L - ₹20L", salaryVal: 20, posted: "2 days ago", skills: ["React", "Next.js", "TypeScript", "Node.js"], source: "LinkedIn", url: "https://www.linkedin.com/jobs/" },
  { id: 2, title: "Backend Engineer", company: "Razorpay", logo: "R", location: "Remote", mode: "Remote", type: "Full-Time", exp: "1-3 Years", salary: "₹10L - ₹16L", salaryVal: 16, posted: "1 day ago", skills: ["Node.js", "MongoDB", "AWS", "Docker"], source: "Wellfound", url: "https://wellfound.com/jobs" },
  { id: 3, title: "Full Stack Intern", company: "Zoho", logo: "Z", location: "Chennai, India", mode: "Onsite", type: "Internship", exp: "0-1 Years", salary: "₹25K/mo", salaryVal: 3, posted: "5 hours ago", skills: ["React", "Express", "MySQL"], source: "Internshala", url: "https://internshala.com" },
  { id: 4, title: "UI/UX Designer", company: "Swiggy", logo: "S", location: "Bangalore, India", mode: "Hybrid", type: "Full-Time", exp: "2-5 Years", salary: "₹14L - ₹22L", salaryVal: 22, posted: "3 days ago", skills: ["Figma", "Design Systems", "Prototyping"], source: "Naukri", url: "https://www.naukri.com" },
  { id: 5, title: "Data Analyst", company: "Flipkart", logo: "F", location: "Bangalore, India", mode: "Onsite", type: "Full-Time", exp: "0-2 Years", salary: "₹8L - ₹13L", salaryVal: 13, posted: "6 hours ago", skills: ["SQL", "Python", "Power BI", "Excel"], source: "Indeed", url: "https://www.indeed.com" },
  { id: 6, title: "React Native Developer", company: "PhonePe", logo: "P", location: "Remote", mode: "Remote", type: "Contract", exp: "1-3 Years", salary: "₹15L - ₹19L", salaryVal: 19, posted: "1 week ago", skills: ["React Native", "TypeScript", "Firebase"], source: "Foundit", url: "https://www.foundit.in" },
  { id: 7, title: "DevOps Engineer", company: "Freshworks", logo: "F", location: "Chennai, India", mode: "Hybrid", type: "Full-Time", exp: "3-6 Years", salary: "₹18L - ₹28L", salaryVal: 28, posted: "4 days ago", skills: ["AWS", "Kubernetes", "Docker", "Terraform"], source: "Glassdoor", url: "https://www.glassdoor.com" },
  { id: 8, title: "Junior Web Developer", company: "Local Startup Co", logo: "L", location: "Coimbatore, India", mode: "Onsite", type: "Full-Time", exp: "0-1 Years", salary: "₹4L - ₹6L", salaryVal: 6, posted: "12 hours ago", skills: ["HTML", "CSS", "JavaScript", "React"], source: "Company Site", url: "#" },
  { id: 9, title: "AI/ML Intern", company: "Ola Electric", logo: "O", location: "Bangalore, India", mode: "Hybrid", type: "Internship", exp: "0-1 Years", salary: "₹30K/mo", salaryVal: 3.6, posted: "2 days ago", skills: ["Python", "TensorFlow", "Pandas"], source: "Internshala", url: "https://internshala.com" },
  { id: 10, title: "Product Manager", company: "CRED", logo: "C", location: "Remote", mode: "Remote", type: "Full-Time", exp: "3-5 Years", salary: "₹25L - ₹35L", salaryVal: 35, posted: "3 days ago", skills: ["Roadmapping", "SQL", "Analytics"], source: "LinkedIn", url: "https://www.linkedin.com/jobs/" },
];

const TRENDING_SKILLS = [
  { name: "React", pct: 92 }, { name: "AWS", pct: 81 }, { name: "TypeScript", pct: 76 },
  { name: "Python", pct: 74 }, { name: "Node.js", pct: 68 }, { name: "Docker", pct: 55 },
];
const TOP_COMPANIES = [
  { name: "Google", openings: 42 }, { name: "Flipkart", openings: 37 },
  { name: "Zoho", openings: 29 }, { name: "Swiggy", openings: 24 }, { name: "Razorpay", openings: 19 },
];

let userSkills = [];       // extracted from resume
let savedJobIds = new Set();
let appliedJobIds = new Set();
let activeFilter = "all";
let viewedGaps = {};       // skill -> count, built as jobs are viewed/scored

/* ---------- Utilities ---------- */

function normalizeSkill(s) { return s.trim().toLowerCase(); }

function computeMatch(jobSkills) {
  // Pure function — no side effects. Called on every render, so it must
  // not mutate shared state (that used to inflate viewedGaps on every
  // search/filter click, not just on jobs the user actually opened).
  if (userSkills.length === 0) return null;
  const userSet = new Set(userSkills.map(normalizeSkill));
  const matched = jobSkills.filter(s => userSet.has(normalizeSkill(s)));
  const missing = jobSkills.filter(s => !userSet.has(normalizeSkill(s)));
  const score = Math.round((matched.length / jobSkills.length) * 100);
  return { score, matched, missing };
}

// Records a missing skill only when the user actually opens a job's
// details — this is what drives the "Skill Gap Analysis" dashboard chart.
function trackGap(missingSkills) {
  missingSkills.forEach(s => { viewedGaps[s] = (viewedGaps[s] || 0) + 1; });
}

function matchClass(score) {
  if (score === null) return "";
  if (score >= 70) return "match-high";
  if (score >= 40) return "match-mid";
  return "match-low";
}

/* ---------- Resume analysis (demo keyword extraction) ---------- */

const SKILL_DICTIONARY = [
  "React", "Next.js", "TypeScript", "JavaScript", "Node.js", "Express", "MongoDB",
  "AWS", "Docker", "Kubernetes", "Terraform", "Python", "TensorFlow", "Pandas",
  "SQL", "MySQL", "Power BI", "Excel", "Figma", "Design Systems", "Prototyping",
  "React Native", "Firebase", "HTML", "CSS", "Tailwind", "Git", "Roadmapping", "Analytics"
];

function analyzeResumeText(text) {
  const found = SKILL_DICTIONARY.filter(skill =>
    text.toLowerCase().includes(skill.toLowerCase())
  );
  return found;
}

document.getElementById("analyzeBtn").addEventListener("click", () => {
  const text = document.getElementById("resumeInput").value;
  const fileInput = document.getElementById("resumeFile");

  const runAnalysis = (fullText) => {
    const skills = analyzeResumeText(fullText);
    if (skills.length === 0) {
      renderProfileSummary(null);
      return;
    }
    userSkills = skills;
    renderProfileSummary(skills);
    renderJobs();
    updateDashboard();
  };

  if (fileInput.files.length > 0 && fileInput.files[0].type === "text/plain") {
    const reader = new FileReader();
    reader.onload = e => runAnalysis(text + "\n" + e.target.result);
    reader.readAsText(fileInput.files[0]);
  } else {
    runAnalysis(text);
  }
});

function renderProfileSummary(skills) {
  const box = document.getElementById("profileSummary");
  if (!skills || skills.length === 0) {
    box.innerHTML = `<h2>Your extracted profile</h2>
      <div class="empty-state">Couldn't find recognizable skills — try pasting a fuller resume, mentioning tools by name (e.g. "React, AWS, SQL").</div>`;
    return;
  }
  box.innerHTML = `
    <h2>Your extracted profile</h2>
    <p class="muted">${skills.length} skills detected. These now drive every job's AI match score.</p>
    <div class="profile-skill-list">${skills.map(s => `<span class="skill-tag">${s}</span>`).join("")}</div>
  `;
}

/* ---------- Job rendering ---------- */

function passesFilter(job) {
  switch (activeFilter) {
    case "remote": return job.mode === "Remote";
    case "hybrid": return job.mode === "Hybrid";
    case "onsite": return job.mode === "Onsite";
    case "internship": return job.type === "Internship";
    case "fulltime": return job.type === "Full-Time";
    default: return true;
  }
}

function getFilteredSortedJobs() {
  const titleQ = document.getElementById("searchTitle").value.trim().toLowerCase();
  const locQ = document.getElementById("searchLocation").value.trim().toLowerCase();

  let list = JOBS.filter(job => {
    const matchesText = !titleQ ||
      job.title.toLowerCase().includes(titleQ) ||
      job.company.toLowerCase().includes(titleQ) ||
      job.skills.some(s => s.toLowerCase().includes(titleQ));
    const matchesLoc = !locQ || job.location.toLowerCase().includes(locQ);
    return matchesText && matchesLoc && passesFilter(job);
  });

  if (activeFilter === "salary") {
    list = [...list].sort((a, b) => b.salaryVal - a.salaryVal);
  } else if (activeFilter === "match" && userSkills.length > 0) {
    list = [...list].sort((a, b) => (computeMatch(b.skills)?.score || 0) - (computeMatch(a.skills)?.score || 0));
  }
  return list;
}

function renderJobs() {
  const list = getFilteredSortedJobs();
  document.getElementById("resultsCount").textContent = `${list.length} jobs found`;
  const grid = document.getElementById("jobList");

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state">No jobs match that search. Try a broader title or location.</div>`;
    return;
  }

  grid.innerHTML = list.map(job => {
    const match = computeMatch(job.skills);
    const badge = match
      ? `<span class="match-badge ${matchClass(match.score)}">${match.score}% match</span>`
      : `<span class="match-badge">Add resume for match</span>`;
    const skillTags = job.skills.map(s => {
      const isMissing = match && match.missing.includes(s);
      return `<span class="skill-tag ${isMissing ? "missing" : ""}">${s}</span>`;
    }).join("");
    const saved = savedJobIds.has(job.id);

    return `
      <div class="job-card" data-id="${job.id}">
        <div class="job-card-top">
          <div style="display:flex; gap:10px;">
            <div class="job-logo">${job.logo}</div>
            <div>
              <div class="job-title">${job.title}</div>
              <div class="job-company">${job.company}</div>
            </div>
          </div>
          ${badge}
        </div>
        <div class="job-meta-row">
          <span>${job.location}</span><span>${job.mode}</span><span>${job.type}</span><span>${job.exp}</span>
        </div>
        <div class="job-meta-row"><span>${job.salary}</span><span>Posted ${job.posted}</span><span>via ${job.source}</span></div>
        <div class="job-skills">${skillTags}</div>
        <div class="job-card-footer">
          <span>Status: Active</span>
          <button class="save-btn ${saved ? "saved" : ""}" data-save="${job.id}">${saved ? "Saved ✓" : "Save"}</button>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll(".save-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      const id = Number(btn.dataset.save);
      if (savedJobIds.has(id)) savedJobIds.delete(id); else savedJobIds.add(id);
      renderJobs();
      updateDashboard();
    });
  });

  grid.querySelectorAll(".job-card").forEach(card => {
    card.addEventListener("click", () => openModal(Number(card.dataset.id)));
  });
}

/* ---------- Modal ---------- */

function openModal(id) {
  const job = JOBS.find(j => j.id === id);
  const match = computeMatch(job.skills);
  if (match) trackGap(match.missing);
  updateDashboard();
  const modal = document.getElementById("jobModal");
  const body = document.getElementById("modalBody");

  let matchSection = `<p class="muted" style="margin-top:14px;">Add your resume in "My Profile" to see your AI match score and skill gap for this role.</p>`;
  if (match) {
    matchSection = `
      <div style="margin-top:16px;">
        <div class="modal-row"><span>AI Match Score</span><strong>${match.score}%</strong></div>
        <div class="modal-row"><span>Matched Skills</span><span>${match.matched.join(", ") || "—"}</span></div>
        <div class="modal-row"><span>Missing Skills</span><span>${match.missing.join(", ") || "None — great fit!"}</span></div>
      </div>
      <p class="muted" style="margin-top:10px; font-size:13.5px;">
        ${match.missing.length > 0
          ? `Learning ${match.missing.slice(0, 2).join(" and ")} could raise your match score toward 90%+.`
          : `Your skills cover everything this role asks for.`}
      </p>
    `;
  }

  body.innerHTML = `
    <div class="modal-body">
      <h2>${job.title}</h2>
      <p class="muted">${job.company} · ${job.location}</p>
      <div class="modal-row"><span>Work Mode</span><span>${job.mode}</span></div>
      <div class="modal-row"><span>Job Type</span><span>${job.type}</span></div>
      <div class="modal-row"><span>Experience</span><span>${job.exp}</span></div>
      <div class="modal-row"><span>Salary</span><span>${job.salary}</span></div>
      <div class="modal-row"><span>Posted</span><span>${job.posted}</span></div>
      <div class="modal-row"><span>Source</span><span>${job.source}</span></div>
      <div class="modal-row"><span>Required Skills</span><span>${job.skills.join(", ")}</span></div>
      ${matchSection}
      <a class="modal-apply" href="${job.url}" target="_blank" rel="noopener">Apply on ${job.source} →</a>
    </div>
  `;
  modal.classList.add("open");
}

document.getElementById("modalClose").addEventListener("click", () => {
  document.getElementById("jobModal").classList.remove("open");
});
document.getElementById("jobModal").addEventListener("click", e => {
  if (e.target.id === "jobModal") e.target.classList.remove("open");
});

/* ---------- Dashboard ---------- */

function updateDashboard() {
  document.getElementById("statSaved").textContent = savedJobIds.size;
  document.getElementById("statApplied").textContent = appliedJobIds.size;

  if (userSkills.length === 0) {
    document.getElementById("statAvgMatch").textContent = "—";
  } else {
    const scores = JOBS.map(j => computeMatch(j.skills).score);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    document.getElementById("statAvgMatch").textContent = avg + "%";
  }

  const gapEntries = Object.entries(viewedGaps).sort((a, b) => b[1] - a[1]).slice(0, 6);
  document.getElementById("statTopGap").textContent = gapEntries[0] ? gapEntries[0][0] : "—";

  const gapChart = document.getElementById("gapChart");
  if (gapEntries.length === 0) {
    gapChart.innerHTML = `<div class="empty-state">Browse some jobs with your resume added to see gaps here.</div>`;
  } else {
    const max = gapEntries[0][1];
    gapChart.innerHTML = gapEntries.map(([skill, count]) => `
      <div class="bar-row">
        <span>${skill}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(count / max) * 100}%"></div></div>
        <span>${count}</span>
      </div>
    `).join("");
  }

  const savedList = document.getElementById("savedList");
  if (savedJobIds.size === 0) {
    savedList.innerHTML = `<div class="empty-state">Nothing saved yet.</div>`;
  } else {
    savedList.innerHTML = [...savedJobIds].map(id => {
      const job = JOBS.find(j => j.id === id);
      return `<div class="mini-item"><span>${job.title} · ${job.company}</span><span class="muted">${job.salary}</span></div>`;
    }).join("");
  }
}

/* ---------- Market tab (static demo trends) ---------- */

function renderMarket() {
  const max = TRENDING_SKILLS[0].pct;
  document.getElementById("trendingSkills").innerHTML = TRENDING_SKILLS.map(s => `
    <div class="bar-row">
      <span>${s.name}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${(s.pct / max) * 100}%"></div></div>
      <span>${s.pct}%</span>
    </div>
  `).join("");

  document.getElementById("topCompanies").innerHTML = TOP_COMPANIES.map(c => `
    <div class="mini-item"><span>${c.name}</span><span class="muted">${c.openings} open roles</span></div>
  `).join("");
}

/* ---------- Tabs ---------- */

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "dashboard") updateDashboard();
    if (btn.dataset.tab === "market") renderMarket();
  });
});

/* ---------- Search & filters ---------- */

document.getElementById("searchBtn").addEventListener("click", renderJobs);
document.getElementById("searchTitle").addEventListener("keydown", e => { if (e.key === "Enter") renderJobs(); });
document.getElementById("searchLocation").addEventListener("keydown", e => { if (e.key === "Enter") renderJobs(); });

document.querySelectorAll(".chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    renderJobs();
  });
});

/* ---------- Theme toggle ---------- */

const themeToggle = document.getElementById("themeToggle");
themeToggle.addEventListener("click", () => {
  const root = document.documentElement;
  const isDark = root.getAttribute("data-theme") === "dark";
  root.setAttribute("data-theme", isDark ? "light" : "dark");
  themeToggle.textContent = isDark ? "☾" : "☀";
});

/* ---------- Init ---------- */

renderJobs();
