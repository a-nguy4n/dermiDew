
// **** Nav Bar Rendering (per page)  ****
fetch('/static/assets/navbar/navbar.html')
.then(res => res.text())
.then(data => {
  document.getElementById('navbarContainer').innerHTML = data;

  // 🔽 Active Link Highlighting Logic AFTER navbar loads
    const path = window.location.pathname;

    document.querySelectorAll('nav a').forEach(link => {
      const href = link.getAttribute('href');
      if (path === href || path.startsWith(href + "/") || path.endsWith(href)) {
        link.classList.add('active');
      }
    });

    // Optional: Highlight the Help <span> if its dropdown is selected
    const helpLink = document.querySelector('#landingHelp a');
    if (helpLink) {
      const helpHref = helpLink.getAttribute('href');
      if (path === helpHref || path.startsWith(helpHref + "/") || path.endsWith(helpHref)) {
        const helpSpan = document.getElementById('navHelp');
        if (helpSpan) {
          helpSpan.classList.add('active');
        }
      }
    }
});

async function saveProfile() {
  const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  const tone = document.getElementById("skinToneSelect").value;
  const concerns = Array.from(document.querySelectorAll("#concernTags .tag-chip")).map(tag => tag.textContent.trim().replace("×", "")).join(",");
  const goals = Array.from(document.querySelectorAll("#goalTags .tag-chip")).map(tag => tag.textContent.trim().replace("×", "")).join(",");
  const allergies = Array.from(document.querySelectorAll("#allergyTags .tag-chip")).map(tag => tag.textContent.trim().replace("×", "")).join(",");

  const res = await fetch("/profile/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skin_type: selected.join(","),
      skin_tone: tone,
      concerns: concerns,
      goals: goals,
      allergies: allergies
    })
  });

  if (!res.ok) {
    console.error("Auto-save failed");
  }
}


// **** Profile Tab Button Content Activations  ****
const tabButtons = document.querySelectorAll('.profileTabButtons button');
const tabContents = document.querySelectorAll('.tabContent, .tabContentActive');

tabButtons.forEach(button => {
button.addEventListener('click', () => {
    const target = button.getAttribute('data-display');
    const targetId = 'tab' + target;

// Resetting the tab buttons 
tabButtons.forEach(btn => {
    btn.classList.remove('tabButtonActive');
    btn.classList.add('tabButton');
});
button.classList.add('tabButtonActive');

// Resetting the content for each tab section
tabContents.forEach(content => {
    content.classList.remove('tabContentActive');
    content.classList.add('tabContent');
});

// Showing the active tab 
const activeTab = document.getElementById(targetId);
if (activeTab){
    activeTab.classList.add('tabContentActive');
    activeTab.classList.remove('tabContent');
    }
});
});

// **** Skin Profile Selections ****

// for Skin Type 
const editBtn = document.getElementById("editIcon");
const saveBtn = document.getElementById("saveSkinType");
const editor = document.getElementById("skinTypeEditor");
const summary = document.getElementById("skinTypeSummary");
const checkboxes = editor.querySelectorAll('input[name="skinType"]');

editBtn.addEventListener("click", () => {
editor.style.display = "block";
editBtn.style.display = "none";
});

document.getElementById("saveSkinType").addEventListener("click", async () => {
  const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);
  const tone = document.getElementById("skinToneSelect").value;
  const concerns = Array.from(document.querySelectorAll("#concernTags .tag-chip")).map(tag => tag.textContent.trim().replace("×", "")).join(",");
  const goals = Array.from(document.querySelectorAll("#goalTags .tag-chip")).map(tag => tag.textContent.trim().replace("×", "")).join(",");
  const allergies = Array.from(document.querySelectorAll("#allergyTags .tag-chip")).map(tag => tag.textContent.trim().replace("×", "")).join(",");

  const res = await fetch("/profile/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      skin_type: selected.join(","),
      skin_tone: tone,
      concerns: concerns,
      goals: goals,
      allergies: allergies
    })
  });

if (res.ok) {
  summary.textContent = selected.length ? selected.join(', ') : "None selected";
  editor.style.display = "none";
  editBtn.style.display = "inline-block";
}

});


// Enforce max 2 selections live
checkboxes.forEach(cb => {
    cb.addEventListener("change", () => {
    const checked = Array.from(checkboxes).filter(i => i.checked);
        if (checked.length > 2) {
            cb.checked = false;
            alert("You can only select up to 2 skin types.");
        }
    });
});

// for Skin Concerns, Goals, Allergens
function setupTagInput(inputId, containerId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);

  input.addEventListener("keydown", async function (event) {
    if (event.key === "Enter" && this.value.trim() !== "") {
      event.preventDefault();

      const value = this.value.trim();
      const tag = document.createElement("div");
      tag.className = "tag-chip";
      tag.innerHTML = `${value} <button onclick="this.parentElement.remove(); saveProfile()">×</button>`;

      container.appendChild(tag);
      this.value = "";

      await saveProfile();
    }
  });
}

  setupTagInput("concernInput", "concernTags");
  setupTagInput("goalInput", "goalTags");
  setupTagInput("alleryInput", "allergyTags");

document.getElementById("skinToneSelect").addEventListener("change", saveProfile);

  

// Past Products
const productGrid = document.getElementById("productGrid");
const products = ["Cleanser", "Serum", "Toner", "Moisturizer", "SPF", "Mask"];

products.forEach(name => {
  const card = document.createElement("div");
  card.className = "productCard";
  card.textContent = name;
  productGrid.appendChild(card);

});

window.addEventListener("DOMContentLoaded", () => {
  if (typeof loadedSkinProfile !== "undefined") {
    // Skin Type
    const selectedTypes = (loadedSkinProfile.skin_type || "").split(",");
    checkboxes.forEach(cb => cb.checked = selectedTypes.includes(cb.value));
    summary.textContent = selectedTypes.length ? selectedTypes.join(", ") : "None selected";

    // Skin Tone
    const tone = loadedSkinProfile.skin_tone || "Select";
    const toneSelect = document.getElementById("skinToneSelect");
    if (toneSelect) {
      toneSelect.value = tone;
    }

    // Function to create tag elements
    const fillTags = (containerId, values) => {
      const container = document.getElementById(containerId);
      container.innerHTML = "";
      if (values) {
        values.split(",").forEach(val => {
          const tag = document.createElement("div");
          tag.className = "tag-chip";
          tag.innerHTML = `${val} <button onclick="this.parentElement.remove(); saveProfile()">×</button>`;
          container.appendChild(tag);
        });
      }
    };

    fillTags("concernTags", loadedSkinProfile.concerns);
    fillTags("goalTags", loadedSkinProfile.goals);
    fillTags("allergyTags", loadedSkinProfile.allergies);
  }
});

document.getElementById("logoutButton").addEventListener("click", async () => {
  const res = await fetch("/logout", {
    method: "POST"
  });
  if (res.redirected) {
    window.location.href = res.url;
  }
});
