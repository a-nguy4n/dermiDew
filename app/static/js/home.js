fetch('/static/assets/navbar/navbar.html')
  .then(res => res.text())
  .then(data => {
    document.getElementById('navbarContainer').innerHTML = data;

    // Active Link Highlighting Logic AFTER navbar loads
    const path = window.location.pathname;

    document.querySelectorAll('nav a').forEach(link => {
      const href = link.getAttribute('href');
      if (path === href || path.startsWith(href + "/") || path.endsWith(href)) {
        link.classList.add('active');
      }
    });
  });


// **** Pop Up Windows **** 

// prevent default general window from showing 
window.addEventListener('load', () => {
  const windowPopup = document.getElementById('homeWindow');
  if(sessionStorage.getItem('windowVisible') === 'true'){
    windowPopup.style.display = 'block';
  } 
  else{
    windowPopup.style.display = 'none';
  }
});

// exit button functionality 
document.querySelector('.windowExit').addEventListener('click', function () {
  const windowPopup = document.getElementById('homeWindow');
  windowPopup.style.display = 'none';
  sessionStorage.removeItem('windowVisible');
});

function showWindow(contentHTML, customClass = '') {
  const windowPopup = document.getElementById('homeWindow');
  const windowContent = windowPopup.querySelector('.windowContent');
  const contentContainer = windowPopup.querySelector('#windowInnerContent');

  // resetting previous styles
  windowContent.className = 'windowContent';

  // adding a custom class for styling 
  if(customClass) {
    windowContent.classList.add(customClass);
  }

  // injecting the HTML and rendering the popup
  contentContainer.innerHTML = contentHTML;
  windowPopup.style.display = 'block';
  sessionStorage.setItem('windowVisible', 'true');

  const exitBtn = windowPopup.querySelector('.windowExit');
  if(exitBtn){
    exitBtn.addEventListener('click', function () {
      windowPopup.style.display = 'none';
      sessionStorage.removeItem('windowVisible');
    });
  }
}

// ------- STREAK COUNTER ------- 
window.addEventListener('load', async () => {
  try {
    const res = await fetch('/login_metrics',{
      method: 'GET',
      credentials: 'include'
    });
    if (!res.ok) {
      console.error('Could not load login metrics:', res.statusText);
      return;
    }
    const data = await res.json();
    const streakElem = document.getElementById('streakCount');
    if (streakElem) {
      if (data.current_streak == '1') {
        streakElem.textContent = data.current_streak + ' day';
      } else {
        streakElem.textContent = data.current_streak + ' days';
      }
    }
  } 
  
  catch (err){
    console.error('Error fetching streak count:', err);
  }
});

