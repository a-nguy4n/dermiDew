
// **** Nav Bar Rendering (per page)  ****
fetch('/app/static/assets/navbar/navbar.html')
.then(res => res.text())
.then(data => {
  document.getElementById('navbarContainer').innerHTML = data;
});

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

saveBtn.addEventListener("click", () => {
const selected = Array.from(checkboxes).filter(cb => cb.checked).map(cb => cb.value);

if (selected.length > 2){
    alert("You can select up to 2 skin types.");
    return;
}

summary.textContent = selected.length ? selected.join(', ') : "None selected";

// Hide editor
editor.style.display = "none";
editBtn.style.display = "inline-block";
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
  
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && this.value.trim() !== "") {
        event.preventDefault();
  
        const value = this.value.trim();
        const tag = document.createElement("div");
        tag.className = "tag-chip";
        tag.innerHTML = `${value} <button onclick="this.parentElement.remove()">×</button>`;
  
        container.appendChild(tag);
        this.value = "";
      }
    });
}

  setupTagInput("concernInput", "concernTags");
  setupTagInput("goalInput", "goalTags");
  setupTagInput("alleryInput", "allergyTags");
  

// Past Products
const productGrid = document.getElementById("productGrid");
const products = ["Cleanser", "Serum", "Toner", "Moisturizer", "SPF", "Mask"];

products.forEach(name => {
  const card = document.createElement("div");
  card.className = "productCard";
  card.textContent = name;
  productGrid.appendChild(card);

});