// -------------- ROUTINE WINDOW -------------- 
document.getElementById('currRoutineBubble').addEventListener('click', async () => {
  // 1. Fetch existing routine from the server
  let routine = {};
  try {
    const res = await fetch('/routine', { credentials: 'include' });
    if (res.ok) {
      routine = await res.json();
    } else {
      console.error('Failed to load routine:', res.statusText);
    }
  } catch (err) {
    console.error('Error fetching routine:', err);
  }

  // 2. Show the popup window
  showWindow(
    `<section id="currRoutineContent">
      <div class="routineHeader"> 
        <h2>My Current Routine</h2>
        <div id="editRoutineButton">
          <p>edit</p>
          <img src="/static/assets/images/editIcon.png" alt="Edit Icon">
        </div>
      </div>
      <div class="routineBlock">
        <section id="morningRoutine">
          <div id="morningHeader">
            <h3>Morning</h3>
            <img id="morningImg" src="/static/assets/images/sunIcon.png" alt="Sun Icon">
          </div>
          <ol id="morningList">
            <li>
              <span class="stepLabel">Cleanser:</span>
              <input type="text" class="stepInput" placeholder="add your cleanser here" disabled>
            </li>
            <li>
              <span class="stepLabel">Toner & Essence:</span>
              <input type="text" class="stepInput" placeholder="add your toner & essence here" disabled>
            </li>
            <li>
              <span class="stepLabel">Moisturizer:</span>
              <input type="text" class="stepInput" placeholder="add your moisturizer here" disabled>
            </li>
            <li>
              <span class="stepLabel">Sunscreen:</span>
              <input type="text" class="stepInput" placeholder="add your sunscreen here" disabled>
            </li>
          </ol>
        </section>
        <section id="nightRoutine">
          <div id="nightHeader">
            <h3>Night</h3>
            <img id="nightImg" src="/static/assets/images/moonIcon.png" alt="Moon Icon">
          </div>
          <ol id="nightList">
            <li>
              <span class="stepLabel">Cleanser:</span>
              <input type="text" class="stepInput" placeholder="add your cleanser here" disabled>
            </li>
            <li>
              <span class="stepLabel">Toner & Essence:</span>
              <input type="text" class="stepInput" placeholder="add your toner & essence here" disabled>
            </li>
            <li>
              <span class="stepLabel">Serums & Treatments:</span>
              <input type="text" class="stepInput" placeholder="add your serums & treatments here" disabled>
            </li>
            <li>
              <span class="stepLabel">Moisturizer:</span>
              <input type="text" class="stepInput" placeholder="add your moisturizer here" disabled>
            </li>
          </ol>
        </section>
        <button id="saveButton" style="display: none;">Save</button>
      </div>
    </section>`,
    'routineWindow'
  );

  // 3. Populate inputs with fetched data
  const morningInputs = document.querySelectorAll('#morningList .stepInput');
  const nightInputs   = document.querySelectorAll('#nightList .stepInput');
  morningInputs[0].value = routine.morning_cleanser   || '';
  morningInputs[1].value = routine.morning_toner      || '';
  morningInputs[2].value = routine.morning_moisturizer|| '';
  morningInputs[3].value = routine.morning_sunscreen  || '';
  nightInputs[0].value   = routine.night_cleanser     || '';
  nightInputs[1].value   = routine.night_toner        || '';
  nightInputs[2].value   = routine.night_serums       || '';
  nightInputs[3].value   = routine.night_moisturizer  || '';

  // 4. Wire up Edit button
  const editBtn = document.getElementById('editRoutineButton');
  const saveBtn = document.getElementById('saveButton');
  editBtn.addEventListener('click', () => {
    morningInputs.forEach(i => { i.disabled = false; i.classList.add('edit-mode'); });
    nightInputs.forEach(i => { i.disabled = false; i.classList.add('edit-mode'); });
    saveBtn.style.display = 'inline-block';
  });

  // 5. Wire up Save button
  saveBtn.addEventListener('click', async () => {
    // Collect payload
    const payload = {
      morning_cleanser:    morningInputs[0].value,
      morning_toner:       morningInputs[1].value,
      morning_moisturizer: morningInputs[2].value,
      morning_sunscreen:   morningInputs[3].value,
      night_cleanser:      nightInputs[0].value,
      night_toner:         nightInputs[1].value,
      night_serums:        nightInputs[2].value,
      night_moisturizer:   nightInputs[3].value,
    };

    // Send to backend
    try {
      const res = await fetch('/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        console.error('Failed to save routine:', await res.text());
      }
    } catch (err) {
      console.error('Error saving routine:', err);
    }

    // Disable editing again
    morningInputs.forEach(i => { i.disabled = true; i.classList.remove('edit-mode'); });
    nightInputs.forEach(i => { i.disabled = true; i.classList.remove('edit-mode'); });
    saveBtn.style.display = 'none';
  });
});

// --------------  GOALS WINDOW -------------- 
document.getElementById('goalsBubble').addEventListener('click', () => {
  showWindow(`
    <section id="goalContent">
      <h2>
        My Skincare Goals
      </h2>
      <div id="goalsContainer"></div>
    </section>
  `, 'goalsWindow');

  loadGoals();
});

// fetching user's goals from endpoint
async function loadGoals(){
  const goalsContainer = document.getElementById('goalsContainer');
  if (!goalsContainer) return;

  goalsContainer.innerHTML = '';

  let data;
  try {
    const res = await fetch('/goals', { credentials: 'include' });
    if (!res.ok) {
      console.error('Failed to fetch goals');
      return;
    }
    data = await res.json();
  } catch (err) {
    console.error(err);
    return;
  }

  ['daily', 'weekly', 'monthly'].forEach(type => {
    const block = createGoalBlock(type, data[type] || []);
    goalsContainer.appendChild(block);
  });

  attachDeleteListeners();
  attachNewEntryListeners();
}

function createGoalBlock(type, goalsArray){
  const block = document.createElement('div');
  block.classList.add('goalBlock');
  block.style.backgroundColor = '#e8f6ff';
  block.style.borderRadius = '8px';
  block.style.padding = '1rem';
  block.style.flex = '1'; 

  const heading = document.createElement('h3');
  heading.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)} Goals:`;
  heading.style.textAlign = 'center';
  heading.style.color = '#285d9b';
  heading.style.marginBottom = '0.5rem';
  block.appendChild(heading);

  const listDiv = document.createElement('div');
  listDiv.classList.add('goalList');
  listDiv.style.display = 'flex';
  listDiv.style.flexDirection = 'column';
  listDiv.style.gap = '0.5rem';
  listDiv.style.maxHeight = '300px';
  listDiv.style.overflowY = 'auto';

  goalsArray.forEach(goal => {
    const item = document.createElement('div');
    item.classList.add('goalItem');
    item.dataset.id = goal.id; 

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.style.marginRight = '0.5rem';
    cb.style.width = '1rem';
    cb.style.height = '1rem';
    item.appendChild(cb);

    const span = document.createElement('span');
    span.textContent = goal.text;
    span.style.flexGrow = '1';
    span.style.color = '#1e3f72';
    span.style.fontSize = '0.95rem';
    item.appendChild(span);

    listDiv.appendChild(item);
  });

  const newRow = document.createElement('div');
  newRow.classList.add('goalItem', 'new');

  const newCb = document.createElement('input');
  newCb.type = 'checkbox';
  newCb.disabled = false;
  newCb.style.marginRight = '0.5rem';
  newCb.style.width = '1rem';
  newCb.style.height = '1rem';
  newRow.appendChild(newCb);

  const newSpan = document.createElement('span');
  newSpan.setAttribute('contenteditable', 'true');
  newSpan.dataset.placeholder = 'click to write goal';
  newSpan.style.borderBottom = '1px dotted #999';
  newSpan.style.flexGrow = '1';
  newSpan.style.color = '#285d9b';
  newSpan.style.fontSize = '0.95rem';
  newSpan.style.padding = '0.2rem 0';
  newSpan.dataset.type = type;   
  newSpan.dataset.new = 'true';  
  newSpan.textContent = '';   
  newRow.appendChild(newSpan);

  listDiv.appendChild(newRow);

  block.appendChild(listDiv);
  return block;
}

// deleting goals with checkboxes 
function attachDeleteListeners(){
  document
    .querySelectorAll('.goalItem input[type="checkbox"]')
    .forEach(checkbox => {
      if (checkbox.disabled) return;

      const freshCb = checkbox.cloneNode(true);
      checkbox.replaceWith(freshCb);

      freshCb.addEventListener('change', async () => {
        if (!freshCb.checked) return; // only act when it becomes checked
        const itemDiv = freshCb.closest('.goalItem');
        const goalId = itemDiv.dataset.id;
        try {
          const res = await fetch(`/goals/${goalId}`, {
            method: 'DELETE',
            credentials: 'include',
          });
          if (!res.ok) {
            console.error('Failed to delete goal', await res.text());
            return;
          }
          setTimeout(() => {
            if (itemDiv) itemDiv.remove();
          }, 500);
        } 
        catch (err){
          console.error(err);
        }
      });
    });
}

function attachNewEntryListeners(){
  document
    .querySelectorAll('span[contenteditable][data-new="true"]')
    .forEach(span => {
      const freshSpan = span.cloneNode(true);
      span.replaceWith(freshSpan);

      freshSpan.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const text = freshSpan.textContent.trim();
          const type = freshSpan.dataset.type; 

          if (!text) {
            freshSpan.textContent = '';
            return;
          }

          try {
            const payload = {
              goal_type: type,
              goal_text: text
            };
            const postRes = await fetch('/goals', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(payload),
            });
            if (!postRes.ok) {
              console.error('Failed to add new goal:', await postRes.text());
              return;
            }
            loadGoals();
          } 
          catch (err){
            console.error(err);
          }
        }
      });
    });
}

// --------------  PRODUCT LOG windows -------------- 

// **** ADD REVIEW WINDOW ****  
document.getElementById('addLogBtn').addEventListener('click', () => {
  showWindow(`
    <section id="reviewLogFormContent"> 
      <h2> Product Review Log Entry </h2>

      <form id="productRevForm">
        <div class="formRow">
          <label for="productName"> Product Name: </label>
          <input type="text" id="productName" name="productName" required> 
        </div>

        <div class="formRow">
          <label for="productType"> Product Type:</label>
          <select id="productType" name="productType" required>
              <option value=""> --- Click to select type --- </option>
              <option value="cleanser">Cleanser</option>
              <option value="toner">Toner</option>
              <option value="serum">Serum</option>
              <option value="moisturizer">Moisturizer</option>
              <option value="sunscreen">Sunscreen</option>
              <option value="treatment">Treatment (e.g., exfoliant, retinol)</option>
              <option value="other">Other</option>
          </select>
        </div>

        <div class="formRow">
          <div class="dateGroup">
            <label for="startDate">Start Date:</label>
            <input type="date" id="startDate" name="startDate" required>
          </div>

          <div class="dateGroup">
            <label for="endDate">End Date:</label>
            <input type="date" id="endDate" name="endDate">
          </div>
        </div>
        
        <div class="formRow">
          <label for="productRating">Effectiveness Rating:</label>
          <select id="productRating" name="productRating" required>
              <option value="">--- Click to select rating --- </option>
              <option value="5">★★★★★ - Excellent</option>
              <option value="4">★★★★☆ - Good</option>
              <option value="3">★★★☆☆ - Average</option>
              <option value="2">★★☆☆☆ - Poor</option>
              <option value="1">★☆☆☆☆ - Irritating or Ineffective</option>
          </select>
        </div>

        <div class="formRow">
          <label for="reaction">Did you experience any skin reactions?</label>
          <textarea id="reaction" name="reaction" rows="3" placeholder="Redness, breakouts, dryness, etc."></textarea>
        </div>

        <div class="formRow">
          <label for="notes">Additional Notes:</label>
          <textarea id="notes" name="notes" rows="4" placeholder="Texture, scent, layering, repurchase plans, etc."></textarea>
        </div>

        <div class="formActions">
          <input type="submit" value="Log New Entry">
        </div>
      </form>

      <div id="successMsg" class="hiddenBanner"></div>

    </section>

  `, 'routineWindow');
});

// log success notif popup + saving content 
document.addEventListener('submit', async function (e){
  if (e.target.id === 'productRevForm') {
    e.preventDefault();

    // -- saving content 
    try {
      const res = await fetch('/product_reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name:      document.getElementById('productName').value,
          type:      document.getElementById('productType').value,
          startDate: document.getElementById('startDate').value,
          endDate:   document.getElementById('endDate').value,
          rating:    parseInt(document.getElementById('productRating').value, 10),
          reaction:  document.getElementById('reaction').value,
          notes:     document.getElementById('notes').value
        })
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.error('Failed to save review:', err);
    }

    // -- success message 
    const msg = document.getElementById('successMsg');
    msg.innerHTML = `Log successfully saved! <br> 
                    <a href="#" id="viewLogsLink"> View Past Logs </a>`;
    msg.classList.remove('hiddenBanner');
    msg.classList.add('visibleBanner');

    setTimeout(() => {
      msg.classList.remove('visibleBanner');
      msg.classList.add('hiddenBanner');
    }, 7000);

    document.getElementById('viewLogsLink').addEventListener('click', function (ev){
      ev.preventDefault();
      document.getElementById('entryBtn').click();
    });
  }
});


// **** PAST LOGS WINDOW ****  
document.getElementById('entryBtn').addEventListener('click', async () => {
  let logs = [];
try {
  const res = await fetch('/product_reviews', {
    method: 'GET',
    credentials: 'include'
  });
  if (!res.ok) throw new Error(res.statusText);
  logs = await res.json();
} catch (err) {
  console.error('Failed to load past logs:', err);
}
  const logEntriesHTML = logs.map(log => `
    <div class="pastEntryBox">
      <p class="logProductName">${log.name}</p>
      <p class="logProductType">${log.type}</p>
      <p class="logProductDates">${log.startDate} - ${log.endDate || 'Present'}</p>
      <p class="logProductRating">${'★'.repeat(log.rating)}${'☆'.repeat(5 - log.rating)}</p>

      <div class="logComments" onclick="toggleTooltip(this)"> 
        view comments 
        <div class="commentToolTip">
          <section class="toolTipSection">
            <strong> Skin Reactions: </strong>
            <p>${log.reaction || 'None'}</p>
          </section>

          <section class="toolTipSection">
            <strong> Additional Notes: </strong>
            <p>${log.notes || 'None'}</p>
          </section>
        </div>
        
      </div>

    </div>
  `).join('');

  showWindow(`
    <section id="pastLogContent">
      <h2> My Past Product Review Logs </h2>

      <div class="logSearchContainer">
        <input type="text" class="searchInput" id="logSearchInput" placeholder="🔍 Search for log entry by product name...">
      </div>

      <div class="logContainer">
        ${logEntriesHTML || '<p id="noLogMsg"> No logs yet. Start by adding one!</p>'}
      </div>
    </section>
  `, 'routineWindow');

  // search bar functionality
  setTimeout(() =>{
    const searchInput = document.querySelector('.searchInput');
    const logContainer = document.querySelector('.logContainer');
    
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
    
      const filteredLogs = logs.filter(log =>
        log.name.toLowerCase().includes(query)
      );
    
      logContainer.innerHTML = filteredLogs.map(log => `
        <div class="pastEntryBox">
          <p class="logProductName">${log.name}</p>
          <p class="logProductType">${log.type}</p>
          <p class="logProductDates">${log.startDate} - ${log.endDate || 'Present'}</p>
          <p class="logProductRating">${'★'.repeat(log.rating)}${'☆'.repeat(5 - log.rating)}</p>
          
          <div class="logComments" onclick="toggleTooltip(this)"> 
            view comments 

            <div class="commentToolTip">
              <section class="toolTipSection">
                <strong> Skin Reactions: </strong>
                <p>${log.reaction || 'None'}</p>
              </section>

              <section class="toolTipSection">
                <strong> Additional Notes: </strong>
                <p>${log.notes || 'None'}</p>
              </section>
            </div>

          </div>

        </div>
      `).join('') || '<p id="noResultsMsg"> No logs match your search. </p>';
    });  
  }, 0);
});


// 'view comments' tool tip toggling functionality 
function toggleTooltip(el) {
  const tooltip = el.querySelector('.commentToolTip');
  const isVisible = tooltip.style.display === 'block';
  document.querySelectorAll('.commentToolTip').forEach(t => t.style.display = 'none'); 
  tooltip.style.display = isVisible ? 'none' : 'block';
}

window.addEventListener('click', function (e){
  const isCommentToggle = e.target.closest('.logComments');
  const isTooltip = e.target.closest('.commentTooltip');

  if (!isCommentToggle && !isTooltip){
    document.querySelectorAll('.commentTooltip').forEach(t => t.style.display = 'none');
  }
});

// --------------  NEW SKIN ANALYSIS Bubble -------------- 

document.getElementById('skinAnalysisBubble').addEventListener('click', async () => {
  // Display the initial analysis window with loading states
  showWindow(`
    <section id="analysisContent">
      <h2>My Skincare Analysis</h2>
      
      <div class="analysis-container">
        <div class="scan-overview">
          <h3>Latest Scan Overview</h3>
          <p class="scan-date">last scan was: Loading...</p>
          <p><strong>Type of Skin:</strong> <span id="skinType">Loading...</span></p>
          <p><strong>Hydration Level:</strong> <span id="hydrationLevel">Loading...</span></p>
          <p><strong>Skin Diagnosis:</strong> <span id="skinDiagnosis">Loading...</span></p>
            <button id="newAnalysisButton">+ get new analysis</button>
        </div>
  
        <div class="vertical-divider"></div>

        <div class="routine-recommendation">
          <h3>Routine Recommendation</h3>
          <div id="routineContent">Loading recommendations...</div>
        </div>
      </div>
    </section>
  `, 'routineWindow');

  // Logic to fetch and display analysis results
  const imageUrl = "https://plus.unsplash.com/premium_photo-1683140815244-7441fd002195?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8YWNuZXxlbnwwfHwwfHx8MA%3D%3D"; // Replace with your actual image source
  // const imageUrl = "http://192.168.1.60/photo"; // Example for local camera feed if applicable

  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    } else {
      console.log("Fetched Image for analysis.");
    }
    
    const imageBlob = await imageResponse.blob();
    const imageBase64 = await blobToBase64(imageBlob);
    
    // UPDATED query to ask for all required information and request JSON format
    const queryText = `Analyze the skin in the image and provide the following information in a JSON format:
{
  "description": "A brief description of the skin in the image.",
  "skinType": "e.g., Oily, Dry, Combination, Normal, Sensitive, Acne-prone",
  "hydrationLevel": "e.g., High, Medium, Low, Dehydrated",
  "skinDiagnosis": "e.g., Clear, Mild acne, Redness, Fine lines, Sun damage, Hyperpigmentation",
  "routineRecommendation": {
    "morning": [
      "Step 1: Product type (e.g., Cleanser)",
      "Step 2: Product type (e.g., Toner)",
      "..."
    ],
    "evening": [
      "Step 1: Product type (e.g., Cleanser)",
      "Step 2: Product type (e.g., Treatment)",
      "..."
    ]
  }
}`;

    const response = await fetch('/analysis', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        query: queryText,
        image: imageBase64,
        imageUrl: imageUrl // Sending imageUrl for potential backend logging or processing
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Raw Analysis Data from Backend:", data);

    // Extract the string from the 'response' key
    let rawJsonResponseString = data.response; 

    // Remove the markdown code block delimiters
    // It looks for ```json (or just ```) at the start and ``` at the end.
    rawJsonResponseString = rawJsonResponseString.replace(/^```json\s*|```$/g, '').trim();

    // Now, parse the cleaned JSON string
    const analysisResults = JSON.parse(rawJsonResponseString); 

    // Populate the analysis results into the displayed window
    document.querySelector('.scan-date').textContent = `last scan was: ${new Date().toLocaleDateString()}`;
    document.getElementById('skinType').textContent = analysisResults.skinType || 'N/A';
    document.getElementById('hydrationLevel').textContent = analysisResults.hydrationLevel || 'N/A';
    document.getElementById('skinDiagnosis').textContent = analysisResults.skinDiagnosis || 'N/A';
    
    let routineHtml = '';
    if (analysisResults.routineRecommendation) {
        if (analysisResults.routineRecommendation.morning && analysisResults.routineRecommendation.morning.length > 0) {
            routineHtml += '<h4>Morning Routine:</h4><ul>';
            analysisResults.routineRecommendation.morning.forEach(item => {
                routineHtml += `<li>${item}</li>`;
            });
            routineHtml += '</ul>';
        }
        if (analysisResults.routineRecommendation.evening && analysisResults.routineRecommendation.evening.length > 0) {
            routineHtml += '<h4>Evening Routine:</h4><ul>';
            analysisResults.routineRecommendation.evening.forEach(item => {
                routineHtml += `<li>${item}</li>`;
            });
            routineHtml += '</ul>';
        }
    } else {
        routineHtml = 'No specific recommendations.';
    }
    document.getElementById('routineContent').innerHTML = routineHtml;


    // Re-attach event listener for 'get new analysis' button if it's dynamic
    document.getElementById('newAnalysisButton').addEventListener('click', () => {
      // You can call the whole skin analysis process again or specific parts
      document.getElementById('skinAnalysisBubble').click(); // Simulates clicking the main bubble again
    });

  } catch (error) {
    console.error('Error during skin analysis:', error);
    // Update the UI to show an error message
    document.querySelector('.scan-date').textContent = 'last scan was: Error';
    document.getElementById('skinType').textContent = 'Error';
    document.getElementById('hydrationLevel').textContent = 'Error';
    document.getElementById('skinDiagnosis').textContent = 'Error';
    document.getElementById('routineContent').innerHTML = 'Failed to get analysis. Please try again.';
  }
});

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}